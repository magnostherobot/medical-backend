import { Request, Response } from 'express';
import * as fs from 'fs-extra';
import { logger } from './logger';
import * as Multer from 'multer';

import * as parse from 'csv-parse';
import * as stringify from 'csv-stringify';
import { default as File } from './db/model/File';
import { default as Project } from './db/model/Project';

const CONTENT_BASE_DIRECTORY: string = './files';
const LOG_BASE_DIRECTORY: string = './logs';
const TEMP_BASE_DIRECTORY: string = './files-temp';

export interface Metadata {
	version: number;
	namespaces: object;
	[index: string]: any;
}

export const INITIAL_METADATA: Metadata = {
	version: 1,
	namespaces: {}
};

const writableStream: (
	filename: string, projectName: string
) => fs.WriteStream = (
	filename: string, projectName: string
): fs.WriteStream => {
	return fs.createWriteStream(path(filename, projectName));
};

interface RawSize {
	offset: number;
	length: number;
}

interface TabularParameters {
	rowstart: number;
	rowcount: number;
	cols: string[];
}

interface Query extends Partial<RawSize>, Partial<TabularParameters> {
	children?: boolean;
}

const readableStream: (
	filename: string, projectName: string, { offset, length }?: Query
) => fs.ReadStream = (
	filename: string, projectName: string, { offset, length }: Query =
		{ offset: undefined, length: undefined }
): fs.ReadStream => {
	const options: object = {
		start: offset ? offset : 0,
		end: offset && length ? offset + length : undefined
	};
	return fs.createReadStream(path(filename, projectName), options);
};

export const logPath: (type: string, projectName?: string) => string = (
	type: string, projectName?: string
): string => {
	return projectName
		? `${LOG_BASE_DIRECTORY}/projects/${projectName}/${type}`
		: `${LOG_BASE_DIRECTORY}/general/${type}`;
};

let storage = Multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, CONTENT_BASE_DIRECTORY)
	},
	filename: function (req, file, cb) {
		cb(null, `temp-${file.originalname}`)
	}
});

export const path: (file: string, project: string, view?: ViewName) => string =
	(file: string, project: string, view: ViewName = 'raw'): string =>
		`${CONTENT_BASE_DIRECTORY}/${project}/${file}/${view}`;

export const pathNoView: (file: string, project: string) => string =
	(file: string, project: string): string =>
		`${CONTENT_BASE_DIRECTORY}/${project}/${file}`;

export const tempPath: (file: string, project: string) => string = (
	file: string
): string =>
	`${TEMP_BASE_DIRECTORY}/${file}`

export const upload: Multer.Instance = Multer({ storage: storage });

export const saveFile: (filename: string, projectname: string, fileId: string, offset: number, truncate?: boolean) => Promise<void> =
	async(filename: string, projectname: string, fileId: string, offset: number, truncate?: boolean): Promise<void> => {
	// TODO only overwrite beginning of file and keep rest of data
	// ensure file exists
	await fs.ensureFile(path(fileId, projectname));
	// truncate to offset
	await truncateFile(fileId, projectname, offset);
	// open streams to append to file
	let rStream = fs.createReadStream(`${CONTENT_BASE_DIRECTORY}/temp-${filename}`);
	let wStream = fs.createWriteStream(path(fileId, projectname), {'flags':'a'});
	rStream.pipe(wStream).on('finish', async() => {
		fs.remove(`${CONTENT_BASE_DIRECTORY}/temp-${filename}`);
	}).on('error', (err: any) => {
		logger.error(`Error while saving file to proper location: ${err}`);
	});
}

export const deleteFile: (fileId: string, projectName: string) => void = async(
	fileId: string, projectName: string
): Promise<void> => {
	await fs.remove(`${CONTENT_BASE_DIRECTORY}/${projectName}/${fileId}`);
}

export const truncateFile: (fileId: string, projectName: string, newLength: number) => Promise<void> =
	async(fileId: string, projectName: string, newLength: number): Promise<void> => {
	// get the file descriptor of the file to be truncated
	const fd: number = await fs.open(path(fileId, projectName), 'r+');
	await fs.ftruncate(fd, newLength);
}

export const copyFile: (projName: string, fromId: string, toId: string, move?: boolean) 
	=> Promise<void> = async(projName: string, fromId: string, toId: string, move?: boolean): Promise<void> => {
	// ensure to path exists
	fs.ensureDirSync(pathNoView(toId, projName));
	const fromDir: string = pathNoView(fromId, projName);
	const toDir: string = pathNoView(toId, projName);
	// loop all views in file
	fs.readdir(fromDir, (err: any, files: string[]) => {
		if(err){
			logger.error(`Error while copying file: ${err}`);
		} else {
			files.forEach((file: string, index: number) => {
				const fromPathFull = fromDir + "/" + file;
				const toPathFull = toDir + "/" + file;
				fs.ensureFileSync(toPathFull);
				// open streams to transfer data
				let rStream = fs.createReadStream(fromPathFull);
				let wStream = fs.createWriteStream(toPathFull);
				rStream.pipe(wStream).on('finish', async() => {
					if(!!move){
						await fs.remove(fromPathFull);
					}
					console.log(`copy success of file from \'${fromPathFull}\' to \'${toPathFull}\'`)
				}).on('error', (err: any) => {
					logger.error(`Error while copying file: ${err}`);
				});
			})
		}
	});
	
}

export const files: {
	path: (f: string, p: string) => string;
	writableStream: (f: string, p: string) => fs.WriteStream;
	logPath: (t: string, p?: string) => string;
} = {
	path,
	writableStream,
	logPath
};

export type ViewName = 'raw' | 'meta' | 'tabular';

interface Query extends Partial<RawSize> {
	include_children?: boolean;
}

export interface View {
	getContents: (file: File, project: Project) => object | Promise<object>;
	getResponseData: (file: File, project: Project, query: Query) =>
		Promise<object>;
	getResponseFunction: (req: Request, res: Response) => Function | null;
}

interface MetaResponseData {
	file_path: string;
	file_name: string;
	id: string;
	type: FileTypeName;
	metadata: object;
	status: string;
	supported_views: {
		[key: string]: object | undefined;
	};
	children?: MetaResponseData[];
}

const metaGetResponseData: (
	file: File, project: Project, query: Query
) => Promise<MetaResponseData> = async(
	file: File, project: Project, query: Query
): Promise<MetaResponseData> => {
	const data: MetaResponseData = {
		file_path: file.fullPath,
		file_name: file.name,
		id: file.uuid,
		type: file.type,
		metadata: file.metadata,
		status: file.status,
		supported_views: {}
	};
	for (const view of fileTypes[file.type].supportedViews) {
		data.supported_views[view] =
			await views[view].getContents(file, project);
	}
	if (query.include_children) {
		data.children = [];
		const children: File[] | null = await File.findAll({
			where: {
				parentFolderId: file.uuid
			}
		});
		if (children != null) {
			for (const child of children) {
				data.children.push(await metaGetResponseData(
					child,
					project,
					{
						...query,
						include_children: undefined
					}
				));
			}
		}
	}
	return data;
};

export const getSize: (file: File, project: Project) => Promise<number> = async(
	file: File, project: Project
): Promise<number> => {
	const stat: fs.Stats = await fs.stat(path(file.uuid, project.name));
	return stat.size;
};

export const views: {
	[view: string]: View;
} = {
	raw: {
		getContents: async(file: File, project: Project): Promise<object> => {
			return {
				size: await getSize(file, project)
			};
		},
		getResponseData: async(
			file: File, project: Project, query: Query
		): Promise<object> => {
			return readableStream(file.uuid, project.name, query);
		},
		getResponseFunction: (req: Request, res: Response): Function | null => {
			return (stream: fs.ReadStream) => stream.pipe(res);
		}
	},
	meta: {
		getContents: (file: File): object => {
			return {};
		},
		getResponseData: metaGetResponseData,
		getResponseFunction: (req: Request, res: Response): Function | null => {
			return null;
		}
	},
	tabular: {
		getContents: (file: File): object => {
			return {
				// columns:
				// rows:
			};
		},
		getResponseData: async(
			file: File, project: Project, query: Query
		): Promise<object> => {
			return readableStream(file.name, project.name, query)
				.pipe(parse({
					columns: true,
					from: query.rowstart,
					to: (query.rowstart && query.rowcount)
						? query.rowstart + query.rowcount
						: undefined
				})).pipe(stringify({
				}));
		},
		getResponseFunction: (req: Request, res: Response): Function | null => {
			return (stream: fs.ReadStream) => stream.pipe(res);
		}
	}
};

export type FileTypeName = 'generic' | 'directory' | 'tabular';

export interface FileType {
	supportedViews: ViewName[];
}

const fileTypes: {
	[type: string]: FileType;
} = {
	generic: {
		supportedViews: [
			'raw', 'meta'
		]
	},
	directory: {
		supportedViews: [
			'meta'
		]
	},
	tabular: {
		supportedViews: [
			'raw', 'meta', 'tabular'
		]
	}
};

class MimeTypeMap extends Map<string, string> {
	public constructor(pairs: [string, FileTypeName][]) {
		super(pairs);
	}

	public get(mime: string): FileTypeName {
		const ret: string | undefined = super.get(mime);
		if (ret) {
			return ret as FileTypeName;
		} else {
			return 'generic';
		}
	}
}

export const mimes: MimeTypeMap = new MimeTypeMap([
	[ 'inode/directory', 'directory' ],
	[ 'text/csv',        'tabular'   ]
]);

export const rootPathId: string = '0';
export const rootPathFile: File | null = null;

export const createRootFolder: () => Promise<void> = async(
): Promise<void> => {
	if (!(await fs.exists(CONTENT_BASE_DIRECTORY))){
		await fs.mkdir(CONTENT_BASE_DIRECTORY);
	}
}

export const createProjectFolder: (name: string) => Promise<void> = async(
	projName: string
): Promise<void> => {
	if (!(await fs.exists(CONTENT_BASE_DIRECTORY + '/' + projName))){
		await fs.mkdir(CONTENT_BASE_DIRECTORY + '/' + projName);
	}
}

export const addSubFileToFolder: (parentId: string, subFileId: string) => Promise<boolean> = async(parentId: string, subFileId: string): Promise<boolean> => {
	logger.debug(`adding file ${subFileId} to directory ${parentId}`)
	// Fetch parent and subFile object from database
	const parent: File | null = await File.findOne({
		include: [{all: true}],
		where: {
			uuid: parentId
		}
	});
	const file: File | null = await File.findOne({
		include: [{all: true}],
		where: {
			uuid: subFileId
		}
	});
	if(!parent || !file){
		return false;
	}
	parent.$add('containedFilesInternal', file);

	return true;
}

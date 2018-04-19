import { Request, Response } from 'express';
import * as fs from 'fs-extra';
import { logger } from './logger';
import * as Multer from 'multer';

import { default as File } from './db/model/File';
import { default as Project } from './db/model/Project';

const CONTENT_BASE_DIRECTORY: string = './files';
const LOG_BASE_DIRECTORY: string = './logs';

/* tslint:disable */
const path: (filename: string, projectName: string) => string = (filename: string, projectName: string): string => {
	return `${CONTENT_BASE_DIRECTORY}/${projectName}/${filename}`;
};

const writableStream: (filename: string, projectName: string) => fs.WriteStream = (filename: string, projectName: string): fs.WriteStream => {
	return fs.createWriteStream(path(filename, projectName));
};

interface RawSize {
	offset: number;
	length: number;
}

const readableStream: (filename: string, projectName: string, { offset, length }?: Partial<RawSize>) => fs.ReadStream 
	= (filename: string, projectName: string, { offset, length }: Partial<RawSize> = { offset: undefined, length: undefined }): fs.ReadStream => {
	const options: object = {
		start: offset? offset: 0,
		end: offset && length? offset + length: undefined
	};
	return fs.createReadStream(path(filename, projectName), options);
};

const logPath: (type: string, projectName?: string) => string = (
	type: string, projectName?: string): string => {
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

export const upload: Multer.Instance = Multer({ storage: storage });

export const saveFile: (filename: string, projectname: string, fileId: string, offset: number, truncate?: boolean) => void = 
	(filename: string, projectname: string, fileId: string, offset: number, truncate?: boolean): void => {
	// TODO only overwrite beginning of file and keep rest of data
	// ensure file exists
	fs.ensureFileSync(`${CONTENT_BASE_DIRECTORY}/${projectname}/${fileId}`);
	// truncate to offset
	truncateFile(fileId, projectname, offset);
	// open streams to append to file
	let rStream = fs.createReadStream(`${CONTENT_BASE_DIRECTORY}/temp-${filename}`);
	let wStream = fs.createWriteStream(`${CONTENT_BASE_DIRECTORY}/${projectname}/${fileId}`, {'flags':'a'});
	rStream.pipe(wStream).on('finish', () => {
		fs.removeSync(`${CONTENT_BASE_DIRECTORY}/temp-${filename}`);
	}).on('error', (err: any) => {
		logger.debug(`Error while saving file to proper location: ${err}`);
	});
}

export const deleteFile: (fileId: string, projectName: string) => void = 
	(fileId: string, projectName: string): void => {
	
	fs.removeSync(`${CONTENT_BASE_DIRECTORY}/${projectName}/${fileId}`);
}

export const truncateFile: (fileId: string, projectName: string, newLength: number) => void = 
	(fileId: string, projectName: string, newLength: number): void => {
	// get the file descriptor of the file to be truncated
	const fd: number = fs.openSync(`${CONTENT_BASE_DIRECTORY}/${projectName}/${fileId}`, 'r+');
	fs.ftruncateSync(fd, newLength);
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

export type ViewName = 'raw' | 'meta';

interface Query extends Partial<RawSize> {
	children?: boolean;
}

export interface View {
	getContents: (file: File) => object;
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
		id: file.id,
		type: file.type,
		metadata: file.metadata,
		status: file.status,
		supported_views: {}
	};
	for (const view of fileTypes[file.type].supportedViews) {
		data.supported_views[view] =
			views[view].getContents(file);
	}
	if (query.children) {
		data.children = [];
		const children: File[] | null = await File.findAll({
			where: {
				parentFolder: file
			}
		});
		if (children != null) {
			for (const child of children) {
				data.children.push(await metaGetResponseData(
					file,
					project,
					{
						...query,
						children: undefined
					}
				));
			}
		}
	}
	return data;
};

export const views: {
	[view: string]: View;
} = {
	raw: {
		getContents: (file: File): object => {
			return {
				size: file.size
			};
		},
		getResponseData: async(
			file: File, project: Project, query: Query
		): Promise<object> => {
			return readableStream(file.name, project.name, query);
		},
		getResponseFunction: (req: Request, res: Response): Function | null => {
			return res.send;
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
	}
};

export type FileTypeName = 'generic' | 'directory';

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
	[ 'inode/directory', 'directory' ]
]);

export const rootPathId: string = '0';
export const rootPathFile: File | null = null;

export const createRootFolder: () => void = (): any => {
	if (!fs.existsSync(CONTENT_BASE_DIRECTORY)){
		fs.mkdirSync(CONTENT_BASE_DIRECTORY);
	}
}

export const createProjectFolder: (name: string) => void = (projName: string): any => {
	if (!fs.existsSync(CONTENT_BASE_DIRECTORY + '/' + projName)){
		fs.mkdirSync(CONTENT_BASE_DIRECTORY + '/' + projName);
	}
}

export const addSubFileToFolder: (parentId: string, subFileId: string) => Promise<boolean> = async(parentId: string, subFileId: string): Promise<boolean> => {
	logger.debug(`adding file ${subFileId}) to directory ${parentId}`)
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
	// update both objects
	parent.containedFiles.push(file);
	file.parentFolderId = parent.uuid;
	// save
	await file.save();
	await parent.save();

	return true;
}

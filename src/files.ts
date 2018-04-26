import { Request, Response } from 'express';
import * as fs from 'fs-extra';
import { logger } from './logger';
import * as Multer from 'multer';
import * as stream from 'stream';
import * as parse from 'csv-parse';
import * as stringify from 'csv-stringify';
import { default as File } from './db/model/File';
import { default as Project } from './db/model/Project';
import { uuid } from './uuid';
import { main as CZICrunch } from './conversion/czi/czi'
import { crunchLeica as SCNCrunch } from './conversion/leica/scn';
import { getTile as getSCNTile } from './conversion/leica/requestconvertor';
import { getTile as getCZITile } from './conversion/czi/pyramidWorker'
import { RequestError } from './errors';
import { toCSV as excelToCSV, buildSupportedViews } from './conversion/csv/excel';
import { profiler } from './profiler';
import { SupportedViews } from './conversion/types/helpers'
import { CZITileRequest } from './conversion/types/customPyramidIndex'
const readDir = require('util').promisify(fs.readdir);
const readFile = require('util').promisify(fs.readFile);
const cache = require('redis').createClient();
cache.on("error", function(err: any) {
	logger.error("Redis_Error: " + err);
})

const BASE_BASE: string = `/cs/scratch/${require("os").userInfo().username}/`
const CONTENT_BASE_DIRECTORY: string = BASE_BASE + 'files';
const LOG_BASE_DIRECTORY: string = BASE_BASE + 'logs';
const TEMP_BASE_DIRECTORY: string = BASE_BASE + 'files-temp';

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

interface FileUploadParameters {
	truncate: boolean;
	overwrite: boolean;
	offset: number;
	action: 'set_metadata'
		| 'delete'
		| 'move'
		| 'copy'
		| 'mkdir';
}

interface TileQuery {
	channel_name: string;
	x_offset: number;
	y_offset: number;
	width: number;
	height: number;
	zoom_level: number;
}
interface Query extends
	Partial<RawSize>,
	Partial<TabularParameters>,
	Partial<FileUploadParameters>,
	Partial<TileQuery> {
	children?: boolean;
}

const readableStream: (
	filename: string,
	projectName: string,
	{ offset, length }?: Query,
	view?: ViewName
) => fs.ReadStream = (
	filename: string,
	projectName: string,
	{ offset, length }: Query = { offset: undefined, length: undefined },
	view?: ViewName
): fs.ReadStream => {
	const options: object = {
		start: Number(offset ? offset : 0),
		end: Number(offset && length ? offset + length : undefined)
	};
	return fs.createReadStream(path(filename, projectName, view), options);
};

export const logPath: (type: string, projectName?: string) => string = (
	type: string, projectName?: string
): string => {
	return projectName
		? `${LOG_BASE_DIRECTORY}/projects/${projectName}/${type}`
		: `${LOG_BASE_DIRECTORY}/general/${type}`;
};

export const path: (file: string, project: string, view?: ViewName) => string =
	(file: string, project: string, view?: ViewName): string =>
		`${CONTENT_BASE_DIRECTORY}/${project}/${file}/${view || 'ORIGINAL'}`;

export const originalPath: (file: string, project: string) => string =
	(file: string, project: string): string =>
		`${CONTENT_BASE_DIRECTORY}/${project}/${file}/ORIGINAL`;

export const pathNoView: (file: string, project: string) => string =
	(file: string, project: string): string =>
		`${CONTENT_BASE_DIRECTORY}/${project}/${file}`;

export const tempPath: (file: string, project: string) => string = (
	file: string
): string =>
	`${TEMP_BASE_DIRECTORY}/${uuid.generate()}`;

export const saveFile: (
	data: Buffer, projectName: string, fileId: string, query: Query
) => Promise<void> = async(
	data: Buffer, projectName: string, fileId: string, query: Query
): Promise<void> => {
	// Ensure file exists
	await fs.ensureFile(path(fileId, projectName));
	// Truncate to offset
	if (!!query.truncate) {
		await truncateFile(fileId, projectName, query.offset || 0);
	}
	// Open file
	const fd: number = await fs.open(path(fileId, projectName), 'r+');
	// Write data to file
	try {
		await fs.write(fd, data, 0, data.length, Number(query.offset || 0));
	} catch (err) {
		logger.failure("Error while writing to file: " + err);
	}
};

export const deleteFile: (fileId: string, projectName: string) => void = async(
	fileId: string, projectName: string
): Promise<void> => {
	await fs.remove(`${CONTENT_BASE_DIRECTORY}/${projectName}/${fileId}`);
};

export const truncateFile: (fileId: string, projectName: string, newLength: number) => Promise<void> =
	async(fileId: string, projectName: string, newLength: number): Promise<void> => {
	// get the file descriptor of the file to be truncated
	const fd: number = await fs.open(path(fileId, projectName), 'r+');
	await fs.ftruncate(fd, newLength);
};

export const copyFile: (projName: string, fromId: string, toId: string, move?: boolean)
	=> Promise<void> = async(projName: string, fromId: string, toId: string, move?: boolean): Promise<void> => {
	// ensure to path exists
	fs.ensureDirSync(pathNoView(toId, projName));
	const fromDir: string = pathNoView(fromId, projName);
	const toDir: string = pathNoView(toId, projName);
	// loop all views in file
	fs.readdir(fromDir, (err: any, files: string[]) => {
		if (err) {
			logger.error(`Error while copying file: ${err}`);
		} else {
			files.forEach((file: string, index: number) => {
				const fromPathFull = fromDir + '/' + file;
				const toPathFull = toDir + '/' + file;
				fs.ensureFileSync(toPathFull);
				// open streams to transfer data
				const rStream = fs.createReadStream(fromPathFull);
				const wStream = fs.createWriteStream(toPathFull);
				rStream.pipe(wStream).on('finish', async() => {
					if (!!move) {
						await fs.remove(fromPathFull);
					}
				}).on('error', (err: any) => {
					logger.error(`Error while copying file: ${err}`);
				});
			});
		}
	});

};

export const files: {
	path: (f: string, p: string) => string;
	writableStream: (f: string, p: string) => fs.WriteStream;
	logPath: (t: string, p?: string) => string;
} = {
	path,
	writableStream,
	logPath
};

export type ViewName = 'raw' | 'meta' | 'tabular' | 'scalable_image';

interface Query extends Partial<RawSize> {
	include_children?: boolean;
}

export interface View {
	getContents: (file: File, project: Project) => object | Promise<object>;
	getResponseData: (file: File, project: Project, query: Query, url: string) =>
		Promise<object>;
	getResponseFunction: (req: Request, res: Response) => Function | null;
	preprocess: (file: File, original: string, space: string) =>
		Promise<void>;
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

const avgReqDuration = profiler.histogram({
	name: "Avg. ImgTile Request Duration (ms)",
	measurement: "mean",
	agg_type: "avg"
})
const cacheHits = profiler.counter({
	name: "Image Tile Cache Hits",
	agg_type: "sum"
})

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
			return (rStream: fs.ReadStream): fs.ReadStream =>
				rStream.pipe(res as any);
		},
		preprocess: async(): Promise<void> => {
			return;
		}
	},
	meta: {
		getContents: (file: File): object => {
			return {};
		},
		getResponseData: metaGetResponseData,
		getResponseFunction: (req: Request, res: Response): Function | null => {
			return null;
		},
		preprocess: async(): Promise<void> => {
			return;
		}
	},
	tabular: {
		getContents: async(file: File, project: Project): Promise<object> => {
			return await buildSupportedViews(path(file.uuid, project.name, 'tabular'));
		},
		getResponseData: async(
			file: File, project: Project, query: Query
		): Promise<object> => {
			const space: string = path(file.uuid, project.name, 'tabular');
			const files: string[] = await readDir(space);
			const select: string | undefined = files.find((name: string): boolean => name[0] === '_');
			if (!select) {
				throw new Error('no default sheet to show :s')
			}
			let rowTo = (query.rowcount)
				? (Number(query.rowstart) || 0) + Number(query.rowcount) -1
				: undefined;
				console.log(rowTo)
			return fs.createReadStream(`${space}/${select}`)
				.pipe(parse({
					columns: true,
					from: query.rowstart,
					to: rowTo
				})).pipe(stringify({
					header: true
				}));
		},
		getResponseFunction: (req: Request, res: Response): Function | null => {
			return (stream: fs.ReadStream) => stream.pipe(res);
		},
		preprocess: async(file: File, original: string, space: string): Promise<void> => {
			const mt: string = file.originalMimetype;
			let validType: boolean = false;

			if (mt.includes("csv")) {
				validType = true;
			} else if(mt.includes("spreadsheet")) {
				validType = true;
			} else if(mt.includes("ods")) {
				validType = true;
			} else if(mt.includes("xls")) {
				validType = true;
			}

			if (validType) {
				await excelToCSV(original, space, mt);
			} else {
				logger.warn(`unsupported file type ${mt}`);
			}
		}
	},
    scalable_image: {
        getContents: async(file: File, project: Project): Promise<object> => {
			return JSON.parse(await readFile(path(file.uuid, project.name, 'scalable_image') + "/supported_views.json", 'utf8')).scalable_image;
        },
        getResponseData: async(
            file: File, project: Project, query: Query, url: string
        ): Promise<object> => {
			let meta: SupportedViews = JSON.parse(await readFile(path(file.uuid, project.name, 'scalable_image') + "/supported_views.json", 'utf8'));
			if (!meta.scalable_image)  {
				throw new RequestError(400, "scalable_image_obj_missing");
			}
			for (let channel of meta.scalable_image.channels) {
				if (channel.channel_name === query.channel_name) {
					query.channel_name = channel.channel_id;
					break;
				}
			}
			let startTime: number = Date.now();

			let cacheHit: string | null = await new Promise<string | null>((res, rej) => {
				cache.get(url, (err:any, cacheFile: string) => {
					if (cacheFile !== null) {
						res(cacheFile);
					}
					res(null);
				})
			});

			if (!cacheHit) {
				try {
					let retMe: CZITileRequest;
					if (file.originalMimetype.includes('tif') || file.originalMimetype.includes('leica')) {
						retMe = await getSCNTile(
							path(file.uuid, project.name, 'scalable_image') + '/',
							query.channel_name,
							query.x_offset,
							query.y_offset,
							query.width,
							query.height,
							query.zoom_level
						);
					} else if (file.originalMimetype.includes('czi') || file.originalMimetype.includes('zeiss')) {
						retMe = await getCZITile(
							path(file.uuid, project.name, 'scalable_image') + '/',
							query.channel_name,
							query.x_offset,
							query.y_offset,
							query.width,
							query.height,
							query.zoom_level
						);
					} else {
						throw new RequestError(400, "bad_tile_mimetype");
					}
					avgReqDuration.update(Date.now() - startTime)
					cache.set(url, retMe.file_path);
					cacheHit = retMe.file_path;
				} catch (Err) {
					throw Err;
				}
			} else {
				logger.debug("CACHE HIT for image tile!");
				cacheHits.inc();
			}
			return await readFile(cacheHit);
        },
        getResponseFunction: (req: Request, res: Response): Function | null => {
			res.setHeader('content-type', "image/png")
            return res.send;
        },
        preprocess: async(file: File, original: string, space: string): Promise<void> => {
			let isCZI: boolean = await new Promise<boolean>((res, rej) => {
				fs.open(original, 'r', function(status, fd) {
				    if (status) {
				        logger.debug(status.message);
				        return;
				    }
				    var buffer = new Buffer(10);
				    fs.read(fd, buffer, 0, 10, 0, async function(err, num) {
				        logger.debug(buffer.toString('utf8', 0, num));
						file.originalMimetype = 'image/czi';
						await file.save();
						res(buffer.toString('utf8', 0, num) === 'ZISRAWFILE');
				    });
				});
			});

			if (isCZI) {
				CZICrunch(original, space);
			} else if (file.originalMimetype.includes('tif')){
				SCNCrunch(original, space);
			} else {
				const mt: string = file.originalMimetype;
				let validType: boolean = false;

				logger.crit("OTHER FILES CURRENTLY NOT IMPLEMENTED")

				// if (mt.includes("tif")) {
				// 	await lecialol(original, space, mt);
				// } else {
				// 	logger.warn(`unsupported file type ${mt}`);
				// }
			}
        }
    }
};

export type FileTypeName = 'generic' | 'directory' | 'tabular' | 'scalable_image';

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
	},
    scalable_image: {
        supportedViews: [
            'raw', 'meta', 'scalable_image'
        ]
    }
};

export const preprocess: (
	file: File, project: Project
) => Promise<void> = async(
	file: File, project: Project
): Promise<void> => {
	const promises: Promise<void>[] = [];
	for (const view of fileTypes[file.type].supportedViews) {
		promises.push(views[view].preprocess(
			file,
			originalPath(file.uuid, project.name),
			path(file.uuid, project.name, view)
		));
	}
	await Promise.all(promises);
	file.status = 'ready';
	await file.save();
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
	[ 'text/csv',        'tabular'   ],
	[ 'application/vnd.ms-excel', 'tabular'],
	[ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'tabular'],
	[ 'application/vnd.oasis.opendocument.text', 'tabular'],
	[ 'application/vnd.oasis.opendocument.spreadsheet', 'tabular'],
	[ 'image/leica', 'scalable_image'],
	[ 'image/zeiss', 'scalable_image'],
	[ 'image/czi', 'scalable_image'],
	[ 'image/tif', 'scalable_image'],
	[ 'image/bigtiff', 'scalable_image'],
	[ 'image/tiff', 'scalable_image']
]);

export const rootPathId: string = '0';
export const rootPathFile: File | null = null;

export const createRootFolder: () => Promise<void> = async(
): Promise<void> => {
	try {
		await fs.mkdir(CONTENT_BASE_DIRECTORY);
	} catch (e) {
		logger.warn(`error when creating base folder: ${e}`);
	}
};

export const createProjectFolder: (name: string) => Promise<void> = async(
	projName: string
): Promise<void> => {
	try {
		await fs.mkdir(CONTENT_BASE_DIRECTORY + '/' + projName);
	} catch (e) {
		logger.warn(`error when creating folder for project ${projName}: ${e}`);
	}
};

export const addSubFileToFolder: (
	parentId: string, subFile: File
) => Promise<void> = async(
	parentId: string, subFile: File
): Promise<void> => {
	logger.debug(`adding file ${subFile.uuid} to directory ${parentId}`);
	// Fetch parent and subFile object from database
	subFile.parentFolderId = parentId;
	await subFile.save();
};

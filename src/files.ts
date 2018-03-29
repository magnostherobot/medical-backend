import * as fs from 'fs';

const CONTENT_BASE_DIRECTORY: string = './files';
const LOG_BASE_DIRECTORY: string = './logs';

const path: (filename: string, projectName: string) => string
	= (filename: string, projectName: string): string => {
	return `${CONTENT_BASE_DIRECTORY}/${projectName}/${filename}`;
};

const writableStream:
	(filename: string, projectName: string) => fs.WriteStream =
	(filename: string, projectName: string): fs.WriteStream => {
	return fs.createWriteStream(path(filename, projectName));
};

const logPath:
(type: string, projectName?: string) => string = (
	type: string, projectName?: string
): string => {
	return projectName
		? `${LOG_BASE_DIRECTORY}/projects/${projectName}/${type}`
		: `${LOG_BASE_DIRECTORY}/general/${type}`;
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

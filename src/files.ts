import * as fs from 'fs';

const CONTENT_BASE_DIRECTORY: string = './files';

const path: (filename: string, projectName: string) => string
	= (filename: string, projectName: string): string => {
	return `${CONTENT_BASE_DIRECTORY}/${projectName}/${filename}`;
};

const writableStream:
	(filename: string, projectName: string) => fs.WriteStream =
	(filename: string, projectName: string): fs.WriteStream => {
	return fs.createWriteStream(path(filename, projectName));
};

export const files: {
	path: (f: string, p: string) => string;
	writableStream: (f: string, p: string) => fs.WriteStream;
} = {
	path,
	writableStream
};

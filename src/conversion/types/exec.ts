import * as shelljs from 'shelljs';
import { execpaths } from '../types/helpers';

export const exec = (cmd: string): Promise<{
	code: number;
	stdout: string;
	stderr: string;
}> => new Promise((res, rej) => {
	shelljs.exec(`${execpaths} ${cmd}`, (code, stdout, stderr) => {
		const ret = { code, stdout, stderr };
		if (code === 0) {
			res(ret);
		} else {
			rej(ret);
		}
	})
});

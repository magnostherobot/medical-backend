import { logger } from '../../logger';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { SupportedViews, writeJSONToFile } from '../types/helpers';
import * as csv from 'csv-parse';
import { extension } from '../../mimetype'

const writeFile = require('util').promisify(fs.writeFile);
const readFile = require('util').promisify(fs.readFile);
const createFolder = require('util').promisify(fs.mkdir);
const readDir = require('util').promisify(fs.readdir);
const rename = require('util').promisify(fs.rename);
const copy = require('util').promisify(fs.copyFile);

const supportedViewsFromMem: (content: string) => Promise<SupportedViews> = (content: string): Promise<SupportedViews> => {
	return new Promise((res, rej) => {
		csv(content, {}, function(err: any, output: any) {
			res({
				tabular: {
					columns: output[0],
					rows: output.length - 1
				}
			});
		});
	});
}

const supportedViewsFromDsk: (path: string) => Promise<SupportedViews> = async(path: string): Promise<SupportedViews> => {
	return supportedViewsFromMem((await readFile(path)).toString());
}

export const toCSV: (file: string, output: string, mimetype: string) => Promise<number> = async (file: string, output: string, mimetype: string): Promise<number> => {
	logger.info(`xls convertor received new file to convert to csv: ${file}`);

	await copy(file, `${file}.${extension(mimetype)}`);
	let book: xlsx.WorkBook = xlsx.readFile(file);
	fs.unlink(`${file}.${extension(mimetype)}`, (err) => {
	  if (err) {
			logger.warn(err.toString());
		}
	});;

	try {
		await createFolder(output);
		let noSheets: number = 0;

		for (let name of book.SheetNames) {
			await writeFile(`${output}/-${name}`, xlsx.utils.sheet_to_csv(book.Sheets[name]));
			noSheets++;
		}

		rename(`${output}/-${book.SheetNames[0]}`, `${output}/_${book.SheetNames[0]}`)

		return noSheets;
	} catch (err) {
		logger.failure(err);
		return 0;
	}
}


const buildSupportedView: (file: string ) => Promise<object> = async (file: string): Promise<object> => {
	let shortFile:string = file.split('/')[file.split('/').length - 1]
	let index: string = shortFile.substring(1, shortFile.length);
	return {
		firstSheet: shortFile.startsWith('_'),
		name: index,
		tabular: (await supportedViewsFromDsk(file)).tabular
	}
}

export const buildSupportedViews: (inputFolder: string ) => Promise<SupportedViews> = async (inputFolder: string): Promise<SupportedViews> => {
		let allSheets: string[] = await readDir(inputFolder);

		let views: any = {}; views.items = [];

		for (let file of allSheets) {
			let view: any = await buildSupportedView(`${inputFolder}/${file}`);
			views.items.push(view.name);
			views[view.name] = view.tabular;
			if (view.firstSheet) {
				views.columns = view.tabular.columns;
				views.rows = view.tabular.rows;
			}
		}
		return views;
}


// const toAll: (file: string) =>
// Promise<{csv: string, json: string, html: string}> =
// async (file: string):
// Promise<{csv: string, json: string, html: string}> => {
// 	return {
// 		csv: await toCSV(file).then(),
// 		html: await toCSV(file).then()
// 	}
// }
//



// const main: () => Promise<void> = async (): Promise<void> => {
// 	console.log(await toCSV('/cs/scratch/cjd24/t.xlsx'));
// }
// // 	try {
// // 		let file: xlsx.WorkBook = xlsx.readFile(`${testDir}${testFile}`);
// //
// // 		for (let name of file.SheetNames) {
// // 			fs.writeFileSync(`${testDir}${testFile.split('.')[0]}-${name}.csv`, xlsx.utils.sheet_to_csv(file.Sheets[name]));
// // 			logger.info(`Wrote ${testFile.split('.')[1]} subsheet {${testFile} : ${name}}  as CSV.`);
// // 			fs.writeFileSync(`${testDir}${testFile.split('.')[0]}-${name}.json`, xlsx.utils.sheet_to_json(file.Sheets[name]));
// // 			logger.info(`Wrote ${testFile.split('.')[1]} subsheet {${testFile} : ${name}}  as json.`);
// // 			fs.writeFileSync(`${testDir}${testFile.split('.')[0]}-${name}.html`, xlsx.utils.sheet_to_html(file.Sheets[name]));
// // 			logger.info(`Wrote ${testFile.split('.')[1]} subsheet {${testFile} : ${name}}  as HTML.`);
// // 		}
// //
// // 		logger.success(`Wrote ${testFile.split('.')[1]} {${testFile}}  as CSV.`);
// // 		logger.success(`Wrote ${testFile.split('.')[1]} {${testFile}}  as JSON.`);
// // 		logger.success(`Wrote ${testFile.split('.')[1]} {${testFile}}  as HTML.`);
// // 	} catch (err) {
// // 		// console.log(err);
// // 		logger.error(err);
// // 	}
// // };
// main().then();

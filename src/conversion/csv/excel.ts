import { logger } from '../../logger';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { SupportedViews, writeJSONToFile } from '../types/helpers';
import * as csv from 'csv-parse';

const writeFile = require('util').promisify(fs.writeFile);
const readFile = require('util').promisify(fs.readFile);


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

const toCSV: (file: string) => Promise<string> = async (file: string): Promise<string> => {
	logger.info(`xls convertor received new file to convert to csv: ${file}`);

	let temp: string[] = file.split('.')[0].split('/');
	let shortFile: string = temp[temp.length - 1];
	let path: string = file.substring(0, file.lastIndexOf('/')) + '/';
	let book: xlsx.WorkBook = xlsx.readFile(file);

	try {
		let views: any = {}; views.items = [];

		for (let name of book.SheetNames) {
			let csvify:string = xlsx.utils.sheet_to_csv(book.Sheets[name]);
			await writeFile(`${path}${shortFile}-${name}.csv`, csvify);
			views.items.push(name);
			views[name] = await supportedViewsFromMem(csvify);
			logger.info(`Wrote subsheet {${shortFile} : ${name}}  as CSV.`);
		}
		writeJSONToFile(`${path}${shortFile}-BASE.supported_views.json`, views[views.items[0]]);
		await writeJSONToFile(`${path}${shortFile}-ALL.supported_views.json`, views);

		return views.items === [] ? "__Empty_Book_Error" : `${path}${shortFile}-ALL.supported_views.json`;
	} catch (err) {
		logger.error(err);
		return "__conversion_to_csv_error_occurred: " + err
	}
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

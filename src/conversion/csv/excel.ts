import { logger } from '../../logger';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { SupportedViews } from '../types/helpers';
import * as csv from 'csv-parser';

// const testDir: string = `/cs/scratch/cjd24/csv/`;
// const testFile: string = `test1.xlsx`

const generateProtoViews: (sheet: xlsx.WorkSheet) => SupportedViews = (sheet: xlsx.WorkSheet): SupportedViews => {
	return {
		tabular: {
			columns: [''],
			rows: sheet['!rows'].length;
		}
	}
}

const toCSV: (file: string) => Promise<string> = async (file: string): Promise<string> => {
	logger.info(`xls convertor received new file to convert to csv: ${file}`);

	let shortFile: string = file.split('.')[0].split('/')[1];
	let path: string = file.split('/')[0] + '/';
	let book: xlsx.WorkBook = xlsx.readFile(file);

	try {
		let views: any = {}; views.items = [];

		for (let name of book.SheetNames) {
			await fs.writeFile(`${path}${shortFile}-${name}.csv`, xlsx.utils.sheet_to_csv(book.Sheets[name]));
			views.items.push(name);
			let parse = csv(`${path}${shortFile}-${name}.csv`);

			views[name] = generateProtoViews(book.Sheets[name]);
			logger.info(`Wrote subsheet {${shortFile} : ${name}}  as CSV.`);
		}
		fs.writeFile(`${path}${shortFile}-BASE.supported_views.json`, views[views.items[0]]);
		await fs.writeFile(`${path}${shortFile}-ALL.supported_views.json`, views);

		return views.items === [] ? "__Empty_Book_Error" : `${path}${shortFile}-ALL.supported_views.json`;
	} catch (err) {
		logger.error(err);
		return "__conversion_to_csv_error_occurred: " + err
	}
}

const toJSON: (file: string) => Promise<string[]> = async (file: string): Promise<string[]> => {
	logger.info(`xls convertor received new file to convert to json: ${file}`);

	let book: xlsx.WorkBook = xlsx.readFile(file);
	try {
		let sheetnames: string[] = [];
		for (let name of book.SheetNames) {
			fs.writeFile(`${file.split('.')[0]}-${name}.json`, xlsx.utils.sheet_to_json(book.Sheets[name]));
			sheetnames.push(`${file.split('.')[0]}-${name}.json`);
			logger.info(`Wrote ${file.split('.')[1]} subsheet {${file} : ${name}}  as JSON.`);
		}
		return sheetnames === [] ? ["__Empty_Book_Error"] : sheetnames;
	} catch (err) {
		logger.error(err);
		return ["__Conversion_to_json_Error_Occurred: " + err]
	}
}

const toHTML: (file: string) => Promise<string[]> = async (file: string): Promise<string[]> => {
	logger.info(`xls convertor received new file to convert to html: ${file}`);

	let book: xlsx.WorkBook = xlsx.readFile(file);
	try {
		let sheetnames: string[] = [];
		for (let name of book.SheetNames) {
			fs.writeFile(`${file.split('.')[0]}-${name}.html`, xlsx.utils.sheet_to_html(book.Sheets[name]));
			sheetnames.push(`${file.split('.')[0]}-${name}.html`);
			logger.info(`Wrote ${file.split('.')[1]} subsheet {${file} : ${name}}  as HTML.`);
		}
		return sheetnames === [] ? ["__Empty_Book_Error"] : sheetnames;
	} catch (err) {
		logger.error(err);
		return ["__Conversion_to_html_Error_Occurred: " + err]
	}
}

const toAll: (file: string) =>
Promise<{csv: string[], json: string[], html: string[]}> =
async (file: string):
Promise<{csv: string[], json: string[], html: string[]}> => {
	return {
		csv: await toCSV(file),
		json: await toCSV(file),
		html: await toCSV(file)
	}
}


// const main: () => void = async (): Promise<void> => {
//
// 	try {
// 		let file: xlsx.WorkBook = xlsx.readFile(`${testDir}${testFile}`);
//
// 		for (let name of file.SheetNames) {
// 			fs.writeFileSync(`${testDir}${testFile.split('.')[0]}-${name}.csv`, xlsx.utils.sheet_to_csv(file.Sheets[name]));
// 			logger.info(`Wrote ${testFile.split('.')[1]} subsheet {${testFile} : ${name}}  as CSV.`);
// 			fs.writeFileSync(`${testDir}${testFile.split('.')[0]}-${name}.json`, xlsx.utils.sheet_to_json(file.Sheets[name]));
// 			logger.info(`Wrote ${testFile.split('.')[1]} subsheet {${testFile} : ${name}}  as json.`);
// 			fs.writeFileSync(`${testDir}${testFile.split('.')[0]}-${name}.html`, xlsx.utils.sheet_to_html(file.Sheets[name]));
// 			logger.info(`Wrote ${testFile.split('.')[1]} subsheet {${testFile} : ${name}}  as HTML.`);
// 		}
//
// 		logger.success(`Wrote ${testFile.split('.')[1]} {${testFile}}  as CSV.`);
// 		logger.success(`Wrote ${testFile.split('.')[1]} {${testFile}}  as JSON.`);
// 		logger.success(`Wrote ${testFile.split('.')[1]} {${testFile}}  as HTML.`);
// 	} catch (err) {
// 		// console.log(err);
// 		logger.error(err);
// 	}
// };
// main();

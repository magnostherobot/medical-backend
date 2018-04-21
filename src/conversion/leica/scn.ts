import * as fs from 'fs';
import * as sharp from 'sharp';
// tslint:disable-next-line:no-duplicate-imports
import { SharpInstance } from 'sharp';
import { SupportedViews, TileBounds, writeJSONToFile, checkForOutputDirectories, execpaths } from '../types/helpers';
import { uuid } from '../../uuid'
import { logger } from '../../logger';

// CHANGE ME FOR TESTING!!!!!
const input: string = "diseessse1.scn"
const baseDirname: string = '/cs/scratch/cjd24/tifers/';



// Various constants for placing files and defining tiles
const extensionBinariesDir: string = __dirname + `/../../../ext/bin/`;

const tileOverlap: number = 0; // Overlap is only half implemented
const tileSize: number = 512;


const crunchLeica: () => Promise<string> = async (): Promise<string> => {

	try {
		let output: string =`${baseDirname}${uuid.generate()}/`;
		let leica: SharpInstance = sharp(baseDirname + input).png();
		logger.debug("Read new sharp instance for lecia: " + input);

		checkForOutputDirectories([output]);
		logger.info("Creating new output directory for LECIA > DZI @ " + output);

		let meta: sharp.Metadata = await leica.metadata();

		let width: number = -1;
		let height: number = -1;
		if (meta.width !== undefined) {
			width = meta.width;
		}
		if (meta.height !== undefined) {
			height = meta.height;
		}

		let supportedViews: SupportedViews = {
			scalable_image: {
				width: width,
				height: height,
				channels:
					[{
						channel_id: '-1',
						channel_name: '-1',
						metadata: {}
					}],
				metadata: {
					tile_size: tileSize,
					max_zoom: "Not yet supported in this version of convertor",
					tile_overlap: tileOverlap,
					exif: meta.exif
				}
			}
		}

		let channels: any = [];
		if (meta.channels !== undefined) {
			for (let index: number = 0; index < meta.channels; index++) {
				channels.push({
					channel_id: `${index}`,
					channel_name: `${meta.space}`,
					metadata: {}
				})
			}
			supportedViews.scalable_image.channels = channels;
		}

		writeJSONToFile(`${output}supported_views.json`, supportedViews)
		logger.info("Wrote supported_views object for: " + output);

		await sharp(baseDirname + input)
			.png()
			.tile({
				size: tileSize,
				overlap: tileOverlap,
				layout: "dz"
			})
			.toFile(`${output}output`);
		logger.success(`Finalised output of ${input} as .dzi`);
		return `${output}output.dzi`;
	}
	catch (err) {
		logger.failure(`Lecia conversion failed with error: ${err}`)
		return `Lecia conversion failed with error: ${err}`;
	}
};


crunchLeica().then((ret:string) => console.log(ret));

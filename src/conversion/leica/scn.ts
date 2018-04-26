import * as fs from 'fs';
import * as sharp from 'sharp';
// tslint:disable-next-line:no-duplicate-imports
import { SharpInstance } from 'sharp';
import { SupportedViews, TileBounds, writeJSONToFile, checkForOutputDirectories, execpaths } from '../types/helpers';
import { uuid } from '../../uuid'
import { logger, Logger } from '../../logger';
let log: Logger;

const tileOverlap: number = 0; // Overlap is only half implemented
const tileSize: number = 512;

export const crunchLeica: (original: string, space:string) => Promise<void> = async (original: string, space:string): Promise<void> => {
	log = logger.for({component: "SCN Crunch", targetFile: original});
	try {
		let leica: SharpInstance = sharp(original).png();

		checkForOutputDirectories([space, space + "/tmp/"]);
		log.info("Creating new output directory for LECIA > DZI @ " + space);

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
			if (!supportedViews.scalable_image) {
				log.error(`Target File is not a scalable_image`)
				throw new Error("Not a scalable image");
			}
			supportedViews.scalable_image.channels = channels;
		}

		writeJSONToFile(`${space}/supported_views.json`, supportedViews)
		log.info("Wrote supported_views object in: " + space);

		await leica
			.tile({
				size: tileSize,
				overlap: tileOverlap,
				layout: "dz"
			})
			.toFile(`${space}/output`);
		log.success(`Finalised output of ${original} as .dzi`);
	}
	catch (err) {
		log.failure(`Lecia conversion failed with error: ${err}`)
	}
};


// crunchLeica().then((ret:string) => console.log(ret));

import { CZITileRequest } from '../types/customPyramidIndex';
import { TileBounds } from '../types/helpers';
import * as sharp from 'sharp';
import { SharpInstance } from 'sharp';
import { uuid } from '../../uuid'
import { logger, Logger } from '../../logger'
import { queue as jobQueue, Promiser as Job } from '../../ppq'
import * as fs from 'fs';
const readFile = require('util').promisify(fs.readFile);
let log: Logger;

export const getTile: Function = async function(imageDir: string, cVal: string, x:number = 0, y:number = 0, w:number = 1024, h:number = 1024, zoom: number = 1): Promise<CZITileRequest> {
	log = logger.for({component: "SCN Live Server", req: {imageDir: imageDir, cVal: cVal, x:x = 0, y:y = 0, w:w, h:h, zoom: zoom}});

	let orig: SharpInstance = await sharp(imageDir + "../ORIGINAL");

	let id: string = uuid.generate();
	let outputFileName: string = `${imageDir}tmp/${id}-out.png`

	let desiredRegion: TileBounds = new TileBounds(Number(x), Number(x) + Number(w), Number(y), Number(y) + Number(h))

	orig
	.extract({
		top: desiredRegion.top,
		left: desiredRegion.left,
		width: desiredRegion.width(),
		height: desiredRegion.height()
	});

	let extractionRegion: TileBounds = desiredRegion;
	extractionRegion.scaleDown(Math.log2(zoom) + 1);

	orig
	.resize(extractionRegion.width(), extractionRegion.height())

	await jobQueue.enqueue(2, orig.toFile as Job<sharp.OutputInfo>, orig, outputFileName);

	log.info(`Gen new Tile: ${outputFileName}  X:${desiredRegion.left} Y:${desiredRegion.top} W:${desiredRegion.width()} H:${desiredRegion.height()} Z:*Ignored*`);
	return {
		dimensions: new TileBounds(
							0, extractionRegion.width(),
							0, extractionRegion.height()
						),
		original_bounds: desiredRegion,
		zoom_level: Math.log2(zoom),
		c_value: "*Ignored*",
		file_path: outputFileName
	};
}

//
// const main: Function = async function(imageDir: string, cVal: string, x:number = 0, y:number = 0, w:number = 1024, h:number = 1024, zoom: number = 1): Promise<void> {
// 	console.log(await getTile("/cs/scratch/cjd24/tifers/c206879a-5602-4d69-b2e9-b5b2adc43c7e/", 3, 0, 0, 1000, 2000, 512));
// }
// main();

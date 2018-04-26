import { WholeCZIHierarchy, CZIHeightMap, CZITile, CZITileRequest } from '../types/customPyramidIndex';
import { TileBounds, execpaths } from '../types/helpers';
import * as sharp from 'sharp';
import { SharpInstance } from 'sharp';
import { isTileRelated } from './tileExtraction';
import { uuid } from '../../uuid'
import * as fs from 'fs';
import { RequestError } from '../../errors'
import { logger, Logger } from '../../logger'
import { exec } from '../types/exec'
import { queue as jobQueue, Promiser as Job } from '../../ppq'
const shell = require('shelljs');
const readFile = require('util').promisify(fs.readFile);
const log: Logger = logger.for({component: "CZI Live Server"});

const findRelatedTiles: Function = function(plane: CZIHeightMap, desired: TileBounds): CZITile[][] {

	const relatedTiles: CZITile[][] = [];
	for (const planeTileRow of plane.plane) {
		let tileRow: CZITile[] = [];
		let foundTiles: boolean = false;

		for (const tile of planeTileRow) {

			if (isTileRelated(
                new TileBounds(
                    tile.x_offset,
                    tile.x_offset + tile.width,
                    tile.y_offset,
                    tile.y_offset + tile.height
                ), desired)
            ) {
				tileRow.push(tile);
				foundTiles = true;
			}
		}
		if (foundTiles) {
			relatedTiles.push(tileRow);
		}
	}
	return relatedTiles;
};

export const getTile: Function = async function(imageDir: string, cVal: string, x:number = 0, y:number = 0, w:number = 1024, h:number = 1024, zoom: number = 1): Promise<CZITileRequest> {
	let layout: WholeCZIHierarchy = JSON.parse(await jobQueue.enqueue(2, readFile, null, imageDir + "/layout.json", 'utf8'));
	if (!layout.complete) {
		throw new RequestError(400, "conversion_incomplete")
	}


	let bound: TileBounds = new TileBounds(Number(x), Number(x) + Number(w), Number(y), Number(y) + Number(h));
	let map: CZIHeightMap;
	try {
		let reqZoom: number = Math.floor(Math.log2(zoom));
		if (reqZoom > layout.zoom_level_count - 1) {
			reqZoom = layout.zoom_level_count - 1;
		}
		map = layout.c_values[Number(cVal)].height_map[reqZoom];
	} catch (err) {
		logger.error(err);
		throw new RequestError(500, "missing_layout_item")
	}
	if (!map) {
		throw new RequestError(400, "bad_zoom_index")
	}
	let reqRes: CZITileRequest = await getFinalTile(imageDir, map, cVal, bound);
	return reqRes;
}

const getFinalTile: Function = async function(imageDir: string, imageTier: CZIHeightMap, cVal: string, desiredRegion: TileBounds): Promise<CZITileRequest> {

	let involvedTiles: string = '';
	for (const row of imageTier.plane) {
		for (const tile of row) {
			involvedTiles += `${imageDir}/data/${tile.file} `
		}
	}

	let id: string = uuid.generate();
	let intermediateFileName: string = `${imageDir}tmp/${id}.png`
	let outputFileName: string = `${imageDir}tmp/${id}-out.png`
	try {
		await new Promise((res) => {
			shell.exec(`${execpaths} vips arrayjoin "${involvedTiles}" ${intermediateFileName} --across ${imageTier.plane[0].length} --vips-concurrency=2`);
			res();
		});
	} catch (err) {
		if (err) {
			log.fatal(err);
		}
	}


	desiredRegion.scaleDown(imageTier.zoom_level);

	let final: SharpInstance = sharp(intermediateFileName)
		.extract({
			top: desiredRegion.top,
			left: desiredRegion.left,
			width: desiredRegion.width(),
			height: desiredRegion.height()
		});
	await jobQueue.enqueue(2, final.toFile as Job<sharp.OutputInfo>, final, outputFileName);

	fs.unlink(intermediateFileName, (err:any) => {
		if (err) {
			logger.warn("Couldn't delete: " + intermediateFileName);
		}
	})

	log.info(`Gen new Tile: ${outputFileName}  X:${desiredRegion.left} Y:${desiredRegion.top} W:${desiredRegion.width()} H:${desiredRegion.height()} Z:${cVal}`);
	return {
		dimensions: new TileBounds(
							0, desiredRegion.width(),
							0, desiredRegion.height()
						),
		original_bounds: desiredRegion,
		zoom_level: imageTier.zoom_level,
		c_value: cVal,
		file_path: outputFileName
	};
}

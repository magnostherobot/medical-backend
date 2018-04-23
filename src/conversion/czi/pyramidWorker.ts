import { WholeCZIHierarchy, CZIHeightMap, CZITile, CZITileRequest } from '../types/customPyramidIndex';
import { TileBounds, execpaths } from '../types/helpers';
import * as sharp from 'sharp';
import { isTileRelated } from './tileExtraction';
import { uuid } from '../../uuid'
import * as fs from 'fs';
import { RequestError } from '../../errors'
const readFile = require('util').promisify(fs.readFile);

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

export const getTile: Function = async function(imageDir: string, cVal: string, x:number = 0, y:number = 0, w:number = 1024, h:number = 1024, zoom: number = 1): Promise<Buffer> {
	let layout: WholeCZIHierarchy = JSON.parse(await readFile(imageDir + "/layout.json", 'utf8'));

	let bound: TileBounds = new TileBounds(x, x + w, y, y + h);
	let map: CZIHeightMap;
	try {
		map = layout.c_values[Number(cVal)].height_map[Math.floor(Math.log2(zoom))]
	} catch {
		throw new RequestError(400, "bad_zoom_index")
	}

	return readFile((await getFinalTile(imageDir, map, cVal, bound)).file_path);
}

const getFinalTile: Function = async function(imageDir: string, imageTier: CZIHeightMap, cVal: string, desiredRegion: TileBounds): Promise<CZITileRequest> {

	console.error("Has the calling function checked that the image has completed processing in WholeCZIHierarchy??");

	let involvedTiles: string = '';
	for (const row of imageTier.plane) {
		for (const tile of row) {
			involvedTiles += `${imageDir}/data/${tile.file} `
		}
	}

	let outputFileName: string =`${imageDir}/tmp/${uuid.generate()}.png`
	require('shelljs').exec(`${execpaths} vips arrayjoin "${involvedTiles}" ${outputFileName} --across ${imageTier.plane[0].length}`)

	let extractionRegion = new TileBounds(
		desiredRegion.left - imageTier.plane[0][0].width,
		desiredRegion.right - imageTier.plane[0][0].width,
		desiredRegion.top - imageTier.plane[0][0].height,
		desiredRegion.bottom - imageTier.plane[0][0].height
	);
	extractionRegion.scaleDown(imageTier.zoom_level);

	await sharp(outputFileName)
		.extract({
			top: extractionRegion.top,
			left: extractionRegion.left,
			width: extractionRegion.width(),
			height: extractionRegion.height()
		})
		.toFile(outputFileName);

	return {
		dimensions: new TileBounds(
							0, extractionRegion.width(),
							0, extractionRegion.height()
						),
		original_bounds: desiredRegion,
		zoom_level: imageTier.zoom_level,
		c_value: cVal,
		file_path: outputFileName
	};
}

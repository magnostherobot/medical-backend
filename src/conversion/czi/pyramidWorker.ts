import { CZITile, CZIHeightMap, WholeCZIHierarchy } from '../types/customPyramidIndex';
import { TileBounds } from '../types/helperCZITypes';
import * as sharp from 'sharp';
import { SharpInstance } from 'sharp';
import * as fs from 'fs';
import { isTileRelated, regionToExtract } from './tileExtraction';

const processedDirname: string = '/cs/scratch/cjd24/0701-extraction-processed/';
const processedImages: string = `${processedDirname}data/`;
const layout: WholeCZIHierarchy = require(`${processedDirname}layout.json`);
const TEMP_OUTPUT_THING: string = `${processedDirname}finalisedTiles/`;
const TEMP_REQUESTED_BOUNDS: TileBounds[] =
[
	new TileBounds(0, 5000, 2000, 7000),
	new TileBounds(1000, 6000, 3000, 8000)
]
const TEMP_C_VALUE: number = 0, ZOOM_LEVEL: number = 2, TILE_SIZE: number = 1024, TILE_OVERLAP: number = 0;


const findRelatedTiles:Function = function(plane: CZIHeightMap, desired: TileBounds): CZITile[][] {

	let relatedTiles: CZITile[][] = [];
	for (const planeTileRow of plane.plane) {
		let tileRow: CZITile[] = [], foundTiles: boolean = false;
		for (const tile of planeTileRow) {

			if (isTileRelated(new TileBounds(tile.x_offset, tile.x_offset + tile.width, tile.y_offset, tile.y_offset + tile.height), desired)) {
				tileRow.push(tile);
				foundTiles = true;
			}
		}
		if (foundTiles) {
			relatedTiles.push(tileRow);
		}
	}
	return relatedTiles;
}

const extractAndStitch: Function = async function(segments: CZITile[][], desiredRegion: TileBounds): Promise<SharpInstance> {

	// //create a buffer for the rows part of raw image data
	// let tileVerticalBuffer: Buffer[] = [];
    //
	// //for all ros (y coords) in the image
	// for (const segRow of segments) {
	// 	//create a buffer for this row
	// 	let tileRow: Buffer[] = [];
	// 	let chunkToExtract: TileBounds = new TileBounds(-1, -1, -1, -1);
    //
	// 	//For all of the columns within this row
	// 	for (const segCol of segRow) {
	// 		//find out the region of the base tile to be added to the new image
	// 		chunkToExtract = findRegionToExtract(segCol, desiredRegion);
	// 		//extract this section of image data into a sharp buffer
	// 		let data: Promise<Buffer> =
	// 			sharp(`${extractionDirectory}${segCol.Data.Data}`)
	// 			.extract({
	// 				left: chunkToExtract.left,
	// 				top: chunkToExtract.top,
	// 				width: chunkToExtract.right - chunkToExtract.left,
	// 				height: chunkToExtract.bottom - chunkToExtract.top
	// 			})
	// 			.toBuffer();
    //
	// 		//push this data into the row buffer
	// 		tileRow.push(await data);
	// 	}
    //
	// 	//prepare variables to squash all of the column data into one, for this row
	// 	let imageVerticalSlice: SharpInstance = sharp(tileRow[0]);
	// 	let bufferBound = findRegionToExtract(segRow[0], desiredRegion);
	// 	//check if the inital chunk needs to be extended to support the other columns
	// 	if ((bufferBound.right - bufferBound.left) < (tileSize - tileOverlap)) {
	// 		imageVerticalSlice = await imageVerticalSlice.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
	// 			{top:0, left:0, bottom:0, right: (tileSize - (bufferBound.right - bufferBound.left))});
	// 	}
	// 	//for every column along this row, join it to the previous column data
	// 	for (let index = 1; index < segRow.length; index++) {
	// 		imageVerticalSlice = await imageVerticalSlice
	// 			.overlayWith(tileRow[index],
	// 				{top: 0, left: (bufferBound.right - bufferBound.left) + ((index -1) * tileSize)});
	// 	}
    //
	// 	//add this horizontal data buffer to the vertical buffer
	// 	tileVerticalBuffer.push(await imageVerticalSlice.toBuffer());
	// }
    //
	// //prepare variables used to combine all rows into one image
	// let finalImage: SharpInstance = sharp(tileVerticalBuffer[0]);
	// let bufferBound = findRegionToExtract(segments[0][0], desiredRegion);
	// //Check if the inital row needs to be extended to support further rows
	// if ((bufferBound.bottom - bufferBound.top) < (tileSize - tileOverlap)) {
	// 	finalImage = await finalImage.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
	// 		{top:0, left:0, bottom: (tileSize - (bufferBound.bottom - bufferBound.top)), right: 0});
	// }
	// //For all further rows in the image, combine it with the previous rows' data
	// for (let index = 1; index < segments.length; index++) {
	// 	finalImage = finalImage.overlayWith(
	// 		tileVerticalBuffer[index],
	// 		{top: getDimension(segments[index -1][0], 'Y').Size, left: 0});
	// }
    //
//	// return the finalised image.
	// return finalImage;
	return;
};





































const main: Function = function() {
	if (!layout.complete) {
		console.error(`The files under: ${processedDirname} have not been finalised yet, please try again later`);
		return;
	}

	if (!fs.existsSync(`${TEMP_OUTPUT_THING}`)) {
		fs.mkdirSync(`${TEMP_OUTPUT_THING}`);
	}

	let requestCount: number = 0;
	for (const bound of TEMP_REQUESTED_BOUNDS) {
		extractAndStitch(
			findRelatedTiles(layout.c_values[TEMP_C_VALUE].height_map[ZOOM_LEVEL], bound), bound
		).then((x: SharpInstance) => x.toFile(`${TEMP_OUTPUT_THING}request-${requestCount++}`));
	}
}
main();

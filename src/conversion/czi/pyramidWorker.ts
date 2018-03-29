import { CZIHeightMap, CZITile, WholeCZIHierarchy } from '../types/customPyramidIndex';
import * as fs from 'fs';
import { TileBounds } from '../types/helperCZITypes';
import * as sharp from 'sharp';
import { SharpInstance } from 'sharp';
import { isTileRelated, regionToExtract } from './tileExtraction';

const processedDirname: string = '/cs/scratch/cjd24/0701-extraction-processed/';
const processedImages: string = `${processedDirname}data/`;
const layout: WholeCZIHierarchy = require(`${processedDirname}layout.json`);
const TEMP_OUTPUT_THING: string = `${processedDirname}finalisedTiles/`;
const TEMP_REQUESTED_BOUNDS: TileBounds[] =
[
	new TileBounds(16386, 38000, 15000, 40000),
	new TileBounds(6000, 15000, 9000, 18000)
];
const TEMP_C_VALUE: number = 1, ZOOM_LEVEL: number = 8, TILE_SIZE: number = 1024, TILE_OVERLAP: number = 0;

const findRelatedTiles: Function = function(plane: CZIHeightMap, desired: TileBounds): CZITile[][] {

	const relatedTiles: CZITile[][] = [];
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
};
const help: number = 0;
const extractAndStitch: Function = async function(tiles: CZITile[][], desiredRegion: TileBounds, zoom: number): Promise<SharpInstance> {

	//create a buffer for the rows part of raw image data
	let tileHorizontalBuffer: Buffer[] = [], bufferBound: TileBounds, rowPixelWidth: number = 0, columnPixelHeight: number = 0;

	//for all rows (y coords) in the image
	for (const row of tiles) {
		//create a buffer for this row
		const tileRow: Buffer[] = [];
		let chunkToExtract: TileBounds = new TileBounds(-1, -1, -1, -1);
		rowPixelWidth = 0;

		//For all of the columns within this row
		for (const tile of row) {
			//find out the region of the base tile to be added to the new image
			chunkToExtract = regionToExtract(new TileBounds(tile.x_offset, tile.x_offset + tile.width, tile.y_offset, tile.y_offset + tile.height), desiredRegion, zoom);
			rowPixelWidth += (chunkToExtract.right - chunkToExtract.left);

			//extract this section of image data into a sharp buffer
			const data: Promise<Buffer> =
				sharp(`${processedImages}${tile.file}`)
				.extract({
					left: chunkToExtract.left,
					top: chunkToExtract.top,
					width: chunkToExtract.right - chunkToExtract.left,
					height: chunkToExtract.bottom - chunkToExtract.top
				})
				.toBuffer();

			//push this data into the row buffer
			tileRow.push(await data);
		}

		//prepare variables to squash all of the column data into one, for this row
		let imageVerticalSlice: SharpInstance = sharp(tileRow[0]);
		bufferBound = regionToExtract(new TileBounds(
			row[0].x_offset,
			row[0].x_offset + row[0].width,
			row[0].y_offset,
			row[0].y_offset + row[0].height
		),                            desiredRegion, zoom);
		//check if the inital chunk needs to be extended to support the other columns
		if (row.length > 1) {
			imageVerticalSlice = await imageVerticalSlice.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
				{top: 0, left: 0, bottom: 0, right: rowPixelWidth - (bufferBound.right - bufferBound.left)});
		}
		for (let index = 1; index < row.length; index++) {
			imageVerticalSlice = sharp(await imageVerticalSlice
				.overlayWith(tileRow[index],
					            {top: 0, left: ((bufferBound.right - bufferBound.left) + ((index - 1) * TILE_SIZE))}).toBuffer());
		}

		//add this horizontal data buffer to the vertical buffer
		tileHorizontalBuffer.push(await imageVerticalSlice.toBuffer());
		columnPixelHeight += bufferBound.bottom - bufferBound.top;
	}

	// prepare variables used to combine all rows into one image
	let finalImage: SharpInstance = sharp(tileHorizontalBuffer[0]);
	bufferBound = regionToExtract(new TileBounds(
		tiles[0][0].x_offset,
		tiles[0][0].x_offset + tiles[0][0].width,
		tiles[0][0].y_offset,
		tiles[0][0].y_offset + tiles[0][0].height
	),                            desiredRegion, zoom);
	//Check if the inital row needs to be extended to support further rows
	if (tiles.length > 1) {
		finalImage = await finalImage.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
			{top: 0, left: 0, bottom: (columnPixelHeight - (bufferBound.bottom - bufferBound.top)), right: 0});
	}
	//For all further rows in the image, combine it with the previous rows' data
	for (let index = 1; index < tiles.length; index++) {
		finalImage = sharp(await finalImage.overlayWith(
			tileHorizontalBuffer[index],
			{top: ((bufferBound.bottom - bufferBound.top) + ((index - 1) * TILE_SIZE)), left: 0}).toBuffer());
	}

	// return the finalised image.
	console.log(`Width: ${rowPixelWidth}    Height: ${columnPixelHeight}`);
	return finalImage;
	// 	.resize(
	// 		rowPixelWidth,
	// 		columnPixelHeight
	// 	)
	// 	.crop(sharp.gravity.northwest);
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
			findRelatedTiles(layout.c_values[TEMP_C_VALUE].height_map[Math.log2(ZOOM_LEVEL)], bound), bound, ZOOM_LEVEL
		).then((x: SharpInstance) => x.toFile(`${TEMP_OUTPUT_THING}request-${requestCount++}`));
	}
};
main();

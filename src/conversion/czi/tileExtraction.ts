import { CZITile } from '../types/customPyramidIndex';
import { TileBounds } from '../types/helperCZITypes';
import { SharpInstance } from 'sharp';
import * as sharp from 'sharp';

export const isTileRelated:Function = function(origCoords: TileBounds, desired: TileBounds): boolean {

	if (((desired.left >= origCoords.left) &&
		(desired.left < origCoords.right)) ||

		// Desired X on right is within the current tile
		((desired.right > origCoords.left) &&
		(desired.right <= origCoords.right)) ||

		// Desired tile X overlaps base tile
		((desired.left < origCoords.left) &&
		(desired.right > origCoords.right)))
		{

			// Desired Y on top is within current tile
			if (((desired.top >= origCoords.top) &&
				(desired.top < origCoords.bottom)) ||

				// Desired Y on right is within the current tile
				((desired.bottom > origCoords.top) &&
				(desired.bottom <= origCoords.bottom)) ||

				// Desired tile Y overlaps whole base tile
				((desired.top < origCoords.top) &&
				(desired.bottom > origCoords.bottom)))
				{

					//If all of the if statements have passed, then this tile
					//is part of the overlap for the new tile to be created.
					return true;
				}
		}
	return false;
}


/*
 * Takes a base tile, and the whole bounds of a new tile, and uses this
 * to calculate the region within the base tile that is overlapping the new tile
 * to be extracted.
 */
export const regionToExtract: Function = function(baseBounds: TileBounds, desired: TileBounds): TileBounds {

	//get the base tile area and create an object for the chunk to extract
	let chunkToExtract: TileBounds = new TileBounds(-1, -1, -1, -1);

	// check if the new tile overlaps the leftmost boundary
	if (desired.left <= baseBounds.left) {
		chunkToExtract.left = 0;
	} else {
		chunkToExtract.left = desired.left - baseBounds.left;
	}

	// check if the new tile overlaps the rightmost boundary
	if (desired.right >= baseBounds.right) {
		chunkToExtract.right = baseBounds.right - baseBounds.left;
	} else {
		chunkToExtract.right = desired.right - baseBounds.left;
	}

	// check if the new tile overlaps the top boundary
	if (desired.top <= baseBounds.top) {
		chunkToExtract.top = 0;
	} else {
		chunkToExtract.top = desired.top - baseBounds.top;
	}

	// check if the new tile overlaps the bottom boundary
	if (desired.bottom >= baseBounds.bottom) {
		chunkToExtract.bottom = baseBounds.bottom - baseBounds.top;
	} else {
		chunkToExtract.bottom = desired.bottom - baseBounds.top;
	}

	if (chunkToExtract.left < 0 || chunkToExtract.right < 0 || chunkToExtract.top < 0 || chunkToExtract.bottom < 0) {
		throw new Error("Chunk to extract from base tile has invalid bound (< 0).");
	}

	//return the slice within the base tile for extraction
	return chunkToExtract;
};


// export const createHorizontalImageSlice: Function = async function (bufferBound: TileBounds, tileSize: number, tileOverlap: number, rowLength:number, row: Buffer[]): Promise<Buffer> {
// 	//prepare variables to squash all of the column data into one, for this row
// 	let imageVerticalSlice: SharpInstance = sharp(row[0]);
// 	//check if the inital chunk needs to be extended to support the other columns
// 	if ((bufferBound.right - bufferBound.left) < (tileSize - tileOverlap)) {
// 		imageVerticalSlice = await imageVerticalSlice.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
// 			{top:0, left:0, bottom:0, right: (tileSize - (bufferBound.right - bufferBound.left))});
// 	}
// 	//for every column along this row, join it to the previous column data
// 	for (let index = 1; index < rowLength; index++) {
// 		imageVerticalSlice = await imageVerticalSlice
// 			.overlayWith(row[index],
// 				{top: 0, left: (bufferBound.right - bufferBound.left) + ((index -1) * tileSize)});
// 	}
// 	return imageVerticalSlice.toBuffer();
// }
//
//
// export const createImageFromHorizontalSlices: Function = async function(bufferBound: TileBounds, horizontalSlices: Buffer[], tileSize: number, tileOverlap: number, rowCount: number, tiles: CZITile[][]): Promise<SharpInstance> {
// 	//prepare variables used to combine all rows into one image
// 	let finalImage: SharpInstance = sharp(horizontalSlices[0]);
//
// 	//Check if the inital row needs to be extended to support further rows
// 	if ((bufferBound.bottom - bufferBound.top) < (tileSize - tileOverlap)) {
// 		finalImage = await finalImage.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
// 			{top:0, left:0, bottom: (tileSize - (bufferBound.bottom - bufferBound.top)), right: 0});
// 	}
// 	//For all further rows in the image, combine it with the previous rows' data
// 	for (let index = 1; index < rowCount; index++) {
// 		finalImage = finalImage.overlayWith(
// 			horizontalSlices[index],
// 			{top: tiles[index - 1][0].height, left: 0});
// 	}
//
// 	return finalImage;
// }

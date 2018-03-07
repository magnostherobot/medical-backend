
import * as fs from 'fs';
import { logger } from '../../logger';
import * as sharp from 'sharp';
import * as parsexml from 'xml-parser';
import { SharpInstance } from 'sharp';

const extractionDirectory: string = '/cs/scratch/cjd24/0701-extraction/';
const outputImageDirectory: string = '/cs/scratch/cjd24/0701-extraction-processed2/'
const tileOverlap: number = 0;
const tileSize: number = 1024;
const maxZoom: number = 64;

interface Dimension {
	Dimension: string;
	Start: number;
	Size: number;
}
interface DirectoryEntry {
	DimensionCount: number;
	DimensionEntries: Dimension[];
}
interface SubBlock {
	DirectoryEntry: DirectoryEntry;
	Data: string;
}
interface Segment {
	Id: string;
	UsedSize: number;
	Data: SubBlock;
}
class TileBounds {
	public left!: number;
	public right!: number;
	public top!: number;
	public bottom!: number;
	public constructor(leftBound: number, rightBound: number, topBound: number, bottomBound: number) {
		this.left = leftBound;
		this.right = rightBound;
		this.top = topBound;
		this.bottom = bottomBound;
	}
}
interface SupportedViews {
	scalable_image: {
		width: number;
		height: number;
		channels: [
			{
				channel_id: string;
				channel_name: string;
				metadata?: {};
			}
		];
		real_width?: {
			value: number;
			units: string;
		};
		real_height?: {
			value: number;
			units: string;
		};
		metadata?: {};
	}
}
interface CZITile {
	x_offset: number;
	y_offset: number;
	width: number;
	height: number;
	file: string;
}
interface CZIHeightMap {
	zoom_level: number,
	plane: CZITile[][];
}
interface WholeCZIHierarchy {
	c_values: [{
		channel_id: string,
		height_map: CZIHeightMap[];
	}];
}

const getOriginalTileBounds: Function = function(originalTile: Segment): (TileBounds | null) {
	const bounds: TileBounds = new TileBounds(-1, -1, -1, -1);

	for (const dimension of originalTile.Data.DirectoryEntry.DimensionEntries) {
		switch (dimension.Dimension) {
			case 'X':
				bounds.left = dimension.Start;
				bounds.right = bounds.left + dimension.Size;
				continue;
			case 'Y':
				bounds.top = dimension.Start;
				bounds.bottom = bounds.top + dimension.Size;
				continue;
			default:
				continue;
		}
	}

	if (bounds.left < 0 || bounds.right < 0 || bounds.top < 0 || bounds.bottom < 0) {
		return null;
	}

	return bounds;
};

const findRelatedTiles: Function = function(activeSegments: Segment[], desired: TileBounds): Segment[] {
	const relatedTiles: Segment[] = [];

	for (const baseTile of activeSegments) {

		let origCoords: TileBounds | null;

		if ((origCoords = getOriginalTileBounds(baseTile)) === null) {
			throw new Error('There was a Sad Boi error');
		}

		// Desired X on left is within current tile
		if (((desired.left >= origCoords.left) &&
			(desired.left < origCoords.right)) ||

			// Desired X on right is within the current tile
			((desired.right > origCoords.left) &&
			(desired.right <= origCoords.right)) ||

			// Desired tile X overlaps base tile
			((desired.left < origCoords.left) &&
			(desired.right > origCoords.right))) {

			// Desired Y on top is within current tile
			if (((desired.top >= origCoords.top) &&
				(desired.top < origCoords.bottom)) ||

				// Desired Y on right is within the current tile
				((desired.bottom > origCoords.top) &&
				(desired.bottom <= origCoords.bottom)) ||

				// Desired tile Y overlaps whole base tile
				((desired.top < origCoords.top) &&
				(desired.bottom > origCoords.bottom))) {

				relatedTiles.push(baseTile);
			}
		}
	}

	return relatedTiles;
};

const getDimension: Function = function(segment: Segment, name: string): Dimension {
	for (const dimension of segment.Data.DirectoryEntry.DimensionEntries) {
		if (dimension.Dimension === name) {
			return dimension;
		}
	}
	throw new Error('Dimension: ' + name + " doesn't exist for segment: " + segment);
};

const orderSegments: Function = function(segments: Segment[]): Segment[][] {

	const output: Segment[][] = [];

	if (segments.length > 1) {
		let xCoords: number[] = [];
		let yCoords: number[] = [];

		// Get all x/y's;
		const initC: number = getDimension(segments[0], 'C').Start;
		for (const seg of segments) {
			if (getDimension(seg, 'C').Start !== initC) {
				throw new Error('Segment array contains multiple values of C - this overlay is currently unsupported within this method');
			}
			xCoords.push(getDimension(seg, 'X').Start);
			yCoords.push(getDimension(seg, 'Y').Start);
		}
		// Filter to get Uniaue Values
		xCoords = xCoords.filter(
			(item: number, index: number, array: number[]) => array.indexOf(item) === index);
		yCoords = yCoords.filter(
			(item: number, index: number, array: number[]) => array.indexOf(item) === index);

		// Use the filtered list to order the segments into rows
		for (const yVal of yCoords) {

			// Get all segments with the same y value
			const row: Segment[] = [];
			for (const seg of segments) {
				if (getDimension(seg, 'Y').Start === yVal) {
					row.push(seg);
				}
			}

			// Sort the row of y values by x value
			const sortedRow: Segment[] = [];
			for (const xVal of xCoords) {
				for (const seg of row) {
					if (getDimension(seg, 'X').Start === xVal) {
						sortedRow.push(seg);
						break;
					}
				}
			}

			// Push this to the finalised grid
			output.push(sortedRow);
		}

		// Return the result
		return output;
	} else {
		output.push(segments);
		return output;
	}
};

const findRegionToExtract: Function = function(segment: Segment, desired: TileBounds): TileBounds {
	const baseBounds: TileBounds = getOriginalTileBounds(segment);
	let chunkToExtract: TileBounds = new TileBounds(-1, -1, -1, -1);

	if (desired.left <= baseBounds.left) {
		chunkToExtract.left = 0;
	} else {
		chunkToExtract.left = desired.left - baseBounds.left;
	}

	if (desired.right >= baseBounds.right) {
		chunkToExtract.right = baseBounds.right - baseBounds.left;
	} else {
		chunkToExtract.right = desired.right - baseBounds.left;
	}

	if (desired.top <= baseBounds.top) {
		chunkToExtract.top = 0;
	} else {
		chunkToExtract.top = desired.top - baseBounds.top;
	}

	if (desired.bottom >= baseBounds.bottom) {
		chunkToExtract.bottom = baseBounds.bottom - baseBounds.top;
	} else {
		chunkToExtract.bottom = desired.bottom - baseBounds.top;
	}

	return chunkToExtract;
};

const extractAndStitchChunks: Function = async function(segments: Segment[][], desiredRegion: TileBounds): Promise<SharpInstance> {

	let tileVerticalBuffer: Buffer[] = [];

	for (const segRow of segments) {
		let tileRow: Buffer[] = [];
		let chunkToExtract: TileBounds = new TileBounds(-1, -1, -1, -1);
		for (const segCol of segRow) {
			chunkToExtract = findRegionToExtract(segCol, desiredRegion);
			let data: Promise<Buffer> =
				sharp(`${extractionDirectory}${segCol.Data.Data}`)
				.extract({
					left: chunkToExtract.left,
					top: chunkToExtract.top,
					width: chunkToExtract.right - chunkToExtract.left,
					height: chunkToExtract.bottom - chunkToExtract.top
				})
				.toBuffer();

			tileRow.push(await data);
		}

		let imageVerticalSlice: SharpInstance = sharp(tileRow[0]);
		let bufferBound = findRegionToExtract(segRow[0], desiredRegion);
		if ((bufferBound.right - bufferBound.left) < (tileSize - tileOverlap)) {
			imageVerticalSlice = await imageVerticalSlice.extend(
				{top:0, left:0, bottom:0, right: (tileSize - (bufferBound.right - bufferBound.left))});
		}
		for (let index = 1; index < segRow.length; index++) {
			imageVerticalSlice = await imageVerticalSlice
				.overlayWith(tileRow[index],
					{top: 0, left: (bufferBound.right - bufferBound.left) + ((index -1) * tileSize)});
		}

		tileVerticalBuffer.push(await imageVerticalSlice.toBuffer());
	}

	let finalImage: SharpInstance = sharp(tileVerticalBuffer[0]);
	let bufferBound = findRegionToExtract(segments[0][0], desiredRegion);
	if ((bufferBound.bottom - bufferBound.top) < (tileSize - tileOverlap)) {
		finalImage = await finalImage.extend(
			{top:0, left:0, bottom: (tileSize - (bufferBound.bottom - bufferBound.top)), right: 0});
	}
	for (let index = 1; index < segments.length; index++) {
		finalImage = finalImage.overlayWith(
			tileVerticalBuffer[index],
			{top: getDimension(segments[index -1][0], 'Y').Size, left: 0});
	}

	return finalImage;
};




//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const dataBlocks: Segment[] = require(`${extractionDirectory}outputjson.json`).czi.filter(
	(s: Segment) => s.Id === 'ZISRAWSUBBLOCK' && s.Data.Data !== 'empty');
const inspect = require('util').inspect;
const metaXML: parsexml.Document = parsexml(fs.readFileSync(`${extractionDirectory}FILE-META-1.xml`, 'utf8'));

let supportedViews: SupportedViews = {scalable_image: {width: -1, height: -1, channels: [{channel_id: '-1', channel_name: ''}], metadata: metaXML}};
supportedViews.scalable_image.channels.pop();

let totalSizeX: number = -1;
let totalSizeY: number = -1;

// THE FOLLOWING FOR LOOP IS DISGUSTING AND I HATE IT, AND I WISH I DIDNT WRITE IT BUT DON'T SEE ANY OTHER WAY TO DO IT LOL :'(
for (const child of metaXML.root.children) {
	if (child.name === 'Metadata') {
		for (const entry of child.children) {
			if (entry.name === 'Information') {
				for (const properties of entry.children) {
					if (properties.name === 'Image') {
						for (const property of properties.children) {
							if (property.name === 'SizeX' && property.content) {
								totalSizeX = Number.parseInt(property.content, 10);
								supportedViews.scalable_image.width = totalSizeX;
								continue;
							} else if (property.name === 'SizeY' && property.content) {
								totalSizeY = Number.parseInt(property.content, 10);
								supportedViews.scalable_image.height = totalSizeY;
								continue;
							} else if(property.name === 'Dimensions') {
								for (const chan of property.children) {
									if (chan.name === 'Channels') {
										for (const channel of chan.children) {
											supportedViews.scalable_image.channels.push(
												{
													channel_id: channel.attributes.Id.split(":")[1],
													channel_name: channel.attributes.Name,
													metadata: channel.children
												}
											);
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
}

// Get all values of X and Y respectively.
const uniqueX: number[] = dataBlocks.map((x: Segment) => getDimension(x, 'X').Start).filter(
	(item: number, index: number, array: number[]) => array.indexOf(item) === index);
const uniqueY: number[] = dataBlocks.map((x: Segment) => getDimension(x, 'Y').Start).filter(
	(item: number, index: number, array: number[]) => array.indexOf(item) === index);

const uniqueTileSizes: number[][] = [];
for (const seg of dataBlocks) {

	const x: number = getDimension(seg, 'X').Size;
	const y: number = getDimension(seg, 'Y').Size;
	let found: boolean = false;
	for (const dimPair of uniqueTileSizes) {
		if (x === dimPair[0] && y === dimPair[1]) {
			found = true;
			break;
		}
	}
	if (!found) {
		uniqueTileSizes.push([x, y]);
	}
}

let filteredDataBlocks: Segment[] = [];
const filterC: Function = function(to: number): void {
	filteredDataBlocks = dataBlocks.filter(
		(item: Segment, index: number, array: Segment[]) => getDimension(item, 'C').Start === to
	);
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Begin work on getting the new tiles all nice
// Print out all of the related tiles to every new tile to be created.
let filecoutner: number = 0;
async function extrapolateDimension(cVal: number, totalCs: number, maxZoomLevel: number): Promise<CZIHeightMap[]> {
	console.log(`Stage (${cVal + 1}/${totalCs}): Task(0/${Math.ceil(totalSizeY/tileSize)}): 0% complete.`)
	for (let ys: number = 0; ys < totalSizeY;) {
		var timing = process.hrtime();
		for (let xs: number = 0; xs < totalSizeX; xs += tileSize) {
			const desired = new TileBounds (
				xs - tileOverlap,
				xs + tileSize + tileOverlap,
				ys - tileOverlap,
				ys + tileSize + tileOverlap
			);
			filterC(cVal);

			// console.log(filteredDataBlocks.map((x: any) => x.Data.DirectoryEntry.DimensionEntries[2]));
			const sortedSegments: Segment[][] = orderSegments(findRelatedTiles(filteredDataBlocks, desired));
			(await extractAndStitchChunks(sortedSegments, desired)).toFile(`${outputImageDirectory}img-${filecoutner++}`);
		}
		ys += tileSize;
		timing = process.hrtime(timing);
		console.log(`Stage (${cVal + 1}/${totalCs}): Task(${ys/tileSize}/${Math.ceil(totalSizeY/tileSize)}): ${Math.ceil(((ys/totalSizeY)*100) *100)/100}% complete. (${timing[0]} sec/iter)`);
	}
	return [];
}

let finalCZIJson: WholeCZIHierarchy = {} as any;
async function main(): Promise<void> {
	for (const cval of supportedViews.scalable_image.channels) {
		await extrapolateDimension(Number.parseInt(cval.channel_id, 10), supportedViews.scalable_image.channels.length, maxZoom).then(v =>
			{
				finalCZIJson.c_values.push({channel_id: cval.channel_id, height_map: v});
				console.log(`Completed Tier: ${cval.channel_id}`);
				return;
			}, err => {
				console.error(err);
			}
		);
	}
	fs.writeFile(`${outputImageDirectory}layout.json`, JSON.stringify(finalCZIJson), (err) => console.error(err));
}
main();

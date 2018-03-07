
import * as fs from 'fs';
import { logger } from '../../logger';
import * as sharp from 'sharp';
import * as parsexml from 'xml-parser';

const extractionDirectory: string = '/cs/scratch/cjd24/0701-extraction/';
const tileOverlap: number = 0;
const tileSize: number = 1024;

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
			(desired.left <= origCoords.right)) ||

			// Desired X on right is within the current tile
			((desired.right >= origCoords.left) &&
				(desired.right <= origCoords.right)) ||

			// Desired tile X overlaps base tile
			((desired.left < origCoords.left) &&
				(desired.right > origCoords.right))) {

			// Desired Y on top is within current tile
			if (((desired.top >= origCoords.top) &&
				(desired.top <= origCoords.bottom)) ||

				// Desired Y on right is within the current tile
				((desired.bottom >= origCoords.top) &&
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
				throw new Error("Segment array contains multiple values of C - this overlay is currently unsupported within this method");
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



















const dataBlocks: Segment[] = require(`${extractionDirectory}outputjson.json`).czi.filter(
	(s: Segment) => s.Id === 'ZISRAWSUBBLOCK' && s.Data.Data !== 'empty');
const inspect: object = require('util').inspect;
const metaXML: parsexml.Node[] = parsexml(fs.readFileSync(`${extractionDirectory}FILE-META-1.xml`, 'utf8')).root.children;

let totalSizeX: number = -1;
let totalSizeY: number = -1;

// THE FOLLOWING FOR LOOP IS DISGUSTING AND I HATE IT, AND I WISH I DIDNT WRITE IT BUT DON'T SEE ANY OTHER WAY TO DO IT LOL :'(
for (const child of metaXML) {
	if (child.name === 'Metadata') {
		for (const entry of child.children) {
			if (entry.name === 'Information') {
				for (const properties of entry.children) {
					if (properties.name === 'Image') {
						for (const property of properties.children) {
							if (property.name === 'SizeX' && property.content) {
								totalSizeX = Number.parseInt(property.content, 10);
							} else if (property.name === 'SizeY' && property.content) {
								totalSizeY = Number.parseInt(property.content, 10);
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

// // TESTS TO SEE WHAT VARIOUS THINGS RETURN
// // `npm bin`/ts-node czi.ts
console.log('\n\nUnique Tile Sizes:');
console.log(uniqueTileSizes);
console.log('\n\nSizeX : ' + totalSizeX);
console.log('UNIQUE X VALUES:');
console.log(uniqueX);
console.log('\n\n(tentative) SizeY : ' + totalSizeY);
console.log('UNIQUE Y VALUES:');
console.log(uniqueY);

let x: number = 1500, y: number = 1500;
let c_filter: Segment[] = [];
const filterC: Function = function(to: number): void {
	c_filter = dataBlocks.filter((x: Segment) => {
									const y: Dimension | null = getDimension(x, 'C');
									if (y != null && y.Start === to) {
										return y;
									}
								});
};

let desired = new TileBounds (0, 0, 0, 0);
function findRelatedTest(cval: number, tilesize: number, tileoverlap: number, x1: number, y1: number) {
	desired = new TileBounds (
		x1 - tileoverlap,
		x1 + tilesize + tileoverlap,
		y1 - tileoverlap,
		y1 + tilesize + tileoverlap
	);
	filterC(cval);
	console.log('\n\nC Value: ' + cval + '  TileSize: ' + tilesize + '  TileOverlap(px): ' + tileoverlap + '   Coords: ' + `[X=${x1}, Y=${y1}]\nResults: `);
	console.log(findRelatedTiles(c_filter, desired).map((x: Segment) => x.Data.Data));
}

findRelatedTest(0, 1024, 5, 1500, 1500);

findRelatedTest(1, 5000, 5, 1500, 1500);

findRelatedTest(0, 1024, 5, 0, 0);

findRelatedTest(0, 1024, 5, 41940, 59240);

findRelatedTest(0, 1024, 5, -tileSize - tileOverlap - 1, 59240);

findRelatedTest(0, 1024, 5, 41945, 59245);

findRelatedTest(3, 1024, 5, 41940, 1500);

filterC(0);
console.log('\n\n\n\n\n\n\n');














////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Begin work on getting the new tiles all nice
const sortSegmentsTest: Function = function(cval: number, tilesize: number, tileoverlap: number, x1: number, y1: number): Segment[][] {
	desired = new TileBounds (
		x1 - tileoverlap,
		x1 + tilesize + tileoverlap,
		y1 - tileoverlap,
		y1 + tilesize + tileoverlap
	);
	filterC(cval);
	console.log('\nC Value: ' + cval + '  TileSize: ' + tilesize + '  TileOverlap(px): ' + tileoverlap + '   Coords: ' + `[X=${x1}, Y=${y1}]`);
	const outputGrid: Segment[][] = orderSegments(findRelatedTiles(c_filter, desired));

	for (const row of outputGrid) {
		let rowOutput: string = '[ ';
		for (const col of row) {
			rowOutput += ` '${col.Data.Data}', `;
		}
		rowOutput += ']';
		console.log(rowOutput);
	}
	return outputGrid;
};

// Print out all of the related tiles to every new tile to be created.
for (let ys: number = 0; ys < totalSizeY; ys += tileSize) {
	for (let xs: number = 0; xs < totalSizeX; xs += tileSize) {
		const sortedSegments: Segment[][] = sortSegmentsTest(0, tileSize, tileOverlap, xs, ys);

	}
}

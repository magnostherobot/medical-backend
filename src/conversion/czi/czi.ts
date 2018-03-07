
import { logger } from '../../logger';
import * as sharp from 'sharp';

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

const extractionDirectory: string = '/cs/scratch/cjd24/0701-extraction/';
const json: Segment[] = require(`${extractionDirectory}outputjson.json`).czi;
const tileOverlap: number = 0;
const tileSize: number = 1024;

const getOriginalTileBounds = function(originalTile: Segment): (TileBounds | null) {
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
}

const findRelatedTiles = function(activeSegments: Segment[], desired: TileBounds): Segment[] {
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
}

const getDimension = function(segment: Segment, name: string): Dimension {
	for (const dimension of segment.Data.DirectoryEntry.DimensionEntries) {
		if (dimension.Dimension == name) {
			return dimension;
		}
	}
	throw new Error('Dimension: ' + name + " doesn't exist for segment: " + segment);
}

const orderSegments = function(segments: Segment[]): Segment[][] {

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
		xCoords = xCoords.filter((item: number, index: number, array: number[]) => array.indexOf(item) === index);
		yCoords = yCoords.filter((item: number, index: number, array: number[]) => array.indexOf(item) === index);

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
	}
	else {
		output.push(segments);
		return output;
	}
}




















// Get all subblocks that have an associated saved tile
const dataBlocks: Segment[] = json.filter((s: Segment) => s.Id === 'ZISRAWSUBBLOCK' && s.Data.Data !== 'empty');

// Get all values of X and Y respectively.
const filterX: number[] = dataBlocks.map((x: Segment) => getDimension(x, 'X').Start);
const filterY: number[] = dataBlocks.map((x: Segment) => getDimension(x, 'Y').Start);

// Filter all values to only keep the unique ones for X and Y coords respectively.
const uniqueX: number[] = filterX.filter(function(elem: any, pos: any) {
	return filterX.indexOf(elem) === pos;
});
const uniqueY: number[] = filterY.filter(function(elem: any, pos: any) {
	return filterY.indexOf(elem) === pos;
});

/*These values are normally stored at the big XML metadata under "Information/Image/SizeX or SizeY";
However for the sake of hacking around, assume that the tiles in memory are
going from left to right; top to bottom. like a book,   then use this in order
to count up the total size (in pixels) of the image*/
let sizeX: number = 0;
let sizeY: number = 0;
for (let i: number = 0; i < uniqueX.length; i++) {
	sizeX += getDimension(dataBlocks[i], 'X').Size;
}
for (let i: number = 0; i < uniqueY.length; i++) {
	sizeY += getDimension(dataBlocks[i], 'Y').Size;
}

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
console.log('\n\n(tentative) SizeX : ' + sizeX);
console.log('UNIQUE X VALUES:');
console.log('[' + uniqueX + ']');
console.log('\n\n(tentative) SizeY : ' + sizeY);
console.log('UNIQUE Y VALUES:');
console.log('[' + uniqueY + ']\n\n');

let x: number = 1500, y: number = 1500, c_val: number = 0;
let c_filter: Segment[] = [];
function filterC(to: number): void {
	c_filter = dataBlocks.filter((x: Segment) => {
									const y: Dimension | null = getDimension(x, 'C');
									if (y != null && y.Start == to) {
										return y;
									}
								});
}

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





















// Begin work on getting the new tiles all nice
function sortSegmentsTest(cval: number, tilesize: number, tileoverlap: number, x1: number, y1: number) {
	desired = new TileBounds (
		x1 - tileoverlap,
		x1 + tilesize + tileoverlap,
		y1 - tileoverlap,
		y1 + tilesize + tileoverlap
	);
	filterC(cval);
	console.log('\nC Value: ' + cval + '  TileSize: ' + tilesize + '  TileOverlap(px): ' + tileoverlap + '   Coords: ' + `[X=${x1}, Y=${y1}]`);
	let outputGrid: Segment[][] = orderSegments(findRelatedTiles(c_filter, desired));

	for (const row of outputGrid) {
		let rowOutput: string = "[ ";
		for (const col of row) {
			rowOutput += ` '${col.Data.Data}', `;
		}
		rowOutput += ']';
		console.log(rowOutput);
	}
}


for (let ys: number = 0; ys < sizeY; ys += tileSize) {
	for (let xs: number = 0; xs < sizeX; xs += tileSize) {
		sortSegmentsTest(0, tileSize, tileOverlap, xs, ys);
	}
}

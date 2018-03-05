let json: any = require('/cs/scratch/cjd24/0701-extraction/outputjson.json');
json = json.czi;

let tileOverlap: number = 5;
let tileSize: number = 1024;

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
	left: number;
	right: number;
	top: number;
	bottom: number;
	constructor(left: number, right: number, top: number, bottom: number) {
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
	};
}


//Get all subblocks that have an associated saved tile
let dataBlocks: Segment[] = json.filter((x: Segment) => x.Id == 'ZISRAWSUBBLOCK' && x.Data.Data != 'empty');


function getOriginalTileBounds(originalTile: Segment): TileBounds | null {
	let bounds: TileBounds = new TileBounds (-1, -1, -1, -1);

	for (let dimension of originalTile.Data.DirectoryEntry.DimensionEntries) {
		if (dimension.Dimension == 'X') {
			bounds.left = dimension.Start;
			bounds.right = bounds.left + dimension.Size;
			continue;
		}
		else if (dimension.Dimension == 'Y') {
			bounds.top = dimension.Start;
			bounds.bottom = bounds.top + dimension.Size;
			continue;
		}
	}

	if (bounds.left < 0 || bounds.right < 0 || bounds.top < 0 || bounds.bottom < 0) {
		return null;
	}

	return bounds;
}


function findRelatedTiles(activeSegments: Segment[], desired: TileBounds): Segment[] {
	let relatedTiles: Segment[] = [];


	for (let origTile of activeSegments) {

		let origCoords: TileBounds | null;

		if ((origCoords = getOriginalTileBounds(origTile)) === null) {
			throw new Error("There was a Sad Boi error");
		}

			//desired X on left is within current tile
		if (((desired.left >= origCoords.left) &&
			(desired.left <= origCoords.right)) ||

			//desired X on right is within the current tile
			((desired.right >= origCoords.left) &&
			(desired.right <= origCoords.right)) ||

			//desired tile X overlaps base tile
			((desired.left < origCoords.left) &&
			(desired.right > origCoords.right)))

		{
			//desired Y on top is within current tile
			if (((desired.top >= origCoords.top) &&
				(desired.top <= origCoords.bottom)) ||

				//desired Y on right is within the current tile
				((desired.bottom >= origCoords.top) &&
				(desired.bottom <= origCoords.bottom)) ||

				//desired tile Y overlaps whole base tile
				((desired.top < origCoords.top) &&
				(desired.bottom > origCoords.bottom)))

			{
				relatedTiles.push(origTile);
			}
		}
	}

	return relatedTiles;
}


function getDimension(segment:Segment, name:string): Dimension {
	for (let dimension of segment.Data.DirectoryEntry.DimensionEntries) {
		if (dimension.Dimension == name) {
			return dimension;
		}
	}
	throw new Error("Dimension: " + name + " doesn't exist for segment: " + segment);
}











//Get all values of X and Y respectively.
let filterX: number[] = dataBlocks.map((x: Segment) => getDimension(x, 'X').Start);
let filterY: number[] = dataBlocks.map((x: Segment) => getDimension(x, 'Y').Start);

//Filter all values to only keep the unique ones for X and Y coords respectively.
let uniqueX: number[] = filterX.filter(function(elem: any, pos: any) {
	return filterX.indexOf(elem) == pos;
});
let uniqueY: number[] = filterY.filter(function(elem: any, pos: any) {
	return filterY.indexOf(elem) == pos;
});

/*These values are normally stored at the big XML metadata under "Information/Image/SizeX or SizeY";
However for the sake of hacking around, assume that the tiles in memory are
going from left to right; top to bottom. like a book,   then use this in order
to count up the total size (in pixels) of the image*/
let sizeX: number = 0, sizeY: number = 0;
for (let i: number = 0; i < uniqueX.length; i++) {
	sizeX += getDimension(dataBlocks[i], 'X').Size;
};
for (let i: number = 0; i < uniqueY.length; i++) {
	sizeX += getDimension(dataBlocks[i], 'Y').Size;
};

let uniqueTileSizes: number[][] = [];
for (let seg of dataBlocks) {

	let x: number = getDimension(seg, 'X').Size, y: number = getDimension(seg, 'Y').Size;
	let found: boolean = false;
	for (let dimPair of uniqueTileSizes) {
		if (x == dimPair[0] && y == dimPair[1]) {
			found = true;
			break;
		}
	}
	if (!found) {
		uniqueTileSizes.push([x, y]);
	}
};






//TESTS TO SEE WHAT VARIOUS THINGS RETURN
// `npm bin`/ts-node czi.ts
console.log("\n\nUnique Tile Sizes:");
console.log(uniqueTileSizes);
console.log("\n\n(tentative) SizeX : " + sizeX);
console.log("UNIQUE X VALUES:");
console.log("[" + uniqueX + "]");
console.log("\n\n(tentative) SizeY : " + sizeY);
console.log("UNIQUE Y VALUES:");
console.log("[" + uniqueY + "]\n\n");

let x: number = 1500, y: number = 1500, c_val: number = 0;
let c_filter: Segment[] = [];
function filterC(to: number): void {
	c_filter = dataBlocks.filter((x: Segment) =>
								{
									let y: Dimension | null = getDimension(x, 'C');
									if (y != null && y.Start == to) {
										return y;
									}
								});
}
let desired = new TileBounds (0,0,0,0);

function runTest(cval: number, tilesize:number, tileoverlap:number, x1:number, y1:number) {
	desired = new TileBounds (
		x1 - tileoverlap,
		x1 + tilesize + tileoverlap,
		y1 - tileoverlap,
		y1 + tilesize + tileoverlap
	);
	filterC(cval);
	console.log("\n\nC Value: " + cval + "  TileSize: " + tilesize + "  TileOverlap(px): " + tileoverlap + "   Coords: " + `[X=${x1}, Y=${y1}]\nResults: `);
	console.log(findRelatedTiles(c_filter, desired).map((x: Segment) => x.Data.Data));
}

runTest(0, 1024, 5, 1500, 1500);

runTest(1, 5000, 5, 1500, 1500);

runTest(0, 1024, 5, 0, 0);

runTest(0, 1024, 5, 41940, 59240);

runTest(0, 1024, 5, -tileSize - tileOverlap -1, 59240);

runTest(0, 1024, 5, 41945, 59245);

runTest(3, 1024, 5, 41940, 1500);

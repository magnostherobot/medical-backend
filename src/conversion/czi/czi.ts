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


function findRelatedTiles(activeSegments: Segment[], desiredX: number, desiredY: number): Segment[] {
	let relatedTiles: Segment[] = [];


	for (let origTile of activeSegments) {

		let origCoords: TileBounds | null;

		if ((origCoords = getOriginalTileBounds(origTile)) === null) {
			throw new Error("There was a Sad Boi error");
		}

		let desired = new TileBounds(
			desiredX - tileOverlap,
			desiredX + tileSize + tileOverlap,
			desiredY - tileOverlap,
			desiredY + tileSize + tileOverlap
		);

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


function getDimension(segment:Segment, name:string): Dimension | null {
	for (let dimension of segment.Data.DirectoryEntry.DimensionEntries) {
		if (dimension.Dimension == name) {
			return dimension;
		}
	}
	return null;
}











//Get all values of X and Y respectively.
let filterX: number[] = dataBlocks.map((x: Segment) =>
					{
						let y: Dimension | null = getDimension(x, 'X');
						return y == null ? -1 : y.Start
					});
let filterY: number[] = dataBlocks.map((x: Segment) =>
					{
						let y: Dimension | null = getDimension(x, 'Y');
						return y == null ? -1 : y.Start
					});


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
let sizeX: number = 0;
let sizeY: number = 0;
for (let i: number = 0; i < uniqueX.length; i++) {
	let temp : Dimension | null = getDimension(dataBlocks[i], 'X');
	if (temp != null) {
		sizeX += temp.Size;
	}
};
for (let i: number = 0; i < uniqueY.length; i++) {
	let temp : Dimension | null = getDimension(dataBlocks[i * uniqueX.length], 'Y');
	if (temp != null)
		sizeY += temp.Size;
};
tileOverlap

let uniqueTileSizes: number[][] = [];
for (let seg of dataBlocks) {
	let newx = getDimension(seg, 'X'), newy = getDimension(seg, 'Y');
	if (newx == null || newy == null) {continue;};
	let x: number = newx.Size, y: number = newy.Size;
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
console.log("\n\nSizeX : " + sizeX);
console.log("UNIQUE X VALUES:");
console.log("[" + uniqueX + "]");
console.log("\n\nSizeY : " + sizeY);
console.log("UNIQUE Y VALUES:");
console.log("[" + uniqueY + "]");
console.log("\n\n\n\n\n\n");

let x: number = 1500, y: number = 1500, c_val: number = 0;
var c_filter: Segment[] = [];
function filterC(to: number): void {
	c_filter = dataBlocks.filter((x: Segment) =>
								{
									let y: Dimension | null = getDimension(x, 'C');
									if (y != null && y.Start == to) {
										return y;
									}
								});
}
filterC(0);

console.log("\n\nC Value: " + c_val + "  TileSize: " + tileSize + "  TileOverlap: " + tileOverlap + "   Coords: " + `[X=${x}, Y=${y}]\nResults: `);
console.log(findRelatedTiles(c_filter, x, y).map((x: Segment) => x.Data.Data));

filterC(c_val = 1);
console.log("\n\nC Value: " + c_val + "  TileSize: " + tileSize + "  TileOverlap: " + tileOverlap + "   Coords: " + `[X=${x}, Y=${y}]\nResults: `);
console.log(findRelatedTiles(c_filter, x, y).map((x: Segment) => x.Data.Data));

filterC(c_val = 0); x=0;y=0;
console.log("\n\nC Value: " + c_val + "  TileSize: " + tileSize + "  TileOverlap: " + tileOverlap + "   Coords: " + `[X=${x}, Y=${y}]\nResults: `);
console.log(findRelatedTiles(c_filter, x, y).map((x: Segment) => x.Data.Data));

filterC(c_val = 0); x=41940;y=59240;
console.log("\n\nC Value: " + c_val + "  TileSize: " + tileSize + "  TileOverlap: " + tileOverlap + "   Coords: " + `[X=${x}, Y=${y}]\nResults: `);
console.log(findRelatedTiles(c_filter, x, y).map((x: Segment) => x.Data.Data));

filterC(c_val = 0); x=41945;y=59245;
console.log("\n\nC Value: " + c_val + "  TileSize: " + tileSize + "  TileOverlap: " + tileOverlap + "   Coords: " + `[X=${x}, Y=${y}]\nResults: `);
console.log(findRelatedTiles(c_filter, x, y).map((x: Segment) => x.Data.Data));

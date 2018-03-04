var json = require('/cs/scratch/cjd24/0701-extraction/outputjson.json');
json = json.czi;
let tileOverlap = 5;
let tileSize = 1024;

var dataBlocks = json.filter((x: { Id: string, Data: { Data: string }}) => x.Id == 'ZISRAWSUBBLOCK' && x.Data.Data != 'empty');

var filterX = dataBlocks.map((x: {Data: {DirectoryEntry: {DimensionEntries: {Start: number}[]}}}) => x.Data.DirectoryEntry.DimensionEntries[0].Start);
var filterY = dataBlocks.map((x: {Data: {DirectoryEntry: {DimensionEntries: {Start: number}[]}}}) => x.Data.DirectoryEntry.DimensionEntries[1].Start);

var uniqueX = filterX.filter(function(elem: any, pos: any) {
	return filterX.indexOf(elem) == pos;
})

var uniqueY = filterY.filter(function(elem: any, pos: any) {
	return filterY.indexOf(elem) == pos;
})


//These values are normally stored at the big XML metadata under "Information/Image/SizeX or SizeY";
var sizeX = 0;
var sizeY = 0;
for (var i = 0; i < uniqueX.length; i++) {
	sizeX += dataBlocks[i].Data.DirectoryEntry.DimensionEntries[0].Size;
}
for (var i = 0; i < uniqueY.length; i++) {
	sizeY += dataBlocks[i * uniqueX.length].Data.DirectoryEntry.DimensionEntries[1].Size;
}


console.log("\n\nSizeX : " + sizeX);
console.log("UNIQUE X VALUES:");
console.log(uniqueX);
console.log("\n\nSizeY : " + sizeY);
console.log("UNIQUE Y VALUES:");
console.log(uniqueY);
console.log("\n\n\n\n\n\n");


console.log(findRelatedTiles(0, 0));














function getOriginalTileCoordinates(originalTile: any): number[] | null{
	let xstart:number | null = null,
		xsize:number  | null = null,
		ystart:number | null = null,
		ysize:number  | null = null;

	for (let dimension of originalTile.Data.DirectoryEntry) {
		if (dimension.Dimension == 'X') {
			xstart = dimension.Start;
			xsize = dimension.Size;
			continue;
		}
		if (dimension.Dimension == 'Y') {
			ystart = dimension.Start;
			ysize = dimension.Size;
			continue;
		}
	}

	if (!xstart || !xsize || !ystart || !ysize) {
		return null;
	} else {
		return [xstart, xsize, ystart, ysize];
	}
}


function findRelatedTiles(desiredX: number, desiredY: number): any[] {
	let relatedTiles: any[] = [];

	for (let origTile in dataBlocks) {
		let origCoords: number[] | null = getOriginalTileCoordinates(origTile);
		if (origCoords === null) {
			return ["There was a sad boi error"];
		}

			//desired X on left is within current tile
		if ((((desiredX - tileOverlap) > origCoords[0]) &&
			((desiredX - tileOverlap) < (origCoords[0] + origCoords[1]))) ||

			//desired X on right is within the current tile
			(((desiredX + tileSize + tileOverlap) > origCoords[0]) &&
			((desiredX + tileSize + tileOverlap) < (origCoords[0] + origCoords[1])))) {


				//desired Y on top is within current tile
			if ((((desiredY - tileOverlap) > origCoords[2]) &&
				((desiredY - tileOverlap) < (origCoords[2] + origCoords[3]))) ||

				//desired Y on bottom is within the current tile
				(((desiredY + tileSize + tileOverlap) > origCoords[2]) &&
				((desiredY + tileSize + tileOverlap) < (origCoords[2] + origCoords[3])))) {

				relatedTiles.push(origTile);
			}
		}
	}

	return relatedTiles;
}

//imports required to make the conversion
import * as fs from 'fs';
import { logger } from '../../logger';
import * as sharp from 'sharp';
import { SharpInstance } from 'sharp';
import * as parsexml from 'xml-parser';

//various constants for placing files and defining tiles
const extractionDirectory: string = '/cs/scratch/cjd24/0701-extraction/';
const outputImageData: string = '/cs/scratch/cjd24/0701-extraction-processed/'
const outputImageDirectory: string = '/cs/scratch/cjd24/0701-extraction-processed/data/'
const tileOverlap: number = 0;
const tileSize: number = 1024;
const maxZoom: number = 64;

//Interfaces used to define the tiles incoming from the CZI extraction
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

//Interface used to define the pixel-bounds of a 'section' within the image
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

//Interface used to define the structure of the "supportedViews" section
//of the protocol specification for scalable images
interface SupportedViews {
	scalable_image: {
		width: number;
		height: number;
		channels: [
			{
				channel_id: string;
				channel_name: string;
				metadata?: parsexml.Node[];
			}
		];
		real_width?: {
			value?: number;
			units?: string;
		};
		real_height?: {
			value?: number;
			units?: string;
		};
		metadata?: {};
	}
}

//The following are interfaces for the Custom object storing Information
//about the CUSTOM pyramid being created for this image
interface CZITile {
	x_offset: number;
	y_offset: number;
	width: number;
	height: number;
	file: string;
}
interface CZIHeightMap {
	zoom_level: number,
	tile_width_count?: number,
	tile_height_count?: number,
	plane: CZITile[][];
}
interface WholeCZIHierarchy {
	c_values: [{
		channel_id: string,
		height_map: CZIHeightMap[];
	}],
	c_value_count: number,
	zoom_level_count: number;
	total_files: number;
}

/*
 * Simple function to find the tile bounds version of an original tile in the base image
 */
const getOriginalTileBounds: Function = function(originalTile: Segment): (TileBounds | null) {
	const bounds: TileBounds = new TileBounds(-1, -1, -1, -1);

	//loop over all dimensions to get the x and y
	for (const dimension of originalTile.Data.DirectoryEntry.DimensionEntries) {
		switch (dimension.Dimension) {
			//If we have found x, then match the start and width
			case 'X':
				bounds.left = dimension.Start;
				bounds.right = bounds.left + dimension.Size;
				continue;
			//If we have found y, then match the top and bottom
			case 'Y':
				bounds.top = dimension.Start;
				bounds.bottom = bounds.top + dimension.Size;
				continue;
			default:
				continue;
		}
	}

	//If one of the bounds was not created, then there must have been an error
	if (bounds.left < 0 || bounds.right < 0 || bounds.top < 0 || bounds.bottom < 0) {
		return null;
	}
	//Successful return
	return bounds;
};

/*
 * Function used to find which of the original base tiles are
 * overlapping with the area of the to-be-created tile
 */
const findRelatedTiles: Function = function(activeSegments: Segment[], desired: TileBounds): Segment[] {
	const relatedTiles: Segment[] = [];

	//For all tiles within the region being checked
	for (const baseTile of activeSegments) {

		//find out the coordinates of the current base tile being checked
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

				//If all of the if statements have passed, then this tile
				//is part of the overlap for the new tile to be created.
				relatedTiles.push(baseTile);
			}
		}
	}

	return relatedTiles;
};

/*
 * This gets the particular dimension from a segment given a segment and dimesnion ID
 */
const getDimension: Function = function(segment: Segment, name: string): Dimension {

	//loop over all dimensions within this segment
	for (const dimension of segment.Data.DirectoryEntry.DimensionEntries) {
		//If the current dimension is the one we are looking for then return it.
		if (dimension.Dimension === name) {
			return dimension;
		}
	}
	//If we have gotten to here, then the dimension doesnt exist, so throw error.
	throw new Error('Dimension: ' + name + " doesn't exist for segment: " + segment);
};

/*
 * This takes a selection of segments and ensures that they are ordered
 * left to right, and top to bottom like the words in a book, so that the
 * stiching process will take the correct slice from them all.
 * (this is based on the pixel x-y coords of the segment.)
 */
const orderSegments: Function = function(segments: Segment[]): Segment[][] {

	const output: Segment[][] = [];

	//So long as there is at least 2 segments to order
	if (segments.length > 1) {
		let xCoords: number[] = [];
		let yCoords: number[] = [];

		// Get all x/y's;
		// However also ensure that all of the segments to be ordered, all come
		// from the same value of 'C' dimension, otherwise there could be overlaps.
		const initC: number = getDimension(segments[0], 'C').Start;
		for (const seg of segments) {
			if (getDimension(seg, 'C').Start !== initC) {
				throw new Error('Segment array contains multiple values of C - this overlay is currently unsupported within this method');
			}
			xCoords.push(getDimension(seg, 'X').Start);
			yCoords.push(getDimension(seg, 'Y').Start);
		}
		// Filter to get Unique Values
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
	}

	//There is only one segment, so no need to re-order.
	return [segments];
};

/*
 * Takes a base tile, and the whole bounds of a new tile, and uses this
 * to calculate the region within the base tile that is overlapping the new tile
 * to be extracted.
 */
const findRegionToExtract: Function = function(segment: Segment, desired: TileBounds): TileBounds {

	//get the base tile area and create an object for the chunk to extract
	const baseBounds: TileBounds = getOriginalTileBounds(segment);
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

	//return the slice within the base tile for extraction
	return chunkToExtract;
};

/*
 * Take an ordered selection of segments and cookie cutter out a tile from this
 * into a new image
 */
const extractAndStitchChunks: Function = async function(segments: Segment[][], desiredRegion: TileBounds): Promise<SharpInstance> {

	//create a buffer for the rows part of raw image data
	let tileVerticalBuffer: Buffer[] = [];

	//for all ros (y coords) in the image
	for (const segRow of segments) {
		//create a buffer for this row
		let tileRow: Buffer[] = [];
		let chunkToExtract: TileBounds = new TileBounds(-1, -1, -1, -1);

		//For all of the columns within this row
		for (const segCol of segRow) {
			//find out the region of the base tile to be added to the new image
			chunkToExtract = findRegionToExtract(segCol, desiredRegion);
			//extract this section of image data into a sharp buffer
			let data: Promise<Buffer> =
				sharp(`${extractionDirectory}${segCol.Data.Data}`)
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
		let bufferBound = findRegionToExtract(segRow[0], desiredRegion);
		//check if the inital chunk needs to be extended to support the other columns
		if ((bufferBound.right - bufferBound.left) < (tileSize - tileOverlap)) {
			imageVerticalSlice = await imageVerticalSlice.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
				{top:0, left:0, bottom:0, right: (tileSize - (bufferBound.right - bufferBound.left))});
		}
		//for every column along this row, join it to the previous column data
		for (let index = 1; index < segRow.length; index++) {
			imageVerticalSlice = await imageVerticalSlice
				.overlayWith(tileRow[index],
					{top: 0, left: (bufferBound.right - bufferBound.left) + ((index -1) * tileSize)});
		}

		//add this horizontal data buffer to the vertical buffer
		tileVerticalBuffer.push(await imageVerticalSlice.toBuffer());
	}

	//prepare variables used to combine all rows into one image
	let finalImage: SharpInstance = sharp(tileVerticalBuffer[0]);
	let bufferBound = findRegionToExtract(segments[0][0], desiredRegion);
	//Check if the inital row needs to be extended to support further rows
	if ((bufferBound.bottom - bufferBound.top) < (tileSize - tileOverlap)) {
		finalImage = await finalImage.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
			{top:0, left:0, bottom: (tileSize - (bufferBound.bottom - bufferBound.top)), right: 0});
	}
	//For all further rows in the image, combine it with the previous rows' data
	for (let index = 1; index < segments.length; index++) {
		finalImage = finalImage.overlayWith(
			tileVerticalBuffer[index],
			{top: getDimension(segments[index -1][0], 'Y').Size, left: 0});
	}

	//return the finalised image.
	return finalImage;
};

/*
 * Used to remove obtuse JSON data, where it is not needed in the SupportedView object
 */
const cleanSupportedViewObject: Function = function(obj: parsexml.Node[]): Object {
    let newChild: any = {};
    let hasAttr: boolean = false, hasChildren: boolean = false, hasContent: boolean = false;

	//for all nodes in the json object
    for (const node of obj) {

		//Check if this node has attributes
        if (node.attributes !== undefined && node.attributes !== null && Object.keys(node.attributes).length !== 0)
            {hasAttr = true;} else {hasAttr = false;}
		//Check for further children
        if (node.children !== undefined && node.children.length > 0)
			{hasChildren = true;} else {hasChildren = false;}
		//Check for simple content object
        if (node.content !== undefined && node.content !== null && node.content !== '')
			{hasContent = true;} else {hasContent = false;}

		//If the Node has further children, then deal with this
        if (hasChildren) {
            let soloChildren: boolean = true;

			//Check if this node just contains children, or its own data too
			newChild[node.name] = {}
            if (hasAttr) {
				//IF there are also attributes, then set this in the output
				newChild[node.name].attributes = node.attributes;
                soloChildren = false;
            }
            if (hasContent) {
				//If there is also a 'content' then set this in the output
                newChild[node.name].content = node.content;
                soloChildren = false;
            }
			//If there are only chilren, then set this as this objects data
            if (soloChildren) {
				//recursively call this function to clean up sub-children too.
                newChild[node.name] = cleanSupportedViewObject(node.children);
            } else {
				//Otherwise, if there is also data, then add a children object
				newChild[node.name].children = cleanSupportedViewObject(node.children);
            }
        }

		//If this node only has attributes, then add this
		else if (hasAttr) {
			newChild[node.name] = {};

			//Check for content too, if so, add a discrete child for this.
            if (hasContent) {
                newChild[node.name].content = node.content;
            }
			//add the attributes as a sub child regardless,
			// since it exists on this key.
			newChild[node.name].attributes = node.attributes;
        }

		//If this node only has a content object then remove all other content
		// and only attatch the content result as the value for this node key
		else if (hasContent) {
            newChild[node.name] = node.content;
        }
	}

    return newChild;
};

/*
 * Clean up all vales of C within the JSON for supported views
 */
const cleanSupportedViews: Function = function(view: SupportedViews): void {
	for (const channel of view.scalable_image.channels) {
        channel.metadata = cleanSupportedViewObject(channel.metadata);
    }
};



//create the objects needed for parsing the XML object of the initial extraction.
const dataBlocks: Segment[] = require(`${extractionDirectory}outputjson.json`).czi.filter(
	(s: Segment) => s.Id === 'ZISRAWSUBBLOCK' && s.Data.Data !== 'empty');

let totalSizeX: number = -1;
let totalSizeY: number = -1;
let supportedViews: SupportedViews = {scalable_image: {width: -1, height: -1, channels: [{channel_id: '-1', channel_name: ''}], metadata: {}}};
supportedViews.scalable_image.channels.pop();

/*
 * Function to parse the xml file from the original extraction from CZI, its nasty!
 */
const parseExtractedXML: Function = function(xmlFile: string): void {
    // const inspect = require('util').inspect;  // << Used when console logging stuff to prettify it
    const metaXML: parsexml.Document = parsexml(fs.readFileSync(xmlFile, 'utf8'));
    // parse the XML :(
    // THE FOLLOWING 2 FOR LOOPS ARE DISGUSTING AND I HATE IT, AND I WISH I DIDNT WRITE IT BUT DON'T SEE ANY OTHER WAY TO DO IT LOL :'(
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
    for (const child of metaXML.root.children) {
    	if (child.name === 'Metadata') {
    		for (const entry of child.children) {
    			if (entry.name === 'Scaling') {
    				for (const properties of entry.children) {
    					if (properties.name === 'Items') {
    						for (const dist of properties.children) {
    							if (dist.name === 'Distance') {
    								if (dist.attributes.Id === 'X') {
    									supportedViews.scalable_image.real_width = {};
    									for (const attr of dist.children) {
    										if (attr.name === 'Value' && attr.content !== undefined)
    											supportedViews.scalable_image.real_width.value = Number.parseFloat(attr.content) * 1000000 * totalSizeX;
    										if (attr.name === 'DefaultUnitFormat')
    											supportedViews.scalable_image.real_width.units = attr.content;
    									}
    								}
    								if (dist.attributes.Id === 'Y') {
    									supportedViews.scalable_image.real_height = {};
    									for (const attr of dist.children) {
    										if (attr.name === 'Value' && attr.content !== undefined)
    											supportedViews.scalable_image.real_height.value = Number.parseFloat(attr.content) * 1000000 * totalSizeY;
    										if (attr.name === 'DefaultUnitFormat')
    											supportedViews.scalable_image.real_height.units = attr.content;
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
    supportedViews.scalable_image.metadata = metaXML;
};



// // Get all values of X and Y respectively.
// const uniqueX: number[] = dataBlocks.map((x: Segment) => getDimension(x, 'X').Start).filter(
// 	(item: number, index: number, array: number[]) => array.indexOf(item) === index);
// const uniqueY: number[] = dataBlocks.map((x: Segment) => getDimension(x, 'Y').Start).filter(
// 	(item: number, index: number, array: number[]) => array.indexOf(item) === index);
//
// const uniqueTileSizes: number[][] = [];
// for (const seg of dataBlocks) {
//
// 	const x: number = getDimension(seg, 'X').Size;
// 	const y: number = getDimension(seg, 'Y').Size;
// 	let found: boolean = false;
// 	for (const dimPair of uniqueTileSizes) {
// 		if (x === dimPair[0] && y === dimPair[1]) {
// 			found = true;
// 			break;
// 		}
// 	}
// 	if (!found) {
// 		uniqueTileSizes.push([x, y]);
// 	}
// }



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Begin work on getting the new tiles all nice                                                                                          //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//used to filter all databocks to get certain values of 'C'.
let filteredDataBlocks: Segment[] = [];
const filterC: Function = function(c_value_filter: number): void
{
	filteredDataBlocks = dataBlocks.filter(
		(item: Segment, index: number, array: Segment[]) => getDimension(item, 'C').Start === c_value_filter
	);
};

// Print out all of the related tiles to every new tile to be created.
let filecoutner: number = 0;
/*
 * This is used to create the next zoomed out tier of the given height map
 */
const zoomTier: Function = async function(previousHeightMap:CZIHeightMap): Promise<CZIHeightMap> {

	let ys:number = 0, timing = process.hrtime(), iterTimes: number[] = [50], avgItrTime: number;;
	let newZoomTier: CZIHeightMap = {zoom_level: previousHeightMap.zoom_level * 2, plane: []};

	//Check the condition where another zoom level does not make sense
	if (previousHeightMap.plane.length === 1 && previousHeightMap.plane[0].length === 1) {
        console.log(
            `         Task(1/1):     ` +
            `Stage 100% complete. ` +
            `(0 sec/iter)  Stage was skipped as maximum sensible zoom level was reached. <<`
        );
        return previousHeightMap;
	}

    //For all rows within the previous plane
	for (;ys < previousHeightMap.plane.length; ys += 2) {
		timing = process.hrtime();
		let cziRow: CZITile[] = [];
		//for all columns within the previous plane
		for (let xs: number = 0; xs < previousHeightMap.plane[0].length; xs += 2) {

//			console.error(`ys: ${ys}  ymax:${previousHeightMap.plane.length}       xs: ${xs}   xmax: ${previousHeightMap.plane[0].length}`)

			//combine 4 tiles into a new tile and scale down for this tier

			let combinedTile: SharpInstance;
			//top left
//			console.error(`SharpInitFile: ${previousHeightMap.plane[ys][xs].file}`)
			combinedTile = await sharp(`${outputImageDirectory}${previousHeightMap.plane[ys][xs].file}`)
							.background({r: 0, g: 0, b: 0, alpha: 0}).extend(
							{top:0, left:0, bottom:tileSize, right: tileSize});

			//combine top right
			let moreToRight: boolean = (xs + 1) < previousHeightMap.plane[0].length;
//			console.error(`More to right: ${moreToRight}`)
			if (moreToRight) {
//				console.error(`Top Right: ${previousHeightMap.plane[ys][xs + 1].file}`)
				combinedTile = sharp(await combinedTile.overlayWith(
					`${outputImageDirectory}${previousHeightMap.plane[ys][xs + 1].file}`,
					{top: 0, left: tileSize}).toBuffer());
			}

			//combine bottom left
			let moreToBottom: boolean = (ys + 1) < previousHeightMap.plane.length;
//			console.error(`More to bottom: ${moreToBottom}`)
			if (moreToBottom) {
//				console.error(`Bottom Left: ${previousHeightMap.plane[ys + 1][xs].file}`)
				combinedTile = sharp(await combinedTile.overlayWith(
					`${outputImageDirectory}${previousHeightMap.plane[ys + 1][xs].file}`,
					{top: tileSize, left: 0}).toBuffer());
			}

			//combine bottom right
			if (moreToBottom && moreToRight) {
//				console.error(`Bottom Right: ${previousHeightMap.plane[ys + 1][xs + 1].file}`)
				combinedTile = sharp(await combinedTile.overlayWith(
					`${outputImageDirectory}${previousHeightMap.plane[ys + 1][xs + 1].file}`,
					{top: tileSize, left: tileSize}).toBuffer());
			}

//			console.error("\n\n");
			//rescale and push to file
			await combinedTile.resize(tileSize, tileSize)
				.toFile(`${outputImageDirectory}img-${filecoutner}`);/*.toFile(`${outputImageData}/thing/img-${filecoutner}`);*/

			cziRow.push({
				x_offset: previousHeightMap.plane[ys][xs].x_offset,
				y_offset: previousHeightMap.plane[ys][xs].y_offset,
				width: previousHeightMap.plane[ys][xs].width * 2,
				height: previousHeightMap.plane[ys][xs].height * 2,
				file: `img-${filecoutner++}`
			});
			finalCZIJson.total_files++;
		}

		newZoomTier.plane.push(cziRow);
		timing = process.hrtime(timing);
		iterTimes.push(timing[0]);
		avgItrTime = iterTimes.reduce((p, c, i) => {return p+(c-p)/(i+1)}, 0);
		console.log(
			`         Task(${ys/2}/${Math.floor(previousHeightMap.plane.length/2)}):     ` +
			`Stage ${Math.ceil(((ys/previousHeightMap.plane.length)*100) *100)/100}% complete. ` +
			`(${timing[0]} sec/iter,  est: ${((avgItrTime * (Math.floor(previousHeightMap.plane.length/2) - (ys/2 + 1)))/60).toFixed(2)} mins remain.)`
		);
	}
	newZoomTier.tile_height_count = newZoomTier.plane.length;
	newZoomTier.tile_width_count = newZoomTier.plane[0].length;

	return newZoomTier;
}

/*
 * Big boi function to build up the base tier of each value of c, then builds
 * Our pre-computed pyramid of the rest of the zoom levels.
 */
const extrapolateDimension:Function = async function(cVal: number, totalCs: number, maxZoom:number): Promise<CZIHeightMap[]> {

    let ys:number = 0, timing = process.hrtime(), iterTimes: number[] = [100], avgItrTime: number;;
    //begin output for the base tier
    console.log('=========================================================');
    console.log(`>>    Beginning Dimension Extrapolation for \'C\' : ${cVal}`);
    console.log('=========================================================');
	console.log(">> Computing base tier, this will take a while...\n")
	let baseCZIHeightMap: CZIHeightMap = {zoom_level: 1, plane: []},
		width_in_tiles = 0, height_in_tiles = 0;

	console.log(`Stage (${cVal * Math.sqrt(maxZoom) + 1}/${totalCs}):`);
    //For all rows within the total base pixel height
	for (;ys < totalSizeY;) {
		timing = process.hrtime();
		let cziRow: CZITile[] = [];
		for (let xs: number = 0; xs < totalSizeX; xs += tileSize) {
			const desired = new TileBounds (
				xs - tileOverlap,
				xs + tileSize + tileOverlap,
				ys - tileOverlap,
				ys + tileSize + tileOverlap
			);
			filterC(cVal);

			cziRow.push({
				x_offset: xs,
				y_offset: ys,
				width: tileSize,
				height: tileSize,
				file: `img-${filecoutner}`
			});
			const sortedSegments: Segment[][] = orderSegments(findRelatedTiles(filteredDataBlocks, desired));
			(await extractAndStitchChunks(sortedSegments, desired)).toFile(`${outputImageDirectory}img-${filecoutner++}`);
			finalCZIJson.total_files++;
			width_in_tiles = xs/tileSize;
		}
		baseCZIHeightMap.plane.push(cziRow);
		ys += tileSize;
		timing = process.hrtime(timing);
		iterTimes.push(timing[0]);
		avgItrTime = iterTimes.reduce((p, c, i) => {return p+(c-p)/(i+1)}, 0);
		console.log(
			`         Task(${ys/tileSize}/${Math.ceil(totalSizeY/tileSize)}):     ` +
			`Stage ${Math.ceil(((ys/totalSizeY)*100) *100)/100}% complete. ` +
			`(${timing[0]} sec/iter,  est: ${((avgItrTime * (Math.ceil(totalSizeY/tileSize) - ys/tileSize))/60).toFixed(2)} mins remain.)`
		);
		height_in_tiles = ys/tileSize;
	}
	baseCZIHeightMap.tile_height_count = height_in_tiles;
	baseCZIHeightMap.tile_width_count = width_in_tiles;

	//BUILD UP THE HIGHER ZOOM LAYERS.
	console.log(">> Base tier complete for \'C\': " + cVal + "; Begin computing zoom tiers...\n")

	let retHeightMap: CZIHeightMap[] = [baseCZIHeightMap];
	for (let stage:number = 1; stage < Math.sqrt(maxZoom); stage++) {
		console.log(`Stage (${cVal * Math.sqrt(maxZoom) + 1 + stage}/${totalCs}):`);
		await zoomTier(retHeightMap[stage - 1])
		.then((v: CZIHeightMap) =>
			{
				retHeightMap.push(v);
				return;
			}
		);
        writeJSONtoFile(`${outputImageData}stageMap-${stage}`, retHeightMap);
	}

    console.log(`>> Completed Extrapolation for dimension, \'C\': ${cVal}\n\n`);
	return retHeightMap;
}

/*
 * function used to ensure that the directories required have been created
 */
const checkForOutputDirectories: Function = function(directories: string[]): void
{
    for (const dir of directories) {
        if (!fs.existsSync(`${dir}`)) {
            fs.mkdirSync(`${dir}`);
        }
    }
};

/*
 * Write given JSON object to given filepath
 */
const writeJSONtoFile: Function = function(filePath:string, object:Object): void
{
	fs.writeFile(filePath,
		JSON.stringify(object, null, 2),
		(err) =>
		{
			if (err) {
				console.error(err)
				throw err;
			}
		}
	);
}

/*
 * used to write the supported views object to file both in total and "cleaned"
 */
const createSupportedViewsObject: Function = function(): void
{

    //parse the xml
    parseExtractedXML(`${extractionDirectory}FILE-META-1.xml`);

    //create the total supported Views object
	writeJSONtoFile(`${outputImageData}supported_views.json`, supportedViews);

    //cleanup and create "smart" supported views object without whole metadata
    cleanSupportedViews(supportedViews);
    supportedViews.scalable_image.metadata = {};
	writeJSONtoFile(`${outputImageData}supported_views_minus_xml.json`, supportedViews);
}

/*
 * Used to build up a pyramid for each value of c from the base images
 */
const buildCustomPyramids:Function = async function buildCustomPyramids(): Promise<void>
{
    //set some variables for errors and and percent counts
    let errorOccurred: Boolean;
	finalCZIJson.zoom_level_count = Math.sqrt(maxZoom);
	finalCZIJson.c_values = [] as any;
	finalCZIJson.c_value_count = 0;

    //for all channels in the base image
	for (const cval of supportedViews.scalable_image.channels) {
        errorOccurred = false;
        if (!errorOccurred) {
            //extract the base tiles and build up custom pyramid data
    		await extrapolateDimension(Number.parseInt(cval.channel_id, 10), supportedViews.scalable_image.channels.length * Math.sqrt(maxZoom), maxZoom)
            .then((v: CZIHeightMap[]) =>
                {
                    // on success, add the new heightmap to the final json data block
    				finalCZIJson.c_values.push({channel_id: cval.channel_id, height_map: v});
    				finalCZIJson.c_value_count++;
    				return;
        		}
    		).catch((err: Error) =>
                {
                    // on error, write the error to console and set an error true.
                    if (err) {
                        console.error(err);
                    }
                    errorOccurred = true;
                }
            );
        }
        else {
            console.error("\nAn error occurred while extracting dimension: " + cval);
            console.error("Skipping futher elements and moving to next dimension.\n\n");
        }
        //write the final json data to file with most recent changes
		writeJSONtoFile(`${outputImageData}layout.json`, finalCZIJson);
	}
}










let finalCZIJson: WholeCZIHierarchy = {} as any;
/*
 * Main function used to call the rest of the relevant code to crunch a CZI extraction.
 */
function main(){
	console.log("\n");

    console.log(">> Checking/Creating output directories...")
    checkForOutputDirectories([outputImageData, outputImageDirectory]);

    console.log(">> Creating Supported Views and writing files...")
    createSupportedViewsObject();

    console.log("");
    buildCustomPyramids();
}
main();
// async function main2() {
//
// 	let layout: WholeCZIHierarchy = require(`${outputImageData}layout.json`);
// 	let retHeightMap: CZIHeightMap = require(`${outputImageData}stageMap-1`);
// 	filecoutner = 5365;
//
// 	for (let stage:number = 2; stage < Math.sqrt(maxZoom); stage++) {
// 		console.log(`Stage (${0 * Math.sqrt(maxZoom) + 1 + stage}/${1}):`);
// 		await zoomTier(retHeightMap)
// 		.then((v: CZIHeightMap) =>
// 			{
//         		writeJSONtoFile(`${outputImageData}stageMap-${stage}`, v);
// 				return;
// 			}
// 		);
// 	}
// }
//
// main2().then();

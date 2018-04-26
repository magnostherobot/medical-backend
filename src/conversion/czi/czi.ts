import { CZIHeightMap, CZITile,
	WholeCZIHierarchy } from '../types/customPyramidIndex';
import { Dimension, Segment } from '../types/cziBinaryTypings';
import * as fs from 'fs';
import { SupportedViews, TileBounds, checkForOutputDirectories, writeJSONToFile, execpaths } from '../types/helpers';
import { logger, Logger } from '../../logger';
import * as sharp from 'sharp';
// tslint:disable-next-line:no-duplicate-imports
import { SharpInstance } from 'sharp';
import { isTileRelated, regionToExtract } from '../types/tileExtraction';
import * as parsexml from 'xml-parser';
import { uuid } from '../../uuid'
import { queue as jobQueue, Promiser as Job } from '../../ppq'
import { profiler } from '../../profiler';
import { exec } from '../types/exec'

let log: Logger;
const THREAD_LIMIT: number = 2;
sharp.concurrency(THREAD_LIMIT);
const readFile = require('util').promisify(fs.readFile);
const readdir = require('util').promisify(fs.readdir);
const exists = require('util').promisify(fs.exists);


// Various constants for placing files and defining tiles
let extractDirectory: string = "";
let outputImageData: string = "";
let outputImageDirectory: string = "";
let supportedViews: SupportedViews;
let totalSizeX: number = -1;
let totalSizeY: number = -1;
let fileName: string = "unset filename";
const tileOverlap: number = 0; // Overlap is only half implemented
const tileSize: number = 1024;
const maxZoom: number = 64;
const shell = require('shelljs');
const finalCZIJson: WholeCZIHierarchy = {
	c_value_count: 0,
	total_files: 0,
	complete: false,
	c_values: [],
	zoom_level_count: 0
};
let dataBlocks: Segment[] = [];

/**
 * Simple function to find the tile bounds version of an original tile
 * in the base image
 */
const getOriginalTileBounds: (originalTile: Segment) => TileBounds = (
	originalTile: Segment
): TileBounds => {
	const bounds: TileBounds = new TileBounds(-1, -1, -1, -1);

	// Loop over all dimensions to get the x and y
	for (const dimension of originalTile.Data.DirectoryEntry.DimensionEntries) {
		switch (dimension.Dimension) {
			// If we have found x, then match the start and width
			case 'X':
				bounds.left = dimension.Start;
				bounds.right = bounds.left + dimension.Size;
				continue;
			// If we have found y, then match the top and bottom
			case 'Y':
				bounds.top = dimension.Start;
				bounds.bottom = bounds.top + dimension.Size;
				continue;
			default:
				continue;
		}
	}

	// If one of the bounds was not created, then there must have been an error
	if (bounds.left   < 0
	 || bounds.right  < 0
	 || bounds.top    < 0
	 || bounds.bottom < 0
	) {
		throw new Error(
			`One of the bounds had a dimension less than zero: ${originalTile.Data.Data}`
		);
	}
	// Successful return
	return bounds;
};

/**
 * Function used to find which of the original base tiles are
 * overlapping with the area of the to-be-created tile
 */
const findRelatedTiles: (activeSegments: Segment[], desired: TileBounds) =>
	Segment[] = (
		activeSegments: Segment[], desired: TileBounds
): Segment[] => {
	const relatedTiles: Segment[] = [];

	// For all tiles within the region being checked
	for (const baseTile of activeSegments) {
		if (isTileRelated(getOriginalTileBounds(baseTile), desired)) {
			relatedTiles.push(baseTile);
		}
	}

	return relatedTiles;
};

/**
 * This gets the particular dimension from a segment given a segment
 * and dimension ID
 */
const getDimension: (segment: Segment, name: string) => Dimension = (
	segment: Segment, name: string
): Dimension => {
	for (const dimension of segment.Data.DirectoryEntry.DimensionEntries) {
		// If the current dimension is the one we are looking for then return it.
		if (dimension.Dimension === name) {
			return dimension;
		}
	}
	// If we have gotten to here, then the dimension doesnt exist, so throw error.
	throw new Error(`Dimension: ${name} doesn't exist for segment: ${segment}`);
};

/**
 * This takes a selection of segments and ensures that they are ordered
 * left to right, and top to bottom like the words in a book, so that the
 * stiching process will take the correct slice from them all.
 * (this is based on the pixel x-y coords of the segment.)
 */
const orderSegments: (segments: Segment[]) => Segment[][] = (
	segments: Segment[]
): Segment[][] => {
	const output: Segment[][] = [];

	// So long as there is at least 2 segments to order
	if (segments.length > 1) {
		let xCoords: number[] = [];
		let yCoords: number[] = [];

		// Get all x/y's;
		// However also ensure that all of the segments to be ordered, all come
		// From the same value of 'C' dimension, otherwise there could be overlaps.
		const initC: number = getDimension(segments[0], 'C').Start;
		for (const seg of segments) {
			if (getDimension(seg, 'C').Start !== initC) {
				throw new Error(`Segment array contains multiple values of C -\
					this overlay is currently unsupported within this method`);
			}
			xCoords.push(getDimension(seg, 'X').Start);
			yCoords.push(getDimension(seg, 'Y').Start);
		}

		// Filter to get Unique Values
		const filter: (item: number, index: number, array: number[]) => boolean = (
			item: number, index: number, array: number[]
		): boolean => array.indexOf(item) === index;
		xCoords = xCoords.filter(filter);
		yCoords = yCoords.filter(filter);

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

	// There is only one segment, so no need to re-order.
	return [segments];
};

/**
 * Takes a base tile, and the whole bounds of a new tile, and uses this
 * to calculate the region within the base tile that is overlapping the new tile
 * to be extracted.
 */
const findRegionToExtract: (
	segmanet: Segment, desired: TileBounds
) => TileBounds = (
	segment: Segment, desired: TileBounds
): TileBounds => {
	// Return the slice within the base tile for extraction
	return regionToExtract(getOriginalTileBounds(segment), desired, 1);
};

/*
 * Take an ordered selection of segments and cookie cutter out a tile from this
 * into a new image
 */
 const extractAndStitchChunks: (
 	segments: Segment[][], desiredRegion: TileBounds
 ) => Promise<SharpInstance> = async(
 	segments: Segment[][], desiredRegion: TileBounds
 ): Promise<SharpInstance> => {

    // Create a buffer for the rows part of raw image data
	const tileVerticalBuffer: Buffer[] = [];

	// For all ros (y coords) in the image
	for (const segRow of segments) {
		// Create a buffer for this row
		const tileRow: Buffer[] = [];
		let chunkToExtract: TileBounds = new TileBounds(-1, -1, -1, -1);

		// For all of the columns within this row
		for (const segCol of segRow) {
			// Find out the region of the base tile to be added to the new image
			chunkToExtract = findRegionToExtract(segCol, desiredRegion);
			let localSharp: SharpInstance = sharp(`${extractDirectory}${segCol.Data.Data}`);
			// Extract this section of image data into a sharp buffer
			let data: Job<Buffer> =
				localSharp
				.extract({
					left: chunkToExtract.left,
					top: chunkToExtract.top,
					width: chunkToExtract.right - chunkToExtract.left,
					height: chunkToExtract.bottom - chunkToExtract.top
				}).toBuffer;

			// Push this data into the row buffer
			tileRow.push(await jobQueue.enqueue(10, data, localSharp));
		}

		// Prepare variables to squash all of the column data into one, for this row
		let imageVerticalSlice: SharpInstance = sharp(tileRow[0]);
		const bufferBound: TileBounds = findRegionToExtract(segRow[0], desiredRegion);
		// Check if the inital chunk needs to be extended to support the other columns
		if ((bufferBound.right - bufferBound.left) < (tileSize - tileOverlap)) {
			imageVerticalSlice = imageVerticalSlice.extend({
				top: 0,
				left: 0,
				bottom: 0,
				right: (tileSize - (bufferBound.right - bufferBound.left))
			});
		}
		// For every column along this row, join it to the previous column data
		for (let index: number = 1; index < segRow.length; index++) {
			imageVerticalSlice = imageVerticalSlice
				.overlayWith(tileRow[index], {
					top: 0,
					left: (bufferBound.right - bufferBound.left)
						+ ((index - 1) * tileSize)
				});
		}

		// Add this horizontal data buffer to the vertical buffer
		tileVerticalBuffer.push(await jobQueue.enqueue(10, imageVerticalSlice.toBuffer as Job<Buffer>, imageVerticalSlice));
	}

	// Prepare variables used to combine all rows into one image
	let finalImage: SharpInstance = sharp(tileVerticalBuffer[0]);
	const bufferBound: TileBounds =
		findRegionToExtract(segments[0][0], desiredRegion);
	// Check if the inital row needs to be extended to support further rows
	if ((bufferBound.bottom - bufferBound.top) < (tileSize - tileOverlap)) {
		finalImage = finalImage
							.background({
								r: 0,
								g: 0,
								b: 0,
								alpha: 1
							}).extend({
								top: 0,
								left: 0,
								bottom: (tileSize - (bufferBound.bottom - bufferBound.top)),
								right: 0
							});
	}
	// For all further rows in the image, combine it with the previous rows' data
	for (let index: number = 1; index < segments.length; index++) {
		finalImage = finalImage.overlayWith(
			tileVerticalBuffer[index],
			{top: getDimension(segments[index - 1][0], 'Y').Size, left: 0});
	}

	// Return the finalised image.
	if ((await jobQueue.enqueue(5, finalImage.metadata as Job<sharp.Metadata>, finalImage)).channels != 4) {
		return sharp(Buffer.alloc(tileSize, tileSize), {
			create: {
				width: tileSize,
				height: tileSize,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 1 }
			}
		}).overlayWith(await jobQueue.enqueue(5, finalImage.toBuffer as Job<Buffer>, finalImage));
	} else {
		return finalImage;
	}
	// .toFile("/cs/home/cjd24/Documents/current/groupPractical/project-code/src/conversion/czi/test1.png");
}

/**
 * Used to remove obtuse JSON data,
 * where it is not needed in the SupportedView object
 */
const cleanSupportedViewObject: (obj: parsexml.Node[]) => object = (
	obj: parsexml.Node[]
): object => {
	const newChild: any = {};
	let hasAttr: boolean = false;
	let hasChildren: boolean = false;
	let hasContent: boolean = false;

	// For all nodes in the json object
	for (const node of obj) {

		// Check if this node has attributes
		hasAttr = (node.attributes !== undefined
			&& node.attributes !== null
			&& Object.keys(node.attributes).length !== 0
		);
		// Check for further children
		hasChildren = (node.children !== undefined && node.children.length > 0);
		// Check for simple content object
		hasContent = (node.content !== undefined
			&& node.content !== null
			&& node.content !== '');

		// If the Node has further children, then deal with this
		if (hasChildren) {
			let soloChildren: boolean = true;

			// Check if this node just contains children, or its own data too
			newChild[node.name] = {};
			if (hasAttr) {
				// If there are also attributes, then set this in the output
				newChild[node.name].attributes = node.attributes;
				soloChildren = false;
			}
			if (hasContent) {
				// If there is also a 'content' then set this in the output
				newChild[node.name].content = node.content;
				soloChildren = false;
			}
			// If there are only chilren, then set this as this objects data
			if (soloChildren) {
				// Recursively call this function to clean up sub-children too.
				newChild[node.name] = cleanSupportedViewObject(node.children);
			} else {
				// Otherwise, if there is also data, then add a children object
				newChild[node.name].children = cleanSupportedViewObject(node.children);
			}
		} else if (hasAttr) {
			newChild[node.name] = {};

			// Check for content too, if so, add a discrete child for this.
			if (hasContent) {
				newChild[node.name].content = node.content;
			}
			/*
			 * Add the attributes as a sub child regardless,
			 * since it exists on this key.
			 */
			newChild[node.name].attributes = node.attributes;
		} else if (hasContent) {
			newChild[node.name] = node.content;
		}
	}

	return newChild;
};

/**
 * Clean up all vales of C within the JSON for supported views
 */
const cleanSupportedViews: (view: SupportedViews) => void = (
	view: SupportedViews
): void => {
	if (!view.scalable_image) {
		throw new Error("SupportedView.scalable_image does not exist where it should.");
	}
	for (const channel of view.scalable_image.channels) {
		channel.metadata = cleanSupportedViewObject(
			channel.metadata as parsexml.Node[]
		);
	}
};

/* tslint:disable:curly cyclomatic-complexity */
/*
 * Function to parse the xml file from the original extraction from CZI,
 * its nasty!
 */
const parseExtractedXML: (xmlFile: string) => void = async(
	xmlFile: string
): Promise<void> => {
	const metaXML: parsexml.Document = parsexml(await readFile(xmlFile, 'utf8'));
	// Parse the XML :(
	// THE FOLLOWING 2 FOR LOOPS ARE DISGUSTING AND I HATE IT,
	// AND I WISH I DIDNT WRITE IT BUT DON'T SEE ANY OTHER WAY TO DO IT LOL :'(
	if (!supportedViews.scalable_image) {
		throw new Error("SupportedView.scalable_image does not exist where it should.");
	}
	for (const child of metaXML.root.children) if (child.name === 'Metadata') {
		for (const entry of child.children)	if (entry.name === 'Information') {
			for (const properties of entry.children) if (properties.name === 'Image') {
				for (const property of properties.children) if (
					property.name === 'SizeX' && property.content
				) {
					totalSizeX = Number.parseInt(property.content, 10);
					supportedViews.scalable_image.width = totalSizeX;
					continue;
				} else if (property.name === 'SizeY' && property.content) {
					totalSizeY = Number.parseInt(property.content, 10);
					supportedViews.scalable_image.height = totalSizeY;
					continue;
				} else if (property.name === 'Dimensions') {
					for (const chan of property.children) if (chan.name === 'Channels') {
						for (const channel of chan.children) {
							supportedViews.scalable_image.channels.push({
								channel_id: channel.attributes.Id.split(':')[1],
								channel_name: channel.attributes.Name,
								metadata: channel.children
							});
						}
					}
				}
				break;
			}
			break;
		}
		break;
	}
	for (const child of metaXML.root.children) if (child.name === 'Metadata') {
		for (const entry of child.children) if (entry.name === 'Scaling') {
			for (const properties of entry.children) if (properties.name === 'Items') {
				for (const dist of properties.children) if (dist.name === 'Distance') {
					switch (dist.attributes.Id) {
						case 'X': {
							supportedViews.scalable_image.real_width = {};
							for (const attr of dist.children) {
								if (attr.name === 'Value' && attr.content !== undefined) {
									supportedViews.scalable_image.real_width.value =
										Number.parseFloat(attr.content) * 1000000 * totalSizeX;
								} else if (attr.name === 'DefaultUnitFormat') {
									supportedViews.scalable_image.real_width.units = attr.content;
								}
							}
							break;
						}
						case 'Y': {
							supportedViews.scalable_image.real_height = {};
							for (const attr of dist.children) {
								if (attr.name === 'Value' && attr.content !== undefined) {
									supportedViews.scalable_image.real_height.value =
										Number.parseFloat(attr.content) * 1000000 * totalSizeY;
								} else if (attr.name === 'DefaultUnitFormat') {
									supportedViews.scalable_image.real_height.units = attr.content;
								}
							}
							break;
						}
					}
				}
				break;
			}
			break;
		}
		break;
	}
	supportedViews.scalable_image.metadata = metaXML;
};
/* tslint:enable:curly cyclomatic-complexity */

////////////////////////////////////////////////////////////////////////////////
// Begin work on getting the new tiles all nice
////////////////////////////////////////////////////////////////////////////////

/**
 * This is used to create the next zoomed out tier of the given height map
 */
const zoomTier: (
	previousHeightMap: CZIHeightMap, p: number, c: number
) => Promise<CZIHeightMap> = async(
	previousHeightMap: CZIHeightMap, p: number, c: number
): Promise<CZIHeightMap> => {

	const squashRow = async (previousPlane: CZITile[][], ys: number, p: number): Promise<CZITile[]> => {

		const squashQuad = async (previousPlane: CZITile[][], ys: number, xs: number, p: number): Promise<CZITile> => {
            if (await exists(`${outputImageDirectory}img-c${c}-p${p}-y${ys * tileSize}-x${xs * tileSize}.png`) && (ys < previousPlane.length)) {
                finalCZIJson.total_files++;
                return {
                    x_offset: xs * tileSize,
                    y_offset: ys * tileSize,
                    width: tileSize,
                    height: tileSize,
                    file: `img-c${c}-p${p}-y${ys}-x${xs}.png`
                };
            }

			// Combine 4 tiles into a new tile and scale down for this tier
			// Top left
			let quadrents:string = `${outputImageDirectory}${previousPlane[ys][xs].file} `;
			let across:number = 1;
			let quadrentCount: number = 1;

			// Combine top right
			const moreToRight: boolean = (xs + 1) < previousPlane[0].length;
			if (moreToRight) {
				quadrents += `${outputImageDirectory}${previousPlane[ys][xs + 1].file} `;
				across++; quadrentCount++;
			}
			// Combine bottom left
			const moreToBottom: boolean = (ys + 1) < previousPlane.length;
			if (moreToBottom) {
				quadrents += `${outputImageDirectory}${previousPlane[ys + 1][xs].file} `;
				quadrentCount++;
			}
			// Combine bottom right
			if (moreToBottom && moreToRight) {
				quadrents += `${outputImageDirectory}${previousPlane[ys + 1][xs + 1].file} `;
			}

            let outputFileName: string =`${outputImageData}/tmp/${uuid.generate()}.png`;

            try {
				await new Promise((res) => {
	        		shell.exec(`${execpaths} vips arrayjoin "${quadrents}" ${outputFileName} --across ${across} --vips-concurrency=${THREAD_LIMIT}`);
					res();
				});
            } catch (err) {
                if (err) {
                    log.fatal(err);
                }
            }

            // Rescale and push to file
    		if (quadrentCount !== 3) {

    			let extRight: number = 0, extBottom: number = 0;
    			if (moreToRight) {
    				extBottom = tileSize;
    			} else if (moreToBottom){
    				extRight = tileSize;
    			}

    			let fullTileQuadRef: SharpInstance = sharp(outputFileName)
    				.background({r: 0, g: 0, b: 0, alpha: 1})
    				.extend({
    					top: 0, left: 0,
    					bottom: extBottom, right: extRight
    				});
    			let fullTileQuad: Buffer = await jobQueue.enqueue(5, fullTileQuadRef.toBuffer as Job<Buffer>, fullTileQuadRef);

    			let rescaledTileQuadRef: SharpInstance = sharp(fullTileQuad)
    				.resize(tileSize, tileSize);

    			await jobQueue.enqueue(5, rescaledTileQuadRef.toFile as Job<sharp.OutputInfo>, rescaledTileQuadRef,
    				`${outputImageDirectory}img-c${c}-p${p}-y${ys * tileSize}-x${xs * tileSize}.png`);
    		} else {
    			let fullTileQuadRef: SharpInstance = sharp(outputFileName)
    				.resize(tileSize, tileSize)

    			await jobQueue.enqueue(5, fullTileQuadRef.toFile as Job<sharp.OutputInfo>, fullTileQuadRef,
    				`${outputImageDirectory}img-c${c}-p${p}-y${ys * tileSize}-x${xs * tileSize}.png`);
    		}

    		fs.unlink(`${outputFileName}`, (err) => {
    			if (err) {
    				log.warn(fileName + ' Error when deleting redundant resource: \n' + err.stack)
    			}
    		});

    		finalCZIJson.total_files++;
    		return {
    			x_offset: previousPlane[ys][xs].x_offset,
    			y_offset: previousPlane[ys][xs].y_offset,
    			width: previousPlane[ys][xs].width * 2,
    			height: previousPlane[ys][xs].height * 2,
    			file: `img-c${c}-p${p}-y${ys * tileSize}-x${xs * tileSize}.png`
    		};
		}

		const cziRow: Promise<CZITile>[] = [];
		// For all columns within the previous plane
		for (let xs: number = 0; xs < previousPlane[0].length; xs += 2) {
			cziRow.push(squashQuad(previousPlane, ys, xs, p));
		}

		return await Promise.all(cziRow);
	}

	const newZoomTier: CZIHeightMap = {
		zoom_level: previousHeightMap.zoom_level * 2, plane: []
	};

	// Check the condition where another zoom level does not make sense
	if (previousHeightMap.plane.length === 1
	 && previousHeightMap.plane[0].length === 1) {
		log.notice(fileName +
			'         Task(1/1):     ' +
			'Stage 100% complete. ' +
			'Stage was skipped as maximum sensible zoom level was reached.'
		);
		return previousHeightMap;
	}

	const newplane: CZITile[][] = [];
	// For all rows within the previous plane
	for (let ys: number = 0; ys < previousHeightMap.plane.length; ys += 2) {
		newplane.push(await squashRow(previousHeightMap.plane, ys, p));

		log.debug(fileName +
			`         Task(${ys / 2 + 1}/${
				Math.floor(previousHeightMap.plane.length / 2) + 1}):     ` +
			`Stage ${Math.ceil(((ys / previousHeightMap.plane.length)
						* 100) * 100) / 100}% complete. `
		);
	}

	newZoomTier.plane = newplane;
	newZoomTier.tile_height_count = newZoomTier.plane.length;
	newZoomTier.tile_width_count = newZoomTier.plane[0].length;

	return newZoomTier;
};

/**
 * Big boi function to build up the base tier of each value of c, then builds
 * Our pre-computed pyramid of the rest of the zoom levels.
 */
const extrapolateDimension: (
	cVal: number, totalCs: number, maxZoom: number
) => Promise<CZIHeightMap[]> = async(
	cVal: number, totalCs: number, maxZoom: number
): Promise<CZIHeightMap[]> => {

	const doOneRow = (ys: number, filteredDataBlocks: Segment[]): Promise<CZITile[]> => {

		const doOneBaseTile = async(xs: number, ys: number, filteredDataBlocks: Segment[]): Promise<CZITile> => {
			if (await exists(`${outputImageDirectory}img-c${cVal}-p0-y${ys}-x${xs}.png`) && (ys + tileSize < totalSizeY)) {
				///////////////////////////////////////////////////////////////////////////////////This if statement should be temporary??????????????????????????????????/
				finalCZIJson.total_files++;
				return {
					x_offset: xs,
					y_offset: ys,
					width: tileSize,
					height: tileSize,
					file: `img-c${cVal}-p0-y${ys}-x${xs}.png`
				};
			}
			const desired: TileBounds = new TileBounds(
				xs - tileOverlap,
				xs + tileSize + tileOverlap,
				ys - tileOverlap,
				ys + tileSize + tileOverlap
			);

			const sortedSegments: Segment[][] =
				orderSegments(findRelatedTiles(filteredDataBlocks, desired));

			(await extractAndStitchChunks(sortedSegments, desired))
			.toFile(`${outputImageDirectory}img-c${cVal}-p0-y${ys}-x${xs}.png`);

			return {
				x_offset: xs,
				y_offset: ys,
				width: tileSize,
				height: tileSize,
				file: `img-c${cVal}-p0-y${ys}-x${xs}.png`
			};
		}

		const rowPromises: Promise<CZITile>[] = [];

		for (let xs: number = 0; xs < totalSizeX; xs += tileSize) {
			rowPromises.push(doOneBaseTile(xs, ys, filteredDataBlocks));
			finalCZIJson.total_files++;
		}

		return Promise.all(rowPromises);
	}

	const filteredDataBlocks: Segment[] = dataBlocks.filter(
		(item: Segment, index: number, array: Segment[]) =>
			getDimension(item, 'C').Start === cVal
	);
	// Begin output for the base tier
	// console.log('=========================================================');
	log.notify(`${fileName} > Beginning Dimension Extrapolation for \'C\' : ${cVal}`);
	// console.log('=========================================================');
	// console.log('>> Computing base tier, this will take a while...\n');
	const baseCZIHeightMap: CZIHeightMap = {zoom_level: 1, plane: []};

	log.notify(`${fileName} > Stage (${cVal * Math.log2(maxZoom) + 1}/${totalCs}):`);
	// For all rows within the total base pixel height
	const plane: CZITile[][] = [];

	for (let ys: number = 0; ys < totalSizeY; ys += tileSize) {
		plane.push(await doOneRow(ys, filteredDataBlocks));

		process.stdout.write("\r");
		log.info(fileName +
			`         Task(${ys / tileSize}/${Math.ceil(totalSizeY / tileSize)}):     ` +
			`Stage ${Math.ceil(((ys / totalSizeY) * 100) * 100) / 100}% complete. `
		);
	}
	baseCZIHeightMap.plane = plane;
	baseCZIHeightMap.tile_height_count = baseCZIHeightMap.plane.length;
	baseCZIHeightMap.tile_width_count = baseCZIHeightMap.plane[0].length;

	// BUILD UP THE HIGHER ZOOM LAYERS.
	// console.log(`>> Base tier complete for \'C\': ${cVal
	// 	}; Begin computing zoom tiers...\n`);

	const retHeightMap: CZIHeightMap[] = [baseCZIHeightMap];
	writeJSONToFile(`${outputImageData}/intermediate-stage-map.json`, retHeightMap);
	for (let stage: number = 1; stage <= Math.log2(maxZoom); stage++) {
		log.notify(`${fileName} > Stage (${cVal * Math.log2(maxZoom) + 1 + stage}/${totalCs}):`);
		await zoomTier(retHeightMap[stage - 1], stage, cVal)
		.then((v: CZIHeightMap) => {
				retHeightMap.push(v);
				return;
			}
		);
		writeJSONToFile(`${outputImageData}/intermediate-stage-map.json`, retHeightMap);
	}

	log.notify(`${fileName} > Completed Extrapolation for dimension, \'C\': ${cVal}`);
	return retHeightMap;
};


/**
 * used to write the supported views object to file both in total and "cleaned"
 */
const createSupportedViewsObject: (skipping: boolean) => void = async(skipping: boolean): Promise<void> => {

		dataBlocks = require(`${extractDirectory}outputjson.json`)
			.czi.filter((s: Segment) =>
				s.Id === 'ZISRAWSUBBLOCK' && s.Data.Data !== 'empty'
			);

		if (!skipping) {
			supportedViews = {
				scalable_image: {
					width: -1,
					height: -1,
					channels: [{
						channel_id: '-1',
						channel_name: ''
					}],
					metadata: {}
				}
			};
			if (!supportedViews.scalable_image) {
				throw new Error("SupportedView.scalable_image does not exist where it should.");
			}
			supportedViews.scalable_image.channels.pop();

			// Parse the xml
			await parseExtractedXML(`${extractDirectory}FILE-META-1.xml`);

			// Create the total supported Views object
			// !!!!! This line was removed in order to reduce the output file size and
			// !!!!! increase the usability by only giving the striped down version
			// writeJSONToFile(`${outputImageData}/supported_views.json`, supportedViews);

			// Cleanup and create "smart" supported views object without whole metadata
			cleanSupportedViews(supportedViews);
			if (!supportedViews.scalable_image) {
				throw new Error("SupportedView.scalable_image does not exist where it should.");
			}
			supportedViews.scalable_image.metadata = {
				tile_size: tileSize,
				max_zoom: maxZoom,
				tile_overlap: tileOverlap
			};
			writeJSONToFile(`${outputImageData}/supported_views.json`, supportedViews);
		}
};

/**
 * Used to build up a pyramid for each value of c from the base images
 */
const buildCustomPyramids: () => Promise<boolean> = async(): Promise<boolean> => {
	// Set some variables for errors and and percent counts
	let successfulBuild: boolean = false;
	finalCZIJson.zoom_level_count = Math.log2(maxZoom) + 1;

	// For all channels in the base image
	if (!supportedViews.scalable_image) {
		throw new Error("SupportedView.scalable_image does not exist where it should.");
	}
	for (const cval of supportedViews.scalable_image.channels) {

		successfulBuild = true;
		if (successfulBuild) {
			// Extract the base tiles and build up custom pyramid data
			await extrapolateDimension(
				Number.parseInt(cval.channel_id, 10),
				supportedViews.scalable_image.channels.length * Math.log2(maxZoom * 2),
				maxZoom
			).then((v: CZIHeightMap[]) => {
				// On success, add the new heightmap to the final json data block
				finalCZIJson.c_values.push({channel_id: cval.channel_id, height_map: v});
				finalCZIJson.c_value_count++;
				return;
			}).catch((err: Error) => {
					// On error, write the error to console and set an error true.
					if (err) {
						console.error(err.message);
						console.log(err.stack);
					}
					successfulBuild = false;
				}
			);
		} else {
			log.error(`${fileName} > An error occurred while extracting dimension: ${cval}`);
			log.warn(`${fileName} > Skipping futher elements and moving to next dimension.\n\n`);
		}
		// Write the final json data to file with most recent changes
		writeJSONToFile(`${outputImageData}/layout.json`, finalCZIJson);
	}
	if (successfulBuild) {
		finalCZIJson.complete = true;
	}
	writeJSONToFile(`${outputImageData}/layout.json`, finalCZIJson);
	return successfulBuild;
};

const initialExtractAndConvert: (absFilePath: string, space: string) => Promise<void> = async (absFilePath: string, space: string): Promise<void> => {

	checkForOutputDirectories([outputImageData, extractDirectory]);
	log.silly(`${fileName} > This will complete at roughly 2GB/min`);

	await exec(`${execpaths} CZICrunch "${absFilePath}" "${extractDirectory}"`);
	await exec(`${execpaths} python3 ./ext/bin/convertJxrs.py "${extractDirectory}"`);

	// let totalFiles: number = 0, counter: number = 0;
	// console.log("=========== BEGIN JXR CONVERSION ===========")
    //
	// let filenames: string[] = (await readdir(extractDirectory)).filter((x: string) => x.endsWith(".jxr"));
	// counter = 0
	// totalFiles = filenames.length;
    //
	// const doOne: (n: number, file: string, asTif: string) => Promise<void> = async(n: number, file: string, asTif: string): Promise<void> => {
	// 	shell.exec(`${execpaths} JxrDecApp -i ${file} -o ${asTif}`);
	// 	shell.exec(`convert ${asTif} ${file.substring(0, file.lastIndexOf('.'))}.png`);
	// 	shell.exec(`rm ${file} ${asTif}`);
	// 	console.log (`> Processed File: ${n}/${totalFiles}   :   ${file}  -->  ${file.substring(0, file.lastIndexOf('.'))}.png`);
	// }
    //
	// try {
	// 	let promises: Promise<void>[] = [];
	// 	for (let index: number = 0; index < filenames.length; index++) {
    //
	// 		if (promises.length < 30) {
	// 			let file = extractDirectory + filenames[index];
	// 			promises.push(doOne(counter++, file, file.substring(0, file.lastIndexOf('.')) + ".tif"));
	// 		} else {
	// 			index--;
	// 			await Promise.all(promises);
	// 			promises.length = 0;
	// 		}
	// 	}
	// 	await Promise.all(promises);
	// } catch (err) {
	// 	console.log("Processing Failed. Probably couldn't find decoder due to invalid system environment path, check this before debugging. Actual Err:");
	// 	console.error(err);
	// }
	// console.log("=========== FINISH JXR CONVERSION ===========")
}

process.on("warning", (err: any) => console.warn(err))
/**
 * Main function used to call the rest of the relevant code to crunch a CZI
 * extraction.
 */
export const main: (original: string, space:string) => Promise<void> = async (original: string, space:string): Promise<void> => {
fileName = `${original.split('/')[original.split('/').length - 1]}`;
log = logger.for({component: "CZI Crunch", targetFile: original});
log.notice("CZI Convertor Received new file: " + fileName);

	try {
		outputImageData = space;
		extractDirectory = outputImageData + "/extract/";
		outputImageDirectory = outputImageData + "/data/";

		if (!(await exists(`${outputImageData}/supported_views.json`))) {
			log.information(`${fileName} > Begin Extracting and Converting to PNG`);
			await initialExtractAndConvert(original, space);

			log.information(`${fileName} > Checking/Creating output directories...`);
			checkForOutputDirectories([outputImageDirectory, `${outputImageData}/tmp/`]);

			log.information(`${fileName} > Creating Supported Views and writing files...`);
			await createSupportedViewsObject(false);
		} else {
			log.notify("It appears as though this CZI has already been extracted, loading files...");
			await createSupportedViewsObject(true);
			supportedViews = require(`${outputImageData}/supported_views.json`);
		}

		if (!supportedViews.scalable_image) {
			throw new Error("lol this wont ever show :)");
		}
		totalSizeX = supportedViews.scalable_image.width;
		totalSizeY = supportedViews.scalable_image.height;

		if (await buildCustomPyramids()) {
			log.alert(`UNCOMMENT ME AGAIN ${fileName} > Removing the initial extraction bloat`);
//			shell.exec(`rm -rf ${outputImageData}/extract/`)
		};

		log.success(`${fileName} > Done`);
	} catch (Err) {
		log.critical(`${fileName} > This was a really big boi error, and something is sad: `);
		log.critical(Err);
		throw Err;
	}
};







// console.log("REMEMBER TO REMOVE THE MAIN CALL AGAIN MR GOOSEMUN!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
//main("/cs/scratch/cjd24/0702.czi", "/cs/scratch/cjd24/0702-extract");

// /* tslint:disable */
// async function main2() {
//
// 	let layout: WholeCZIHierarchy = require(`${outputImageData}layout.json`);
//
// 	for (let stage:number = 1; stage < Math.sqrt(maxZoom); stage++) {
// 		await zoomTier(layout.c_values[0].height_map[stage - 1])
// 				.then((v: CZIHeightMap) =>
// 					{
// 						writeJSONToFile(`${outputImageData}stageMap-${stage}.json`, v);
// 						return;
// 					}
// 				);
// 	}
// }
//
// main2().then().catch(e => console.log(e));

import { CZIHeightMap, CZITile,
	WholeCZIHierarchy } from '../types/customPyramidIndex';
import { Dimension, Segment } from '../types/cziBinaryTypings';
import * as fs from 'fs';
import { SupportedViews, TileBounds, checkForOutputDirectories, writeJSONToFile, execpaths } from '../types/helpers';
// import { logger } from '../../logger';
import * as sharp from 'sharp';
// tslint:disable-next-line:no-duplicate-imports
import { SharpInstance } from 'sharp';
import { isTileRelated, regionToExtract } from './tileExtraction';
import * as parsexml from 'xml-parser';
import { uuid } from '../../uuid'

// Various constants for placing files and defining tiles
const baseDirname: string = '/cs/scratch/cjd24/0701-extraction';
const extractionDirectory: string = `${baseDirname}/`;
const outputImageData: string = `${baseDirname}-processed/`;
const outputImageDirectory: string = `${baseDirname}-processed/data/`;
const tileOverlap: number = 0; // Overlap is only half implemented
const tileSize: number = 1024;
const maxZoom: number = 64;
const shell = require('shelljs');

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
 	segments: Segment[][], desiredRegion: TileBounds, tmp: number
 ) => Promise<SharpInstance> = async(
 	segments: Segment[][], desiredRegion: TileBounds, tmp: number
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
			// Extract this section of image data into a sharp buffer
			const data: Promise<Buffer> =
				sharp(`${extractionDirectory}${segCol.Data.Data}`)
				.extract({
					left: chunkToExtract.left,
					top: chunkToExtract.top,
					width: chunkToExtract.right - chunkToExtract.left,
					height: chunkToExtract.bottom - chunkToExtract.top
				})
				.toBuffer();

			// Push this data into the row buffer
			tileRow.push(await data);
		}

		// Prepare variables to squash all of the column data into one, for this row
		let imageVerticalSlice: SharpInstance = sharp(tileRow[0]);
		const bufferBound: TileBounds = findRegionToExtract(segRow[0], desiredRegion);
		// Check if the inital chunk needs to be extended to support the other columns
		if ((bufferBound.right - bufferBound.left) < (tileSize - tileOverlap)) {
			imageVerticalSlice = await imageVerticalSlice.extend({
				top: 0,
				left: 0,
				bottom: 0,
				right: (tileSize - (bufferBound.right - bufferBound.left))
			});
		}
		// For every column along this row, join it to the previous column data
		for (let index: number = 1; index < segRow.length; index++) {
			imageVerticalSlice = await imageVerticalSlice
				.overlayWith(tileRow[index], {
					top: 0,
					left: (bufferBound.right - bufferBound.left)
						+ ((index - 1) * tileSize)
				});
		}

		// Add this horizontal data buffer to the vertical buffer
		tileVerticalBuffer.push(await imageVerticalSlice.toBuffer());
	}

	// Prepare variables used to combine all rows into one image
	let finalImage: SharpInstance = sharp(tileVerticalBuffer[0]);
	const bufferBound: TileBounds =
		findRegionToExtract(segments[0][0], desiredRegion);
	// Check if the inital row needs to be extended to support further rows
	if ((bufferBound.bottom - bufferBound.top) < (tileSize - tileOverlap)) {
		finalImage = await finalImage
							.background({
								r: 0,
								g: 0,
								b: 0,
								alpha: 0
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
	return sharp(Buffer.alloc(1,1), {
		create: {
			width: tileSize,
			height: tileSize,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		}
	}).overlayWith(await finalImage.toBuffer())
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
	for (const channel of view.scalable_image.channels) {
		channel.metadata = cleanSupportedViewObject(
			channel.metadata as parsexml.Node[]
		);
	}
};

/**
 * Create the objects needed for parsing the XML object
 * of the initial extraction.
 */
// tslint:disable-next-line:no-var-requires
const dataBlocks: Segment[] =
	require(`${extractionDirectory}outputjson.json`)
	.czi.filter((s: Segment) =>
		s.Id === 'ZISRAWSUBBLOCK' && s.Data.Data !== 'empty'
	);

let totalSizeX: number = -1;
let totalSizeY: number = -1;
const supportedViews: SupportedViews = {
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
supportedViews.scalable_image.channels.pop();

/* tslint:disable:curly cyclomatic-complexity */
/*
 * Function to parse the xml file from the original extraction from CZI,
 * its nasty!
 */
const parseExtractedXML: (xmlFile: string) => void = (
	xmlFile: string
): void => {
	const metaXML: parsexml.Document = parsexml(fs.readFileSync(xmlFile, 'utf8'));
	// Parse the XML :(
	// THE FOLLOWING 2 FOR LOOPS ARE DISGUSTING AND I HATE IT,
	// AND I WISH I DIDNT WRITE IT BUT DON'T SEE ANY OTHER WAY TO DO IT LOL :'(
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

// Print out all of the related tiles to every new tile to be created.
let filecounter: number = 0;
/**
 * This is used to create the next zoomed out tier of the given height map
 */
const zoomTier: (
	previousHeightMap: CZIHeightMap
) => Promise<CZIHeightMap> = async(
	previousHeightMap: CZIHeightMap
): Promise<CZIHeightMap> => {
	let ys: number = 0;
	let timing: [number, number] = process.hrtime();
	const iterTimes: number[] = [50];
	let avgItrTime: number;
	const newZoomTier: CZIHeightMap = {
		zoom_level: previousHeightMap.zoom_level * 2, plane: []
	};

	// Check the condition where another zoom level does not make sense
	if (previousHeightMap.plane.length === 1
	 && previousHeightMap.plane[0].length === 1) {
		console.log(
			'         Task(1/1):     ' +
			'Stage 100% complete. ' +
			'(0 sec/iter)  Stage was skipped as maximum sensible zoom level was reached.'
		);
		return previousHeightMap;
	}

	// For all rows within the previous plane
	for (; ys < previousHeightMap.plane.length; ys += 2) {
		timing = process.hrtime();
		const cziRow: CZITile[] = [];
		// For all columns within the previous plane
		for (let xs: number = 0; xs < previousHeightMap.plane[0].length; xs += 2) {

			// Combine 4 tiles into a new tile and scale down for this tier
			// Top left
			let quadrents:string = `${outputImageDirectory}${previousHeightMap.plane[ys][xs].file} `;
			let across:number = 1;

			// Combine top right
			const moreToRight: boolean = (xs + 1) < previousHeightMap.plane[0].length;
			if (moreToRight) {
				quadrents += `${outputImageDirectory}${previousHeightMap.plane[ys][xs + 1].file} `;
				across++;
			}
			// Combine bottom left
			const moreToBottom: boolean = (ys + 1) < previousHeightMap.plane.length;
			if (moreToBottom) {
				quadrents += `${outputImageDirectory}${previousHeightMap.plane[ys + 1][xs].file} `;
			}
			// Combine bottom right
			if (moreToBottom && moreToRight) {
				quadrents += `${outputImageDirectory}${previousHeightMap.plane[ys + 1][xs + 1].file} `;
			}

			let outputFileName: string =`${outputImageData}tmp/${uuid.generate()}.png`;
//			console.log(quadrents);
			shell.exec(`${execpaths} vips arrayjoin "${quadrents}" ${outputFileName} --across ${across}`);

			// Rescale and push to file
			await sharp(outputFileName)
				.resize(tileSize, tileSize)
				.toFile(`${outputImageDirectory}img-${filecounter}.png`);
			shell.rm(outputFileName);

			cziRow.push({
				x_offset: previousHeightMap.plane[ys][xs].x_offset,
				y_offset: previousHeightMap.plane[ys][xs].y_offset,
				width: previousHeightMap.plane[ys][xs].width * 2,
				height: previousHeightMap.plane[ys][xs].height * 2,
				file: `img-${filecounter++}.png`
			});
			finalCZIJson.total_files++;
		}

		newZoomTier.plane.push(cziRow);
		timing = process.hrtime(timing);
		iterTimes.push(timing[0]);
		if (iterTimes.length > 5) { iterTimes.shift(); }
		// tslint:disable-next-line:typedef
		avgItrTime = iterTimes.reduce((p, c, i) => p + (c - p) / (i + 1), 0);
		console.log(
			`         Task(${ys / 2 + 1}/${
				Math.floor(previousHeightMap.plane.length / 2) + 1}):     ` +
			`Stage ${Math.ceil(((ys / previousHeightMap.plane.length)
						* 100) * 100) / 100}% complete. ` +
			`(${timing[0]} sec/iter,  est: ${((avgItrTime *
				((Math.floor(previousHeightMap.plane.length / 2) + 1) -
					(ys / 2 + 1))) / 60).toFixed(2)} mins remain.)`
		);
	}
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
	let ys: number = 0;
	let timing: [number, number] = process.hrtime();
	const iterTimes: number[] = [100];
	let avgItrTime: number;
	const filteredDataBlocks: Segment[] = dataBlocks.filter(
		(item: Segment, index: number, array: Segment[]) =>
			getDimension(item, 'C').Start === cVal
	);
	// Begin output for the base tier
	console.log('=========================================================');
	console.log(`>>    Beginning Dimension Extrapolation for \'C\' : ${cVal}`);
	console.log('=========================================================');
	console.log('>> Computing base tier, this will take a while...\n');
	const baseCZIHeightMap: CZIHeightMap = {zoom_level: 1, plane: []};

	console.log(`Stage (${cVal * Math.log2(maxZoom) + 1}/${totalCs}):`);
	// For all rows within the total base pixel height
	for (; ys < totalSizeY;) {
		timing = process.hrtime();
		const cziRow: CZITile[] = [];
		let rowProgBar: string = `${Math.ceil(totalSizeX/tileSize)} : `;
		let rowProgCount: number = 0;
		for (let xs: number = 0; xs < totalSizeX; xs += tileSize) {
			const desired: TileBounds = new TileBounds(
				xs - tileOverlap,
				xs + tileSize + tileOverlap,
				ys - tileOverlap,
				ys + tileSize + tileOverlap
			);

			cziRow.push({
				x_offset: xs,
				y_offset: ys,
				width: tileSize,
				height: tileSize,
				file: `img-${filecounter}.png`
			});
			const sortedSegments: Segment[][] =
				orderSegments(findRelatedTiles(filteredDataBlocks, desired));

			(await extractAndStitchChunks(sortedSegments, desired, filecounter))
			.toFile(`${outputImageDirectory}img-${filecounter++}.png`);
// shell.exec(`${execpaths} vips addalpha "${outputImageDirectory}img-${filecounter}" "${outputImageDirectory}img-${filecounter++}"`);

			rowProgBar += ">"; rowProgCount++;
			process.stdout.write(`\r${rowProgBar} ${rowProgCount}`);
			finalCZIJson.total_files++;
		}
		baseCZIHeightMap.plane.push(cziRow);
		ys += tileSize;
		timing = process.hrtime(timing);
		iterTimes.push(timing[0]);
		if (iterTimes.length > 5) { iterTimes.shift(); }
		// tslint:disable-next-line:typedef
		avgItrTime = iterTimes.reduce((p, c, i) => p + (c - p) / (i + 1), 0);
		process.stdout.write("\r");
		console.log(
			`         Task(${ys / tileSize}/${Math.ceil(totalSizeY / tileSize)}):     ` +
			`Stage ${Math.ceil(((ys / totalSizeY) * 100) * 100) / 100}% complete. ` +
			`(${timing[0]} sec/iter,  est: ${((avgItrTime *
				(Math.ceil(totalSizeY / tileSize) - ys / tileSize)) /
					60).toFixed(2)} mins remain.)`
		);
	}
	baseCZIHeightMap.tile_height_count = baseCZIHeightMap.plane.length;
	baseCZIHeightMap.tile_width_count = baseCZIHeightMap.plane[0].length;

	// BUILD UP THE HIGHER ZOOM LAYERS.
	console.log(`>> Base tier complete for \'C\': ${cVal
		}; Begin computing zoom tiers...\n`);

	const retHeightMap: CZIHeightMap[] = [baseCZIHeightMap];
	writeJSONToFile(`${outputImageData}stageMap-${cVal}-${0}`, retHeightMap);
	for (let stage: number = 1; stage <= Math.log2(maxZoom); stage++) {
		console.log(`Stage (${cVal * Math.log2(maxZoom) + 1 + stage}/${totalCs}):`);
		await zoomTier(retHeightMap[stage - 1])
		.then((v: CZIHeightMap) => {
				retHeightMap.push(v);
				return;
			}
		);
		writeJSONToFile(`${outputImageData}stageMap-${cVal}-${stage}`, retHeightMap);
	}

	console.log(`>> Completed Extrapolation for dimension, \'C\': ${cVal}\n\n`);
	return retHeightMap;
};


/**
 * used to write the supported views object to file both in total and "cleaned"
 */
const createSupportedViewsObject: () => void = (): void => {
	// Parse the xml
	parseExtractedXML(`${extractionDirectory}FILE-META-1.xml`);

	// Create the total supported Views object
	writeJSONToFile(`${outputImageData}supported_views.json`, supportedViews);

	// Cleanup and create "smart" supported views object without whole metadata
	cleanSupportedViews(supportedViews);
	supportedViews.scalable_image.metadata = {
		tile_size: tileSize,
		max_zoom: maxZoom,
		tile_overlap: tileOverlap
	};
	writeJSONToFile(
		`${outputImageData}supported_views_minus_xml.json`, supportedViews);
};

/**
 * Used to build up a pyramid for each value of c from the base images
 */
const buildCustomPyramids: () => Promise<void> = async(): Promise<void> => {
	// Set some variables for errors and and percent counts
	let errorOccurred: Boolean;
	finalCZIJson.zoom_level_count = Math.log2(maxZoom);

	// For all channels in the base image
	for (const cval of supportedViews.scalable_image.channels) {
		errorOccurred = false;
		if (!errorOccurred) {
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
					}
					errorOccurred = true;
				}
			);
		} else {
			console.error(`\nAn error occurred while extracting dimension: ${cval}`);
			console.error('Skipping futher elements and moving to next dimension.\n\n');
		}
		// Write the final json data to file with most recent changes
		writeJSONToFile(`${outputImageData}layout.json`, finalCZIJson);
	}
	finalCZIJson.complete = true;
};

const finalCZIJson: WholeCZIHierarchy = {
	c_value_count: 0,
	total_files: 0,
	complete: false,
	c_values: [],
	zoom_level_count: 0
};

/**
 * Main function used to call the rest of the relevant code to crunch a CZI
 * extraction.
 */
const main: () => void = (): void => {
	console.log('\n');

	console.log('>> Checking/Creating output directories...');
	checkForOutputDirectories([outputImageData, outputImageDirectory, `${outputImageData}tmp/`]);

	console.log('>> Creating Supported Views and writing files...');
	createSupportedViewsObject();

	console.log('');
	buildCustomPyramids();
};
main();

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

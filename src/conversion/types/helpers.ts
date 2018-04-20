import * as fs from 'fs';
import { Node } from 'xml-parser';

/**
 * Interface used to define the structure of the "supportedViews" section
 * of the protocol specification for scalable images
 */
export interface SupportedViews {
	scalable_image: {
		width: number;
		height: number;
		channels:
			{
				channel_id: string;
				channel_name: string;
				metadata?: {};
			}[];
		real_width?: {
			value?: number;
			units?: string;
		};
		real_height?: {
			value?: number;
			units?: string;
		};
		metadata?: {};
	};
}

/**
 * Interface used to define the pixel-bounds of a 'section' within the image
 */
export class TileBounds {
	public left: number;
	public right: number;
	public top: number;
	public bottom: number;
	public constructor(
		leftBound: number,
		rightBound: number,
		topBound: number,
		bottomBound: number
	) {
		this.left = leftBound;
		this.right = rightBound;
		this.top = topBound;
		this.bottom = bottomBound;
	}
	public width(): number {
		return this.right - this.left;
	}
	public height(): number {
		return this.bottom - this.top;
	}
	public scaleDown(level: number) {
		this.left = Math.ceil(this.left / level),
		this.right = Math.ceil(this.right / level),
		this.top = Math.ceil(this.top / level),
		this.bottom = Math.ceil(this.bottom / level)
	}
	public scaleUp(level: number) {
		this.left = Math.floor(this.left * level),
		this.right = Math.ceil(this.right * level),
		this.top = Math.ceil(this.top * level),
		this.bottom = Math.ceil(this.bottom * level)
	}
}



/**
 * function used to ensure that the directories required have been created
 */
export const checkForOutputDirectories: (directories: string[]) => void = (
	directories: string[]
): void => {
	for (const dir of directories) {
		if (!fs.existsSync(`${dir}`)) {
			fs.mkdirSync(`${dir}`);
		}
	}
};

/**
 * Write given JSON object to given filepath
 */
export const writeJSONToFile: (filePath: string, obj: object) =>
	void = (filePath: string, obj: object): void => {
		fs.writeFile(
			filePath,
			JSON.stringify(obj, null, 2),
			(err: Error) => {
				if (err) {
					console.error(err.message);
					throw err;
				}
			}
		);
	};

const extensionBinariesDir: string = __dirname + `/../../../ext/bin/`;
export const execpaths: string = `PATH="$PATH:${extensionBinariesDir}" LD_LIBRARY_PATH="$LD_LIBRARY_PATH:${extensionBinariesDir}../lib/" `;

import { Node } from 'xml-parser';

/**
 * Interface used to define the structure of the "supportedViews" section
 * of the protocol specification for scalable images
 */
export interface SupportedViews {
	scalable_image: {
		width: number;
		height: number;
		channels: [
			{
				channel_id: string;
				channel_name: string;
				metadata?: Node[];
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
	};
}

// Interface used to define the pixel-bounds of a 'section' within the image
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
}

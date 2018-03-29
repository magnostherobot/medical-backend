//The following are interfaces for the Custom object storing Information
//about the CUSTOM pyramid being created for this image
    export interface CZITile {
    	x_offset: number;
    	y_offset: number;
    	width: number;
    	height: number;
    	file: string;
    }

    export interface CZIHeightMap {
    	zoom_level: number,
    	tile_width_count?: number,
    	tile_height_count?: number,
    	plane: CZITile[][];
    }

    export interface WholeCZIHierarchy {
    	c_values: [{
    		channel_id: string,
    		height_map: CZIHeightMap[];
    	}],
    	c_value_count: number,
    	zoom_level_count: number;
    	total_files: number;
    	complete: boolean;
	}

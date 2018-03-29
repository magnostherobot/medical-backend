//Interfaces used to define the tiles incoming from the CZI extraction

export interface Dimension {
	Dimension: string;
	Start: number;
	Size: number;
}

export interface DirectoryEntry {
	DimensionCount: number;
	DimensionEntries: Dimension[];
}

export interface SubBlock {
	DirectoryEntry: DirectoryEntry;
	Data: string;
}

export interface Segment {
	Id: string;
	UsedSize: number;
	Data: SubBlock;
}

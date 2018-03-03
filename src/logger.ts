/* tslint:disable:no-any */

interface Metadata {
	[key: string]: any;
}

export const logger: {
	log: (
		level: string,
		value: any,
		meta: Metadata
	) => void;
	fetch: (
		level: string,
		meta: Metadata
	) => any[];
	isEnabled: () => boolean;
} = {
	log: (level: string, value: any, meta: Metadata): void => {
		return;
	},
	fetch: (level: string, meta: Metadata): any[] => {
		return [];
	},
	isEnabled: (): boolean => false
};

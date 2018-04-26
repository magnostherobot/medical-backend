type Atom = string | number | boolean;
type AggregateType = 'sum' | 'max' | 'min' | 'avg' | 'none';
interface Alert {
	mode: string;
	value: number;
	msg?: string;
	action?: () => void;
	cmp?: (value: number, threshold: number) => boolean;
}

export const profiler: {
	metric: (obj: {
		name: string;
		agg_type?: AggregateType;
		value?: Atom | (() => Atom);
		alert?: Alert;
	}) => {
		set: (value: Atom) => void;
	};

	counter: (obj: {
		name: string;
		agg_type?: AggregateType;
		alert?: Alert;
	}) => {
		inc: () => void;
		dec: () => void;
	};

	meter: (obj: {
		name: string;
		samples: number;
		timeframe: number;
		agg_type?: AggregateType;
	}) => {
		mark: () => void;
	};

	histogram: (obj: {
		name: string;
		measurement: string;
		agg_type?: AggregateType;
	}) => {
		update: (value: number) => void;
	};
};

export type RemoteResolver = (ret: { success: boolean }) => void;

export const remote: (
	name: string,
	logic: (res: RemoteResolver) => void
) => void;

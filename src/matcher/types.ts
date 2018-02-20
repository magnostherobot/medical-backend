/* tslint:disable:no-any */

type Checker<T = any> = (v: any) => v is T;

export type Atom = Number | String | Boolean | null;

const typeCheckerGenerator: <T>(test: T) => Checker<T> =
	<T>(test: T): Checker<T> => {
	const f: Checker<T> = (value: any): value is T =>
		value != null && value.constructor === test.constructor;
	return f;
};

export const isObject: Checker<Object> =
	typeCheckerGenerator<Object>({});

export const isNumber: Checker<Number> =
	typeCheckerGenerator<Number>(0);

export const isString: Checker<String> =
	typeCheckerGenerator<String>('');

export const isBoolean: Checker<Boolean> =
	typeCheckerGenerator<Boolean>(true);

export const isArray: Checker<any[]> =
	typeCheckerGenerator<any[]>([]);

export const isFunction: Checker<Function> =
	typeCheckerGenerator<Function>(new Function());

export const isNull: Checker<null> =
	(v: any): v is null => v === null;

export const isUndefined: Checker<undefined> =
	(v: any): v is undefined => v === undefined;

export const isPresent: (v: any) => boolean =
	(v: any): boolean => !isUndefined(v);

export const isInteger: Checker<Number> =
	(v: any): v is Number => isNumber(v) && Number.isInteger(v as number);

export const isAtom: Checker<Atom> =
	(v: any): v is Atom =>
		isNull(v) || isNumber(v) || isString(v) || isBoolean(v);

const types: {
	object: Checker<Object>;
	number: Checker<Number>;
	string: Checker<String>;
	boolean: Checker<Boolean>;
	array: Checker<any[]>;
	function: Checker<Function>;
	integer: Checker<Number>;
	null: Checker<null>;
	present: (v: any) => boolean;
	is_present: (v: any) => boolean;
	not_present: Checker<undefined>;
	undefined: Checker<undefined>;
	anything: (v: any) => boolean;
	atom: Checker<Atom>;
} = {
	object:      isObject,
	number:      isNumber,
	string:      isString,
	boolean:     isBoolean,
	array:       isArray,
	function:    isFunction,
	integer:     isInteger,
	null:        isNull,
	present:     isPresent,
	is_present:  isPresent,
	not_present: isUndefined,
	undefined:   isUndefined,
	anything:    isPresent,
	atom:        isAtom
};
export default types;

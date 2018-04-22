import { Atom, default as types } from './types';

type Checker = ((value: Value | undefined) => boolean);

export type TemplateValue =
	Atom | Template | Checker;

export interface Template {
	[key: string]: TemplateValue | undefined;
}

export type Value =
	{ [key: string]: Value | undefined } | Atom;

const matchNoCurry:
	(template: TemplateValue, value: Value | undefined) => boolean =
	(template: TemplateValue, value: Value | undefined): boolean => {
	if (types.atom(template)) {
		return template === value;
	} else if (types.function(template)) {
		return template(value);
	} else if (types.atom(value) || value === undefined) {
		return false;
	} else if (types.object(template)) {
		return Object.keys(template)
			.every((key: string): boolean => {
				const v: Value | undefined = value[key];
				return matchNoCurry(template[key] as TemplateValue, v);
			});
	} else {
		throw new Error(`Unknown template value: ${template}`);
	}
};

// tslint:disable-next-line:typedef
export const match = (template: TemplateValue, value?: Value) => {
	if (value === undefined) {
		return matchNoCurry.bind(null, template);
	}
	return matchNoCurry(template, value);
};

// tslint:disable-next-line:typedef
export const exact = (template: Template, value?: Value) => {
	if (value === undefined) {
		return exact.bind(null, template);
	}
	if (!match(template, value)) {
		return false;
	}
	if (!types.atom(value)) {
		const k1: string[] = Object.keys(template);
		const k2: string[] = Object.keys(value);
		return k2.every((x: string) => k1.indexOf(x) < 0);
	} else {
		return true;
	}
};

// tslint:disable-next-line:typedef
export const optional = (template: TemplateValue, value?: Value) => {
	if (value === undefined) {
		return optional.bind(null, template);
	}
	return types.undefined(value) || match(template, value);
};

// tslint:disable-next-line:typedef
export const alternative = (templates: TemplateValue[], value?: Value) => {
	if (value === undefined) {
		return alternative.bind(null, templates);
	}
	if (templates.length === 0) {
		return false;
	} else {
		return templates.some((t: TemplateValue): boolean => match(t, value));
	}
};

// tslint:disable-next-line:typedef
export const array = (template: TemplateValue, values?: Value[]) => {
	if (values === undefined) {
		return array.bind(null, template);
	}
	const m: Checker = types.function(template)
		? template
		: match.bind(null, template);
	return values.every(m);
};

// tslint:disable-next-line:typedef
export const metadata = exact({
	version: types.integer,
	namespaces: {}
});

// tslint:disable-next-line:typedef
const options = {
	match,
	exact,
	optional,
	alternative,
	array
};
export default options;

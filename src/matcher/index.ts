export {
	Template,
	TemplateValue,
	Value,
	exact,
	optional,
	alternative,
	array,
	match,
	metadata
} from './options';

export {
	Atom,
	isPresent   as anything,
	isNumber    as number,
	isString    as string,
	isBoolean   as boolean,
	isUndefined as not_present,
	isInteger   as integer
} from './types';

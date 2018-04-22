import { default as types } from './matcher/types';

type Value = string | number | boolean;
type ValueString = 'string' | 'number' | 'integer' | 'boolean';

const serverConfig: Property[] = [];

/**
 * A way to display user-configurable properties.
 */
interface PropertyDisplay {
	/**
	 * The category the property belongs to.
	 */
	category: string;

	/**
	 * The group the property belongs to.
	 */
	group: string;

	/**
	 * The name for the property to display to a user.
	 */
	displayName: string;

	/**
	 * The description of the property.
	 */
	description: string;
}

/**
 * A server property that infuences the running of the server.
 * Loaded from configs at launch, and possibly editable during run-time.
 */
export class Property {
	/**
	 * The property's unique ID.
	 */
	public id: string;

	/**
	 * How to display the property to the user.
	 */
	public display?: PropertyDisplay;

	/**
	 * Is the property read-only, or can it be edited at run-time?
	 */
	public readOnly: boolean;

	/**
	 * The variable type of the property.
	 *
	 * These strings represent Javascript types directly,
	 * except `"integer"`, which is a `number` in logic.
	 */
	public type: ValueString;

	/**
	 * The value of the property.
	 */
	private valueInternal!: Value;

	public constructor(
		id: string,
		type: ValueString,
		value: Value,
		readOnly: boolean = true,
		display?: PropertyDisplay
	) {
		this.id = id;
		this.display = display;
		this.readOnly = readOnly;
		this.type = type;
		this.valueInternal = value;
	}

	public get value(): Value {
		return this.valueInternal;
	}

	public set value(value: Value) {
		if (this.readOnly) {
			throw new Error('this property is read-only');
		} else if (!types[this.type](value)) {
			throw new Error(`value ${value} is not of type ${this.type}`);
		}
		this.valueInternal = value;
	}
}

// Logging
let propertyDisplay: PropertyDisplay = {
	category: 'logging',
	group: 'BE4',
	displayName: 'Is logging enabled?',
	description:
		'This property defines if logging is enabled on this backend server.'
};

serverConfig.push(new Property(
	'Server_Log',
	'boolean',
	false,
	false,
	propertyDisplay
));

// Caching Settings (global)
serverConfig.push(new Property(
	'Global_Cache_Limit',
	'integer',
	1,
	true
));

// Caching Settings (project level)
propertyDisplay = {
	category: 'Caching',
	group: 'BE4',
	displayName: 'Caching Type',
	description:
		'This property defines the current caching style for this project.'
};

serverConfig.push(new Property(
	'project_example',
	'integer',
	1,
	false,
	propertyDisplay
));

export default serverConfig;

const serverConfig: Property[] = [];

/**
 * A way to display user-configurable properties.
 */
class PropertyDisplay {
	/**
	 * The category the property belongs to.
	 */
	public category: string;

	/**
	 * The group the property belongs to.
	 */
	public group: string;

	/**
	 * The name for the property to display to a user.
	 */
	public displayName: string;

	/**
	 * The description of the property.
	 */
	public description: string;

	/**
	 * Constructs a [[PropertyDisplay]] using its properties.
	 *
	 * @param cat	The property's category.
	 * @param grp	The property's group.
	 * @param dn	 The property's displayable name.
	 * @param desc A description of the property.
	 */
	public constructor(cat: string, grp: string, dn: string, desc: string) {
		this.category = cat;
		this.group = grp;
		this.displayName = dn;
		this.description = desc;
	}
}

/**
 * A server property that infuences the running of the server.
 * Loaded from configs at launch, and possibly editable during run-time.
 */
interface Property {
	/**
	 * The property's unique ID.
	 */
	id: string;

	/**
	 * How to display the property to the user.
	 */
	display?: PropertyDisplay;

	/**
	 * Is the property read-only, or can it be edited at run-time?
	 */
	readOnly: boolean;

	/**
	 * The variable type of the property.
	 *
	 * These strings represent Javascript types directly,
	 * except `"integer"`, which is a `number` in logic.
	 */
	type: 'string' | 'number' | 'integer' | 'boolean';

	/**
	 * The value of the property.
	 */
	value: string | number | boolean;
}

// Logging
let propertyDisplay: PropertyDisplay = new PropertyDisplay(
	'Logging',
	'BE4',
	'Is logging enabled?',
	'This property defines if logging is currently enabled on this backend server.'
);

serverConfig.push({
	id: 'Server_Log',
	display: propertyDisplay,
	readOnly: false,
	type: 'boolean',
	value: false
});

// Caching Settings (global)
serverConfig.push({
	id: 'Global_Cache_Limit',
	readOnly: true,
	type: 'integer',
	value: 1
});

// Caching Settings (project level)
propertyDisplay = new PropertyDisplay(
	'Caching',
	'BE4',
	'Caching Type',
	'This property defines the current caching style for this project.'
);

serverConfig.push({
	id: 'project_example',
	display: propertyDisplay,
	readOnly: false,
	type: 'integer',
	value: 1
});

/**
 * Checks if a property exists in the server's property list.
 *
 * @param propKey The property unique ID to search for.
 * @returns The index of the property in the server's property list,
 * or `-1` if the property is not present.
 */
export const propertyExists: (propKey: string) => number =
	(propKey: string): number => {
	let found: number = -1;
	for (const prop in serverConfig) {
		if (serverConfig[prop].id === propKey) {
			found = parseInt(prop, 10);
			break;
		}
	}
	return found;
};

export default serverConfig;

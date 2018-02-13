const serverConfig: Property[] = [];

/* This is a class used to define the optional attribute of Property,
	 if the property is user configurable*/
export class PropertyDisplay {
	public category: string;
	public group: string;
	public displayName: string;
	public description: string;

	public constructor(cat: string, grp: string, dn: string, desc: string) {
		this.category = cat;
		this.group = grp;
		this.displayName = dn;
		this.description = desc;
	}
}

/* This is a class used to contain all of the protocol attributes of a Property
	 of the current backend server.*/
export interface Property {
	id: string;
	display?: PropertyDisplay;
	readOnly: boolean;
	type: string;
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

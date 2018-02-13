var serverConfig : Property[] = [];

/**
 * A way to display user-configurable properties.
 */
class PropertyDisplay {
    /**
     * Constructs a [[PropertyDisplay]] using its properties.
     *
     * @param cat  The property's category.
     * @param grp  The property's group.
     * @param dn   The property's displayable name.
     * @param desc A description of the property.
     */
    constructor(cat : string, grp : string, dn : string, desc : string) {
      this.category = cat;
      this.group = grp;
      this.display_name = dn;
      this.description = desc;
    };

    /**
     * The category the property belongs to.
     */
    category : string;

    /**
     * The group the property belongs to.
     */
    group : string;

    /**
     * The name for the property to display to a user.
     */
    display_name : string;

    /**
     * The description of the property.
     */
    description : string;
};

/* This is a class used to contain all of the protocol attributes of a Property
   of the current backend server.*/
/**
 * A server property that infuences the running of the server.
 * Loaded from configs at launch, and possibly editable during run-time.
 */
class Property {
    /**
     * The property's unique ID.
     */
    id : string;

    /**
     * How to display the property to the user.
     */
    display? : PropertyDisplay;

    /**
     * Is the property read-only, or can it be edited at run-time?
     */
    read_only : boolean;

    /**
     * The variable type of the property.
     *
     * These strings represent Javascript types directly,
     * except `"integer"`, which is a `number` in logic.
     */
    type : "string" | "number" | "integer" | "boolean";

    /**
     * The value of the property.
     */
    value : string | number | boolean;
}

var property_display = new PropertyDisplay("Logging", "BE4", "Is logging enabled?", "This property defines if logging is currently enabled on this backend server.");
serverConfig.push({id : "Server_Log", display : property_display, read_only : false, type : "boolean", value : false});

//caching settings (global)
serverConfig.push({id : "Global_Cache_Limit", read_only : true, type : "integer", value : 1});
//caching settings (project level)
property_display = new PropertyDisplay("Caching", "BE4", "Caching Type", "This property defines the current caching style for this project.");
serverConfig.push({id : "project_example", display : property_display, read_only : false, type : "integer", value : 1});

/**
 * Checks if a property exists in the server's property list.
 *
 * @param propKey The property unique ID to search for.
 * @returns The index of the property in the server's property list,
 * or `-1` if the property is not present.
 */
function propertyExists (propKey : string): number {
    var found = -1;
    for (var prop in serverConfig) {
        if (serverConfig[prop].id == propKey) {
            found = parseInt(prop);
            break;
        }
    }
    return found;
}

module.exports = {
    default : serverConfig,
    propertyExists : propertyExists,
}

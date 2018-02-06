var serverConfig : Property[] = [];

/* This is a class used to define the optional attribute of Property,
   if the property is user configurable*/
class PropertyDisplay {
    constructor(cat : string, grp : string, dn : string, desc : string) {
      this.category = cat;
      this.group = grp;
      this.display_name = dn;
      this.description = desc;
    };
    category : string;
    group : string;
    display_name : string;
    description : string;
};

/* This is a class used to contain all of the protocol attributes of a Property
   of the current backend server.*/
class Property {
    id : string;
    display? : PropertyDisplay;
    read_only : boolean;
    type : string;
    value : string | number | boolean;
}

//Logging
var property_display = new PropertyDisplay("Logging", "BE4", "Is logging enabled?", "This property defines if logging is currently enabled on this backend server.");
serverConfig.push({id : "Server_Log", display : property_display, read_only : false, type : "boolean", value : false});

//caching settings (global)
serverConfig.push({id : "Global_Cache_Limit", read_only : true, type : "integer", value : 1});
//caching settings (project level)
property_display = new PropertyDisplay("Caching", "BE4", "Caching Type", "This property defines the current caching style for this project.");
serverConfig.push({id : "project_example", display : property_display, read_only : false, type : "integer", value : 1});

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

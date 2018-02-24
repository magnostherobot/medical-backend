import { NextFunction, Request, Response, Router } from 'express';
import { Property, default as serverConfig,
	propertyExists } from './serverConfig';

/**
 * The type of an Express middleware callback.
 */
type Middleware =
	(req: Request, res: Response, next: NextFunction) => void;

/*
 * Returns the supported Protocols
 *
 * The server's unwrapped response MUST match:

	exactly({
		"supported": array(string),
		"required": array(string)
	})
 */
const getProtocols: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	const returnValue: {
		supported: string[];
		required: string[];
	} = {
		supported: [
			'BE50'
		],
		required: [
			'BE01'
		]
	};
	res.send(JSON.stringify(returnValue));
};

/*
 * Logging Endpoint for all components:
 *
 * with a request matching

	array({
		"component": string,
		"level": alternative([
			"info", "security", "warning", "error", "critical"
		]),
		"value": anything
	})
 */
const postLog: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(501)
		.send({error: 'logging_not_enabled'});
};

/*
 * Clients authorised as a user with the admin privilege can access
 *
 * http://backend.endpoint/log?before=<datetime>&after=<datetime>&level=<level>
 *
 * the server response should match

	array({
		"component": string,
		"level": alternative(
			["info", "security", "warning", "error", "critical"
		]),
		"value": anything,
		"username": string,
		"timestamp": string
	})
 */
const getLog: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(501)
		.send({error: 'logging_not_enabled'});
};

/*
 * Any authenticated client can access
 *
 * http://backend.endpoint/properties
 *
 * the server SHOULD respond with a list of properties,
 * with the unwrapped response matching

	array({
		"id": string,
		"display": optional({
			"category": string,
			"group": string,
			"display_name": string,
			"description": string
		}),
		"read_only": boolean,
		"type": alternative(["string", "integer", "boolean"]),
		"value": alternative([string, integer, boolean])
	})
 */
const getProperties: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.send(serverConfig);
};

/*
 * To update properties the client POSTs to
 *
 * http://backend.endpoint/properties?action=update
 *
 * with body

	array({
		"id": string,
		"value": alternative([string, integer, boolean])
	})
 */
const postProperties: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	let success: boolean = true;

	// For each property to update
	let prop: Property;
	for (prop of req.body) {

		// Check that the property has an ID and a value
		if (!prop.hasOwnProperty('id') || !prop.hasOwnProperty('value')) {
			res.status(400)
				.send({
				error: 'invalid_request',
				error_description: 'A supplied property is missing an id or value'
			});
			success = false;
			break;
		}

		// Find out if the property exists in the config and if so, at which index
		const index: number = propertyExists(prop.id);

		// Check some of the properties values to ensure that it can be updated
		if (index === -1 || serverConfig[index].readOnly) {
			/* TODO Implement an or, using Tom's type checker to ensure
			 * the value is "valid" based on the type of the property */
			const description: string =
				index === -1
				? 'Property not found'
				: 'Property is Read_Only';
			res.status(400)
				.send({
					error: 'invalid_property',
					error_data: prop.id,
					error_description: description
				});
			success = false;
			break;
		}

		// Make the update to the property
		serverConfig[index].value = prop.value;
	}

	// Tell the client that everything was okay;
	if (success) {
		res.status(200)
			.send();
	}
};

/*
 * Listing available privileges
 *
 * And the server's response, unwrapped, must match

	array({
		"privilege": string,
		"description": string,
		"internal": boolean
	})
 */
const getUserPriveleges: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/*
 * Listing users
 *
 * If the client is authorised as a user with the admin privilege
 * the server MUST respond with a list of users,
 * with the unwrapped response matching

	array({
		"username": string,
		"privileges": array(string),
		"projects": array({
			"project_name": string,
			"access_level": string
		}),
		"public_user_metadata": metadata,
		"private_user_metadata": metadata,
		"public_admin_metadata": metadata,
		"private_admin_metadata": metadata
	})
 */
const getUsers: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();

};

/*
 * expose additional configuration options for individual users
 *
 *
 */
const getUserProperties: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/*
 * Listing a particular User
 *
 * If the client is authorised as a user with the admin privilege
 * the server MUST respond with details of the particular user
 * if they exist (unwrapped response):

	{
		"username": string,
		"privileges": array(string),
		"projects": array({
			"project_name": string,
			"access_level": string
		}),
		"public_user_metadata": metadata,
		"private_user_metadata": metadata,
		"public_admin_metadata": metadata,
		"private_admin_metadata": metadata
	}
 */
const getUsername:
	(req: Request, res: Response, next: NextFunction, user?: string) => void =
	(req: Request, res: Response, next: NextFunction, user?: string): void => {
	res.status(500)
		.send();
};

const getCurUser: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
	const curUser: string = '';
	getUsername(req, res, next, curUser);
};

/*
 * Updating the current user
 *
 * http://backend.endpoint/current_user?action=update
 *
 * with body matching

	{
		"password": optional({
			"old": string,
			"new": string
		}),
		"public_user_metadata": optional(metadata),
		"private_user_metadata": optional(metadata),
		"public_admin_metadata": not_present,
		"private_admin_metadata": not_present
	}
*/
const postCurUser: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/*
 * Creating a User/updating a user
 *
 * http://backend.endpoint/users/<username>?action=create
 *
 * with body matching

	{
		"privileges": array(string),
		"password": string,
		"public_user_metadata": optional(metadata),
		"private_user_metadata": optional(metadata),
		"public_admin_metadata": optional(metadata),
		"private_admin_metadata": optional(metadata)
	}
 */
const postUsername: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/*
 * Listing available Roles
 *
 * The servers response, unwrapped, must match

	array({
		"role": string,
		"description": string,
		"internal": boolean
	})
 */
const getProjectRoles: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/*
 * Listing Projects
 *
 * The server MUST respond with a list of projects,
 * with the unwrapped response matching

	array({
		"project_name": string,
		"users": array({
			"username": string,
			"access_level": string
		}),
		"public_metadata": metadata,
		"private_metadata": optional(metadata),
		"admin_metadata": optional(metadata)
	})
 */
const getProjects: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/*
 * Listing a specific Project
 *
 * The server MUST respond with details of the particular project
 * if it exists (unwrapped response):

	{
		"project_name": string,
		"users": array({
			"username": string,
			"access_level": string
		}),
		"public_metadata": metadata,
		"private_metadata": metadata,
		"admin_metadata": optional(metadata)
	}
 */
const getProjectName: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/*
 * Creating a Project / updating a project / deleting / Project grants
 *
 * http://backend.endpoint/projects/<project_name>?action=create
 *
 * with body matching

	{
			"public_metadata": optional(metadata),
			"private_metadata": optional(metadata),
			"admin_metadata": optional(metadata)
	}
 */
const postProjectName: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/*
 * additional configuration options for individual projects
 */
const getProjectProperties: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/**
 * GET a File.
 */
const getFilePath: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/**
 * GET a File.
 */
const getFileId: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

/**
 * Post a File. / delete / move / etc
 */
const postFilePath: Middleware =
	(req: Request, res: Response, next: NextFunction): void => {
	res.status(500)
		.send();
};

export class FileRouter {
	public router: Router;

	/**
	 * Initialize the FileRouter
	 */
	public constructor() {
		this.router = Router();
		this.init();
	}

	/**
	 * Take each handler, and attach to one of the Express.Router's
	 * endpoints.
	 */
	public init(): void {
		// General
		this.router.get ('/_supported_protocols_',	                   getProtocols);
		this.router.get ('/log',						                     getLog);
		this.router.post('/log',	       									postLog);
		this.router.get ('/properties',						          getProperties);
		this.router.post('/properties',						         postProperties);
		// Users
		this.router.get ('/user_privileges',				      getUserPriveleges);
		this.router.get ('/users',									       getUsers);
		this.router.get ('/users/:username',				            getUsername);
		this.router.post('/users/:username',				           postUsername);
		this.router.get ('/users/:username/properties',           getUserProperties);
		this.router.get ('/current_user',					             getCurUser);
		this.router.post('/current_user',					            postCurUser);
		// Projects
		this.router.get ('/project_roles',					        getProjectRoles);
		this.router.get ('/projects',							        getProjects);
		this.router.get ('/projects/:project_name',                  getProjectName);
		this.router.post('/projects/:project_name',                 postProjectName);
		this.router.get ('/projects/:project_name/properties', getProjectProperties);
		// File access
		this.router.get ('/projects/:project_name/files/:path',         getFilePath);
		this.router.post('/projects/:project_name/files/:id',          postFilePath);
		this.router.get ('/projects/:project_name/files_by_id/:id',       getFileId);
	}
}

// Create the FileRouter, and export its configured Express.Router
const fileRoutes: FileRouter = new FileRouter();
fileRoutes.init();

export default fileRoutes.router;

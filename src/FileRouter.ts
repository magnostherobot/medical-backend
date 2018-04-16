import { ContributorGroupFullInfo, default as ContributorGroup
	} from './db/model/ContributorGroup';
import { default as File } from './db/model/File';
import { ProjectFullInfo, default as Project } from './db/model/Project';
import { UserFullInfo, default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';

import { NextFunction, Request, Response, Router } from 'express';

import { RequestError } from './errors/errorware';
import { View, files, views } from './files';
import { logger } from './logger';
import { Property, default as serverConfig } from './serverConfig';
import { uuid } from './uuid';

// TODO: figure this out
const BASE_FILE_STORAGE: string = 'TODO: figure this out';

/**
 * The type of an Express middleware callback.
 */
export type Middleware =
	(req: Request, res: Response, next: NextFunction) => void;

/**
 * Returns the supported Protocols
 *
 * The server's unwrapped response MUST match:
 *
 * exactly({
 *     "supported": array(string),
 *     "required": array(string)
 * })
 */
const getProtocols: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	logger.debug('Fetching supported protocols');
	res.locals.data = {
		supported: [],
		required: [
			'BE01'
		]
	};
	next();
};

/**
 * Logging Endpoint for all components:
 *
 * with a request matching
 *
 * array({
 *     "component": string,
 *     "level": alternative([
 *         "info",
 *         "security",
 *         "warning",
 *         "error",
 *         "critical"
 *     ]),
 *     "value": anything
 * })
 */
const postLog: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	res.locals.modified = true;
	logger.debug('Adding forwarded log');
	if (!req.user.hasPrivilege('logging')) {
		next(new RequestError(401, 'invalid_privilege'));
		return;
	} else if (!logger.isEnabled()) {
		next(new RequestError(501, 'logging_not_enabled'));
		return;
	}
	for (const item of req.body) {
		logger.forward(item.level, item.value, {
			component: item.component,
			user: req.user.username,
			external: true
		});
	}
	next();
};

/**
 * Clients authorised as a user with the admin privilege can access
 *
 * http://backend.endpoint/log?before=<datetime>&after=<datetime>&level=<level>
 *
 * the server response should match
 *
 * array({
 *     "component": string,
 *     "level": alternative([
 *         "info",
 *         "security",
 *         "warning",
 *         "error",
 *         "critical"
 *     ]),
 *     "value": anything,
 *     "username": string,
 *     "timestamp": string
 * })
 */
const getLog: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	logger.debug('Fetching log');
	res.locals.modified = true;
	if (!req.user.hasPrivilege('admin')) {
		next(new RequestError(401, 'invalid_privilege'));
	}
	/* tslint:disable */ 
	if(!req.params.level) req.params.level = 'info';
	if(!req.params.before) req.params.before = new Date();
	if(!req.params.after) req.params.after = new Date(0);
	/* tslint:enable */
	res.locals.data = logger.fetch(
		req.params.level, {
			before: new Date(req.params.before),
			after: new Date(req.params.after)
		}
	);
	next();
};

/**
 * Any authenticated client can access
 *
 * http://backend.endpoint/properties
 *
 * the server SHOULD respond with a list of properties,
 * with the unwrapped response matching
 *
 * array({
 *     "id": string,
 *     "display": optional({
 *         "category": string,
 *         "group": string,
 *         "display_name": string,
 *         "description": string
 *     }),
 *     "read_only": boolean,
 *     "type": alternative(["string", "integer", "boolean"]),
 *     "value": alternative([string, integer, boolean])
 * })
 */
const getProperties: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	logger.debug('Listing server properties');
	res.locals.data = serverConfig;
	next();
};

/**
 * To update properties the client POSTs to
 *
 * http://backend.endpoint/properties?action=update
 *
 * with body
 *
 * array({
 *     "id": string,
 *     "value": alternative([string, integer, boolean])
 * })
 */
const postProperties: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	logger.debug('Editing server properties');
	res.locals.modified = true;
	for (const newProp of req.body) {
		const prop: Property | undefined = serverConfig.find(
			(p: Property): boolean => p.id === newProp.id
		);
		if (prop === undefined) {
			next(new RequestError(400, 'invalid_property', undefined, newProp.id));
			return;
		} else if (prop.readOnly) {
			next(new RequestError(400, 'invalid_property', undefined, newProp.id));
			return;
		}
		try {
			prop.value = newProp.value;
		} catch (err) {
			// FIXME: Assuming it's a value-type error, but it might not be!
			next(new RequestError(400, 'invalid_property_value', undefined, newProp.id));
			return;
		}
	}
	next();
};

/**
 * Listing available privileges
 *
 * And the server's response, unwrapped, must match
 *
 * array({
 *     "privilege": string,
 *     "description": string,
 *     "internal": boolean
 * })
 */
const getUserPrivileges: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug('Listing all user privileges');
	const usergroups: UserGroup[] = await UserGroup.findAll();
	res.locals.data = usergroups.map(
		(ug: UserGroup) => ug.getPrivilege()
	);
	next();
};

/**
 * Listing users
 *
 * If the client is authorised as a user with the admin privilege
 * the server MUST respond with a list of users,
 * with the unwrapped response matching
 *
 * array({
 *     "username": string,
 *     "privileges": array(string),
 *     "projects": array({
 *         "project_name": string,
 *         "access_level": string
 *     }),
 *     "public_user_metadata": metadata,
 *     "private_user_metadata": metadata,
 *     "public_admin_metadata": metadata,
 *     "private_admin_metadata": metadata
 * })
 */
const getUsers: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug('Listing all registered users');
	const users: User[] = await User.findAll({
		include: [
			UserGroup,
			Project
		]
	});
	res.locals.data = users.map((u: User): UserFullInfo => {
		const info: UserFullInfo = u.fullInfo;
		if (!req.user.hasPrivilege('admin')) {
			delete info.private_user_metadata;
			delete info.private_admin_metadata;
		}
		return info;
	});
	next();
};

/**
 * Expose additional configuration options for individual users
 */
const getUserProperties: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	logger.debug('Listing additional properties for a user');
	res.locals.modified = true;
	if (res.locals.user == null) {
		next(new RequestError(404, 'user_not_found'));
		return;
	}
	res.locals.data = res.locals.user.properties;
	next();
};

/**
 * Listing a particular User
 *
 * If the client is authorised as a user with the admin privilege
 * the server MUST respond with details of the particular user if they exist
 * (unwrapped response):
 *
 * {
 *     "username": string,
 *     "privileges": array(string),
 *     "projects": array({
 *         "project_name": string,
 *         "access_level": string
 *     }),
 *     "public_user_metadata": metadata,
 *     "private_user_metadata": metadata,
 *     "public_admin_metadata": metadata,
 *     "private_admin_metadata": metadata
 * }
 */
const getUsername: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	logger.debug(`Listing user ${res.locals.user}`);
	res.locals.modified = true;
	if (res.locals.user == null) {
		next(new RequestError(404, 'user_not_found'));
		return;
	}
	res.locals.data = res.locals.user.fullInfo;
	next();
};

const getCurUser: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	logger.debug('Listing current user');
	res.locals.data = req.user.fullInfo;
	next();
};

/**
 * Updating the current user
 *
 * http://backend.endpoint/current_user?action=update
 *
 * with body matching
 *
 * {
 *     "password": optional({
 *         "old": string,
 *         "new": string
 *     }),
 *     "public_user_metadata": optional(metadata),
 *     "private_user_metadata": optional(metadata),
 *     "public_admin_metadata": not_present,
 *     "private_admin_metadata": not_present
 * }
 */
const postCurUser: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug('Editing current user');
	res.locals.modified = true;
	try {
		await req.user.updateInfo(req.body);
		await req.user.save();
	} catch (err) {
		next(err);
		return;
	}
	next();
};

/**
 * Creating a User/updating a user
 *
 * http://backend.endpoint/users/<username>?action=create
 *
 * with body matching
 *
 * {
 *     "privileges": array(string),
 *     "password": string,
 *     "public_user_metadata": optional(metadata),
 *     "private_user_metadata": optional(metadata),
 *     "public_admin_metadata": optional(metadata),
 *     "private_admin_metadata": optional(metadata)
 * }
 */
const postUsername: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	let user: User | null | undefined = res.locals.user;
	res.locals.modified = true;
	if (user == null) {
		logger.debug('Adding new user');
		user = new User({
			username: req.params.username,
			password: req.params.password
		});
	} else {
		logger.debug('Editing user');
		user.password = req.params.password;
	}
	if (req.body) {
		user.metadata = req.body;
	}
	next();
};

/**
 * Listing available Roles
 *
 * The servers response, unwrapped, must match
 *
 * array({
 *     "role": string,
 *     "description": string,
 *     "internal": boolean
 * })
 */
const getProjectRoles: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	res.locals.modified = true;
	logger.debug('Listing available project roles');
	const roles: ContributorGroup[] = await ContributorGroup.findAll();
	res.locals.data = roles.filter(
		(cg: ContributorGroup): boolean => !cg.isInternal
	).map(
		(cg: ContributorGroup): ContributorGroupFullInfo => cg.fullInfo
	);
	next();
};

/**
 * Listing Projects
 *
 * The server MUST respond with a list of projects,
 * with the unwrapped response matching
 *
 * array({
 *     "project_name": string,
 *     "users": array({
 *         "username": string,
 *         "access_level": string
 *     }),
 *     "public_metadata": metadata,
 *     "private_metadata": optional(metadata),
 *     "admin_metadata": optional(metadata)
 * })
 */
const getProjects: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug('Listing all projects');
	res.locals.modified = true;
	const projects: Project[] = await Project.findAll({
		include: [
			User
		]
	});
	res.locals.data = projects.map(
		(p: Project): ProjectFullInfo => p.fullInfo
	);
	next();
};

/**
 * Listing a specific Project
 *
 * The server MUST respond with details of the particular project
 * if it exists (unwrapped response):
 *
 * {
 *     "project_name": string,
 *     "users": array({
 *         "username": string,
 *         "access_level": string
 *     }),
 *     "public_metadata": metadata,
 *     "private_metadata": metadata,
 *     "admin_metadata": optional(metadata)
 * }
 */
const getProjectName: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug('Getting project properties');
	res.locals.modified = true;
	const project: Project | null = res.locals.project;
	if (project == null) {
		return next(new RequestError(404, 'project_not_found'));
	} else {
		res.locals.data = project.fullInfo;
		next();
	}
};

/**
 * Creating a Project / updating a project / deleting / Project grants
 *
 * http://backend.endpoint/projects/<project_name>?action=create
 *
 * with body matching
 *
 * {
 *     "public_metadata": optional(metadata),
 *     "private_metadata": optional(metadata),
 *     "admin_metadata": optional(metadata)
 * }
 */
const postProjectName: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	let project: Project | null = res.locals.project;
	res.locals.modified = true;
	let promise: PromiseLike<File> | null = null;
	if (project == null) {
		logger.debug('Adding new project');
		const file: File = new File({
			uuid: uuid.generate(),
			mimetype: 'inode/directory'
		});
		promise = file.save();
		project = new Project({
			name: req.params.project_name,
			rootFolder: file
		});
	} else {
		logger.debug('Updating project properties');
	}
	project.metadata = req.body;
	// tslint:disable-next-line:await-promise
	await promise;
	await project.save();
	next();
};

/**
 * additional configuration options for individual projects
 */
const getProjectProperties: Middleware = (
	req: Request, res: Response, next: NextFunction
): void => {
	logger.debug('Getting project properties');
	res.locals.modified = true;
	if (res.locals.project == null) {
		next(new RequestError(404, 'project_not_found'));
	} else {
		res.locals.data = res.locals.project.properties;
		next();
	}
};

/**
 * GET a File.
 */
const getFile: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug(`Getting file in ${req.query.view} view`);
	res.locals.modified = true;
	const file: File | null = res.locals.file;
	if (file == null) {
		return next(new RequestError(404, 'file_not_found'));
	}
	const project: Project = res.locals.project;
	const view: View = views[req.query.view || 'meta'];
	res.locals.function = view.getResponseFunction(req, res);
	res.locals.data = view.getResponseData(file, project, req.query);
	next();
};

/**
 * GET a File.
 */
const getFilePath: Middleware = getFile;

/**
 * GET a File.
 */
const getFileId: Middleware = getFile;

/**
 * Post a File. / delete / move / etc
 */
const postFilePath: Middleware = (
	req: Request, res: Response, next: NextFunction
): void =>  {
	logger.debug(`Receiving file to ${res.locals.parentFolder}`);
	res.locals.modified = true;
	if (res.locals.file != null) {
		next(new RequestError(400, 'file_exists'));
	}
	const file: File = new File({
		uuid: uuid.generate(),
		name: res.locals.filename,
		parentFolder: res.locals.parentFolder
	});
	//console.log(res.locals);	
	req.pipe(files.writableStream(file.uuid, res.locals.project.name));
	next();
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
		this.precondition();

		// General
		this.router.get ('/_supported_protocols_',					   getProtocols);
		this.router.get ('/log',						                     getLog);
		this.router.post('/log',	       									postLog);
		this.router.get ('/properties',						          getProperties);
		this.router.post('/properties',						         postProperties);
		// Users
		this.router.get ('/user_privileges',				      getUserPrivileges);
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
		this.router.post('/projects/:project_name/files/:path',        postFilePath);
		this.router.get ('/projects/:project_name/files_by_id/:id',       getFileId);
	}

	/**
	 * Introduces variable-preconditioning middleware to the Express app.
	 *
	 * These middleware functions pre-process Express' matching variables
	 * in routes (e.g. `:project_name`).
	 * If an entity cannot be found in the database, the corresponding
	 * value is set to `null` instead.
	 */
	private precondition(): void {
		logger.debug('Adding parameter preconditioning to router');
		// Fetch a user from their name:
		this.router.param(
			'username',
			async(
				req: Request, res: Response, next: NextFunction,
				name: string
			): Promise<void> => {
				logger.debug(`Searching for user ${name}`);
				const user: User | null = await User.findOne({
					include: [{all: true}],
					where: {
						username: name
					}
				});
				res.locals.user = user;
				next();
			}
		);

		// Fetch a project from its name:
		this.router.param(
			'project_name',
			async(
				req: Request, res: Response, next: NextFunction,
				projectName: string
			): Promise<void> => {
				res.locals.project = await Project.findOne({
					include: [{all: true}],
					where: {
						name: projectName
					}
				});
				next();
			}
		);

		// Fetch a file from its path:
		this.router.param(
			'path',
			async(
				req: Request, res: Response, next: NextFunction,
				filename: string
			): Promise<void> => {
				console.log(`parsing path ${filename}`)
				logger.debug(`Searching for file ${filename}`);
				const fileNames: string[] = req.params.path.split('/');
				const project: Project | null = res.locals.project;
				if (project == null) {
					logger.debug('Project was not found: skipping finding file');
					return next(new RequestError(404, 'project_not_found'));
				}
				let file: File = project.rootFolder;
				// TODO Rewrite using sub-queries instead of repeated queries.
				while (fileNames.length > 2) {
					const fileOrNull: File | null = await File.findOne({
						include: [{all: true}],
						where: {
							name: fileNames[0],
							parentFolder: file
						}
					});
					if (fileOrNull == null) {
						return next();
					} else {
						file = fileOrNull;
					}
					fileNames.splice(0, 1);
				}
				if (file == null) {
					return next();
				}
				const parentFolder: File | null = await File.findOne({
					include: [
						{ model: File, as: 'containedFilesInternal'}
					],
					where: {
						parentFolderId: file.id,
						name: fileNames[0]
					}
				});
				//console.log(parentFolder);
				if (parentFolder == null) {
					return next();
				}
				res.locals.parentFolder = parentFolder;
				const tFile: File | undefined = parentFolder.containedFiles.find(
					(f: File): boolean => f.name === fileNames[1]
				);
				res.locals.file = tFile;
				res.locals.filename = fileNames[1];
				next();
			}
		);

		// Fetch a file from its UUID:
		this.router.param(
			'id',
			async(
				req: Request, res: Response, next: NextFunction,
				fileId: string
			): Promise<void> => {
				console.log(`parsing id ${fileId}`);
				const file: File | null = await File.findOne({
					include: [{all: true}],
					where: {
						uuid: fileId
					}
				});
				res.locals.file = file;
				next();
			}
		);
	}
}

// Create the FileRouter, and export its configured Express.Router
const fileRoutes: FileRouter = new FileRouter();

export default fileRoutes.router;

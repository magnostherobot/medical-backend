import { ContributorGroupFullInfo, default as ContributorGroup
	} from './db/model/ContributorGroup';
import { default as File } from './db/model/File';
import { ProjectFullInfo, default as Project } from './db/model/Project';
import { UserFullInfo, default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';

import * as bodyParser from 'body-parser';
import { RequestError } from './errors/errorware';
import { NextFunction, Request, Response, Router } from 'express';
import { View, addSubFileToFolder, copyFile, createProjectFolder, deleteFile,
	saveFile, views } from './files';
import { appendFileSync } from 'fs';
import { logger } from './logger';
import { mimetype } from './mimetype';
import { Contains } from 'sequelize-typescript';
import { Property, default as serverConfig } from './serverConfig';
import UserHasPrivilege from './db/model/UserHasPrivilege';
import UserJoinsProject from './db/model/UserJoinsProject';
import { uuid } from './uuid';

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
	logger.debug('Posted Properties successfully');
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
	res.locals.data = Promise.all(users.map((u: User): Promise<UserFullInfo> => {
		const info: Promise<UserFullInfo> = u.getFullInfo();
		return info;
	}));
	if (!req.user.hasPrivilege('admin')) {
		delete res.locals.data.private_user_metadata;
		delete res.locals.data.private_admin_metadata;
	}
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
const getUsername: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug(`Listing user ${res.locals.user}`);
	res.locals.modified = true;
	if (res.locals.user == null) {
		next(new RequestError(404, 'user_not_found'));
		return;
	}
	res.locals.data = await res.locals.user.getFullInfo();
	next();
};

const getCurUser: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug('Listing current user');
	res.locals.data = await req.user.getFullInfo();
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

	if( req.query.action === 'update'){
		if (user!= null){
			logger.debug('Editing user');

			if(req.body.password != null){
				user.password = req.body.password;
			}
			if (req.body) {
				user.metadata = req.body;
			}
			await user.save();
			if(req.body.privileges != null){
				const priv: UserGroup[] | null = await UserGroup.findAll({
					include: [{all: true}],
					where: {
						name: req.body.privileges
					}
				})
				await user.$set('userGroups', priv);
			}
		}
		else{
			next(new RequestError(404, 'user_not_found'));
			return;
		}
	}
	else if( req.query.action === 'delete'){
		logger.debug('Deleting a user');
		if (user!= null){
			await user.destroy();
		}
		else{
			next(new RequestError(404, 'user_not_found'));
			return;
		}
	}
	else{
		if (user == null) {
			logger.debug('Adding new user');
			const priv: UserGroup[] | null = await UserGroup.findAll({
				include: [{all: true}],
				where: {
					name: req.body.privileges
				}
			})
			user = new User({
				username: req.params.username,
				password: req.params.password,
			});
			await user.save();
			await user.$set('userGroups', priv);
		}
		else{
			next(new RequestError(400, 'user_already_exists'));
			return;
		}
	}
	await user.save();
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
	res.locals.data = Promise.all(projects.map(
		(p: Project): Promise<ProjectFullInfo> => p.getFullInfo()
	));
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
		res.locals.data = await project.getFullInfo();
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

	if (req.query.action === 'update') {
		logger.debug('Adding new project');
		if (project != null) {
			project.metadata = req.body;
			await project.save();
		} else {
			next(new RequestError(400, 'project_not_found'));
		}
	} else if (req.query.action === 'delete') {
		if (project != null) {
			project.destroy();
		} else {
			next(new RequestError(400, 'project_not_found'));
		}
	} else if (req.query.action === 'update_grant') {
		if (project == null) {
			next(new RequestError(400, 'project_not_found'));
		} else {
			const ujp: UserJoinsProject | null = await UserJoinsProject.findOne({
				include: [{all: true}],
				where: {
					username: req.body.username,
					projectName: project.name
				}
			});
			if (ujp != null) {
				await ujp.destroy();
			}
			if (req.body.access_level !== 'none') {
				try {
					let ujp: UserJoinsProject = new UserJoinsProject({
						username: req.body.username,
						projectName: project.name,
						contributorGroupName: req.body.access_level
					});
					await ujp.save();
				} catch (err) {
					next(new RequestError(400, 'invalid_access_level'));
				}
			}
		}
	} else {
		if (project == null) {
			logger.debug('Adding new project');
			const file: File = new File({
				uuid: uuid.generate(),
			});
			file.mimetype = 'inode/directory';
			file.name = '';
			promise = file.save();
			project = new Project({
				name: req.params.project_name,
				rootFolderId: file.uuid
			});

			createProjectFolder(req.params.project_name);

			project.metadata = req.body;
			// tslint:disable-next-line:await-promise
			await promise;
			await project.save()
			const contribute: UserJoinsProject = new UserJoinsProject({
				username: req.user.username,
				projectName: req.params.project_name,
				contributorGroupName: 'projectOwner'

			})
			contribute.save()
		} else {
			next(new RequestError(400, 'project_already_exists'));
		}
	}

	next()
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

// Fetch a file from its path:
const getFileFromPath: (req: Request, res: Response) => Promise<void> = async(
	req: Request, res: Response
): Promise<void> => {
	// Vars we assign here:
	//  - res.locals.deepestFolderName (...Id): deepest existing folder in path
	//  - res.locals.path: requested path (using "/")
	//  - res.locals.filename: requested file name (may be '')
	//  - res.locals.file: actual file object if it exists
	// Vars arleady assigned:
	//  - res.locals.project: requested project object

	const nth: (str: string, pat: string, n: number) => number = (
		str: string, pat: string, num: number
	): number => {
		const l: number = str.length;
		let j: number = -1;
		let n: number = num;
		while (n-- && j++ < l) {
			j = str.indexOf(pat, j);
			if (j < 0) {
				break;
			}
		}
		return j;
	};

	const path: string = req.path.substring(nth(req.path, '/', 4) + 1);

	res.locals.path = path;
	logger.debug(`Searching for path '${res.locals.path}'`);
	// Split path into parts
	const fileNames: string[] = res.locals.path.split('/')
		.filter((s: string): boolean => s !== '');
	res.locals.filename = fileNames.length > 0
		?  fileNames[fileNames.length - 1]
		: '';
	const project: Project | null = res.locals.project;
	if (project == null) {
		// Project should have been found by previous precondition
		logger.debug('Project was not found: skipping finding file');
		throw new RequestError(404, 'project_not_found');
	}
	let curDir: File | null = project.rootFolder;
	if (!curDir) {
		throw new Error(`Project ${project.name} has been left with no root folder`);
	}
	res.locals.deepestFolderId = curDir.uuid;
	res.locals.deepestFolderName = curDir.name;
	if (fileNames.length === 0) {
		res.locals.file = curDir;
	}
	let i: number = 0;
	// Loop through the path and find the deepest folder that exists.
	// 		Also find the file if possible.
	while (curDir && i < fileNames.length) {
		logger.debug(`Searching for '${fileNames[i]}'`);
		const fileOrNull: File | null = await File.findOne({
			include: [{all: true}],
			where: {
				nameInternal: fileNames[i],
				parentFolderId: curDir.uuid
			}
		});
		if (fileOrNull == null) {
			logger.debug(`Sub-file \'${fileNames[i]}\' not found in DB`);
			return;
		}

		if (i < fileNames.length - 1) {
			// Found next subdirectory
			logger.debug(`Found Sub-folder \'${fileOrNull.name}\'`);
			res.locals.deepestFolderId = fileOrNull.uuid;
			res.locals.deepestFolderName = fileOrNull.name;
		} else {
			// Found actual file
			logger.debug(`Found file \'${fileOrNull.name}\'`);
			res.locals.file = fileOrNull;
		}
		curDir = fileOrNull;
		i++;
	}
};

/**
 * GET a File.
 */
const getFile: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	logger.debug(`Getting file in ${req.query.view} view`);
	const file: File | null = res.locals.file;
	if (file == null) {
		return next(new RequestError(404, 'file_not_found'));
	}
	const project: Project = res.locals.project;
	const view: View = views[req.query.view || 'meta'];
	// TODO return 400 for unsupported views
	// TODO raw view accepts extra query params offset and length
	res.locals.function = view.getResponseFunction(req, res);
	res.locals.data = view.getResponseData(file, project, req.query);
	next();
};

/**
 * GET a File.
 */
const getFilePath: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> => {
	try {
		await getFileFromPath(req, res);
		await getFile(req, res, next);
	} catch (e) {
		next(e);
	}
};

/**
 * GET a File.
 */
const getFileId: Middleware = getFile;

/**
 * Checks the parameters for file posting
 */
const qH: {
	[key: string]: Function;
} = {
	hasAction: (req: Request): boolean => !!req.query.action,
	setsMetadata: (req: Request): boolean =>
		req.query.action === 'set_metadata',
	mksDir: (req: Request): boolean => req.query.action === 'mkdir',
	deletes: (req: Request): boolean => req.query.action === 'delete',
	moves: (req: Request): boolean => req.query.action === 'move',
	copys: (req: Request): boolean => req.query.action === 'copy',
	overwrites: (req: Request): boolean => !!req.query.overwrite,
	offset: (req: Request): number =>
		req.query.offset ? req.query.offset : 0,
	truncates: (req: Request): boolean => !!req.query.truncate,
	isFinal: (req: Request): boolean => !!req.query.final,
	nothingSet: (req: Request): boolean =>
		!qH.hasAction(req) && !qH.overwrites(req) &&
		!qH.truncates(req) && !qH.isFinal(req)
};

const makeFile = async(req: Request, res: Response): Promise<File> => {
	// lets have a res.locals.deepestFolderName (and Id) which is a string of the deepest parent folder found
	let remainingPath: string = (res.locals.deepestFolderName == '') ? '/' + res.locals.path
		: res.locals.path.split(res.locals.deepestFolderName)[1];

	let curPath: string = res.locals.deepestFolderName;
	// Loop the part of the path that doesn't exist yet and create all the folders
	while ((remainingPath.match(/\//g) || []).length > 1) {
		// If there are more subfolders that dont exist, then create them
		const subFolder: string = remainingPath.split('/')[1];
		curPath += subFolder;
		logger.debug(`Adding subfolder '${subFolder}'`);
		const dir: File = new File({
			uuid: uuid.generate(),
			type: 'directory',
			status: 'ready',
			fullPathInternal: curPath,
			nameInternal: subFolder
		});
		await dir.save();
		curPath += '/';
		// update parent directory of new directory
		await addSubFileToFolder(res.locals.deepestFolderId, dir);
		// update vars
		remainingPath = remainingPath.split(subFolder)[1];
		res.locals.deepestFolderName = subFolder;
		res.locals.deepestFolderId = dir.uuid;
	}

	logger.debug(`Writing file '${res.locals.filename}' to folder '${res.locals.deepestFolderName}'`);
	res.locals.file = new File({
		uuid: uuid.generate(),
		nameInternal: res.locals.filename,
		fullPathInternal: res.locals.path,
		status: req.query.final
			? 'ready'
			: 'uploading'
	});
	res.locals.file.mimetype = mimetype(
		req.header('Content-Type'), req.body, res.locals.filename);

	// update parent directory of new directory
	await addSubFileToFolder(res.locals.deepestFolderId, res.locals.file);
	return res.locals.file;
};

/**
 * Post a File. / delete / move / etc
 */
const postFilePath: Middleware = async(
	req: Request, res: Response, next: NextFunction
): Promise<void> =>  {
	try {
		await getFileFromPath(req, res);
		logger.debug(`Receiving file ${res.locals.path}`);
		// / req.query.action: set_metadata, mkdir, delete, move, copy
		// / req.query.overwrite (bool)
		// / req.query.offset (int)
		// / req.query.truncate (bool)
		// / req.query.final (bool)

		if (res.locals.file) {
			/* tslint:disable-next-line:curly */
			if (req.query.action) switch (req.query.action) {
				case 'set_metadata': {
					res.locals.file.metadata = JSON.parse(req.body.toString());
					await res.locals.file.save();
					break;
				} case 'delete': {
					logger.info(`File ${res.locals.file.name} will be deleted`);
					deleteFile(res.locals.file.uuid, res.locals.project.name);
					await res.locals.file.destroy();
					break;
				} case 'move': {
					if (!req.body.path) {
						logger.warn('copying by uuid not implimented');
						return next(new RequestError(500, 'copy_to_path_only'));
					}
					logger.info(`Copying file '${
						res.locals.file.fullPath}' to new path '${req.body.path}'`);
					// New File object
					const promise: PromiseLike<File> | null = null;
					const newFile: File = new File({
						uuid: uuid.generate(),
						type: res.locals.file.type,
						status: res.locals.file.status,
						creatorName: res.locals.file.creatorName,
						createdAt: res.locals.file.createdAt,
						modifyDate: res.locals.file.modifyDate
					});
					newFile.setMetadataInternal(res.locals.file.metadata);
					newFile.fullPath = req.body.path;
					newFile.parentFolderId = res.locals.parentFolderId;
					await newFile.save();
					const oldUUID: string = res.locals.file.uuid;
					await res.locals.file.destroy();
					copyFile(res.locals.project.name, res.locals.file.uuid, oldUUID, true);
					break;
				} case 'copy': {
					if (!req.body.path) {
						logger.debug('copying by uuid not implimented');
						return next(new RequestError(500, 'copy_to_path_only'));
					}
					logger.info(`Copying file '${
						res.locals.file.fullPath}' to new path '${req.body.path}'`);
					const promise: PromiseLike<File> | null = null;
					const newFile: File = new File({
						uuid: uuid.generate(),
						type: res.locals.file.type,
						status: res.locals.file.status,
						creatorName: res.locals.file.creatorName,
						createdAt: res.locals.file.createdAt,
						modifyDate: res.locals.file.modifyDate
					});
					newFile.setMetadataInternal(res.locals.file.metadata);
					newFile.fullPath = req.body.path;
					newFile.parentFolderId = res.locals.parentFolderId;
					await newFile.save();
					copyFile(res.locals.project.name, res.locals.file.uuid, newFile.uuid);
					break;
				} case 'mkdir': {
					logger.debug(`Action '${req.query.action}' not valid if file exists`);
					return next(new RequestError(400, 'file_exists'));
				} default: {
					logger.warn(`Unknown file edit action '${req.query.action}'`);
					return next(new RequestError(400, 'unknown_action'));
				}
			} else {
				 if (req.query.overwrite) {
					if (req.query.truncate) {
						await saveFile(
							req.body,
							res.locals.project.name,
							res.locals.file.uuid,
							req.query
						);
						if (req.query.final) {
							res.locals.file.status = 'preprocessing';
							await res.locals.file.save();
							// Start file preprocesssing
						}
					} else {
						logger.warn('overwriting without truncating not supported');
						return next(new RequestError(
							500,
							'not_implemented',
							'please specify truncate parameter'
						));
					}
				 } else {
					 return next(new RequestError(400, 'file_already_exists'));
				 }
			}
		} else {
			/* tslint:disable-next-line:curly */
			if (req.query.action) switch (req.query.action) {
				case 'mkdir': {
					await makeFile(req, res);
					res.locals.file.status = 'final';
					break;
				}
				case 'set_metadata':
				case 'delete':
				case 'move':
				case 'copy':
					logger.debug(`Action '${req.query.action
						}' not valid if file does not exist`);
					return next(new RequestError(404, 'file_not_found'));
			} else {
				if (!req.body) {
					logger.debug('No file attached. Sending 400');
					next(new RequestError(400, 'no_file_attached'));
				}
				await makeFile(req, res);
				await saveFile(
					req.body,
					res.locals.project.name,
					res.locals.file.uuid,
					req.query
				);
				// Sets final if requested
				if (qH.isFinal(req)) {
					res.locals.file.status = 'preprocessing';
					// TODO Start file preprocessing
				}
			}
			await res.locals.file.save();
		}
		return next();

	} catch (e) {
		next(e);
	}
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
		this.router.get ('/projects/:project_name/files/*',             getFilePath);
		this.router.post(
			'/projects/:project_name/files/*',
			bodyParser.raw({ type: '*/*' }), postFilePath);
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
				if (user == null) {
					//return next(new RequestError(404, 'user_not_found'));
				} else {
					res.locals.user = user;
				}
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
					include: [
						User,
						File
					],
					where: {
						name: projectName
					}
				});
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
				logger.info(`parsing id ${fileId}`);
				const file: File | null = await File.findOne({
					include: [{all: true}],
					where: {
						uuid: fileId
					}
				});
				res.locals.file = file;
				if (file) {
					res.locals.filename = file.name;
					res.locals.deepestFolderId = file.parentFolderId;
					if (file.parentFolder) {
						res.locals.deepestFolderName = file.parentFolder.name;
					} else {
						logger.debug('parentfolder not set!');
					}
				}
				next();
			}
		);
	}
}

// Create the FileRouter, and export its configured Express.Router
const fileRoutes: FileRouter = new FileRouter();

export default fileRoutes.router;

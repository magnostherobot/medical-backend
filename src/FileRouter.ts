import { ContributorGroupFullInfo, default as ContributorGroup
	} from './db/model/ContributorGroup';
import { default as File } from './db/model/File';
import { ProjectFullInfo, default as Project } from './db/model/Project';
import { UserFullInfo, default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';

import { NextFunction, Request, Response, Router } from 'express';
import { RequestError } from './errors/errorware';
import { addSubFileToFolder, View, files, views, rootPathId, createProjectFolder, upload, deleteFile, truncateFile, saveFile } from './files';
import { logger } from './logger';
import { Property, default as serverConfig } from './serverConfig';
import { uuid } from './uuid';
import UserHasPrivilege from './db/model/UserHasPrivilege';
import { Contains } from 'sequelize-typescript';
import UserJoinsProject from './db/model/UserJoinsProject';
import { appendFileSync } from 'fs';


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
	console.log('Editing server properties');
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
	console.log("Posted Properties successfully");
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
		await delete res.locals.data.private_user_metadata;
		await delete res.locals.data.private_admin_metadata;
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
const getUsername: Middleware = async (
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

	if( req.query.action === 'update'){
		logger.debug('Adding new project');
		if(project != null){
			project.metadata = req.body;
			await project.save()
		}
		else{
			next(new RequestError(400, 'project_not_found'));
		}
	}
	else if( req.query.action === 'delete'){
		if(project != null){
			project.destroy()
		}
		else{
			next(new RequestError(400, 'project_not_found'));
		}
	}
	else if( req.query.action === 'update_grant'){
		if (project == null){
			next(new RequestError(400, 'project_not_found'));
		}
		else{
			let ujp: UserJoinsProject | null = await UserJoinsProject.findOne({
				include: [{all:true}],
				where: {
					username: req.body.username,
					projectName: project.name
				}
			})
			if(ujp != null){
				await ujp.destroy();
			}
			if(req.body.access_level != 'none'){
				try{
					let ujp: UserJoinsProject = new UserJoinsProject({
						username: req.body.username,
						projectName: project.name,
						contributorGroupName: req.body.access_level
					})
					await ujp.save();
				}
				catch(err){
					next(new RequestError(400, 'invalid_access_level'));
				}
			}
		}
	}
	else{
		if(project == null){
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
		}
		else{
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
	// TODO return 400 for unsuported views
	// TODO raw view accepts extra query params offset and length
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
 * Checks the parameters for file posting
 */
namespace qH {
	export const hasAction: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.action ? true : false);
	}
	export const setsMetadata: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.action && req.query.action == 'set_metadata' ? true : false);
	}
	export const mksDir: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.action && req.query.action == 'mkdir' ? true : false);
	}
	export const deletes: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.action && req.query.action == 'delete' ? true : false);
	}
	export const moves: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.action && req.query.action == 'move' ? true : false);
	}
	export const copys: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.action && req.query.action == 'copy' ? true : false);
	}
	export const overwrites: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.overwrite ? req.query.overwrite : false);
	}
	export const offset: ((req: Request) => number) = (req: Request): number => {
		return (req.query.offset ? req.query.offset : 0);
	}
	export const truncates: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.truncate ? req.query.truncate : false);
	}
	export const isFinal: ((req: Request) => boolean) = (req: Request): boolean => {
		return (req.query.final ? req.query.final : false);
	}
	export const nothingSet: ((req: Request) => boolean) = (req: Request): boolean => {
		return (!hasAction(req) && !overwrites(req) && !truncates(req) && !isFinal(req));
	}
}

/**
 * Post a File. / delete / move / etc
 */
/* tslint:disable */
const postFilePath: Middleware = async(req: Request, res: Response, next: NextFunction): Promise<void> =>  {
	logger.debug(`Receiving file ${res.locals.path}`);
	console.log(req.file);
	// req.query.action: set_metadata, mkdir, delete, move, copy
	// req.query.overwrite (bool)
	// req.query.offset (int)
	// req.query.truncate (bool)
	// req.query.final (bool)

	// Return 404 when one of these actions is attempted on non-existing file
	if (res.locals.file == null && (qH.setsMetadata(req) || qH.deletes(req) || qH.moves(req) || qH.copys(req))){
		logger.debug(`Action \'${req.query.action}\' not valid if file does not exist`);
		next(new RequestError(404, 'file_not_found'));
	}

	// Return 400 when one of these actions is attempted on existing file
	if (res.locals.file != null && (qH.nothingSet(req) || qH.mksDir(req))) {
		logger.debug(`Action \'${req.query.action}\' not valid if file exists`);
		next(new RequestError(400, 'file_exists'));
	}

	// Sets final if requested
	if (res.locals.file && qH.isFinal(req)) {
		res.locals.file.status = 'preprocessing';
		// start file conversion
	}

	// Sets Metadata if requested
	if(qH.setsMetadata(req)){
		res.locals.file.metadata = req.body;
		await res.locals.file.save();
		next();
	}

	// Deletes File if requested
	if(qH.deletes(req)){
		logger.info(`File ${res.locals.file.name} will be deleted`)
		deleteFile(res.locals.file.uuid, res.locals.project.name);
		await res.locals.file.destroy();
		next();
	}

	// Moves File if requested
	if(qH.moves(req)){
		// TODO
		next(new RequestError(500, 'not_implemented'));
	}

	// Copies File if requested
	if(qH.copys(req)){
		// TODO
		next(new RequestError(500, 'not_implemented'));
	}

	// Overwrite data but not truncate
	// eg. OOOONNNNNNOOOO (O = old data, N = new data)
	if(qH.overwrites(req) && !qH.truncates(req)){
		// TODO
		next(new RequestError(500, 'not_implemented', 'please specify truncate parameter'));
	}

	// Create File or Folder if file doesn't exist
	if (res.locals.file == null){
		// lets have a res.locals.deepestFolderName (and Id) which is a string of the deepest parent folder found
		let remainingPath: string = (res.locals.deepestFolderName == '') ? '/' + res.locals.path
			: res.locals.path.split(res.locals.deepestFolderName)[1];

		// Loop the part of the path that doesn't exist yet and create all the folders
		while((remainingPath.match(/\//g) || []).length > 1){
			// If there are more subfolders that dont exist, then create them
			const subFolder: string = remainingPath.split("/")[1]
			logger.debug(`Adding subfolder \'${subFolder}\'`);
			const dir: File = new File({
				uuid: uuid.generate(),
				mimetype: 'inode/directory',
				nameInternal: subFolder
			});
			await dir.save();

			// update parent directory of new directory
			if(!await addSubFileToFolder(res.locals.deepestFolderId, dir.uuid)){
				logger.debug("adding file to folder failed!")
				next(new RequestError(500, 'Adding file to folder failed'))
			}
			// update vars
			remainingPath = remainingPath.split(subFolder)[1]
			res.locals.deepestFolderName = subFolder;
			res.locals.deepestFolderId = dir.uuid;
		}

		logger.debug(`Writing file \'${res.locals.filename}\' to folder \'${res.locals.deepestFolderName}\'`)
		res.locals.file = new File({
			uuid: uuid.generate(),
			nameInternal: res.locals.filename
		});
		res.locals.file.mimetype = qH.mksDir(req) ? 'inode/directory' : req.file.mimetype;

		await res.locals.file.save();

		// update parent directory of new directory
		if(!await addSubFileToFolder(res.locals.deepestFolderId, res.locals.file.uuid)){
			logger.debug("adding file to folder failed!")
			next(new RequestError(500, 'Adding file to folder failed'))
		}
	}

	// Move temp file to proper location (if not directory)
	if(!qH.mksDir(req)){
		saveFile(req.file.originalname, res.locals.project.name, res.locals.file.uuid, qH.offset(req));
	}

	// Sets final if requested
	if (qH.isFinal(req)) {
		res.locals.file.status = 'final';
	}
	
	next();
	
};
/* tslint:enable */

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
		this.router.post('/projects/:project_name/files/:path',
											upload.single('userfile'), postFilePath);
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
						User
					],
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
				// Vars we assign here:
				//  - res.locals.deepestFolderName (...Id): deepest existing folder in path
				//  - res.locals.path: requested path (using "/")
				//  - res.locals.filename: requested file name (may be '')
				//  - res.locals.file: actual file object if it exists
				// Vars arleady assigned:
				//  - res.locals.project: requested project object

				// Replace + with /
				res.locals.path = filename.replace(/\+/g, '/');
				logger.debug(`Searching for path \'${res.locals.path}\'`);
				// Split path into parts
				const fileNames: string[] = res.locals.path.split('/');
				res.locals.filename = (fileNames.length > 0) ?
					fileNames[fileNames.length - 1] : '';
				logger.debug(`Searching for file \'${res.locals.filename}\'`);
				const project: Project | null = res.locals.project;
				if (project == null) {
					// Project should have been found by previous precondition
					logger.debug('Project was not found: skipping finding file');
					return next(new RequestError(404, 'project_not_found'));
				}
				let curDir: File | null = project.rootFolder;
				res.locals.deepestFolderId = curDir.uuid;
				res.locals.deepestFolderName = curDir.name;
				let i: number = 0;
				// Loop through the path and find the deepest folder that exists.
				// 		Also find the file if possible.
				while (curDir && i < fileNames.length) {
					logger.debug(`Searching for \'${fileNames[i]}\'`);
					const fileOrNull: File | null = await File.findOne({
						include: [{all: true}],
						where: {
							nameInternal: fileNames[i],
							parentFolderId: curDir.uuid
						}
					});
					if (fileOrNull == null) {
						logger.debug(`Sub-file \'${fileNames[i]}\' not found in DB`);
						return next();
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

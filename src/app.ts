import * as bodyParser from 'body-parser';
import * as ex from 'express';
import * as expressJwt from 'express-jwt';
import * as logger from 'morgan';
import * as passport from 'passport';

import { default as authRouter, unauthorisedErr } from './auth';

import { RequestError, errorHandler } from './errors/errorware';
import FileRouter from './FileRouter';

import { default as File } from './db/model/File';
import { default as Project } from './db/model/Project';
import { default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';

/**
 * Configuration of the Express server app, including installation of
 * various middleware functions.
 */

/**
 * The Class used to configure the Express app used in the server instance.
 */
class App {
	/**
	 * The Express app used throught the server.
	 */
	public express: ex.Express;

	/**
	 * Whether or not logging is enabled on the server.
	 */
	private readonly logEnabled: boolean = true;

	/**
	 * Constructs an instance of the app, by loading middleware.
	 *
	 * @param enableLog Whether or not logging should be enabled on the
	 *   server.
	 */
	public constructor(enableLog: boolean) {
		this.logEnabled = enableLog;
		this.express = ex();
		this.precondition();
		this.middleware();
		this.mountRoutes();
		this.express.use(
			async(req: ex.Request, res: ex.Response, next: ex.NextFunction):
			Promise<void> => {
				res.json({
					status: 'success',
					data: await res.locals.data
				});
			}
		);
		this.errorware();
	}

	/**
	 * Configures regular Express middleware.
	 */
	private middleware(): void {
		this.express.use(expressJwt({secret: 'Mr Secret'})
			.unless({path: [
				'/cs3099group-be-4/oauth/token',
				'/cs3099group-be-4/_supported_protocols_'
			] })
		);
		this.express.use(passport.initialize());
		this.express.use(async(
			req: ex.Request, res: ex.Response, next: ex.NextFunction
		): Promise<void> => {
			if (req.user != null) {
				req.user = await User.findOne({
					where: {
						username: req.user.object.username
					},
					include: [
						UserGroup
					]
				});
			}
			next();
		});
		if (this.logEnabled) {
			this.express.use(logger('combined'));
		}
		this.express.use(bodyParser.json());
		this.express.use(bodyParser.urlencoded({ extended: false }));
	}

	/**
	 * Adds the Router routes to the Express app.
	 */
	private mountRoutes(): void {
		const defRouter: ex.Router = ex.Router();
		defRouter.get('/', (req: ex.Request, res: ex.Response): void => {
			res.json({
				message: 'Welcome to the CS3099 BE4 server!',
				important: 'Endpoints start from /cs3099group-be-4/'
			});
		});
		defRouter.get('/*', (req: ex.Request, res: ex.Response): void => {
			res.status(404)
			.json({
				status: 'error',
				error : 'invalid_route',
				error_description: 'Endpoints start from /cs3099group-be-4/'
			});
		});
		this.express.use('/cs3099group-be-4', FileRouter);
		this.express.use('/cs3099group-be-4', authRouter);
		this.express.use('/', defRouter);
	}

	/**
	 * Adds error-handling (4-arity) middleware to the Express app.
	 */
	private errorware(): void {
		this.express.use(unauthorisedErr);
		this.express.use(errorHandler);
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
		// Fetch a user from their name:
		this.express.param(
			'username',
			async(
				req: ex.Request, res: ex.Response, next: ex.NextFunction,
				name: string
			): Promise<void> => {
				const user: User | null = await User.findOne({
					where: {
						username: name
					}
				});
				if (user === null) {
					return next(new RequestError(404, 'user_not_found'));
				} else {
					res.locals.user = user;
				}
				next();
			}
		);

		// Fetch a project from its name:
		this.express.param(
			'project_name',
			async(
				req: ex.Request, res: ex.Response, next: ex.NextFunction,
				project: string
			): Promise<void> => {
				res.locals.project = await Project.findOne({
					where: {
						name: project
					}
				});
				next();
			}
		);

		// Fetch a file from its path:
		this.express.param(
			'file',
			async(
				req: ex.Request, res: ex.Response, next: ex.NextFunction,
				filename: string
			): Promise<void> => {
				const fileNames: string[] = req.params.path.split('/');
				const project: Project | null = res.locals.project;
				if (project === null) {
					next(new RequestError(404, 'project_not_found'));
					return;
				}
				let file: File = project.rootFolder;
				// TODO Rewrite using sub-queries instead of repeated queries.
				while (fileNames.length > 2) {
					const fileOrNull: File | null = await File.findOne({
						where: {
							name: fileNames[0],
							parentFolder: file
						}
					});
					if (fileOrNull === null) {
						return next();
					} else {
						file = fileOrNull;
					}
					fileNames.splice(0, 1);
				}
				const parentFolder: File | null = await File.findOne({
					include: [
						{ model: File, as: 'containedFiles' }
					],
					where: {
						parentFolder: file,
						name: fileNames[0]
					}
				});
				if (parentFolder === null) {
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
		this.express.param(
			'id',
			async(
				req: ex.Request, res: ex.Response, next: ex.NextFunction,
				fileId: string
			): Promise<void> => {
				const file: File | null = await File.findOne({
					where: {
						uuid: fileId
					}
				});
				if (file === null) {
					next(new RequestError(404, 'file_not_found'));
					return;
				} else {
					res.locals.file = file;
				}
				next();
			}
		);
	}
}

export default new App(true).express;

/**
 * A version of the app used only for testing.
 */
// tslint:disable-next-line:variable-name
export const TestApp: () => ex.Express = (): ex.Express => {
	return new App(false).express;
};

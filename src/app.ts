import * as bodyParser from 'body-parser';
import * as ex from 'express';
import * as expressJwt from 'express-jwt';
import * as logger from 'morgan';
import * as passport from 'passport';

import { unauthorisedErr, isAdmin, default as authRouter } from './auth';

import { RequestError, errorHandler } from './errors/errorware';
import FileRouter from './FileRouter';

import { default as File } from './db/model/File';
import { default as Project } from './db/model/Project';
import { default as User } from './db/model/User';

class App {
	public express: ex.Express;
	public logEnabled: boolean = true;

	public constructor() {
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

	// Configure Express middleware.
	private middleware(): void {
		this.express.use(expressJwt({secret: 'Mr Secret'})
			.unless({path: [
				'/cs3099group-be-4/login',
				'/cs3099group-be-4/_supported_protocols_'
			] })
		);
		this.express.use(passport.initialize());
		if (this.logEnabled) {
			this.express.use(logger('combined'));
		}
		this.express.use(bodyParser.json());
		this.express.use(bodyParser.urlencoded({ extended: false }));
	}

	// Configure API endpoints.
	private mountRoutes(): void {
		const defRouter: ex.Router = ex.Router();
		defRouter.get('/', (req: ex.Request, res: ex.Response): void => {
			res.json({
				message: 'Welcome to the CS3099 BE4 server!',
				important: 'Endpoints start from /cs3099group-be-4/'
			});
		});
		this.express.use('/', defRouter);
		this.express.use('/cs3099group-be-4', FileRouter);
		this.express.use('/cs3099group-be-4', authRouter);		
	}

	private errorware(): void {
		this.express.use(unauthorisedErr);
		this.express.use(errorHandler);
	}

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
					next(new RequestError(404, 'user_not_found'));
					return;
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
						next();
						return;
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
					next();
					return;
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

export default new App().express;

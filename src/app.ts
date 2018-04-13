import * as bodyParser from 'body-parser';
import * as ex from 'express';
import * as expressJwt from 'express-jwt';
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
	 * The Express app used throughout the server.
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
		this.express.use((
			req: ex.Request, res: ex.Response, next: ex.NextFunction
		): void => { console.log(req.url); next(); });		
		this.middleware();
		this.mountRoutes();
		this.express.use(
			async(req: ex.Request, res: ex.Response, next: ex.NextFunction):
			Promise<void> => {
				if (res.locals.function) {
					res.locals.function.bind(res)(res.locals.data);
				} else {
					res.json({
						status: 'success',
						data: await res.locals.data
					});
				}
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
		const errRouter: ex.Router = ex.Router();
		errRouter.get('/*', (req: ex.Request, res: ex.Response): void => {
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
		this.express.use('/XX*', errRouter);
	}

	/**
	 * Adds error-handling (4-arity) middleware to the Express app.
	 */
	private errorware(): void {
		this.express.use(unauthorisedErr);
		this.express.use(errorHandler);
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

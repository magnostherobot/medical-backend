/* tslint:disable:prefer-function-over-method */

import { Errorware, RequestError } from './errors/errorware';
import { NextFunction, Request, Response, Router } from 'express';
import { Middleware } from './FileRouter';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import { Strategy } from 'passport-local';
import { default as Project } from './db/model/Project';
import { default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';

/**
 * The module for system authentication.
 */

/**
 * A class used to configure the authentication of the server.
 */
export class AuthRouter {
	/**
	 * The Express Router this authenticator is built on.
	 */
	public router: Router;

	/**
	 * A simple constructor that initialises the authenticator.
	 */
	public constructor() {
		this.router = Router();
		this.init();
	}

	/**
	 * A middleware function that generates an OAuth-like token, used for
	 * authentication in future interactions with the client.
	 *
	 * @param req The Express http request.
	 * @param res The Express http response.
	 */
	public async genToken(req: Request, res: Response): Promise<void> {
		const user: User | null = await User.findOne({
			where: {
				username: req.body.username
			},
			include: [ UserGroup, Project]
		});

		if (user === null) {
			// Whoa, what an error!
			return;
		}

		const token: string = jwt.sign(
			{ object: user },
			'Mr Secret',
			{ expiresIn: 21600 }
		);

		res.json({
			token_type: 'bearer',
			access_token: token,
			refresh_token: token,
			expires_in: 21600
		});
	}

	/**
	 * Middleware used to authenticate the user, using previously-obtained
	 * OAuth-like tokens.
	 *
	 * @param req The Express http request.
	 * @param res The Express http response.
	 */
	private authenticate(req: Request, res: Response, next: NextFunction): void {
		passport.authenticate(
			'local',
			{ session: false },
			(err: Error, user: User) => {
				// TODO: Implement
				if (err) { throw err; }

				if (!user) {
					next(new RequestError(
						400, 'invalid_grant', 'Incorrect authentication details'
					));
				}
			}
		);
		next();
	}

	/**
	 * Middleware that checks the incoming request for missing or
	 * inaccurate properties, before the authentication process.
	 *
	 * @param req The Express http request.
	 * @param res The Express http response.
	 */
	public checkErr(req: Request, res: Response, next: NextFunction): void {
		if (!req.body.grant_type || !req.body.username || !req.body.password) {
			return next(new RequestError(400, 'invalid_request', 'Missing parameters'));
		}

		if (req.body.grant_type !== 'refresh_token'
			&& req.body.grant_type !== 'password') {
			return next(new RequestError(
				400, 'unsupported_grant_type', 'invalid grant type'
			));
		}

		next();
	}

	/**
	 * Used to configure Passport to use the custom authentication strategy.
	 */
	private configStrategy(): void {
		// tslint:disable-next-line:typedef
		passport.use(new Strategy( async(username, password, done) => {
			const user: User | null = await User.findOne({
				where: {
					username
				},
				include: [UserGroup, Project]
			});

			if (!user || user.password !== password) {
				return done(null, false);
			}
			return done(null, user);
		}));
	}

	/**
	 * Function used by the constructor to initialise the authenticator.
	 */
	public init(): void {
		this.configStrategy();

		this.router.post(
			'/oauth/token',
			this.checkErr,
			this.authenticate,
			this.genToken
		);
		this.router.get(
			'/logout',
			(req: Request, res: Response): void => { req.logout(); }
		);
	}
}

/**
 * Error-handling middleware used to handle authentication errors.
 *
 * The error is transformed into one that can be handled by later
 * error-handling middleware functions.
 *
 * @param err The Error to handle/transform.
 * @param req The Express http request.
 * @param res The Express http response.
 * @param next The next Express middleware function.
 */
export const unauthorisedErr: Errorware =
	(err: Error, req: Request, res: Response, next: NextFunction): void => {
	if (err.name === 'UnauthorizedError') {
		return next(new RequestError(
			401, 'not_authorised',
			'user does not have correct authorisation for task'
		));
	}
	next(err);
};

/**
 * A middleware to check whether or not the currently-authenticated User is
 * an admin.
 *
 * @param req The Express http request.
 * @param res The Express http response.
 * @param next The next Express middleware function.
 */
export const isAdmin: Middleware =
(req: Request, res: Response, next: NextFunction): void => {
	const admin: boolean = req.user.object.userGroups
		.some((x: UserGroup): boolean => x.name === 'admin');

	if (!admin) {
		next(new RequestError(
			401, 'not_authorised',
			'user is not authorised to perform task'
		));
		return;
	}
	next();
};

export default new AuthRouter().router;
///////////////////////////////////////////////////

/*
 * tasks left:
 * 	refreshing tokens
 * 	connect to db
 * 	revoke tokens/checking validity
 * 	logging out
 */

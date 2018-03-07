/* tslint:disable:prefer-function-over-method */

import { RequestError } from './errors/errorware';
import { NextFunction, Request, Response, Router } from 'express';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import { Strategy } from 'passport-local';
import { default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';
import { default as Project } from './db/model/Project';

import { Errorware } from './errors/errorware';

export class AuthRouter {
	public router: Router;

	public constructor() {
		this.router = Router();
		this.init();
	}

	// Middleware which generates token and sends it as response
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

	// Checks for errors within request before authentication
	public checkErr(req: Request, res: Response, next: NextFunction): void {
		if (!req.body.grant_type || !req.body.username || !req.body.password) {
			next(new RequestError(400, 'invalid_request', 'Missing parameters'));
		}

		if (req.body.grant_type !== 'refresh_token'
			&& req.body.grant_type !== 'password') {
			next(new RequestError(400, 'unsupported_grant_type', 'invalid grant type'));
		}

		next();
	}

	
	// Configure local strategy to use with passport-js.
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

	public init(): void {
		this.configStrategy();

		this.router.post('/oauth/token', this.checkErr, this.authenticate, this.genToken);
		this.router.get(
			'/logout',
			(req: Request, res: Response): void => { req.logout(); }
		);
	}
}

// Handle error if user is unauthorised
export const unauthorisedErr: Errorware =
	(err: Error, req: Request, res: Response, next: NextFunction): void => {
	console.log('fffff');
	if (err.name === 'UnauthorizedError') {
		console.log('efewfwf');
		return next(new RequestError(
			401, 'not_authorised',
			'user does not have correct authorisation for task'
		));
	}
	next(err);
};

// Middleware to check privileges - admin
export const isAdmin: any = 
(req: Request, res: Response, next: NextFunction): void => {	
	var isAdmin: boolean = req.user.object.userGroups.some((x: UserGroup): boolean => x.name === 'admin');
	
	if (!isAdmin) {
		next(new RequestError(
			401, 'not_authorised',
			'user is not authorised to perform task'
		));
		return;
	}
	next();
}

const authRoutes: AuthRouter = new AuthRouter();
authRoutes.init();

export default authRoutes.router;
///////////////////////////////////////////////////

/*
 * tasks left:
 * 	refreshing tokens
 * 	connect to db
 * 	revoke tokens/checking validity
 * 	logging out
 */

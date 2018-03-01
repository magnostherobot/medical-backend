import { NextFunction, Request, Response, Router } from 'express';
import * as expressJwt from 'express-jwt';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import { Strategy } from 'passport-local';
import { default as User } from './db/model/User';

export class AuthRouter {
	public localStrategy: Strategy;
	public router: Router;
	ensureAuth;

	public constructor() {
		this.localStrategy = Strategy();
		this.ensureAuth = expressJwt({secret: 'Mr Secret'}); //protects routes
		this.router();
		this.init();
	}

	// Used by passport-js to locate a user object from the database by username
	public findByUsername(username: string): User {
		if (username === user.username) {
			return user;
		}
		return false;
	}

	// Find user object from database by user ID
	public findUserByID(id): User {
		if (id === user.id) {
			return user;
		}
		return false;
	}

	// Middleware which generates token and sends it as response
	public genToken(req: Request, res: Response) {
		const userid = findUserByID(req.body.username);
		const token = jwt.sign(
			{ id: userid },
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

	private authenticate(req: Request, res: Response, next: NextFunction) {
		passport.authenticate('local', { session: false }, function(err, user) {
			if (err) { console.log(err); }

			if (!user) {
				next(new RequestError(400, 'invalid_grant', 'Incorrect authentication details'));
			}
		});
		next();
	}

	// Checks for errors within request before authentication
	public checkErr(req: Request, res: Response, next: NextFunction) {
		if (!req.body.grant_type || !req.body.username || !req.body.password) {
			next(new RequestError(400, 'invalid_request', 'Missing parameters'));
		}

		if (req.body.grant_type !== 'refresh_token'
			&& req.body.grant_type !== 'password') {
			next(new RequestError(400, 'unsupported_grant_type', 'invalid grant type'));
		}

		next();
	}

	// Handle error if user is unauthorised
	public unauthorisedErr(err, req: Request, res: Response, next: NextFunction) {
		if (err.name === 'UnauthorizedError') {
			next(new RequestError(401, 'not_authorised', 'user does not have correct authorisation to complete task'));
		}
		next();
	}

	//middleware to check privileges - admin
	public isAdmin(req: Request, res: Response, next: NextFunction) {
		if (!req.user.admin) {
			next(new RequestError(401, 'not_authorised', 'user is not authorised to perform task'));
		}
		next();
	}

	// Configure local strategy to use with passport-js.
	private configStrategy() {
		passport.use(new localStrategy( (username, password, done) => {
			const user = findByUsername(username);

			if (!user || user.password != password) {
				return done(null, false);
			}
			return done(null, user);
		}));
	}

	init() {
		this.configStrategy();

		this.router.post('/login', this.checkErr, this.authenticate, this.genToken);
		this.router.get('/logout', (req, res) => { req.logout(); });
	}
}

const authRoutes = new AuthRouter();
authRoutes.init();

export default authRoutes.router;
///////////////////////////////////////////////////

app.use(passport.initialize());
app.use(unauthorisedErr); //currently does not handle userdefined error

/*
tasks left:
	refreshing tokens
	connect to db
	revoke tokens/checking validity
	logging out
*/

import { NextFunction, Request, Response, Router } from 'express';
import * as expressJwt from 'express-jwt';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import { Strategy } from 'passport-local';
import { default as User } from './db/model/User';

export class AuthRouter {
	public localStrategy: Strategy;
	public router: Router;

	public constructor() {
		this.localStrategy = Strategy();
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

	// Checks for errors within request before authentication
	public checkErr(req: Request, res: Response, next: NextFunction) {
		if (!req.body.grant_type || !req.body.username || !req.body.password) {
			res.status(400)
				.json({
				error: 'invalid_request',
				error_description: 'Missing parameters'
			});
			res.end();
		}

		if (req.body.grant_type !== 'refresh_token'
			&& req.body.grant_type !== 'password') {
			res.status(400)
				.json({
				error: 'unsupported_grant_type',
				error_description: 'invalid grant type'
			});
			res.end();
		}

		next();
	}

	// Handle error if user is unauthorised
	public unauthorisedErr(err, req: Request, res: Response, next: NextFunction) {
		if (err.name === 'UnauthorizedError') {
			res.status(401).json({
				status: 'error',
				error: 'not_authorised',
				error_description:
					'user does not have correct authorisation to complete task'
			});
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
}
///////////////////////////////////////////////////

const app = express();
const ensureAuth = expressJwt({secret: 'Mr Secret'}); //protect routes

app.use(passport.initialize());
app.use(unauthorisedErr); //currently does not handle userdefined error

app.post('/login', checkErr, function(req, res, next) {
	passport.authenticate('local', { session: false }, function(err, user) {
		if (err) { console.log(err); }

		if (!user) {
			res.status(400).json({
				error: 'invalid_grant',
				error_description: 'Incorrect authentication details'
			});
		}
	});
	next();
},       genToken);

app.get('/logout', function(req, res) {
	req.logout();
});

app.get('/test', ensureAuth, function(req, res) {
	res.send('you are authenticated!');
});

/*
tasks left:
	refreshing tokens
	connect to db
	revoke tokens/checking validity
	logging out
*/

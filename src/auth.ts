import * as passport from 'passport';
import * as passportLocal from 'passport-local';
import * as jwt from 'jsonwebtoken';
import {Router, Request, Response, NextFunction} from 'express';
import * as expressJwt from 'express-jwt';

export class AuthRouter {
	router: Router
	LocalStrategy
	ensureAuth	

	constructor() {
		this.LocalStrategy = passportLocal.Strategy();
		this.ensureAuth = expressJwt({secret: 'Mr Secret'}); //protect routes
		this.router();		
		this.init();
	}

	//Used by passport-js to locate a user object from the database by username
	public findByUsername(username) {
		if (username == user.username) {
			return user;
		}
		return false;
	}

	//Find user obejct from database by user ID
	public findUserByID(id) {
		if (id == user.id) {
			return user;
		}
		return false;
	}

	//middleware which generates token and sends it as response
	private genToken(req: Request, res: Response) {	
		var userid = findUserByID(req.body.username);
		
		var token = jwt.sign({
			id: userid
		}, 'Mr Secret', {
			expiresIn: 21600
		});

		res.json({
			"token_type": "bearer",
			"access_token": token,
			"refresh_token": token,
			"expires_in": 21600
		});
	}

	private authenticate(req: Request, res: Response, next: NextFunction) {
		passport.authenticate('local', { session: false }, function(err, user) {
			if (err) { console.log(err); }		
	
			if (!user) {
				res.status(400).json({
					"error": "invalid_grant",
					"error_description": "Incorrect authentication details"
				});
			}		
		});
		next();
	}

	//checks for errors within request before authentication
	private checkErr(req: Request, res: Response, next: NextFunction) {	
		if (!req.body.grant_type || !req.body.username || !req.body.password) {
			res.status(400).json({
				"error": "invalid_request",
				"error_description": "Missing parameters"
			});	
			res.end();	
		}

		if (req.body.grant_type != "refresh_token" && req.body.grant_type != "password") {
			res.status(400).json({
				"error": "unsupported_grant_type",
				"error_description": "invalid grant type"
			});
			res.end();
		}

		next();
	}

	//handle error if user is unauthorised
	public unauthorisedErr(err, req: Request, res: Response, next: NextFunction) {
		console.log(err);
		if (err.name === 'UnauthorizedError') {
			res.status(401).json({
				"status": "error",
				"error": "not_authorised",
				"error_description": "user does not have correct authorisation to complete task"
			});	
		}
		next();
	}

	//Configure local strategy to use with passport-js.
	private configStrategy() {
		passport.use(new this.LocalStrategy( (username, password, done) => {
			var user = findByUsername(username);

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

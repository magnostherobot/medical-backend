import * as passport from 'passport';
import * as passportLocal from 'passport-local';
import * as jwt from 'jsonwebtoken';

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as expressJwt from 'express-jwt';

const LocalStrategy = passportLocal.Strategy;

//user object for basic testing
var user = {
	"id": 23,
	"username": "har4",
	"password":  "secret"
}

//Used by passport-js to locate a user object from the database by username
function findByUsername(username) {
	if (username == user.username) {
		return user;
	}
	return false;
}

//Find user obejct from database by user ID
function findUserByID(id) {
	if (id == user.id) {
		return user;
	}
	return false;
}

//middleware which generates token and sends it as response
function genToken(req, res) {	
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

//checks for errors within request before authentication
function checkErr(req, res, next) {	
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
function unauthorisedErr(err, req, res, next) {
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
passport.use(new LocalStrategy(
	function(username, password, done) {
		var user = findByUsername(username);

		if (!user || user.password != password) { 
			return done(null, false); 
		}
		return done(null, user);
	})
);


//both methods below needed for persistant sessions
/*passport.serializeUser(function(user, done) {		
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	var user = findUserByID(id);
	done(null, user);
});
*/

///////////////////////////////////////////////////

var app = express();
var ensureAuth = expressJwt({secret: 'Mr Secret'}); //protect routes
app.use(bodyParser.json());

app.use(passport.initialize());
//app.use(passport.session());
app.use(unauthorisedErr); //currently does not handle userdefined error

app.post('/login', checkErr, function(req, res, next) {	
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
}, genToken);

app.get('/logout', function(req, res) {
	req.logout();
});

app.get('/test', ensureAuth, function(req, res) {
	res.send("you are authenticated!");
});

app.listen(3000);

/*
tasks left:
	refreshing tokens
	connect to db
	revoke tokens/checking validity
	logging out
*/

import * as passport from 'passport';
import * as passportLocal from 'passport-local';
import * as jwt from 'jsonwebtoken';

const LocalStrategy = passportLocal.Strategy;

//Used by passport-js to locate a user object from the database by username
function findByUsername(username) {

}

//Find user obejct from database by user ID
function findUserByID(id) {

}

//middleware which generates token and sends it as response
function genToken(req, res) {
	var userid = findUserByID(req.username);
	
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

function checkErr(req, res, next) {
	if (!req.grant_type || !req.username || !req.password) {
		res.status(400).json({
			"error": "invalid_request",
			"error_description": "Missing parameters"
		});
		res.end();
	}

	if (req.grant_type != "refresh_token" || req.grant_type != "password") {
		res.status(400).json({
			"error": "unsupported_grant_type",
			"error_description": "invalid grant type"
		});
		res.end();
	}

	next();
}



//Configure local strategy to use with passport-js.
passport.use(new LocalStrategy({
	function(username, password, done) {
		var user = findByUsername(username);

		if (!user || user.password != password) { 
			return done(null, false); 
		}
		return done(null, user);
	}
}));

passport.serializeUser(function(user, done) {		
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	var user = findUserByID(id);
	done(null, user);
});


///////////////////////////////////////////////////
app.use(passport.initialize());
app.use(passport.session());

app.post('/login', checkErr, passport.authenticate('local', function(err, user) {
	if (!user) {
		res.status(400).json({
			"error": "invalid_grant",
			"error_description": "Incorrect authentication details"
		});
	}
}), genToken);

app.get('/logout', )
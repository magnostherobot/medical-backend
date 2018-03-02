import * as bodyParser from 'body-parser';
import * as ex from 'express';
import * as expressJwt from 'express-jwt';
import * as logger from 'morgan';
import * as passport from 'passport';

import { default as authRouter } from './auth';

import { errorHandler } from './errors/errorware';
import FileRouter from './FileRouter';

class App {
	public express: ex.Express;
	public logEnabled: boolean = true;

	public constructor() {
		this.express = ex();
		this.middleware();
		this.mountRoutes();
		this.errorware();
	}

	// Configure Express middleware.
	private middleware(): void {
		this.express.use(expressJwt({secret: 'Mr Secret'}).unless({path: ['/cs3099group-be-4/login', '/cs3099group-be-4/_supported_protocols_'] }));
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
				important : 'Endpoints start from /cs3099group-be-4/'
			});
		});
		this.express.use('/', defRouter);
		this.express.use('/cs3099group-be-4', FileRouter);
		this.express.use('/cs3099group-be-4', authRouter);
	}

	private errorware(): void {
		//this.express.use(authRouter.unauthorisedErr);
		this.express.use(errorHandler);
	}
}

export default new App().express;

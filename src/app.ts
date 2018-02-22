import * as bodyParser from 'body-parser';
import * as ex from 'express';
import FileRouter from './FileRouter';
import * as logger from 'morgan';

class App {
	public express: ex.Express;
	private logEnabled: boolean;

	public constructor(enableLog: boolean) {
		this.express = ex();
		this.middleware();
		this.mountRoutes();
		this.logEnabled = enableLog;
	}

	// Configure Express middleware.
	private middleware(): void {
		if (this.logEnabled) {
			console.log("log enabled")
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
	}
}

export default new App(true).express;
export function TestApp(){
	return new App(false).express;
} 

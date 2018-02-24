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
		defRouter.get('/*', (req: ex.Request, res: ex.Response): void => {
			res.status(404)
			.json({
				status: 'error',
				error : 'invalid_route',
				error_description: 'Endpoints start from /cs3099group-be-4/\n'
						+' Please refer to \'https://github.com/CS3099JH2017/cs3099jh/blob/master/protocols/BE01.md\''
						+ ' for further details.'
			});
		})
		this.express.use('/cs3099group-be-4', FileRouter);
		this.express.use('/', defRouter);
	}
}

export default new App(true).express;
export function TestApp(){
	return new App(false).express;
} 

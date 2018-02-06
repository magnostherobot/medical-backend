import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import FileRouter from './FileRouter';


class App {
  public express
  public log_enabled : boolean;

  constructor () {
    this.express = express()
    this.middleware()
    this.mountRoutes()
  }

  // Configure Express middleware.
  private middleware(): void {
    console.log(this.log_enabled);
    if(this.log_enabled) this.express.use(logger('combined'));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
  }

  // Configure API endpoints.
  private mountRoutes (): void {
    const defRouter = express.Router()
    defRouter.get('/', (req, res) => {
      res.json({
        message: 'Welcome to the CS3099 BE4 server!'
      })
    })
    this.express.use('/', defRouter)
    this.express.use('/cs3099group-be-4', FileRouter)
  }
}

export default new App().express
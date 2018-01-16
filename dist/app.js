"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");
const FileRouter_1 = require("./FileRouter");
class App {
    constructor() {
        this.express = express();
        this.middleware();
        this.mountRoutes();
    }
    // Configure Express middleware.
    middleware() {
        this.express.use(logger('combined'));
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: false }));
    }
    // Configure API endpoints.
    mountRoutes() {
        const defRouter = express.Router();
        defRouter.get('/', (req, res) => {
            res.json({
                message: 'Welcome to the CS3099 BE4 server!'
            });
        });
        this.express.use('/', defRouter);
        this.express.use('/cs3099group-be-4/files/directory', FileRouter_1.default);
    }
}
exports.default = new App().express;

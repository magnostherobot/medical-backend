"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Files = null; //require('../data');
/*
 *                         |->
 * /project/files/directory/file?filters
 *                         |->
 */
class FileRouter {
    /**
     * Initialize the FileRouter
     */
    constructor() {
        this.router = express_1.Router();
        this.init();
    }
    /**
     * GET a File.
     */
    getFile(req, res, next) {
        let fileID = req.params.file;
        // check if fileID is number or path
        // find file in data
        // check if only metadata was requested and return appropriate info
        // otherwise:
        // if image:
        // convert if necessary
        // zoom if necessary
        // if csv/xls
        // send data in appropriate csv format
        // limit cols if necessary
        res.send("File");
    }
    /**
     * Take each handler, and attach to one of the Express.Router's
     * endpoints.
     */
    init() {
        this.router.get('/:file', this.getFile);
    }
}
exports.FileRouter = FileRouter;
// Create the FileRouter, and export its configured Express.Router
const fileRoutes = new FileRouter();
fileRoutes.init();
exports.default = fileRoutes.router;

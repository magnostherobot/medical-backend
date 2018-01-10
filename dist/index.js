"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
console.log('Welcome to the CS3099 Server thingy!');
const app_1 = require("./app");
// use default port 3000 or port supplied by OS
const port = process.env.PORT || 3000;
app_1.default.listen(port, (err) => {
    if (err) {
        return console.log(err);
    }
    return console.log(`server is listening on port ${port}`);
});

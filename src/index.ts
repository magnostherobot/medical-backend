/* tslint:disable:no-console
 * This only goes here until we have a logging system */

import app from './app';

console.log('Welcome to the CS3099 Server thingy!');

const DEFAULT_PORT: number = 3000;

// Use default port 3000 or port supplied by OS
const port: number = process.env.PORT
	? process.env.PORT
	: DEFAULT_PORT;

app.listen(port, (err: Error): void => {
	if (err) {
		return console.log(err);
	}

	return console.log(`server is listening on port ${port}`);
});

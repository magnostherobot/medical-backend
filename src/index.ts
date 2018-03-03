/* tslint:disable:no-console
 * This only goes here until we have a logging system */

console.log('begin import');
import { default as app } from './app';
import { default as seq } from './db/orm';
console.log('end import');

import { default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';

const DEFAULT_PORT: number = 3000;

// Use default port 3000 or port supplied by OS
const port: number = process.env.PORT
	? process.env.PORT
	: DEFAULT_PORT;

// tslint:disable:no-floating-promises
(async(): Promise<void> => {
	console.log('Booting PSQL database');

	await seq.authenticate();

	console.log('Resetting Database');

	await seq.sync({
		force: true
	});

	const admin: UserGroup = new UserGroup({
		name: 'admin',
		canCreateUsers: true,
		canDeleteUsers: true,
		canEditUsers: true,
		canCreateProjects: true,
		canDeleteProjects: true,
		canEditProjects: true,
		isInternal: false,
		description: 'Systems admin'
	});

	await admin.save();

	console.log(admin.id);

	const root: User = new User({
		username: 'hafeez',
		password: 'pass',
		userGroup: admin
	});

	root.save();

	console.log('Booting ExpressJS server');

	app.listen(port, (err: Error) => {
		if (err) {
			return console.log(err);
		} else {
			return console.log(`server is listening on port ${port}`);
		}
	});
})();

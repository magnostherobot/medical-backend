
import { logger } from './logger';

logger.info('Starting up server');

logger.info('Importing server logic');
import { default as app } from './app';

logger.info('Importing database ORM');
import { default as seq } from './db/orm';

import { default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';

const DEFAULT_PORT: number = 3000;

// Use default port 3000 or port supplied by OS
const port: number = process.env.PORT
	? process.env.PORT
	: DEFAULT_PORT;
logger.info(`Port ${port} chosen`);

// tslint:disable:no-floating-promises
(async(): Promise<void> => {
	try {
		logger.info('Authenticating with database');
		await seq.authenticate();
	} catch (err) {
		logger.error(`Cannot authenticate with database: ${err}`);
		process.exit(1);
	}

	try {
		logger.info('Resetting Database');
		await seq.sync({
			force: true
		});
	} catch (err) {
		logger.error(`Cannot synchronise with database: ${err}`);
		process.exit(1);
	}

	logger.info('Adding admin privileges');
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

	logger.info('Adding admin user');
	const root: User = new User({
		username: 'hafeez',
		password: 'pass',
		userGroup: admin
	});

	await root.save();

	logger.info('Booting ExpressJS server');
	app.listen(port, (err: Error) => {
		if (err) {
			return logger.error(`Error on ExpressJS startup: ${err}`);
		} else {
			return logger.info(`Server started on port ${port}`);
		}
	});

	// tslint:disable-next-line:no-unused-expression
	process.send && process.send('ready');
})();

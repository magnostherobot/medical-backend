
import { logger } from './logger';

logger.info('Starting up server');

logger.info('Importing server logic');
import { default as app } from './app';

logger.info('Importing database ORM');
import { createRootFolder, rootPathId } from './files';
import { default as seq } from './db/orm';

import { default as File } from './db/model/File';
import { default as User } from './db/model/User';
import { default as UserGroup } from './db/model/UserGroup';

const DEFAULT_PORT: number = 3000;

// Use default port 3000 or port supplied by OS
const port: number = process.env.PORT
	? process.env.PORT
	: DEFAULT_PORT;
logger.info(`Port ${port} chosen`);

async function reset(): Promise<void> {
	try {
		logger.info('Resetting Database');
		await seq.sync({
			force: true
		});
	} catch (err) {
		logger.error(`Cannot synchronise with database: ${err}`);
		process.exit(1);
	}

	logger.info('Setting up directory structure');
	const rootDir: File = new File({
		uuid: rootPathId,
		mimetype: 'inode/directory',
		name: '/'
	});
	await rootDir.save();

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
	const logging: UserGroup = new UserGroup({
		name: 'logging',
		canAccessLogs: true,
		isInternal: false,
		description: 'Allows Post to Log'
	});

	await logging.save();
	await admin.save();

	logger.info('Adding admin user');
	const root: User = new User({
		username: 'hafeez',
		password: 'pass'
	});

	await root.save();
	createRootFolder();

	await root.$set('userGroups', [admin, logging]);

	const user: User | null = await User.findOne({
		include: [{all: true}],
		where: {
			username: 'hafeez'
		}
	});

}

// tslint:disable:no-floating-promises
(async(): Promise<void> => {
	try {
		logger.info('Authenticating with database');
		await seq.authenticate();
	} catch (err) {
		logger.error(`Cannot authenticate with database: ${err}`);
		process.exit(1);
	}

	//await reset();

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

import { default as Project } from '../src/db/model/Project';
import { default as User } from '../src/db/model/User';
import { default as UserGroup } from '../src/db/model/UserGroup';
import { default as File } from '../src/db/model/File';
import { FileTypeName } from '../src/files';

import { Sequelize } from 'sequelize-typescript';
import * as sqlite from 'sqlite3';

export type Database = Sequelize;

export const initDB: () => Database = (): Database => {
	const dataFile: string = ':memory:';
	const db: sqlite.Database = new sqlite.Database(dataFile);
	const seq: Database = new Sequelize(`sqlite:${dataFile}`);
	seq.addModels([`${__dirname}/../src/db/model`]);
	seq.options.logging = false;
	return seq;
};

export const resetDB: (database: Database) => Promise<void> = async(
	database: Database
): Promise<void> => {
	await database.sync({
		force: true
	});
};

export interface Credentials {
	username: string;
	password: string;
	usergroups: UserGroup[];
}

export interface Projec {
	name: string;
	contributors: Credentials[];
	creationDate: Date;
	lastActivity: Date;
}

export interface Filee {
	name: string,
	path: string,
	uuid: string,
	creator: Credentials,
	type: FileTypeName
}

export const addUser: (database?: Database, admin?: boolean) =>
	Promise<Credentials> = async(
		database?: Database, admin?: boolean
): Promise<Credentials> => {
	const mockUser: Credentials = {
		username: 'mock_user',
		password: 'mock_password',
		usergroups: []
	};

	const priv: UserGroup = new UserGroup({
		name: 'admin',
		canCreateUsers: true,
		canDeleteUsers: true,
		canEditUsers: true,
		canCreateProjects: true,
		canDeleteProjects: true,
		canEditProjects: true,
		canAccessLogs: true,
		isInternal: false
	});
	await priv.save();
	mockUser.usergroups.push(priv);

	const logging: UserGroup = new UserGroup({
		name: 'logging',
		canAccessLogs: true,
		isInternal: false,
		description: 'Allows Post to Log'
	});
	mockUser.usergroups.push(logging);

	await logging.save();

	const root: User = await new User(mockUser).save();

	await root.$set('userGroups', [priv, logging]);

	return mockUser;
};

export const addProjec: (database: Database, user: Credentials) =>
	Promise<Projec> = async(
		database: Database, user: Credentials
): Promise<Projec> => {
	const mockProject: Projec = {
		name: 'mocky',
		contributors: [user],
		creationDate: new Date(),
		lastActivity: new Date()
	};

	await new Project(mockProject).save();
	return mockProject;
};

export const addFilee: (database: Database, user: Credentials) =>
	Promise<Filee> = async(
		database: Database, user: Credentials
): Promise<Filee> => {
	const mockFile: Filee = {
		name: 'mockyFile',
		path: 'example/path',
		uuid: 'file1',
		creator: user,
		type: 'generic'
	};

	await new File(mockFile).save();
	return mockFile;
};

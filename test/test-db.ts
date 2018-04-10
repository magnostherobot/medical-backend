import { default as User } from '../src/db/model/User';
import { default as UserGroup } from '../src/db/model/UserGroup';

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

export const addUser: (database?: Database, admin?: boolean) =>
	Promise<Credentials> = async(
		database?: Database, admin?: boolean
): Promise<Credentials> => {
	const mockUser: Credentials = {
		username: 'mock_user',
		password: 'mock_password',
		usergroups: []
	};
	if (admin) {
		const priv: UserGroup = new UserGroup({
			name: 'admin',
			canCreateUsers: true,
			canDeleteUsers: true,
			canEditUsers: true,
			canCreateProjects: true,
			canDeleteProjects: true,
			canEditProjects: true,
			isInternal: false
		});
		await priv.save();
		mockUser.usergroups.push(priv);
	}
	await new User(mockUser).save();
	return mockUser;
};
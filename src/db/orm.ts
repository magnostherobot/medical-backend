import { logQuery } from '../logger';
import { Sequelize } from 'sequelize-typescript';

const seq: Sequelize = new Sequelize({
	database: 'be4',
	dialect: 'postgres',
	username: 'admin',
	password: '',
	operatorsAliases: false,
	modelPaths: [`${__dirname}/model`],
	logging: logQuery,
	benchmark: true
});

export default seq;

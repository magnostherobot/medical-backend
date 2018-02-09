import { Sequelize } from 'sequelize-typescript';

const seq = new Sequelize({
  database: 'be4',
  dialect: 'postgres',
  username: 'admin',
  password: '',
  operatorsAliases: false,
  modelPaths: [__dirname + '/model']
});

export default seq;

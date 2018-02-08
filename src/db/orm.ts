import { Sequelize } from 'sequelize-typescript';

const seq = new Sequelize({
  database: 'be4',
  dialect: 'postgres',
  username: 'admin',
  password: '',
  operatorsAliases: false,
  modelPaths: [__dirname + 'model']
});

seq.authenticate()
  .then(() => console.log('Logged in!'));

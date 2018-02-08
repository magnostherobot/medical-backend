import { Sequelize } from 'sequelize-typescript';

const seq = new Sequelize({
  database: 'be4',
  dialect: 'postgres',
  username: 'admin',
  password: 'eprprJacR0hBpmWvs5IDJZTnjRAY2gM3tSm0b1af',
  storage: ':memory:',
  operatorsAliases: false,
  modelPaths: [__dirname + 'model']
});

seq.authenticate()
  .then(() => console.log('Logged in!'));

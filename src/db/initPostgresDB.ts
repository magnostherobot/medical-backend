var Sequelize = require('sequelize');
const Op = Sequelize.Op;
const gres = new Sequelize('postgres://admin:eprprJacR0hBpmWvs5IDJZTnjRAY2gM3tSm0b1af@localhost:5432/be4',
                            {operatorsAliases : false});

gres
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

import * as Sequelize from 'sequelize';
const gres: Sequelize.Sequelize = new Sequelize(
	'postgres://admin:eprprJacR0hBpmWvs5IDJZTnjRAY2gM3tSm0b1af@postgres:5432/be4',
	{
		operatorsAliases : false
	}
);

gres.authenticate()
	.then(() => {
		// Connection has been established successfully.
	})
	.catch((err: Error) => {
		// Unable to connect to the database.
	});

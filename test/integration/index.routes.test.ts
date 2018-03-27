/* tslint:disable:newline-per-chained-call */
/* Chai assertions look silly when formatted multiline. */
/* tslint:disable:no-unused-expression */
/* Chai assertions do not require assignation. */
/* tslint:disable:typedef */
/* Mocha tests do not require strong typing. */

import * as chai from 'chai';
const expect: Chai.ExpectStatic = chai.expect;
import { Credentials, Database, addUser, initDB, resetDB } from '../test-db';
import { default as User } from '../../src/db/model/User';

// Chai-http must be imported this way:
// tslint:disable-next-line:no-var-requires no-require-imports
chai.use(require('chai-http'));

// Mocha must be imported as a side-effect library:
// tslint:disable-next-line:no-import-side-effect
import 'mocha';

import * as App from '../../src/app';
const app = App.TestApp();

let database: Database;
let mockUser: Credentials;
let token: string;

const initDatabase = async() => {
	database = initDB();
	await database.authenticate();
};

const populateDatabase = async() => {
	await resetDB(database);
	mockUser = await addUser(database);
};

const getToken = async() => {
	return chai.request(app)
	.post('/cs3099group-be-4/login')
	.send({
		username: mockUser.username,
		password: mockUser.password,
		grant_type: 'password'
	})
	.then((res) => {
		token = res.body.access_token;
	});
};

describe('routes : index', () => {
	before(initDatabase);
	describe('GET /', () => {
		before(populateDatabase);
		it('should return 401 without authentication', () => {
			chai.request(app).get('/')
			.catch((err) => {
				return expect(err).to.have.status(401);
			});
		});

		context('with authentication', () => {
			beforeEach(getToken);
			it('should return 200', () => {
				return chai.request(app).get('/')
				.set('Authorization', `Bearer ${token}`)
				.then((res: ChaiHttp.Response) => {
					expect(res).to.have.status(200);
				});
			});
			it('should return json', () => {
				return chai.request(app).get('/')
				.set('Authorization', `Bearer ${token}`)
				.then((res: ChaiHttp.Response) => {
					expect(res.type).to.eql('application/json');
				});
			});

			it('should return a message prop', () => {
				return chai.request(app).get('/')
				.set('Authorization', `Bearer ${token}`)
				.then((res: ChaiHttp.Response) => {
					expect(res.body.message).to.eql('Welcome to the CS3099 BE4 server!');
				});
			});

			it('should return an important prop', () => {
				return chai.request(app).get('/')
				.set('Authorization', `Bearer ${token}`)
				.then((res: ChaiHttp.Response) => {
					expect(res.body.important)
						.to.eql('Endpoints start from /cs3099group-be-4/');
				});
			});
		});

	});
});

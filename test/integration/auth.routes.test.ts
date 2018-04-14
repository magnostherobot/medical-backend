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
	.post('/cs3099group-be-4/oauth/token')
	.send({
		username: mockUser.username,
		password: mockUser.password,
		grant_type: 'password'
	}).then((res) => {
		token = res.body.access_token;
	});
};

const badRequestErr = {
	status: 'error',
	error: 'invalid_request',
	error_description: 'Missing parameters'
};

const unsupportedGrantTypeErr = {
	status: 'error',
	error: 'unsupported_grant_type',
	error_description: 'invalid grant type'
};

const authorisationErr = {
	status: 'error',
	error: 'not_authorised',
	error_description: 'user does not have correct authorisation for task'
};

const base: string = '/cs3099group-be-4';

describe('authentication', () => {
	before(initDatabase);
	context('invalid password authentication', () => {
		before(populateDatabase);
		it('should reject login to invalid endpoints', () => {
			return chai.request(app)
			.post('/invalid endpoint')
			.send({
				username: mockUser.username,
				password: mockUser.password,
				grant_type: 'password'
			}).then((res) => {
				// File-not-found is a valid response
				expect(res).to.have.status(404);
			}).catch((reason) => {
				// Unauthorised is a valid response
				expect(reason).to.have.status(401);
			});
		});
		it('should reject invalid usernames', () => {
			return chai.request(app)
			.post(`${base}/oauth/token`)
			.send({
				username: 'invalid',
				password: mockUser.password,
				grant_type: 'password'
			}).catch((reason) => {
				expect(reason).to.have.status(400);
			});
		});
		it('should reject invalid passwords', () => {
			return chai.request(app)
			.post(`${base}/oauth/token`)
			.send({
				username: mockUser.username,
				password: 'asasasas',
				grant_type: 'password'
			}).catch((reason) => {
				expect(reason).to.have.status(400);
			});
		});
		it('should reject invalid grant_type', () => {
			return chai.request(app)
			.post(`${base}/oauth/token`)
			.send({
				username: mockUser.username,
				password: mockUser.password,
				grant_type: 'invalid'
			}).catch((reason) => {
				expect(reason.response.body).to.eql(unsupportedGrantTypeErr);
			});
		});
		it('should reject empty usernames', () => {
			return chai.request(app)
			.post(`${base}/oauth/token`)
			.send({
				username: '',
				password: mockUser.password,
				grant_type: 'password'
			}).catch((reason) => {
				expect(reason.response.body).to.eql(badRequestErr);
			});
		});
		it('should reject empty passwords', () => {
			return chai.request(app)
			.post(`${base}/oauth/token`)
			.send({
				username: mockUser.username,
				password: '',
				grant_type: 'password'
			}).catch((reason) => {
				expect(reason.response.body).to.eql(badRequestErr);
			});
		});
		it('should reject empty grant_type', () => {
			return chai.request(app)
			.post(`${base}/oauth/token`)
			.send({
				username: mockUser.username,
				password: mockUser.password,
				grant_type: ''
			}).catch((reason) => {
				expect(reason.response.body).to.eql(badRequestErr);
			});
		});
	});
	context('valid password authentication', () => {
		before(populateDatabase);
		it('should accept correct credentials', () => {
			return chai.request(app)
			.post(`${base}/oauth/token`)
			.send({
				username: mockUser.username,
				password: mockUser.password,
				grant_type: 'password'
			}).then((res) => {
				expect(res).to.have.status(200);
			});
		});
	});
	context('token authentication', () => {
		beforeEach(populateDatabase);
		beforeEach(getToken);
		it('should reject invalid tokens', () => {
			return chai.request(app).get(`${base}/users`)
			.set('Authorization', 'Bearer ' + 'invalid')
			.then((res) => {
				expect(res).to.have.status(401);
			}).catch((reason) => {
				expect(reason.response.body).to.eql(authorisationErr);
			});
		});
		it('should accept valid tokens', () => {
			return chai.request(app).get(`${base}/_supported_protocols_`)
			.set('Authorization', `Bearer ${token}`)
			.then((res) => {
				expect(res).to.have.status(200);
			});
		});
	});
});

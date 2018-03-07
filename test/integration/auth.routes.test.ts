/* tslint:disable:newline-per-chained-call */
/* Chai assertions look silly when formatted multiline. */
/* tslint:disable:no-unused-expression */
/* Chai assertions do not require assignation. */

import * as chai from 'chai';
const expect: Chai.ExpectStatic = chai.expect;
import { default as seq } from '../../src/db/orm';
import { default as User } from '../../src/db/model/User';

// Chai-http must be imported this way:
// tslint:disable-next-line:no-var-requires no-require-imports
chai.use(require('chai-http'));

// Mocha must be imported as a side-effect library:
// tslint:disable-next-line:no-import-side-effect
import 'mocha';

import * as App from '../../src/app';
const app = App.TestApp();

const badRequestErr = 
	{ status: 'error',
	  error: 'invalid_request',
	  error_description: 'Missing parameters' };
const unsupportedGrantTypeErr = 
	{ status: 'error',
	  error: 'unsupported_grant_type',
	  error_description: 'invalid grant type' }
const authorisationErr = 
	{ status: 'error',
	  error: 'not_authorised',
	  error_description: 'user does not have correct authorisation for task' }
		

const bobbyCredentials = {
	username: 'bobby',
	password: 'tables',
	grant_type: 'password'
};

let bobbyToken: string;

async function resetDatabase(done: any){
	await seq.sync({
		force: true
	});
	const u: string = bobbyCredentials.username
	const p: string = bobbyCredentials.password

	const newUser: User = new User({
		username: u,
		password: p,
		userGroups: []
	});
	await newUser.save();
	done();
}

async function setupDatabase(done: any) {
	await seq.authenticate();
	await seq.sync({
		force: true
	});
	done();
}

// Add user
before((done: any) => {
	setupDatabase(done);
});

describe('authentication', () => {
	context('invalid password authentication', () => {
		it('should reject invalid usernames', () => {
			chai.request(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, username: 'invalid'})
			.then((res) => {
				expect(res).to.have.status(401);
			});
		});
		it('should reject invalid passwords', () => {
			chai.request(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, password: 'asasasas'})
			.then((res) => {
				expect(res).to.have.status(401);
			});
		});
		it('should reject invalid grant_type', () => {
			chai.request(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, grant_type: 'invalid'})
			.catch((reason) => {
				expect(reason.response.body).to.eql(unsupportedGrantTypeErr);
			});
		});
		it('should reject empty usernames', () => {
			chai.request(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, username: ''})
			.catch((reason) => {
				expect(reason.response.body).to.eql(badRequestErr);
			});
		});
		it('should reject empty passwords', () => {
			chai.request(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, password: ''})
			.catch((reason) => {
				expect(reason.response.body).to.eql(badRequestErr);
			});
		});
		it('should reject empty grant_type', () => {
			chai.request(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, grant_type: ''})
			.catch((reason) => {
				expect(reason.response.body).to.eql(badRequestErr);
			});
		});
	});
	context('valid password authentication', () => {
		before((done: any) => {
			resetDatabase(done);
		});
		it('should accept correct credentials', () => {
			chai.request(app)
			.post('/cs3099group-be-4/login')
			.send(bobbyCredentials)
			.then((res) => {
				expect(res).to.have.status(200);
			});
		});
	});
	context('token authentication', () => {
		let bobbyToken: string;
		before((done: any) => {
			resetDatabase(() => {
				chai.request(app)
				.post('/cs3099group-be-4/login')
				.send(bobbyCredentials)
				.end((err, res) => {
					if (err) { throw err; }
					bobbyToken = res.body.access_token;
					done();
				});
			});
		});
		it('should reject invalid tokens', () => {
			return chai.request(app).get('/')
			.set('Authorization', 'Bearer ' + 'invalid')
			.then((res) => {
				expect(res).to.have.status(401);
			}).catch((reason) => {
				expect(reason.response.body).to.eql(authorisationErr);
			});
		});
		it('should accept valid tokens', () => {
			return chai.request(app).get('/')
			.set('Authorization', 'Bearer ' + bobbyToken)
			.then((res) => {
				expect(res).to.have.status(200);
			});
		});
	});
});

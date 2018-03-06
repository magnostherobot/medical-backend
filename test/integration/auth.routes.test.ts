/* tslint:disable:newline-per-chained-call */
/* Chai assertions look silly when formatted multiline. */
/* tslint:disable:no-unused-expression */
/* Chai assertions do not require assignation. */

import * as chai from 'chai';
const expect: Chai.ExpectStatic = chai.expect;
import { default as seq } from '../../src/db/orm';
import request = require('supertest');
import { default as User } from '../../src/db/model/User';

// Chai-http must be imported this way:
// tslint:disable-next-line:no-var-requires no-require-imports
chai.use(require('chai-http'));

// Mocha must be imported as a side-effect library:
// tslint:disable-next-line:no-import-side-effect
import 'mocha';

import * as App from '../../src/app';
const app = App.TestApp();

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
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, username: 'invalid'})
			.end((err, res) => {
				expect(err).to.not.be.undefined;
				expect(res).to.have.status(401);
			});
		});
		it('should reject invalid passwords', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, password: 'asasasas'})
			.end((err, res) => {
				expect(err).to.not.be.undefined;
				expect(res).to.have.status(401);
			});
		});
		it('should reject invalid grant_type', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, grant_type: 'invalid'})
			.catch((reason) => {
				expect(reason).to.eql('unsupported_grant_type: invalid grant type');
			});
		});
		it('should reject empty usernames', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, username: ''})
			.end((err, res) => {
				expect(err).to.not.be.undefined;
				expect(res).to.have.status(401);
			});
		});
		it('should reject empty passwords', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, password: ''})
			.end((err, res) => {
				expect(err).to.not.be.undefined;
				expect(res).to.have.status(401);
			});
		});
		it('should reject empty grant_type', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, grant_type: ''})
			.catch((reason) => {
				expect(reason).to.eql('unsupported_grant_type: invalid grant type');
			});
		});
	});
	context('valid password authentication', () => {
		before((done: any) => {
			resetDatabase(done);
		});
		it('should accept correct credentials', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send(bobbyCredentials)
			.end((err, res) => {
				expect(err).to.be.null;
				expect(res).to.have.status(200);
			});
		});
	});
	context('token authentication', () => {
		let bobbyToken: string;
		before((done: any) => {
			resetDatabase(() => {
				request.agent(app)
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
			.end((err, res) => {
				expect(err).to.not.be.undefined;
				expect(res).to.have.status(401);
			});
		});
		it('should accept valid tokens', () => {
			return chai.request(app).get('/')
			.set('Authorization', 'Bearer ' + bobbyToken)
			.end((err, res) => {
				expect(err).to.be.null;
				expect(res).to.have.status(200);
			});
		});
	});
});

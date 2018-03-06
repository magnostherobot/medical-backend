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

async function addUser(credentials: any, done: any) {
	await seq.authenticate();
	await seq.sync({
		force: true
	});

	const u: string = credentials.username
	const p: string = credentials.password
	console.log(u + " " + p)

	const newUser: User = new User({
		username: u,
		password: p,
		userGroups: []
	});
	await newUser.save();
	done();
}

// Add user
before(function(done: any) {
	addUser(bobbyCredentials, done);
});

describe('authentication', () => {
	context('invalid authentication', () => {
		it('should reject invalid usernames', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, username: 'invalid'})
			.end(function(err, res) {
				expect(err).to.not.be.undefined;
				expect(res).to.have.status(401);
			});
		});
		it('should reject invalid passwords', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, password: 'invalid'})
			.end(function(err, res) {
				expect(err).to.not.be.undefined;
				expect(res).to.have.status(401);
			});
		});
		it('should reject invalid grant_type', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send({...bobbyCredentials, grant_type: 'invalid'})
			.end(function(err, res) {
				expect(err).to.not.be.undefined;
				expect(res).to.have.status(400);
			});
		});
	})
	context('valid authentication', () => {
		it('should accept correct credentials', () => {
			request.agent(app)
			.post('/cs3099group-be-4/login')
			.send(bobbyCredentials)
			.end(function(err, res) {
				expect(err).to.be.undefined;
				expect(res).to.have.status(200);
			});
		});
	})
});

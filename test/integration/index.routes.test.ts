/* tslint:disable:newline-per-chained-call */
/* Chai assertions look silly when formatted multiline. */
/* tslint:disable:no-unused-expression */
/* Chai assertions do not require assignation. */

import * as chai from 'chai';
const expect: Chai.ExpectStatic = chai.expect;
const should = chai.should();
import * as ex from 'express';
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
const app: ex.Express = App.TestApp();

const userCredentials: Object = {
	username: 'bobby',
	password: 'pass',
	grant_type: 'password'
};

const authenticatedUser = request.agent(app);
let token: string;

async function addUser(done: any) {
	await seq.authenticate();
	await seq.sync({
		force: true
	});

	const newUser: User = new User({
		username: 'bobby',
		password: 'pass',
		userGroups: []
	});
	await newUser.save();
	done();
}

// Add user
before(function(done: any) {
	addUser(done);
});

describe('routes : index', () => {
	describe('GET /', () => {
		it('should return 401 without authentication', () => {
			chai.request(app).get('/')
			.catch(function(err: any) {
				return expect(err).to.have.status(401);
			});
		});

		context('with authentication', () => {
			before(function(done) {
				authenticatedUser
					.post('/cs3099group-be-4/login') // cs3099group-be-4/login
					.send(userCredentials)
					.end(function(err, res) {
						if (err) { throw err; }
						token = res.body.access_token;
						done();
					});
			});
			it('should return 200', () => {
				return chai.request(app).get('/')
				.set('Authorization', 'Bearer ' + token)
				.then((res: ChaiHttp.Response) => {
					res.status.should.eql(200);
				});
			});
			it('should return json', () => {
				return chai.request(app).get('/')
				.set('Authorization', 'Bearer ' + token)
				.then((res: ChaiHttp.Response) => {
					expect(res.type).to.eql('application/json');
				});
			});

			it('should return a message prop', () => {
				return chai.request(app).get('/')
				.set('Authorization', 'Bearer ' + token)
				.then((res: ChaiHttp.Response) => {
					expect(res.body.message).to.eql('Welcome to the CS3099 BE4 server!');
				});
			});

			it('should return an important prop', () => {
				return chai.request(app).get('/')
				.set('Authorization', 'Bearer ' + token)
				.then((res: ChaiHttp.Response) => {
					expect(res.body.important)
						.to.eql('Endpoints start from /cs3099group-be-4/');
				});
			});
		});

	});

});

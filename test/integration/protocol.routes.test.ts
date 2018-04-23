/* tslint:disable:newline-per-chained-call */
/* Chai assertions look silly when formatted multiline. */
/* tslint:disable:no-unused-expression */
/* Chai assertions do not require assignation. */
/* tslint:disable:typedef */
/* Mocha tests do not require strong typing. */

import * as chai from 'chai';
const expect: Chai.ExpectStatic = chai.expect;
import { Credentials, Database, addUser, initDB, resetDB,
	Projec, addProjec, Filee, addFilee } from '../test-db';
import { default as User } from '../../src/db/model/User';
import * as fs from 'fs';

// Chai-http must be imported this way:
// tslint:disable-next-line:no-var-requires no-require-imports
chai.use(require('chai-http'));

// Mocha must be imported as a side-effect library:
// tslint:disable-next-line:no-import-side-effect
import 'mocha';

// Mocha-each must be imported using a require:
// tslint:disable-next-line:no-require-imports
import forEach = require('mocha-each');

import * as App from '../../src/app';
const app = App.TestApp();

let database: Database;
let mockUser: Credentials;
let token: string;
let mockProj: Projec;
let mockFile: Filee;

const initDatabase = async() => {
	database = initDB();
	await database.authenticate();
};

const populateDatabase = async() => {
	await resetDB(database);
	mockUser = await addUser(database, true);
	mockProj = await addProjec(database, mockUser);
	mockFile = await addFilee(database, mockUser);
};

const getToken = async() => {
	return chai.request(app)
	.post('/cs3099group-be-4/oauth/token')
	.send({
		username: mockUser.username,
		password: mockUser.password,
		grant_type: 'password'
	})
	.then((res) => {
		token = res.body.access_token;
	});
};

import options, { Template, alternative, array, exact, match, optional }from '../../src/matcher/options';
import { default as types } from '../../src/matcher/types';

// The general response template according to protocol
const responseTemplate: Template = {
	status: types.string,
	data: optional(types.anything),
	error: optional(types.string),
	error_description: optional(types.string),
	user_message: optional(types.string),
	error_data: optional(types.anything)
};

// The error response template according to protocol
const errorResponseTemplate: Template = {
	status: 'error',
	error: types.string,
	error_description: optional(types.string),
	user_message: optional(types.string),
	error_data: optional(types.anything)
};

type MochaForEachInput = [ string, string, Template, number ];

const base: string = '/cs3099group-be-4';

/* tslint:disable:align */

// Format:
// <method> <route> <json-response-template> <response-code>
const completeProtocol: MochaForEachInput[] = [
	['get', '/_supported_protocols_', {
			supported: array(types.string),
			required: array(types.string)
	}, 200],
	['get', '/log', array({
		user: optional(types.string),
		component: types.string,
		level: alternative([
			'debug',
			'info',
			'security',
			'warn',
			'error',
			'critical',
			'success',
			'failure',
			'verbose'
		]),
		message: types.anything,
		label: optional(types.string),
		timestamp: types.string
	}), 200],
	['post', '/log', [{
		component: 'tesssst',
		level: 'info',
		value: 'sdasdasdasdasdasd'
	}], 200],
	['get', '/properties', array({
		id: types.string,
		display: optional(match({
			category: types.string,
			group: types.string,
			displayName: types.string,
			description: types.string
		})),
		readOnly: types.boolean,
		type: alternative([
			'string',
			'integer',
			'boolean'
		]),
		valueInternal: alternative([
			types.string,
			types.integer,
			types.boolean
		])
	}), 200],
	['post', '/properties?action=update',
		[{id: 'project_example', value: 2}], 200],
	['get', '/user_privileges', array({
		privilege: types.string,
		description: types.string,
		internal: types.boolean
	}), 200],
	['get', '/users', array({
		username: types.string,
		privileges: array(types.string),
		projects: array({
			project_name: types.string,
			access_level: types.string
		}),
		public_user_metadata: types.anything,
		private_user_metadata: types.anything,
		public_admin_metadata: types.anything,
		private_admin_metadata: types.anything
	}), 200],
	// TODO types.metadata
	['get', '/users/mock_user', {
		username: types.string,
		privileges: array(types.string),
		projects: array({
			project_name: types.string,
			access_level: types.string
		}),
		public_user_metadata: types.anything,
		private_user_metadata: types.anything,
		public_admin_metadata: types.anything,
		private_admin_metadata: types.anything
	}, 200],
	['post', '/users/new_user?action=create',
		 {password: 'secret', privileges: []}, 200],
	['get', '/users/mock_user/properties', {
		data: optional(types.anything)
	}, 200],
	['get', '/current_user', {
		username: types.string,
		privileges: array(types.string),
		projects: array({
			project_name: types.string,
			access_level: types.string
		}),
		public_user_metadata: types.anything,
		private_user_metadata: types.anything,
		public_admin_metadata: types.anything,
		private_admin_metadata: types.anything
	}, 200],
	['post', '/current_user?action=update', {password: {
        old: 'pass',
        new: 'newpass'
    }}, 200],
	['get', '/project_roles', array({
		role: types.string,
		description: types.string,
		internal: types.boolean
	}), 200],
	['get', '/projects', array({
		project_name: types.string,
		users: array({
			username: types.string,
			access_level: types.string
		}),
		public_metadata: types.anything,
		private_metadata: optional(types.anything),
		admin_metadata: optional(types.anything)
	}), 200],
	['get', '/projects/mocky', {
		project_name: types.string,
		users: array({
			username: types.string,
			access_level: types.string
		}),
		public_metadata: types.anything,
		private_metadata: types.anything,
		admin_metadata: optional(types.anything)
	}, 200],
	['post', '/projects/mocky2', {}, 200],
	['get', '/projects/mocky/properties', null, 200],
	['post', '/projects/mocky/files/file?overwrite=true&truncate=true', {}, 200],
	['get',  '/projects/mocky/files/file', null, 200]
	//['get', '/projects/mocky/files_by_id/file1', null, 200]
];

/* tslint:enable:align */

describe('routes : protocol', () => {

	before(initDatabase);
	beforeEach(populateDatabase);
	beforeEach(getToken);

	describe('Access all valid routes', () => {
		forEach(completeProtocol).it(
			'%s %s should be json',
			(method: string, path: string, temp: Template, resCode: number) => {
			const request: any = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path)
					.set('content-type', 'application/json').send(temp);
			request.set('Authorization', `Bearer ${token}`);
			return request.then((res: ChaiHttp.Response) => {
				expect(res.type).to.equal('application/json');
			});
		});
		forEach(completeProtocol).it(
			'%s %s should have a status %4$d',
			(method: string, path: string, temp: Template, resCode: number) => {
			const request: any = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path).send(temp);
			/*if (path.includes('/projects/mocky/files/some_file')) {
				fs.createReadStream('test/mockUI/ui.html').pipe(
					request);
					console.log("tasdasdas")
			}*/
			request.set('Authorization', `Bearer ${token}`);
			return request.then((res: ChaiHttp.Response) => {
				if (path.includes('/projects/mocky/files/some_file')) {
					//console.log("something")
				}
				expect(res).to.have.status(resCode);
			});
		});
		forEach(completeProtocol).it(
			'%s %s should conform to the general response template',
			(method: string, path: string, temp: Template, resCode: number) => {
			const request: any = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path).send(temp);;
			request.set('Authorization', `Bearer ${token}`);
			return request.then((res: ChaiHttp.Response) => {
				if (!(match(responseTemplate)(res.body))) {
					console.log(`${method} ${path} ******************`);
					console.log(res.body);
					console.log("^^^^^^ received || template vvvvvvvv")
					console.log(responseTemplate);
					console.log('--------------------------------')
				}
				expect(match(responseTemplate)(res.body)).to.be.true;
			});
		});
		forEach(completeProtocol).it(
			'%s %s should conform to its specific response template',
			(method: string, path: string, temp: Template, resCode: number) => {
			if (method === 'get' && temp != null) {
				return chai.request(app)
				.get(base + path)
				.set('Authorization', `Bearer ${token}`)
				.then((res: ChaiHttp.Response) => {
					if (!(match(temp)(res.body.data))) {
						console.log(`${method} ${path} ******************`);
						console.log(res.body.data);
						console.log("^^^^^^ received || template vvvvvvvv")
						console.log(temp);
						console.log('--------------------------------')
					}
					expect(match(temp)(res.body.data)).to.be.true;
				});
			} else {
				return true;
			}
		});
	});

	describe('test edge cases', () => {
		before(initDatabase);
		beforeEach(populateDatabase);
		beforeEach(getToken);

		describe('GET invalid routes', () => {
			// Should invalid routes also possibly be 401?
			it.skip('should have response code 404', () => {
				return chai.request(app).get('/invalid/route')
				.set('Authorization', `Bearer ${token}`)
				.catch((err) => {
					expect(err.status).to.equal(404);
				});
			});
			it('should conform to the error protocol', () => {
				return chai.request(app).get('/invalid/route')
				.set('Authorization', `Bearer ${token}`)
				.catch((err) => {
					expect(match(errorResponseTemplate)(err.response.body)).to.be.true;
				});
			});
		});

		describe('POST invalid routes', () => {
			// Should invalid routes also possibly be 401?
			it.skip('should have response code 404', () => {
				return chai.request(app).post('/invalid/route')
				.set('Authorization', `Bearer ${token}`)
				.catch((err) => {
					expect(err.status).to.equal(404);
				});
			});
			it('should conform to the error protocol', () => {
				return chai.request(app).post('/invalid/route')
				.set('Authorization', `Bearer ${token}`)
				.catch((err) => {
					expect(match(errorResponseTemplate)(err.response.body)).to.be.true;
				});
			});
		});
/*
		describe('access valid routes with invalid parameters', () => {
			forEach(completeProtocol.filter((item, index, arr) => {
				return (item[0] == 'post');
			})).it(
				'%s %s with null body should throw error',
				(method: string, path: string, temp: Template, resCode: number) => {
				const request: any = chai.request(app).post(base + path);
				request.set('Authorization', `Bearer ${token}`)
				.then((res: any) => {
					expect(res).to.have.status(400);
				}).catch((reason: any) => {
					expect(reason.response.body).to.eql("errererere");
				});
			});
		});*/
	});
});

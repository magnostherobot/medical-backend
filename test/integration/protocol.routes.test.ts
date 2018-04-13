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

import { Template, alternative, array, exact, match, optional
	} from '../../src/matcher/options';
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

describe('routes : errors', () => {
	before(initDatabase);
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
});

describe('routes : protocol', () => {
	const base: string = '/cs3099group-be-4';

	/* tslint:disable:align */

	// Format:
	// <method> <route> <json-response-template> <response-code>
	const completeProtocol: MochaForEachInput[] = [
		['get', '/_supported_protocols_', exact({
				supported: array(types.string),
				required: array(types.string)
		}), 200],
		['get', '/log', types.array({
			component: types.string,
			level: alternative([
				'info',
				'security',
				'warning',
				'error',
				'critical'
			]),
			value: types.anything,
			username: types.string,
			timestamp: types.string
		}), 200],
		['post', '/log', [{
			component: 'tesssst',
			level: 'info',
			value: 'sdasdasdasdasdasd'
		}], 200],
		['get', '/properties', types.array({
			id: types.string,
			display: optional(match({
				category: types.string,
				group: types.string,
				display_name: types.string,
				description: types.string
			})),
			read_only: types.boolean,
			type: alternative([
				'string',
				'integer',
				'boolean'
			]),
			value: alternative([
				types.string,
				types.integer,
				types.boolean
			])
		}), 200],
		['post', '/properties', null, 200],
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
		['post', '/users/new_user', null, 200],
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
		['post', '/current_user', null, 200],
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
		['post', '/projects/mocky', null, 200],
		['get', '/projects/mocky/properties', {
			data: optional(types.anything)
		}, 200],
		['get', '/projects/mocky/files/example/path', null, 200],
		['post', '/projects/mocky/files/mockyfile2', null, 200],
		['get', '/projects/mocky/files_by_id/file1', null, 200]
	];

	/* tslint:enable:align */

	before(initDatabase);
	beforeEach(populateDatabase);
	beforeEach(getToken);

	describe('Access all valid routes', () => {
		forEach(completeProtocol).it(
			'%s %s should be json',
			(method: string, path: string, temp: Template, resCode: number) => {
			const request: ChaiHttp.Request = method === 'get'
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
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path);
			request.set('Authorization', `Bearer ${token}`);
			return request.then((res: ChaiHttp.Response) => {
				expect(res).to.have.status(resCode);
			});
		});
		forEach(completeProtocol).it(
			'%s %s should conform to the general response protocol',
			(method: string, path: string, temp: Template, resCode: number) => {
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path);
			request.set('Authorization', `Bearer ${token}`);
			return request.then((res: ChaiHttp.Response) => {
				match(responseTemplate, JSON.parse(res.body)).shoul.be.true;
			});
		});
		forEach(completeProtocol).it(
			'the response for %s %s should conform to its specific response protocol',
			(method: string, path: string, temp: Template, resCode: number) => {
			if (method === 'get' && temp != null) {
				return chai.request(app)
				.get(base + path)
				.set('Authorization', `Bearer ${token}`)
				.then((res: ChaiHttp.Response) => {
					expect(match(temp)(JSON.parse(res.body))).to.be.true;
				});
			} else {
				return true;
			}
		});
	});
});

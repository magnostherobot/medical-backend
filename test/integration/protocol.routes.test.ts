/* tslint:disable:newline-per-chained-call */
/* Chai assertions look silly when formatted multiline. */
/* tslint:disable:no-unused-expression */
/* Chai assertions do not require assignation. */

import * as chai from 'chai';
const expect: Chai.ExpectStatic = chai.expect;

// Chai-http must be imported this way:
// tslint:disable-next-line:no-var-requires no-require-imports
chai.use(require('chai-http'));

// Mocha must be imported as a side-effect library:
// tslint:disable-next-line:no-import-side-effect
import 'mocha';

// Mocha-each must be imported using a require call:
// tslint:disable-next-line:no-require-imports
import forEach = require('mocha-each');

import { Template, alternative, array, exact, match, optional
	} from '../src/matcher/options';
import { default as types } from '../src/matcher/types';

import * as App from '../src/app';
let app = App.TestApp();


const responseTemplate: Template = {
	status: types.string,
	data: optional(types.anything),
	error: optional(types.string),
	error_description: optional(types.string),
	user_message: optional(types.string),
	error_data: optional(types.anything)
};

type MochaForEachInput = [ string, string, Template ];

describe('Protocol', () => {
	const completeProtocol: MochaForEachInput[] = [
		['get', '/_supported_protocols_', exact({
				supported: array(types.string),
				required: array(types.string)
		})],
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
		})],
		['post', '/log', null],
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
		})],
		['post', '/properties', null],
		['get', '/user_privileges', array({
			privilege: types.string,
			description: types.string,
			internal: types.boolean
		})],
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
		})],
		// TODO types.metadata
		['get', '/users/:username', {
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
		}],
		['post', '/users/:username', null],
		['get', '/users/:username/properties', {
			data: optional(types.anything)
		}],
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
		}],
		['post', '/current_user', null],
		['get', '/project_roles', array({
			role: types.string,
			description: types.string,
			internal: types.boolean
		})],
		['get', '/projects', array({
			project_name: types.string,
			users: array({
				username: types.string,
				access_level: types.string
			}),
			public_metadata: types.anything,
			private_metadata: optional(types.anything),
			admin_metadata: optional(types.anything)
		})],
		['get', '/projects/:project_name', {
			project_name: types.string,
			users: array({
				username: types.string,
				access_level: types.string
			}),
			public_metadata: types.anything,
			private_metadata: types.anything,
			admin_metadata: optional(types.anything)
		}],
		['post', '/projects/:project_name', null],
		['get', '/projects/:project_name/properties', {
			data: optional(types.anything)
		}],
		['get', '/projects/:project_name/files/:path', null],
		['post', '/projects/:project_name/files/:id', null],
		['get', '/projects/:project_name/files_by_id/:id', null]
	];

	describe('Response specification', () => {
		forEach(completeProtocol).it(
			'%s %s should be json',
			(method: string, path: string, temp: Template) => {
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(path)
				: chai.request(app).post(path);
			request.then((res: ChaiHttp.Response) => {
				expect(res.type).to.equal('application/json');
			});
		});
		forEach(completeProtocol).it(
			'%s %s should have a status 200',
			(method: string, path: string, temp: Template) => {
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(path)
				: chai.request(app).post(path);
			request.then((res: ChaiHttp.Response) => {
				expect(res).to.have.status(200);
			});
		});
		forEach(completeProtocol).it(
			'%s %s should conform to the standard response protocol',
			(method: string, path: string, temp: Template) => {
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(path)
				: chai.request(app).post(path);
			request.then((res: ChaiHttp.Response) => {
				match(responseTemplate, JSON.parse(res.body)).shoul.be.true;
			});
		});
		forEach(completeProtocol).it(
			'the response for %s %s should conform to its specific response protocol',
			(method: string, path: string, temp: Template) => {
			if (method === 'get' && temp != null) {
				return chai.request(app).get(path)
				.then((res: ChaiHttp.Response) => {
					match(temp)(JSON.parse(res.body)).should.be.true;
				});
			}
		});
	});
});

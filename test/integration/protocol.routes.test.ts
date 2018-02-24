import * as mocha from 'mocha';
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
	} from '../../src/matcher/options';
import { default as types } from '../../src/matcher/types';

import * as App from '../../src/app';
let app = App.TestApp();


chai.use(chaiHttp);
const expect = chai.expect;

const errorResponseTemplate: Template = {
	status: 'error',
	error: types.string,
	error_description: optional(types.string),
	user_message: optional(types.string),
	error_data: optional(types.anything)
};

type MochaForEachInput = [ string, string, Template ];

describe('routes : errors', () => {
	describe('GET invalid routes', function(){
		it('should have response code 404', () => {
			return chai.request(app).get('/invalid/route')
			.catch(function (res) {
				expect(res.status).to.equal(404);
			});
		});
		it('should conform to the error protocol', function(){
			return chai.request(app).get('/invalid/route')
			.catch(function (err: any) {
				match(errorResponseTemplate)(err.response.body).should.be.true;
			});
		})
	});

});

describe('routes : protocol', () => {
	const base: string = '/cs3099group-be-4';
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

	describe('GET/POST all valid routes', () => {
		forEach(completeProtocol).it(
			'%s %s should be json',
			(method: string, path: string, temp: Template) => {
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path);
			return request.then((res: ChaiHttp.Response) => {
				expect(res.type).to.equal('application/json');
			}).catch(function (err: any) {
				match(errorResponseTemplate)(err.response.body).should.be.true;
			});;
		});
		forEach(completeProtocol).it(
			'%s %s should have a status 200',
			(method: string, path: string, temp: Template) => {
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path);
			return request.then((res: ChaiHttp.Response) => {
				expect(res).to.have.status(200);
			}).catch(function (err: any) {
				match(errorResponseTemplate)(err.response.body).should.be.true;
			});;
		});
		forEach(completeProtocol).it(
			'%s %s should conform to the standard response protocol',
			(method: string, path: string, temp: Template) => {
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path);
			return request.then((res: ChaiHttp.Response) => {
				match(responseTemplate, JSON.parse(res.body)).shoul.be.true;
			}).catch(function (err: any) {
				match(errorResponseTemplate)(err.response.body).should.be.true;
			});;
		});
		forEach(completeProtocol).it(
			'the response for %s %s should conform to its specific response protocol',
			(method: string, path: string, temp: Template) => {
			if (method === 'get' && temp != null) {
				return chai.request(app).get(base + path)
				.then((res: ChaiHttp.Response) => {
					match(temp)(JSON.parse(res.body)).should.be.true;
				}).catch(function (err: any) {
					match(errorResponseTemplate)(err.response.body).should.be.true;
				});
			}else{
				return true;
			}
		});
	});
});

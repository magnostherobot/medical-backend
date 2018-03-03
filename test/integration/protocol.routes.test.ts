import * as mocha from 'mocha';
import * as chai from 'chai';
const expect: Chai.ExpectStatic = chai.expect;

chai.use(require('chai-http'));
import 'mocha';
import forEach = require('mocha-each');
import request = require('supertest');

import { Template, alternative, array, exact, match, optional
	} from '../../src/matcher/options';
import { default as types } from '../../src/matcher/types';
import * as App from '../../src/app';
let app = App.TestApp();

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

const userCredentials = {
	email: 'sponge@bob.com', 
	password: 'garyTheSnail'
}
  
//now let's login the user before we run any tests
let authenticatedUser = request.agent(app);
  
before(function(done){
	authenticatedUser
		.post('/login')
		.send(userCredentials)
		.end(function(err, res){
			expect(res.status).to.equal(200);
			done();
		});
});

describe('routes : errors', () => {
	describe('GET invalid routes', function(){
		it('should have response code 404', () => {
			return chai.request(app).get('/invalid/route')
			.catch(function (err: any) {
				expect(err.status).to.equal(404);
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
	// format:
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
		}), 500],
		['post', '/log', null, 500],
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
		}), 401],
		// todo types.metadata
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
		}, 401],
		['post', '/users/:username', null, 401],
		['get', '/users/:username/properties', {
			data: optional(types.anything)
		}, 401],
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
		['get', '/projects/:project_name', {
			project_name: types.string,
			users: array({
				username: types.string,
				access_level: types.string
			}),
			public_metadata: types.anything,
			private_metadata: types.anything,
			admin_metadata: optional(types.anything)
		}, 200],
		['post', '/projects/:project_name', null, 200],
		['get', '/projects/:project_name/properties', {
			data: optional(types.anything)
		}, 200],
		['get', '/projects/:project_name/files/:path', null, 200],
		['post', '/projects/:project_name/files/:id', null, 200],
		['get', '/projects/:project_name/files_by_id/:id', null, 200]
	];

	describe('GET/POST all valid routes', () => {
		forEach(completeProtocol).it(
			'%s %s should be json',
			(method: string, path: string, temp: Template, res_code: number) => {
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
			'%s %s should have a status %4$d',
			(method: string, path: string, temp: Template, res_code: number) => {
			const request: ChaiHttp.Request = method === 'get'
				? chai.request(app).get(base + path)
				: chai.request(app).post(base + path);
			return request.then((res: ChaiHttp.Response) => {
				expect(res).to.have.status(res_code);
			}).catch(function (err: any) {
				match(errorResponseTemplate)(err.response.body).should.be.true;
			});;
		});
		forEach(completeProtocol).it(
			'%s %s should conform to the standard response protocol',
			(method: string, path: string, temp: Template, res_code: number) => {
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
			(method: string, path: string, temp: Template, res_code: number) => {
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

/* tslint:disable:newline-per-chained-call */
/* Chai assertions look silly when formatted multiline. */
/* tslint:disable:no-unused-expression */
/* Chai assertions do not require assignation. */

import * as chai from 'chai';
const expect: Chai.ExpectStatic = chai.expect;
const should = chai.should();

// Chai-http must be imported this way:
// tslint:disable-next-line:no-var-requires no-require-imports
chai.use(require('chai-http'));

// Mocha must be imported as a side-effect library:
// tslint:disable-next-line:no-import-side-effect
import 'mocha';

import * as App from '../../src/app';
let app = App.TestApp();

describe('routes : index', () => {
	describe('GET /', () => {
		it('should return 200', () => {
			return chai.request(app).get('/')
			.then((res: ChaiHttp.Response) => {
				res.status.should.eql(200);
			})
		});

		it('should return json', () => {
			return chai.request(app).get('/')
			.then((res: ChaiHttp.Response) => {
				expect(res.type).to.eql('application/json');
			});
		});
	
		it('should return a message prop', () => {
			return chai.request(app).get('/')
			.then((res: ChaiHttp.Response) => {
				expect(res.body.message).to.eql('Welcome to the CS3099 BE4 server!');
			});
		});
	
		it('should return an important prop', () => {
			return chai.request(app).get('/')
			.then((res: ChaiHttp.Response) => {
				expect(res.body.important).to.eql('Endpoints start from /cs3099group-be-4/');
			});
		});
	});
});
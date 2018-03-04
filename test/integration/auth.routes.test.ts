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

import * as App from '../../src/app';
const app = App.TestApp();

describe('authentication', () => {
	it('should be json', () => {
		return chai.request(app).get('/')
		.then((res: ChaiHttp.Response) => {
			expect(res.type).to.eql('application/json');
		});
	});

	it('should have a message prop', () => {
		return chai.request(app).get('/')
		.then((res: ChaiHttp.Response) => {
			expect(res.body.message).to.eql('Welcome to the CS3099 BE4 server!');
		});
	});

	it('should have an important prop', () => {
		return chai.request(app).get('/')
		.then((res: ChaiHttp.Response) => {
			expect(res.body.important).to.eql('Endpoints start from /cs3099group-be-4/');
		});
	});

});

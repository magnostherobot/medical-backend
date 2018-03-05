/* tslint:disable:no-unused-expression */
// Disabled to allow chai-style assertions.

import * as chai from 'chai';
chai.should();

import { ErrorResponseBlock, RequestError } from '../../src/errors/errorware';

describe('RequestError', () => {
	describe('constructor', () => {
		it('constructs simple errors', () => {
			const err: RequestError = new RequestError(
				404, 'user_not_found'
			);
			err.code.should.equal(404);
			err.name.should.equal('user_not_found');
		});
		it('constructs with sensible defaults', () => {
			const err: RequestError = new RequestError();
			err.code.should.not.be.undefined;
			err.name.should.not.be.undefined;
		});
	});
	describe('response generation', () => {
		it('generates responses', () => {
			const err: RequestError = new RequestError(
				500, 'internal_server_error'
			);
			const response: ErrorResponseBlock =
				err.responseBlock();
			response.status.should.equal('error');
			response.error.should.equal('internal_server_error');
		});
	});
});

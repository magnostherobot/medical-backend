/* tslint:disable:typedef */
// Disabled to allow quick template creation.

/* tslint:disable:newline-per-chained-call */
// Disabled to allow Chai- and Mocha-style test formatting.

/* tslint:disable:no-unused-expression */
// Disabled to allow `...to.be.true`.

import * as chai from 'chai';
chai.should();

import * as options from '../../src/matcher/options';
import { default as types } from '../../src/matcher/types';

// tslint:disable-next-line:no-require-imports

describe('Matching:', () => {
	describe('Rough Matching', () => {
		context('for literals', () => {
			context('accepts matching', () => {
				it('strings', () => {
					options.match('a', 'a').should.be.true;
				});
				it('numbers', () => {
					options.match(3, 3).should.be.true;
				});
				it('boolean values', () => {
					options.match(true, true).should.be.true;
				});
				it('null to null', () => {
					options.match(null, null).should.be.true;
				});
			});
			context('rejects', () => {
				it('different strings', () => {
					options.match('x', 'y').should.be.false;
				});
				it('different numbers', () => {
					options.match(20, 42).should.be.false;
				});
				it('different boolean values', () => {
					options.match(true, false).should.be.false;
				});
				it('different types', () => {
					options.match('55', 55).should.be.false;
				});
				it('null matched with non-null values', () => {
					options.match(null, false).should.be.false;
				});
				it('non-null values matched with null', () => {
					options.match(0, null).should.be.false;
				});
			});
		});
		context('for checker functions', () => {
			context('accepts', () => {
				it('values that succeed the checker function', () => {
					options.match(types.number, 9).should.be.true;
				});
			});
			context('rejects', () => {
				it('values that do not succeed the checker function', () => {
					options.match(types.boolean, 'true').should.be.false;
				});
			});
		});
		it('accepts basic things', () => {
			const template = {
				a: types.string
			};
			const matchee = {
				a: 'yes'
			};
			options.match(template, matchee).should.be.true;
		});
		it('accepts objects with superfluous properties', () => {
			const template = {
				a: types.number
			};
			const matchee = {
				a: 40,
				b: 20
			};
			options.match(template, matchee).should.be.true;
		});
		it('rejects objects missing some properties', () => {
			const template = {
				a: types.boolean,
				b: types.number,
				c: types.number
			};
			const matchee = {
				b: 5
			};
			options.match(template, matchee).should.be.false;
		});
		it('accepts objects that omit not_present properties', () => {
			const template = {
				a: types.number,
				b: types.not_present,
				c: types.not_present
			};
			const matchee = {
				a: 4
			};
			options.match(template, matchee).should.be.true;
		});
		it('rejects empty objects for non-empty templates', () => {
			const template = {
				a: types.boolean
			};
			const matchee = {
			};
			options.match(template, matchee).should.be.false;
		});
		it('accepts empty objects for empty templates', () => {
			const template = {
			};
			const matchee = {
			};
			options.match(template, matchee).should.be.true;
		});
		it('accepts nested objects that match', () => {
			const template = {
				a: types.number,
				b: {
					ba: types.string,
					bb: types.string
				},
				c: types.boolean
			};
			const matchee = {
				a: 432,
				b: {
					ba: 'baracus',
					bb: 'ATEAM'
				},
				c: true,
				x: false
			};
			options.match(template, matchee).should.be.true;
		});
		it('accepts literal matches', () => {
			const template = {
				a: 'literal'
			};
			const matchee = {
				a: 'literal'
			};
			options.match(template, matchee).should.be.true;
		});
		it('rejects incorrect literal matches', () => {
			const template = {
				g: 99
			};
			const matchee = {
				g: 80
			};
			options.match(template, matchee).should.be.false;
		});
		it('accepts optional matches', () => {
			const template = {
				a: options.optional(types.array),
				b: options.optional(types.anything)
			};
			const matchee = {
				b: []
			};
			options.match(template)(matchee).should.be.true;
		});
		it('big bad unit test', () => {
			/* tslint:disable:align */
			const matchee = { status: 'success',
			data: [ { privilege: 'admin', description: 'null', internal: false },
				{ privilege: 'logging',
					description: 'Allows Post to Log',
					internal: false } ] };
			const template = {
				status: types.string,
				data: options.optional(types.anything),
				error: options.optional(types.string),
				error_description: options.optional(types.string),
				user_message: options.optional(types.string),
				error_data: options.optional(types.anything)
			};
			/* tslint:enable:align */

			options.match(template)(matchee).should.be.true;
		});
		it('bigger badder unit test', () => {
			/* tslint:disable:align */
			const matchee = [ { project_name: 'mocky',
				users: [{ username: 'uname', access_level: 'admin'}],
				public_metadata: { creation_date: '2018-04-14T17:13:44.291Z' },
				private_metadata: {},
				admin_metadata: {} } ];
			const template = types.array({
				project_name: types.string,
				users: types.array({
					username: types.string,
					access_level: types.string
				}),
				public_metadata: types.anything,
				private_metadata: options.optional(types.anything),
				admin_metadata: options.optional(types.anything)
			});
			/* tslint:enable:align */

			options.match(template)(matchee).should.be.true;
		});
		it.only('Matching Arrays', () => {
			/* tslint:disable:align */
			const matchee: any = ['ss'];
			const template: any = types.array;
			/* tslint:enable:align */

			options.match(template)(matchee).should.be.true;
		});
	});
});

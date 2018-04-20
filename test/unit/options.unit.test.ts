/* tslint:disable:typedef */
// Disabled to allow quick template creation.

/* tslint:disable:newline-per-chained-call */
// Disabled to allow Chai- and Mocha-style test formatting.

/* tslint:disable:no-unused-expression */
// Disabled to allow `...to.be.true`.

import * as chai from 'chai';
chai.should();

import { anything,  boolean, not_present, number, string
} from '../../src/matcher';
import { array, match, optional } from '../../src/matcher/options';

// tslint:disable-next-line:no-require-imports

describe('Matching:', () => {
	describe('Rough Matching', () => {
		context('for literals', () => {
			context('accepts matching', () => {
				it('strings', () => {
					match('a', 'a').should.be.true;
				});
				it('numbers', () => {
					match(3, 3).should.be.true;
				});
				it('boolean values', () => {
					match(true, true).should.be.true;
				});
				it('null to null', () => {
					match(null, null).should.be.true;
				});
			});
			context('rejects', () => {
				it('different strings', () => {
					match('x', 'y').should.be.false;
				});
				it('different numbers', () => {
					match(20, 42).should.be.false;
				});
				it('different boolean values', () => {
					match(true, false).should.be.false;
				});
				it('different types', () => {
					match('55', 55).should.be.false;
				});
				it('null matched with non-null values', () => {
					match(null, false).should.be.false;
				});
				it('non-null values matched with null', () => {
					match(0, null).should.be.false;
				});
			});
		});
		context('for checker functions', () => {
			context('accepts', () => {
				it('values that succeed the checker function', () => {
					match(number, 9).should.be.true;
				});
			});
			context('rejects', () => {
				it('values that do not succeed the checker function', () => {
					match(boolean, 'true').should.be.false;
				});
			});
		});
		it('accepts basic things', () => {
			const template = {
				a: string
			};
			const matchee = {
				a: 'yes'
			};
			match(template, matchee).should.be.true;
		});
		it('accepts objects with superfluous properties', () => {
			const template = {
				a: number
			};
			const matchee = {
				a: 40,
				b: 20
			};
			match(template, matchee).should.be.true;
		});
		it('rejects objects missing some properties', () => {
			const template = {
				a: boolean,
				b: number,
				c: number
			};
			const matchee = {
				b: 5
			};
			match(template, matchee).should.be.false;
		});
		it('accepts objects that omit not_present properties', () => {
			const template = {
				a: number,
				b: not_present,
				c: not_present
			};
			const matchee = {
				a: 4
			};
			match(template, matchee).should.be.true;
		});
		it('rejects empty objects for non-empty templates', () => {
			const template = {
				a: boolean
			};
			const matchee = {
			};
			match(template, matchee).should.be.false;
		});
		it('accepts empty objects for empty templates', () => {
			const template = {
			};
			const matchee = {
			};
			match(template, matchee).should.be.true;
		});
		it('accepts nested objects that match', () => {
			const template = {
				a: number,
				b: {
					ba: string,
					bb: string
				},
				c: boolean
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
			match(template, matchee).should.be.true;
		});
		it('accepts literal matches', () => {
			const template = {
				a: 'literal'
			};
			const matchee = {
				a: 'literal'
			};
			match(template, matchee).should.be.true;
		});
		it('rejects incorrect literal matches', () => {
			const template = {
				g: 99
			};
			const matchee = {
				g: 80
			};
			match(template, matchee).should.be.false;
		});
		it('accepts optional matches', () => {
			const template = {
				a: optional(number),
				b: optional(anything)
			};
			const matchee = {
				b: []
			};
			match(template)(matchee).should.be.true;
		});
		it('big bad unit test', () => {
			const matchee = {
				status: 'success',
				data: [
					{
						privilege: 'admin',
						description: 'null',
						internal: false
					},
					{
						privilege: 'logging',
						description: 'Allows Post to Log',
						internal: false
					}
				]
			};
			const template = {
				status: string,
				data: optional(anything),
				error: optional(string),
				error_description: optional(string),
				user_message: optional(string),
				error_data: optional(anything)
			};

			match(template)(matchee).should.be.true;
		});
		it('bigger badder unit test', () => {
			const matchee = [{
				project_name: 'mocky',
				users: [{
					username: 'uname',
					access_level: 'admin'
				}],
				public_metadata: {
					creation_date: '2018-04-14T17:13:44.291Z'
				},
				private_metadata: {},
				admin_metadata: {}
			}];
			const template = array({
				project_name: string,
				users: array({
					username: string,
					access_level: string
				}),
				public_metadata: anything,
				private_metadata: optional(anything),
				admin_metadata: optional(anything)
			});

			match(template)(matchee).should.be.true;
		});
		it('Matching Arrays', () => {
			const matchee: string[] = ['ss'];
			const template = array(string);

			match(template)(matchee).should.be.true;
		});
	});
});

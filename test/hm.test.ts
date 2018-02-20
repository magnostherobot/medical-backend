/* tslint:disable:newline-per-chained-call */
/* Chai assertions look silly when formatted multiline. */
/* tslint:disable:no-unused-expression */
/* Chai assertions do not require assignation. */

import { expect } from 'chai';

// Mocha has to be imported as a side-effect library.
// tslint:disable-next-line:no-import-side-effect
import 'mocha';

describe('placeholder test', () => {
	it('should pass', () => {
		expect(true).to.be.true;
	});
});

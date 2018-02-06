import * as mocha from 'mocha';
import chai = require('chai');
var should = chai.should();

import * as options from '../src/matcher/options';
import { default as types } from '../src/matcher/types';

describe('Object Matching:', () => {
  describe('Rough Matching', () => {
    it('accepts basic things', () => {
      let template = {
        a: types.string
      };
      let matchee = {
        a: "yes"
      };
      options.rough(template, matchee).should.be.true;
    });
    it('accepts objects with superfluous properties', () => {
      let template = {
        a: types.number
      };
      let matchee = {
        a: 40,
        b: 20
      };
      options.rough(template, matchee).should.be.true;
    });
    it('rejects objects missing some properties', () => {
      let template = {
        a: types.boolean,
        b: types.number,
        c: types.number
      };
      let matchee = {
        b: 5
      };
      options.rough(template, matchee).should.be.false;
    });
    it('accepts objects that omit not_present properties', () => {
      let template = {
        a: types.function,
        b: types.not_present,
        c: types.not_present
      };
      let matchee = {
        a: new Function()
      };
      options.rough(template, matchee).should.be.true;
    });
  });
});

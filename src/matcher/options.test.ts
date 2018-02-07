import * as mocha from 'mocha';
import chai = require('chai');
var should = chai.should();

import * as options from './options';
import { default as types } from './types';

describe('Object Matching:', () => {
  describe('Rough Matching', () => {
    it('accepts basic things', () => {
      let template = {
        a: types.string
      };
      let matchee = {
        a: "yes"
      };
      options.match(template, matchee).should.be.true;
    });
    it('accepts objects with superfluous properties', () => {
      let template = {
        a: types.number
      };
      let matchee = {
        a: 40,
        b: 20
      };
      options.match(template, matchee).should.be.true;
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
      options.match(template, matchee).should.be.false;
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
      options.match(template, matchee).should.be.true;
    });
    it('rejects empty objects for non-empty templates', () => {
      let template = {
        a: types.boolean
      };
      let matchee = {
      };
      options.match(template, matchee).should.be.false;
    });
    it('accepts empty objects for empty templates', () => {
      let template = {
      };
      let matchee = {
      };
      options.match(template, matchee).should.be.true;
    });
    it('accepts nested objects that match', () => {
      let template = {
        a: types.number,
        b: {
          ba: types.string,
          bb: types.function
        },
        c: types.boolean
      };
      let matchee = {
        a: 432,
        b: {
          ba: "barracus",
          bb: new Function(),
        },
        c: true,
        x: false
      };
      options.match(template, matchee).should.be.true;
    });
  });
});

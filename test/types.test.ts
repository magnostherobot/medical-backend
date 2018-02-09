import * as mocha from 'mocha';
import chai = require('chai');
var should = chai.should();

import { default as types } from '../src/matcher/types';

describe('Type Checking:', () => {
  let x: string;
  for (let x of
    [ 'object', 'number', 'integer', 'string', 'boolean', 'array' ]
  ) {
    let name: string = x.charAt(0).toUpperCase() + x.slice(1);
    describe(`${name} Checking`, () => {
      it('rejects null', () => {
        types[x](null).should.be.false;
      });
      it('rejects undefined', () => {
        types[x](undefined).should.be.false;
      });
    });
  }

  describe('Presence Checking', () => {
    it('accepts non-undefined values', () => {
      types.anything(1).should.be.true;
      types.anything("string").should.be.true;
      types.anything(false).should.be.true;
    });
    it('accepts null', () => {
      types.anything(null).should.be.true;
    });
    it('rejects undefined', () => {
      types.anything(undefined).should.be.false;
    });
    it('rejects objects without the named property', () => {
      let x: Object = {};
      // there's no way to pick a key that definitely won't be
      // on the object
      types.anything(x['hopefully this isn\'t a property']).should.be.false;
    });
  });

  describe('Absence Checking', () => {
    it('accepts undefined', () => {
      types.not_present(undefined).should.be.true;
    });
  });

  describe('Number Checking', () => {
    it('accepts positive integers', () => {
      types.number(4).should.be.true;
    });
    it('accepts negative integers', () => {
      types.number(-10).should.be.true;
    });
    it('accepts floats', () => {
      types.number(3.14).should.be.true;
    });
    it('accepts zero', () => {
      types.number(0).should.be.true;
    });
    it('accepts boxed numbers', () => {
      types.number(new Number(20)).should.be.true;
    });
    it('rejects strings', () => {
      types.number('haha').should.be.false;
    });
    it('rejects objects', () => {
      types.number(new Object()).should.be.false;
    });
    it('rejects arrays', () => {
      types.number([1, 2, 3]).should.be.false;
    });
    it('rejects things that look like numbers', () => {
      types.number('1234').should.be.false;
      types.number('-3.14').should.be.false;
    });
    it('accepts NaN', () => {
      types.number(NaN).should.be.true;
    });
    it('accepts Infinity', () => {
      types.number(Infinity).should.be.true;
    });
  });

  describe('Integer Checking', () => {
    it('rejects non-integer numbers', () => {
      types.integer(3.14).should.be.false;
    });
    it('rejects NaN', () => {
      types.integer(NaN).should.be.false;
    });
    it('rejects Infinity', () => {
      types.integer(Infinity).should.be.false;
    });
  });

  describe('String Checking', () => {
    it('accepts basic primitive strings', () => {
      types.string('string!').should.be.true;
    });
    it('accepts strings of numbers', () => {
      types.string('1234').should.be.true;
    });
    it('accepts the empty string', () => {
      types.string('').should.be.true;
    });
    it('accepts non-primitive string objects', () => {
      types.string(new String('String!')).should.be.true;
    });
    it('rejects numbers', () => {
      types.string(5).should.be.false;
      types.string(new Number(28)).should.be.false;
    });
    it('rejects objects', () => {
      types.string(new Object()).should.be.false;
    });
    it('rejects arrays', () => {
      types.string(['ah', 'ha']).should.be.false;
    });
  });

  describe('Boolean Checking', () => {
    it('accepts true and false', () => {
      types.boolean(true).should.be.true;
      types.boolean(false).should.be.true;
    });
    it('rejects numbers', () => {
      types.boolean(2).should.be.false;
    });
    it('rejects strings', () => {
      types.boolean('not boolean').should.be.false;
    });
    it('rejects strings of boolean values', () => {
      types.boolean('true').should.be.false;
    });
    it('rejects objects', () => {
      types.boolean(new Object()).should.be.false;
    });
    it('rejects arrays', () => {
      types.boolean([true, true, false]).should.be.false;
    });
    it('rejects falsy values', () => {
      types.boolean(0).should.be.false;
    });
  });

  describe('Array Checking', () => {
    it('accepts arrays', () => {
      types.array([1, 'two', false]).should.be.true;
    });
    it('accepts empty arrays', () => {
      types.array([]).should.be.true;
      types.array(new Array()).should.be.true;
    });
    it('rejects strings', () => {
      types.array('not an array').should.be.false;
    });
    it('rejects strings that look like arrays', () => {
      types.array('[1, 2, false]').should.be.false;
    });
    it('rejects numbers', () => {
      types.array(8).should.be.false;
    });
    it('rejects objects', () => {
      types.array(new Object()).should.be.false;
    });
  });
});

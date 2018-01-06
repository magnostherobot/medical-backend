const fs = require('fs');
const util = require('util');

Buffer.prototype.readUInt64LE = async function(offset, noAssert) {
  let l = await this.readUInt32LE(offset, noAssert);
  let u = await this.readUInt32LE(offset + 8, noAssert);
  return u << 8 + l;
}

Buffer.prototype.readUInt64BE = async function(offset, noAssert) {
  let u = await this.readUInt32LE(offset, noAssert);
  let l = await this.readUInt32LE(offset + 8, noAssert);
  return u << 8 + l;
}

const open = util.promisify(fs.open);
async function read(fd, pos, size) {
  let data = await util.promisify(fs.read)(fd, new Buffer(size), 0, size,
    pos);
  if (data.bytesRead !== size) {
    throw new Error(`bytes read ${data.bytesRead} !== expected ${size}`);
  }
  return data.buffer;
}

// function that generates reading functions
// based on chosen endianness
function readBinder(g, size) {
  return async function(fd, pos) {
    // read binary data from file into Buffer
    let data = await read(fd, pos, size);
    // runs the function that converts from Buffer
    // to a useful variable
    return g(data);
  }
}

let readUInt8 = readBinder(x => x.readUInt8(), 8);
let readUInt16;
let readUInt32;
let readUInt64;
let readString = function(fd, pos, size, encoding) {
  return readBinder(x => x.toString(encoding), size)(fd, pos);
};

function setEndianness(byteOrderIndication) {
  le = ['II', 'LE'];
  be = ['MM', 'BE'];

  function included(xs) {
    return xs.some(x => x == byteOrderIndication);
  }
  
  if (included(le)) {
    readUInt16 = readBinder(x => x.readUInt16LE(), 16);
    readUInt32 = readBinder(x => x.readUInt32LE(), 32);
    readUInt64 = readBinder(x => x.readUInt64LE(), 64);
  } else if (included(be)) {
    readUInt16 = readBinder(x => x.readUInt16BE(), 16);
    readUInt32 = readBinder(x => x.readUInt32BE(), 32);
    readUInt64 = readBinder(x => x.readUInt64BE(), 64);
  } else {
    throw new Error(`byte order '${byteOrderIndication}' unknown`);
  }
}

async function leicaToPyramid(in_name, out_name) {
  try {
    let fd = await open(in_name, 'r');
    let byteOrderIndication = await readString(fd, 0, 2, 'utf8');
    console.log(byteOrderIndication);
    setEndianness(byteOrderIndication);
    let fortyThree = await readUInt16(fd, 1);
    console.log(fortyThree);
  } catch (err) {
    console.log(err);
  }
}

leicaToPyramid('../../test/test-leica.scn', null);

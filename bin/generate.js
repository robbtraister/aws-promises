#!/usr/bin/env node

var crypto = require('crypto');


var generate = module.exports = function generate(format, minLength, maxLength) {
  minLength = Number(minLength);
  maxLength = Number(maxLength);

  minLength = isNaN(minLength) ? 50 : minLength;
  maxLength = isNaN(maxLength) ? minLength : maxLength;

  var length = minLength + Math.floor(Math.random() * (maxLength - minLength));
  var bytes = crypto.randomBytes(length);

  return bytes.toString(format);
}


if (module === require.main) {
  var format = 'hex';
  var minLength = 50;
  var maxLength = 50;

  process.argv.forEach(arg => {
    if (/^\d+(\:\d+)?$/.test(arg)) {
      var pieces = arg.split(':');
      minLength = pieces.shift();
      maxLength = pieces.shift();
    } else if (Buffer.isEncoding(arg)) {
      format = arg;
    }
  });

  console.log(generate(format, minLength, maxLength));
}

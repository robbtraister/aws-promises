#!/usr/bin/env node

var aws = require('../lib/aws');


var decrypt = module.exports = function decrypt(ciphertext) {
  var region = process.env.AWS_REGION || 'us-east-1';

  return aws.kms(region).decrypt(ciphertext, true)
    .then(data => {
      data.Plaintext = data.Plaintext.toString('utf8');
      return data;
    });
}


if (module === require.main) {
  function decryptInput(input) {
    decrypt(input)
      .then(console.log)
      .catch(console.error);
  }

  var ciphertext = '';
  if (process.argv.length > 2) {
    decryptInput(process.argv[2]);
  } else {
    process.stdin.on('readable', () => {
      var ciphertext = process.stdin.read();
      if (ciphertext) {
        decryptInput(ciphertext.toString('utf8').replace(/\n$/, ''));
      }
    });
  }

}

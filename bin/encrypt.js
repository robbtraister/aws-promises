#!/usr/bin/env node

var fs = require('fs');
var ini = require('ini');

var aws = require('../lib/aws');

var promisify = require('../lib/utils/promisify')

var credsFile = process.env.AWS_CREDENTIAL_PROFILES_FILE || `${process.env.HOME}/.aws/credentials`;

var readFilePromise = promisify(fs.readFile.bind(fs));


function getKeyId(kmsKeyId) {
  if (kmsKeyId && /^arn:aws:kms:/.test(kmsKeyId)) {
    return Promise.resolve(kmsKeyId);
  } else if (process.env.KMS_KEY_ID) {
    return Promise.resolve(process.env.KMS_KEY_ID);
  } else {
    return readFilePromise(credsFile)
      .then(creds => ini.decode(creds.toString()))
      .then(profiles => {
        var profileName = [
          kmsKeyId,
          process.env.AWS_PROFILE,
          'default'
        ].find(profileName => profiles.hasOwnProperty(profileName));

        if (!profileName) {
          throw `profile '${kmsKeyId}' could not be found`;
        }

        return profiles[profileName].kms_key_id;
      });
  }
}


var encrypt = module.exports = function encrypt(plaintext, kmsKeyId) {
  var region = process.env.AWS_REGION || 'us-east-1';

  return getKeyId(kmsKeyId)
    .then(kmsKeyId => aws.kms(region).encrypt(kmsKeyId, plaintext))
    .then(data => data.toString('base64'));
}


if (module === require.main) {
  function encryptInput(plaintext, kmsKeyId) {
    encrypt(plaintext, kmsKeyId)
      .then(console.log)
      .catch(console.error);
  }

  if (process.argv.length < 3 || /^arn\:aws\:kms\:/.test(process.argv[2])) {
    process.stdin.on('readable', () => {
      var plaintext = process.stdin.read();
      if (plaintext) {
        encryptInput(plaintext.toString('utf8').replace(/\n$/, ''), process.argv[2]);
      }
    });
  } else {
    encryptInput(process.argv[2], process.argv[3]);
  }
}

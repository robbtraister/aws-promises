#!/usr/bin/env node

'use strict'

const fs = require('fs')
const ini = require('ini')

const { KMS } = require('../lib/aws')

const promisify = require('../lib/utils/promisify')

const credsFile = process.env.AWS_CREDENTIAL_PROFILES_FILE || `${process.env.HOME}/.aws/credentials`

const readFilePromise = promisify(fs.readFile.bind(fs))

function getKeyId (kmsKeyId) {
  return (kmsKeyId && /^arn:aws:kms:/.test(kmsKeyId))
    ? Promise.resolve(kmsKeyId)
    : (process.env.KMS_KEY_ID)
      ? Promise.resolve(process.env.KMS_KEY_ID)
      : readFilePromise(credsFile)
        .then(creds => ini.decode(creds.toString()))
        .then(profiles => {
          let profileName = [
            kmsKeyId,
            process.env.AWS_PROFILE,
            'default'
          ].find(profileName => profiles.hasOwnProperty(profileName))

          if (!profileName) {
            throw new Error(`profile '${kmsKeyId}' could not be found`)
          }

          return profiles[profileName].kms_key_id
        })
}

function encryptInput (plaintext, kmsKeyId) {
  encrypt(plaintext, kmsKeyId)
    .then(console.log)
    .catch(console.error)
}

function encrypt (plaintext, kmsKeyId) {
  const region = process.env.AWS_REGION || 'us-east-1'

  return getKeyId(kmsKeyId)
    .then(kmsKeyId => KMS({ region }).encrypt(kmsKeyId, plaintext))
    .then(data => data.toString('base64'))
}

module.exports = encrypt
module.exports.encrypt = encrypt

if (module === require.main) {
  if (process.argv.length < 3 || /^arn:aws:kms:/.test(process.argv[2])) {
    process.stdin.on('readable', () => {
      let plaintext = process.stdin.read()
      if (plaintext) {
        encryptInput(plaintext.toString('utf8').replace(/\n$/, ''), process.argv[2])
      }
    })
  } else {
    encryptInput(process.argv[2], process.argv[3])
  }
}

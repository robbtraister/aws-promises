#!/usr/bin/env node

'use strict'

const aws = require('../lib/aws')

function decryptInput (input) {
  decrypt(input)
    .then(console.log)
    .catch(console.error)
}

function decrypt (ciphertext) {
  let region = process.env.AWS_REGION || 'us-east-1'

  return aws.kms(region).decrypt(ciphertext, true)
    .then(data => {
      data.Plaintext = data.Plaintext.toString('utf8')
      return data
    })
}

module.exports = decrypt
module.exports.decrypt = decrypt

if (module === require.main) {
  if (process.argv.length > 2) {
    decryptInput(process.argv[2])
  } else {
    process.stdin.on('readable', () => {
      let ciphertext = process.stdin.read()
      if (ciphertext) {
        decryptInput(ciphertext.toString('utf8').replace(/\n$/, ''))
      }
    })
  }
}

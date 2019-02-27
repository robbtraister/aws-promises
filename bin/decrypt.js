#!/usr/bin/env node

'use strict'

const { KMS } = require('../lib/aws')

function decryptInput (input, field) {
  decrypt(input, field)
    .then(console.log)
    .catch(console.error)
}

function decrypt (ciphertext, field) {
  const region = process.env.AWS_REGION || 'us-east-1'

  return KMS({ region }).decrypt(ciphertext, true)
    .then(data => {
      data.Plaintext = data.Plaintext.toString('utf8')
      return data
    })
    .then(data =>
      (field)
        ? data[field]
        : data
    )
}

module.exports = decrypt
module.exports.decrypt = decrypt

if (module === require.main) {
  if (process.argv.length > 2) {
    decryptInput(process.argv[2], process.argv[3] || process.env.FIELD)
  } else {
    process.stdin.on('readable', () => {
      let ciphertext = process.stdin.read()
      if (ciphertext) {
        decryptInput(ciphertext.toString('utf8').replace(/\n$/, ''), process.env.FIELD)
      }
    })
  }
}

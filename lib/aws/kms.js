'use strict'

const { awsify } = require('../utils/awsify')

const kmsPromises = awsify('KMS', {
  decrypt: null,
  encrypt: 'CiphertextBlob'
})

function KMS (options) {
  const kms = kmsPromises(options)

  return {
    decrypt (ciphertext, fullResponse) {
      let CiphertextBlob = ciphertext
      if (!(CiphertextBlob instanceof Buffer)) {
        try {
          CiphertextBlob = Buffer.from(ciphertext, 'hex')
        } catch (err) {}
        if (!CiphertextBlob.length) {
          try {
            CiphertextBlob = Buffer.from(ciphertext, 'base64')
          } catch (err) {}
        }
        if (!CiphertextBlob.length) {
          try {
            CiphertextBlob = Buffer.from(ciphertext, 'utf8')
          } catch (err) {}
        }
      }

      return kms.decrypt({CiphertextBlob})
        .then(data => fullResponse ? data : data.Plaintext.toString('utf8'))
    },

    encrypt (KeyId, Plaintext) {
      return kms.encrypt({KeyId, Plaintext})
    }
  }
}

module.exports = KMS

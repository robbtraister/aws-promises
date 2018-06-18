'use strict'

const { awsify } = require('../utils/awsify')

const kmsPromises = awsify('KMS', {
  createAlias: null,
  createKey: 'KeyMetadata',
  decrypt: null,
  describeKey: 'KeyMetadata',
  encrypt: 'CiphertextBlob'
})

function KMS (options) {
  const kms = kmsPromises(options)

  return {
    createAlias (AliasName, TargetKeyId) {
      return kms.createAlias({
        AliasName,
        TargetKeyId
      })
    },

    createKey (AliasName, Policy) {
      const params = {}
      if (Policy) {
        params.Policy = JSON.stringify(Policy)
      }
      const newKey = kms.createKey(params)
      return (AliasName)
        ? newKey
          .then(metadata => this.createAlias(AliasName, metadata.KeyId))
          .then(() => newKey)
        : newKey
    },

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

    describeKey (KeyId) {
      return kms.describeKey({KeyId})
    },

    encrypt (KeyId, Plaintext) {
      return kms.encrypt({KeyId, Plaintext})
    }
  }
}

module.exports = KMS

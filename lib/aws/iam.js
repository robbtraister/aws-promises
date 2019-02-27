'use strict'

const debug = require('debug')('aws-promises:iam')

const { awsify } = require('../utils/awsify')

const iamPromises = awsify('IAM', {
  createAccessKey: 'AccessKey',
  createRole: 'Role',
  deleteAccessKey: null,
  getRole: 'Role',
  listAccessKeys: 'AccessKeyMetadata',
  putRolePolicy: null,
  updateAccessKey: null
})

function IAM (options) {
  const iam = iamPromises(options)

  return {
    activateAccessKey (AccessKeyId) {
      return iam.updateAccessKey({
        AccessKeyId,
        Status: 'Active'
      })
    },

    createAccessKey () {
      return iam.createAccessKey()
    },

    createRole (RoleName, AssumeRolePolicyDocument, PolicyDocument) {
      debug(`Creating Role: ${RoleName}`)
      return iam.createRole({
        RoleName,
        AssumeRolePolicyDocument: JSON.stringify(AssumeRolePolicyDocument)
      })
        .then((Role) => {
          debug(`Putting Role Policy: ${RoleName}`)
          return PolicyDocument
            ? iam.putRolePolicy({
              RoleName,
              PolicyName: RoleName,
              PolicyDocument: JSON.stringify(PolicyDocument)
            }).then(() => Role)
            : Role
        })
    },

    deactivateAccessKey (AccessKeyId) {
      return iam.updateAccessKey({
        AccessKeyId,
        Status: 'Inactive'
      })
    },

    deleteAccessKey (AccessKeyId) {
      return iam.deleteAccessKey({ AccessKeyId })
    },

    getRole (RoleName) {
      debug(`Getting Role: ${RoleName}`)
      return iam.getRole({ RoleName })
    },

    listAccessKeys () {
      return iam.listAccessKeys()
    }
  }
}

module.exports = IAM

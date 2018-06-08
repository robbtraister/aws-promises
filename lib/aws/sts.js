'use strict'

const debug = require('debug')('aws-promises:sts')

const { awsify } = require('../utils/awsify')

const stsPromises = awsify('STS', {
  getCallerIdentity: null
})

function STS (options) {
  const sts = stsPromises(options)

  return {
    getCallerIdentity () {
      debug(`Getting Caller Identity`)
      return sts.getCallerIdentity({})
    }
  }
}

module.exports = STS

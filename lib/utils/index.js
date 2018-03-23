'use strict'

const promisify = module.exports.promisify = require('./promisify')
const throttle = module.exports.throttle = require('./throttle')
const tokenize = module.exports.tokenize = require('./tokenize')

function awsify (fcn, options) {
  return tokenize(throttle(promisify(fcn), options), options)
}

module.exports.awsify = awsify

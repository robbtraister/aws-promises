'use strict'

var promisify = module.exports.promisify = require('./promisify')
var throttle = module.exports.throttle = require('./throttle')
var tokenize = module.exports.tokenize = require('./tokenize')

function awsify (fcn, options) {
  return tokenize(throttle(promisify(fcn), options), options)
}

module.exports.awsify = awsify

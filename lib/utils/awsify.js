'use strict'

const AWS = require('aws-sdk')

const promisify = require('./promisify')
const throttle = require('./throttle')
const tokenize = require('./tokenize')

function awsify (Class, methodMap) {
  Class = (Class instanceof Function)
    ? Class
    : AWS[Class]

  return function (options) {
    const service = new Class(options)
    const map = {}
    map.sdk = service
    Object.keys(methodMap)
      .map(m => {
        const params = (methodMap[m] instanceof Object)
          ? methodMap[m]
          : (methodMap[m])
            ? { property: methodMap[m] }
            : {}
        map[m] = tokenize(throttle(promisify(service, m)), params)
      })
    return map
  }
}

function arnMask (params) {
  if (!params.type) {
    throw new Error('`type` is required')
  }
  var specific = (name) => new RegExp(`^arn:aws:(${params.service || '[^:]+'}):(${params.region || '[^:]+'}):([0-9]+):(${params.type})/(${name || '[^/]+'})(/([a-f0-9]+))?$`)
  var generic = specific()
  generic.specific = specific
  return generic
}

module.exports = {
  arnMask,
  awsify
}

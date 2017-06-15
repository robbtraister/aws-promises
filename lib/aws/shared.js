'use strict'

var awsSdk = require('aws-sdk')

var utils = require('../utils')

function getEcsCredentials () {
  if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
    return require('request-promise-native')(`http://169.254.170.2${process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI}`)
      .then(data => {
        return {
          accessKeyId: data.AccessKeyId,
          secretAccessKey: data.SecretAccessKey
        }
      })
      .catch(() => ({}))
  } else {
    return Promise.resolve({})
  }
}

function api (Class, options, methods) {
  if (arguments.length < 3) {
    methods = options
    options = {}
  }

  return getEcsCredentials()
    .then(credentials => {
      var awsInstance = new awsSdk[Class](Object.assign({}, credentials, options))

      var result = {}
      Object.keys(methods)
        .forEach(methodName => {
          result[methodName] = utils.awsify(awsInstance[methodName].bind(awsInstance), methods[methodName])
        })

      return result
    })
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

function regionCache (Class) {
  var cache = {}
  var instance = cache[''] = cache[null] = cache[undefined] = Class()

  var fcn = function (region) {
    cache[region] = cache[region] || Class(region)
    return cache[region]
  }
  Object.keys(Class.prototype).forEach(key => {
    var value = Class.prototype[key]
    fcn[key] = (value instanceof Function) ? value.bind(instance) : value
  })
  Object.keys(instance).forEach(key => {
    var value = instance[key]
    fcn[key] = (value instanceof Function) ? value.bind(instance) : value
  })

  return fcn
}

module.exports = {
  api,
  arnMask,
  regionCache
}

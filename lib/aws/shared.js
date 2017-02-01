var aws_sdk = require('aws-sdk');

var utils = require('../utils');


function getEcsCredentials() {
  if (process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
    return require('request-promise-native')(`http://169.254.170.2${process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI}`)
      .then(data => {
        return {
          accessKeyId: data.AccessKeyId,
          secretAccessKey: data.SecretAccessKey
        }
      })
      .catch(() => ({}));
  } else {
    return Promise.resolve({});
  }
}


var api = module.exports.api = function api(Class, options, methods) {
  if (arguments.length < 3) {
    methods = options;
    options = {};
  }

  return getEcsCredentials()
    .then(credentials => {
      var awsInstance = new aws_sdk[Class](Object.assign({}, credentials, options));

      var result = {};
      Object.keys(methods)
        .forEach(methodName => {
          result[methodName] = utils.awsify(awsInstance[methodName].bind(awsInstance), methods[methodName]);
        });

      return result;
    });
}


var arnMask = module.exports.arnMask = function arnMask(params) {
  if (!params.type) {
    throw '`type` is required';
  }
  var specific = (name) => new RegExp(`^arn\:aws\:${params.service || '[^\:]+'}\:${params.region || '[^\:]+'}\:[0-9]+\:${params.type}${name ? `\/${name}` : ''}(\/|\$)`);
  var generic = specific();
  generic.specific = specific;
  return generic;
};


var regionCache = module.exports.regionCache = function regionCache(Class){
  var cache = {};
  var instance = cache[''] = cache[null] = cache[undefined] = Class();

  var fcn = function(region) {
    return cache[region] = cache[region] || Class(region);
  };
  Object.keys(Class.prototype).forEach(key => {
    var value = Class.prototype[key];
    fcn[key] = (value instanceof Function) ? value.bind(instance) : value;
  });
  Object.keys(instance).forEach(key => {
    var value = instance[key];
    fcn[key] = (value instanceof Function) ? value.bind(instance) : value;
  });

  return fcn;
}

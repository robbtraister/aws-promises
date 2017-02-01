var promisify = module.exports.promisify = require('./promisify');
var throttle = module.exports.throttle = require('./throttle');
var tokenize = module.exports.tokenize = require('./tokenize');
var awsify = module.exports.awsify = function(fcn, options) {
  return tokenize(throttle(promisify(fcn), options), options);
};

'use strict'

function tokenize (promiseFcn, options) {
  options = options || {}
  var property = options.property

  return function tokenize (params) {
    params = params || {}

    var test = params.test || options.test
    delete params.test

    var handler = params.handler || options.handler
    delete params.handler

    function next (params) {
      return promiseFcn(params)
        .then(data => {
          if (property) {
            var result = data[property] || []

            if (test) {
              var match = result.find(test)
            }

            if (handler) {
              handler(result)
            }

            var nextToken
            if ((nextToken = data.nextToken || data.nextForwardToken)) {
              return match || next(Object.assign({}, params, {nextToken}))
                       .then(data => test ? data : result.concat(data))
            } else {
              return test ? match : result
            }
          } else {
            return data
          }
        })
    }

    return next(params)
  }
}

module.exports = tokenize

'use strict'

function tokenize (promiseFcn, options) {
  options = options || {}
  const property = options.property

  return function tokenize (params) {
    params = params || {}

    const test = params.test || options.test
    delete params.test

    const handler = params.handler || options.handler
    delete params.handler

    function next (params) {
      return promiseFcn(params)
        .then(data => {
          if (property) {
            const result = data[property] || []

            const match = (test)
              ? result.find(test)
              : null

            handler && handler(result)

            let nextToken
            if ((nextToken = data.nextToken || data.nextForwardToken)) {
              return match ||
                next(Object.assign({}, params, {nextToken}))
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

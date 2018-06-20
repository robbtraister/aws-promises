'use strict'

const debug = require('debug')('aws-promises:throttle')

function throttle (promiseFcn, options) {
  options = options || {}
  let delay = options.delay || 100
  const multiplier = options.multiplier || 2

  return function throttle (params) {
    function exec () {
      return promiseFcn(params)
        .catch((err) => {
          if (err.retryable && options.retry !== false && params.retry !== false) {
            debug(`Request failed; retryable: ${err.retryable}`)
            return new Promise(function (resolve, reject) {
              setTimeout(function () {
                exec().then(resolve).catch(reject)
              }, delay)
              delay *= multiplier
            })
          } else {
            throw err
          }
        })
    }
    return exec()
  }
}

module.exports = throttle

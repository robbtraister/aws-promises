'use strict'

const debug = require('debug')('aws-promises:throttle')

function throttle (promiseFcn, options) {
  options = options || {}
  let delay = options.delay || 100
  const multiplier = options.multiplier || 2
  const maxRetries = options.maxRetries || 3

  return function throttle (params) {
    function exec (retries = maxRetries) {
      if (retries >= 0) {
        return promiseFcn(params)
          .catch((err) => {
            if (err.retryable && options.retry !== false && params.retry !== false) {
              debug(`Request failed; retryable: ${err.retryable}`)
              return new Promise(function (resolve, reject) {
                setTimeout(function () {
                  exec(retries - 1).then(resolve).catch(reject)
                }, delay)
                delay *= multiplier
              })
            } else {
              throw err
            }
          })
      } else {
        return Promise.reject(new Error('Reached maximum retries'))
      }
    }
    return exec()
  }
}

module.exports = throttle

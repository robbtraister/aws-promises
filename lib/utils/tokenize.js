'use strict'

const tokenize = (promiseFcn, options) => {
  options = options || {}
  const property = options.property

  return function (params) {
    const argArray = Array.prototype.slice.call(arguments, 1) || []

    const test = params.test || options.test
    delete params.test

    const fetch = params => promiseFcn(params, ...argArray)
      .then(data => {
        if (property) {
          const result = data[property] || []
          const match = test ? result.find(test) : null

          if (match) {
            return match
          }

          const nextPage = (field, token) => {
            if (token) {
              return fetch(Object.assign({}, params, {[field]: token}))
                .then(data => test ? data : result.concat(data))
            }
          }

          return nextPage('nextToken', data.nextToken || data.nextForwardToken) ||
                 nextPage('Marker', data.NextMarker) ||
                 nextPage('StartRecordName', data.NextRecordName) ||
                 // if test is supplied, there were no matches
                 (test ? null : result)
        } else {
          return data
        }
      })

    return fetch(params)
  }
}

module.exports = tokenize

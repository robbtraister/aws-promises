'use strict'

const promisify = (obj, methodName) => {
  // if given an array of method names,
  // return an object with those names mapped to their associated promisified functions
  if (methodName instanceof Array) {
    const map = {}
    methodName.map(m => { map[m] = promisify(obj, m) })
    return map
  }

  const fcn = methodName ? obj[methodName] : obj
  const scope = methodName ? obj : null

  if (!(fcn instanceof Function)) {
    throw new Error('`promisify` expects either a function or an object and method name')
  }

  return function () {
    // `arguments` is not a real array, but slice will convert it to one
    const slice = Array.prototype.slice
    return new Promise((resolve, reject) => {
      fcn.apply(scope, slice.call(arguments).concat(function (err) {
        err ? reject(err) : resolve.apply(null, slice.call(arguments, 1))
      }))
    })
  }
}

module.exports = promisify

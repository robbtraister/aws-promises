#!/usr/bin/env node

'use strict'

const crypto = require('crypto')

function generate (format, minLength, maxLength) {
  minLength = Number(minLength)
  maxLength = Number(maxLength)

  minLength = isNaN(minLength) ? 50 : minLength
  maxLength = isNaN(maxLength) ? minLength : maxLength

  let length = minLength + Math.floor(Math.random() * (maxLength - minLength))
  let bytes = crypto.randomBytes(length)

  return bytes.toString(format)
}

module.exports = generate
module.exports.generate = generate

if (module === require.main) {
  let format = 'hex'
  let minLength = 50
  let maxLength = 50

  process.argv.forEach(arg => {
    if (/^\d+(:\d+)?$/.test(arg)) {
      let pieces = arg.split(':')
      minLength = pieces.shift()
      maxLength = pieces.shift()
    } else if (Buffer.isEncoding(arg)) {
      format = arg
    }
  })

  console.log(generate(format, minLength, maxLength))
}

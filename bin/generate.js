#!/usr/bin/env node

'use strict'

const crypto = require('crypto')

function generate ({format, minLength, maxLength}) {
  minLength = Number(minLength)
  maxLength = Number(maxLength)

  minLength = isNaN(minLength) ? 50 : minLength
  maxLength = isNaN(maxLength) ? minLength : maxLength

  const length = minLength + Math.floor(Math.random() * (maxLength - minLength))
  const bytes = crypto.randomBytes(length)

  return bytes.toString(format)
}

module.exports = generate
module.exports.generate = generate

if (module === require.main) {
  const options = {
    format: 'hex',
    minLength: 50,
    maxLength: 50
  }

  process.argv.forEach(arg => {
    if (/^\d+(:\d+)?$/.test(arg)) {
      const pieces = arg.split(':')
      options.minLength = pieces.shift()
      options.maxLength = pieces.shift()
    } else if (Buffer.isEncoding(arg)) {
      options.format = arg
    }
  })

  console.log(generate(options))
}

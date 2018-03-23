#!/usr/bin/env node

'use strict'

const fs = require('fs')

const ini = require('ini')

const promisify = require('../lib/utils/promisify')

const credsFile = process.env.AWS_CREDENTIAL_PROFILES_FILE || `${process.env.HOME}/.aws/credentials`

const readFilePromise = promisify(fs.readFile.bind(fs))
const writeFilePromise = promisify(fs.writeFile.bind(fs))

function setProfile (p) {
  return readFilePromise(credsFile)
    .then(creds => ini.decode(creds.toString()))
    .then(profiles => {
      if (!profiles.hasOwnProperty(p)) {
        throw new Error(`profile '${p}' could not be found`)
      }

      profiles.default = Object.assign(profiles.default || {}, profiles[p])

      return writeFilePromise(credsFile, ini.encode(profiles))
    })
}

module.exports = setProfile

if (module === require.main) {
  setProfile(process.argv[2])
    .then(null)
    .catch(console.error)
}

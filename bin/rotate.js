#!/usr/bin/env node

'use strict'

const childProcess = require('child_process')
const fs = require('fs')

const ini = require('ini')

const aws = require('..')

const promisify = require('../lib/utils/promisify')

const setProfile = require('./set-profile')

const execPromise = promisify(childProcess.exec.bind(childProcess))
const readFilePromise = promisify(fs.readFile.bind(fs))
const writeFilePromise = promisify(fs.writeFile.bind(fs))

const credsFile = process.env.AWS_CREDENTIAL_PROFILES_FILE || `${process.env.HOME}/.aws/credentials`
const envDir = `${process.env.HOME}/.env`

function updateEnvDir () {
  return readFilePromise(credsFile)
    .then(credsBuf => credsBuf.toString())
    .then(credsContent => ini.decode(credsContent))
    .then(profiles => Promise.all(
      Object.keys(profiles)
        .filter(p => p !== 'default')
        .map(p => execPromise(`mkdir -p ${envDir}/${p}`)
          .then(() => Promise.all(
            Object.keys(profiles[p])
              .map(k => writeFilePromise(`${envDir}/${p}/${k.toUpperCase()}`, profiles[p][k]))
          ))
        )
    ))
    .then(() => null)
}

function rotate (profileName, keepOldest) {
  profileName = profileName || process.env.AWS_PROFILE

  const accessKeysPromise = aws.iam.listAccessKeys()

  const profilesPromise = readFilePromise(credsFile)
    .then(credsBuf => credsBuf.toString())
    .then(credsContent => ini.decode(credsContent))

  const setDefaultProfile = !profileName
  const profilePromise = profileName
    ? Promise.resolve(profileName)
    : Promise.all([
      accessKeysPromise,
      profilesPromise
    ])
      .then(data => {
        let accessKeyIds = data.shift().map(k => k.AccessKeyId)
        let profiles = data.shift()

        return Object.keys(profiles)
          .filter(profileName => profileName !== 'default')
          .find(profileName => accessKeyIds.indexOf(profiles[profileName].aws_access_key_id) >= 0)
      })

  let result = Promise.all([
    profilesPromise,
    profilePromise,
    aws.iam.createAccessKey()
  ])
    .then(data => {
      const profiles = data.shift()
      const profileName = data.shift()
      const accessKey = data.shift()

      profiles[profileName].aws_access_key_id = accessKey.AccessKeyId
      profiles[profileName].aws_secret_access_key = accessKey.SecretAccessKey

      return profiles
    })
    .then(profiles => writeFilePromise(credsFile, ini.encode(profiles)))
    .then(updateEnvDir)

  if (!keepOldest) {
    result = result
      .then(() => accessKeysPromise)
      .then(keys => keys.sort((a, b) => a.CreateDate - b.CreateDate).shift())
      // .then(oldestKey => aws.iam.deactivateAccessKey(oldestKey.AccessKeyId))
      .then(oldestKey => aws.iam.deleteAccessKey(oldestKey.AccessKeyId))
  }

  if (setDefaultProfile) {
    result = result
      .then(() => {
        profilePromise.then(setProfile)
      })
  }

  return result
}

if (module === require.main) {
  rotate.apply(null, process.argv.slice(2))
    .catch(console.error)
}

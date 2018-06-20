'use strict'

const debug = require('debug')('aws-promises:lambda')

const { awsify } = require('../utils/awsify')

const lambdaPromises = awsify('Lambda', {
  createAlias: null,
  createFunction: null,
  deleteAlias: null,
  deleteFunction: null,
  getFunction: null,
  invoke: {retry: false},
  listAliases: 'Aliases',
  listVersionsByFunction: 'Versions',
  updateAlias: null,
  updateFunctionCode: null,
  updateFunctionConfiguration: null
})

function Lambda (options) {
  const lambda = lambdaPromises(options)

  return {
    createAlias (FunctionName, FunctionVersion, Name) {
      debug(`Creating Alias: ${FunctionName}:${Name}`)
      return lambda.createAlias({FunctionName, FunctionVersion, Name})
    },

    createFunction (FunctionName, Code, Configs) {
      debug(`Creating Function: ${FunctionName}`)
      return lambda.createFunction(
        Object.assign(
          {
            FunctionName,
            Code,
            Publish: true
          },
          Configs
        )
      )
    },

    deleteAlias (FunctionName, Name) {
      debug(`Deleting Alias: ${FunctionName}:${Name}`)
      return lambda.deleteAlias({FunctionName, Name})
    },

    deleteFunction (FunctionName, Qualifier) {
      debug(`Deleting Function: ${FunctionName}:${Qualifier}`)
      return lambda.deleteFunction({FunctionName, Qualifier})
    },

    getFunction (FunctionName, Qualifier) {
      debug(`Getting Function: ${FunctionName}:${Qualifier}`)
      return lambda.getFunction({FunctionName, Qualifier})
    },

    invoke (params) {
      debug(`Invoking ${params.FunctionName}${params.Qualifier ? `:${params.Qualifier}` : ''}`)
      return lambda.invoke(params)
    },

    listAliases (FunctionName, FunctionVersion) {
      debug(`Listing Aliases: ${FunctionName}${FunctionVersion ? `:${FunctionVersion}` : ''}`)
      const params = {FunctionName}
      if (FunctionVersion) {
        params.FunctionVersion = FunctionVersion
      }
      return lambda.listAliases(params)
    },

    listVersions (FunctionName) {
      debug(`Listing Versions: ${FunctionName}`)
      return lambda.listVersionsByFunction({FunctionName})
    },

    updateAlias (FunctionName, FunctionVersion, Name) {
      debug(`Updating Alias: ${FunctionName}:${Name}`)
      return lambda.updateAlias({FunctionName, FunctionVersion, Name})
    },

    updateFunctionCode (FunctionName, Code) {
      debug(`Updating Function Code: ${FunctionName}`)
      return lambda.updateFunctionCode(
        Object.assign(
          {
            FunctionName,
            Publish: true
          },
          Code
        )
      )
    },

    updateFunctionConfiguration (FunctionName, Configs) {
      debug(`Updating Function Configuration: ${FunctionName}`)
      return lambda.updateFunctionConfiguration(
        Object.assign(
          {
            FunctionName
          },
          Configs
        )
      )
    }
  }
}

module.exports = Lambda

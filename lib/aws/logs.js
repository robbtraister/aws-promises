'use strict'

const debug = require('debug')('aws-promises:logs')

const { awsify } = require('../utils/awsify')

const logsPromises = awsify('CloudWatchLogs', {
  createLogGroup: null,
  deleteLogGroup: null,
  describeLogGroups: 'logGroups',
  describeLogStreams: 'logStreams',
  filterLogEvents: 'events',
  getLogEvents: 'events',
  putRetentionPolicy: null
})

function Logs (options) {
  const logs = logsPromises(options)

  return {
    createLogGroup (logGroupName, retentionInDays) {
      return this.describeLogGroup(logGroupName)
        .then(logGroup => {
          if (logGroup) {
            debug(`Log group already exists [${logGroupName}]`)
          } else {
            debug(`Creating Log Group [${logGroupName}]`)
            return logs.createLogGroup({ logGroupName })
              .then(() => {
                debug(`Successfully created Log Group [${logGroupName}]`)
              })
          }
        })
        .then(() => this.putRetentionPolicy(logGroupName, retentionInDays))
    },

    deleteLogGroup (logGroupName) {
      debug(`Deleting Log Group [${logGroupName}]`)
      return logs.deleteLogGroup({ logGroupName })
        .then(() => {
          debug(`Successfully deleted Log Group [${logGroupName}]`)
        })
    },

    describeLogGroup (logGroupName) {
      const params = {}
      if (logGroupName) {
        params.logGroupNamePrefix = logGroupName
        const loggroupname = logGroupName.toLowerCase()
        params.test = (lg) => lg.logGroupName.toLowerCase() === loggroupname
      }
      return logs.describeLogGroups(params)
    },

    describeLogGroups (logGroupNamePrefix) {
      const params = {}
      if (logGroupNamePrefix) {
        params.logGroupNamePrefix = logGroupNamePrefix
      }
      return logs.describeLogGroups(params)
    },

    describeLogStreams (logGroupName, logStreamNamePrefix, firstEventTimestamp, lastEventTimestamp) {
      const params = { logGroupName }
      if (logStreamNamePrefix) {
        params.logStreamNamePrefix = logStreamNamePrefix
      }
      return logs.describeLogStreams(params)
        .then(streams => {
          if (firstEventTimestamp) {
            return streams.filter(stream => stream.lastEventTimestamp >= firstEventTimestamp)
          } else {
            return streams
          }
        })
        .then(streams => {
          if (lastEventTimestamp) {
            return streams.filter(stream => stream.firstEventTimestamp <= lastEventTimestamp)
          } else {
            return streams
          }
        })
    },

    getLogEvents (logGroupName, logStreamName) {
      const params = {
        logGroupName,
        logStreamName
      }
      return logs.describeLogGroups(params)
    },

    listLogGroups () {
      this.describeLogGroups()
    },

    listLogStreams () {
      this.describeLogStreams()
    },

    putRetentionPolicy (logGroupName, retentionInDays) {
      debug(`Putting retention policy for Log Group [${logGroupName}]`)
      return logs.putRetentionPolicy({ logGroupName, retentionInDays: retentionInDays || 30 })
        .then(() => {
          debug(`Successfully put retention policy for Log Group [${logGroupName}]`)
        })
    }
  }
}

module.exports = Logs

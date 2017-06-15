'use strict'

var debug = require('debug')('aws:logs')

var aws = require('./shared')

function Logs (region) {
  if (!(this instanceof Logs)) {
    return new Logs(region)
  }

  this.awsApi = aws.api('CloudWatchLogs', {region}, {
    createLogGroup: {},
    deleteLogGroup: {},
    describeLogGroups: {property: 'logGroups'},
    describeLogStreams: {property: 'logStreams'},
    filterLogEvents: {property: 'events'},
    getLogEvents: {property: 'events'},
    putRetentionPolicy: {}
  })
}

Logs.prototype.createLogGroup = function createLogGroup (logGroupName, retentionInDays) {
  return this.describeLogGroup(logGroupName)
    .then(logGroup => {
      if (logGroup) {
        debug(`Log group already exists [${logGroupName}]`)
      } else {
        debug(`Creating Log Group [${logGroupName}]`)
        return this.awsApi
          .then(api => api.createLogGroup({logGroupName}))
          .then(() => {
            debug(`Successfully created Log Group [${logGroupName}]`)
          })
      }
    })
    .then(() => this.putRetentionPolicy(logGroupName, retentionInDays))
}

Logs.prototype.deleteLogGroup = function deleteLogGroup (logGroupName) {
  debug(`Deleting Log Group [${logGroupName}]`)
  return this.awsApi
    .then(api => api.deleteLogGroup({logGroupName}))
    .then(() => {
      debug(`Successfully deleted Log Group [${logGroupName}]`)
    })
}

Logs.prototype.describeLogGroup = function describeLogGroup (logGroupName) {
  var params = {}
  if (logGroupName) {
    params.logGroupNamePrefix = logGroupName
    var loggroupname = logGroupName.toLowerCase()
    params.test = (lg) => lg.logGroupName.toLowerCase() === loggroupname
  }
  return this.awsApi
    .then(api => api.describeLogGroups(params))
}

Logs.prototype.describeLogGroups = function describeLogGroups (logGroupNamePrefix) {
  var params = {}
  if (logGroupNamePrefix) {
    params.logGroupNamePrefix = logGroupNamePrefix
  }
  return this.awsApi
    .then(api => api.describeLogGroups(params))
}

Logs.prototype.describeLogStreams = function describeLogStreams (logGroupName, logStreamNamePrefix, firstEventTimestamp, lastEventTimestamp) {
  var params = {logGroupName}
  if (logStreamNamePrefix) {
    params.logStreamNamePrefix = logStreamNamePrefix
  }
  return this.awsApi
    .then(api => api.describeLogStreams(params))
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
}

Logs.prototype.getLogEvents = function getLogEvents (logGroupName, logStreamName) {
  var params = {
    logGroupName,
    logStreamName
  }
  return this.awsApi
    .then(api => api.describeLogGroups(params))
}

Logs.prototype.listLogGroups = Logs.prototype.describeLogGroups

Logs.prototype.listLogStreams = Logs.prototype.describeLogStreams

Logs.prototype.putRetentionPolicy = function putRetentionPolicy (logGroupName, retentionInDays) {
  debug(`Putting retention policy for Log Group [${logGroupName}]`)
  return this.awsApi
    .then(api => api.putRetentionPolicy({logGroupName, retentionInDays: retentionInDays || 30}))
    .then(() => {
      debug(`Successfully put retention policy for Log Group [${logGroupName}]`)
    })
}

module.exports = aws.regionCache(Logs)

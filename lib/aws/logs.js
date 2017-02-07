var debug = require('debug')('aws:logs');

var aws = require('./shared');


function Logs(region) {
  if (!(this instanceof Logs)) {
    return new Logs(region);
  }

  this.awsApi = aws.api('CloudWatchLogs', {region}, {
    createLogGroup: {},
    deleteLogGroup: {},
    describeLogGroups: {property: 'logGroups'},
    putRetentionPolicy: {}
  });
}

Logs.prototype.createLogGroup = function createLogGroup(logGroupName, retentionInDays) {
  return this.describeLogGroup(logGroupName)
    .then(logGroup => {
      if (logGroup) {
        debug(`Log group already exists [${logGroupName}]`);
      } else {
        debug(`Creating Log Group [${logGroupName}]`);
        return this.awsApi
          .then(api => api.createLogGroup({logGroupName}))
          .then(() => {
            debug(`Successfully created Log Group [${logGroupName}]`);
          });
      }
    })
    .then(() => this.putRetentionPolicy(logGroupName, retentionInDays));
};

Logs.prototype.deleteLogGroup = function deleteLogGroup(logGroupName) {
  debug(`Deleting Log Group [${logGroupName}]`);
  return this.awsApi
    .then(api => api.deleteLogGroup({logGroupName}))
    .then(() => {
      debug(`Successfully deleted Log Group [${logGroupName}]`);
    });
};

Logs.prototype.describeLogGroup = function describeLogGroup(logGroupName) {
  var params = {};
  if (logGroupName) {
    params.logGroupNamePrefix = logGroupName;
    var loggroupname = logGroupName.toLowerCase();
    params.test = (lg) => lg.logGroupName.toLowerCase() === loggroupname;
  }
  return this.awsApi
    .then(api => api.describeLogGroups(params));
};

Logs.prototype.describeLogGroups = function describeLogGroups(logGroupName) {
  var params = {};
  if (logGroupName) {
    params.logGroupNamePrefix = logGroupName;
  }
  return this.awsApi
    .then(api => api.describeLogGroups(params));
};

Logs.prototype.listLogGroups = Logs.prototype.describeLogGroups;

Logs.prototype.putRetentionPolicy = function putRetentionPolicy(logGroupName, retentionInDays) {
  debug(`Putting retention policy for Log Group [${logGroupName}]`);
  return this.awsApi
    .then(api => api.putRetentionPolicy({logGroupName, retentionInDays: retentionInDays || 30}))
    .then(() => {
      debug(`Successfully put retention policy for Log Group [${logGroupName}]`);
    });
};


module.exports = aws.regionCache(Logs);

var aws = require('./shared');


function EC2(region) {
  if (!(this instanceof EC2)) {
    return new EC2(region);
  }

  this.awsApi = aws.api('EC2', {region}, {
    describeInstances: {property: 'Reservations'}
  });
}

EC2.prototype.describeInstance = function describeInstance(instanceIdsOrIpsOrName) {
  return this.describeInstances(instanceIdsOrIpsOrName)
    .then(instances => instances.shift())
};

EC2.prototype.describeInstancesById = function describeInstancesById(InstanceIds) {
  return this.awsApi
    .then(api => api.describeInstances({InstanceIds}))
};

EC2.prototype.describeInstancesByName = function describeInstancesByName(Values) {
  return this.awsApi
    .then(api => api.describeInstances({Filters: [{Name: 'tag:Name', Values}]}));
};

EC2.prototype.describeInstancesByPrivateIp = function describeInstancesByPrivateIp(Values) {
  return this.awsApi
    .then(api => api.describeInstances({Filters: [{Name: 'private-ip-address', Values}]}));
};

EC2.prototype.describeInstancesByPublicIp = function describeInstancesByPublicIp(Values) {
  return this.awsApi
    .then(api => api.describeInstances({Filters: [{Name: 'ip-address', Values}]}));
};

EC2.prototype.describeInstances = function describeInstances(instanceIdsOrIpsOrNames) {
  if (!(instanceIdsOrIpsOrNames instanceof Array)) {
    instanceIdsOrIpsOrNames = [instanceIdsOrIpsOrNames];
  }

  var idMask = /^i\-/;
  var ipMask = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;

  var ids = instanceIdsOrIpsOrNames.filter(instanceIdsOrIpsOrName => idMask.test(instanceIdsOrIpsOrName));
  var ips = instanceIdsOrIpsOrNames.filter(instanceIdsOrIpsOrName => ipMask.test(instanceIdsOrIpsOrName));
  var names = instanceIdsOrIpsOrNames.filter(instanceIdsOrIpsOrName => {
    return !idMask.test(instanceIdsOrIpsOrName) && !ipMask.test(instanceIdsOrIpsOrName);
  });

  var promises = [];

  if (ids.length > 0) {
    promises.push(this.describeInstancesById(ids).catch(() => []));
  }

  if (ips.length > 0) {
    promises.push(
      this.describeInstancesByPrivateIp(ips).catch(() => []),
      this.describeInstancesByPublicIp(ips).catch(() => [])
    );
  }

  if (names.length) {
    promises.push(this.describeInstancesByName(names).catch(() => []));
  }

  return Promise.all(promises)
    .then(reservationsSet => [].concat.apply([], reservationsSet))
    .then(reservations => reservations.map(reservation => reservation.Instances))
    .then(instancesSet => [].concat.apply([], instancesSet))
    ;
};


module.exports = aws.regionCache(EC2);

var aws = require('./shared');


function EC2(region) {
  if (!(this instanceof EC2)) {
    return new EC2(region);
  }

  this.awsApi = aws.api('EC2', {region}, {
    describeInstances: {property: 'Reservations'}
  });
}

EC2.prototype.describeInstance = function describeInstance(InstanceId) {
  return this.describeInstances(InstanceId)
    .then(instances => instances.shift())
};

EC2.prototype.describeInstances = function describeInstances(InstanceIds) {
  if (!(InstanceIds instanceof Array)) {
    InstanceIds = [InstanceIds];
  }

  return this.awsApi
    .then(api => api.describeInstances({InstanceIds}))
    .then(reservations => [].concat.apply([], reservations.map(reservation => reservation.Instances)));
};


module.exports = aws.regionCache(EC2);

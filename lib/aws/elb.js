var aws = require('./shared');


function ELB(region) {
  if (!(this instanceof ELB)) {
    return new ELB(region);
  }

  this.awsApi = aws.api('ELB', {region}, {
    addTags: {},
    deleteLoadBalancer: {},
    describeLoadBalancerAttributes: {property: 'LoadBalancerAttributes'},
    describeLoadBalancers: {property: 'LoadBalancerDescriptions'}
  });
}

ELB.prototype.addTags = function addTags(LoadBalancerNames, Tags) {
  if (!(LoadBalancerNames instanceof Array)) {
    LoadBalancerNames = [LoadBalancerNames];
  }

  if (!(Tags instanceof Array)) {
    Tags = Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]}));
  }

  debug(`Adding Load Balancer Tags`);
  return this.awsApi
    .then(api => api.addTags({
      LoadBalancerNames,
      Tags
    }))
    .then(() => {
      debug(`Successfully added Load Balancer Tags`);
    });
};

ELB.prototype.describeLoadBalancer = function describeLoadBalancer(LoadBalancerName) {
  return this.describeLoadBalancers(LoadBalancerName)
    .then(elbs => elbs.shift());
};

ELB.prototype.describeLoadBalancerAttributes = function describeLoadBalancerAttributes(LoadBalancerName) {
  return this.awsApi
    .then(api => api.describeLoadBalancerAttributes({LoadBalancerName}));
};

ELB.prototype.describeLoadBalancers = function describeLoadBalancers(LoadBalancerNames) {
  if (!(LoadBalancerNames instanceof Array)) {
    LoadBalancerNames = [LoadBalancerNames];
  }

  return this.awsApi
    .then(api => api.describeLoadBalancers({LoadBalancerNames}));
};

ELB.prototype.deleteLoadBalancer = function deleteLoadBalancer(loadBalancerName) {
  return this.awsApi
    .then(api => api.describeLoadBalancerAttributes({LoadBalancerName}));
};

ELB.prototype.removeTags = function removeTags(LoadBalancerNames, Tags) {
  if (!(LoadBalancerNames instanceof Array)) {
    LoadBalancerNames = [LoadBalancerNames];
  }

  if (Tags instanceof Array) {
    Tags = Tags.map(tag => (tag && tag.Key ? tag : {Key: tag}));
  } else if (Tags instanceof Object) {
    Tags = Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]}));
  } else {
    Tags = [{Key: Tags}];
  }

  debug(`Removing Load Balancer Tags`);
  return this.awsApi
    .then(api => api.removeTags({
      LoadBalancerNames,
      Tags
    }))
    .then(() => {
      debug(`Successfully removed Load Balancer Tags`);
    });
};


module.exports = aws.regionCache(ELB);

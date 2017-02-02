var aws = require('./shared');


var clusterArnMask = aws.arnMask({type: 'cluster'});
var serviceArnMask = aws.arnMask({type: 'service'});


function ECS(region) {
  if (!(this instanceof ECS)) {
    return new ECS(region);
  }

  this.awsApi = aws.api('ECS', {region}, {
    describeServices: {property: 'services'},
    describeTaskDefinition: {property: 'taskDefinition'},
    listClusters: {property: 'clusterArns'},
    listServices: {property: 'serviceArns'}
  });
}

ECS.prototype.listClusters = function listClusters() {
  return this.awsApi
    .then(api => api.listClusters());
};

ECS.prototype.getClusterArn = function getClusterArn(clusterName) {
  if (clusterArnMask.test(clusterName)) {
    return Promise.resolve(clusterName);
  } else {
    var specificMask = clusterArnMask.specific(clusterName);
    return this.awsApi
      .then(api => api.listClusters({test: specificMask.test.bind(specificMask)}));
  }
};

ECS.prototype.getServiceArn = function getServiceArn(serviceName, cluster) {
  if (serviceArnMask.test(serviceName)) {
    return Promise.resolve(serviceName);
  } else {
    var specificMask = serviceArnMask.specific(serviceName);
    var params = {test: specificMask.test.bind(specificMask)};
    if (cluster) {
      params.cluster = cluster;
    }
    return this.awsApi
      .then(api => api.listServices(params));
  }
};

ECS.prototype.getTaskDefinitionArn = function getTaskDefinitionArn(serviceName, cluster) {
  return this.getServiceArn(serviceName, cluster)
    .then(serviceArn => {
      if (serviceArn) {
        var params = {services: [serviceArn]};
        if (cluster) {
          params.cluster = cluster;
        }
        return this.awsApi
          .then(api => api.describeServices(params));
      }
    })
    .then(data => data && data.map(d => d.taskDefinition).shift());
};

ECS.prototype.describeTaskDefinition = function describeTaskDefinition(serviceName, cluster) {
  return this.getTaskDefinitionArn(serviceName, cluster)
    .then(taskDefinition => {
      if (taskDefinition) {
        return this.awsApi
          .then(api => api.describeTaskDefinition({taskDefinition}));
      }
    });
};

ECS.prototype.describeContainers = function describeContainers(serviceName, cluster) {
  return this.describeTaskDefinition(serviceName, cluster)
    .then(taskDefinition => taskDefinition && taskDefinition.containerDefinitions);
};

ECS.prototype.environments = function environments(serviceName, cluster) {
  return this.describeContainers(serviceName, cluster)
    .then(containers => {
      if (containers) {
        var containerMap = {};
        containers.forEach(container => {
          var environment = {};
          container.environment.forEach(v => environment[v.name] = v.value);
          containerMap[container.name] = environment;
        });
        return containerMap;
      }
    });
};


module.exports = aws.regionCache(ECS);

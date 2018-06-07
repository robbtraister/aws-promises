'use strict'

const debug = require('debug')('aws-promises:ecs')

const { arnMask, awsify } = require('../utils/awsify')

const clusterArnMask = arnMask({type: 'cluster'})
const serviceArnMask = arnMask({type: 'service'})

const ecsPromises = awsify('ECS', {
  createService: 'service',
  deleteService: 'service',
  deregisterTaskDefinition: 'taskDefinition',
  describeServices: 'services',
  describeTaskDefinition: 'taskDefinition',
  describeTasks: 'tasks',
  listClusters: 'clusterArns',
  listServices: 'serviceArns',
  listTasks: 'taskArns',
  registerTaskDefinition: 'taskDefinition',
  // runTask:,
  updateService: 'service',
  waitFor: 'services'
})

function ECS (options) {
  const ecs = ecsPromises(options)

  return {
    createService (params) {
      debug(`Creating Service: ${params.serviceName}`)
      // prepare params

      return ecs.createService(params) // {
      // cluster,
      // serviceName,
      // taskDefinition,
      // loadBalancers,
      // desiredCount,
      // clientToken,
      // role,
      // deploymentConfiguration,
      // placementConstraints,
      // placementStrategy
      // })
    },

    deleteService ({service, cluster}) {
      debug(`Deleting Service: ${service}`)
      return ecs.deleteService({cluster, service})
    },

    deregisterTaskDefinition (taskDefinition) {
      debug(`Deregistering Task Definition: ${taskDefinition}`)
      return ecs.deregisterTaskDefinition({taskDefinition})
    },

    describeContainers (serviceName, cluster) {
      return this.getTaskDefinitionArn(serviceName, cluster)
        .then(taskDefinitionArn => this.describeTaskDefinition(taskDefinitionArn))
        .then(taskDefinition => taskDefinition && taskDefinition.containerDefinitions)
    },

    describeServices ({service, services, cluster}) {
      // support both singular and plural names
      services = Array.prototype.concat(service, services)
        .filter(i => !!i)

      debug(`Describing Services for: ${cluster}`)
      return ecs.describeServices({cluster, services})
    },

    describeTaskDefinition (taskDefinition) {
      // unwrap in case of named parameters
      if (taskDefinition && taskDefinition.taskDefinition) {
        taskDefinition = taskDefinition.taskDefinition
      }
      debug(`Describing Task Definition: ${taskDefinition}`)
      return ecs.describeTaskDefinition({taskDefinition})
    },

    describeTasks ({task, tasks, cluster}) {
      // support both singular and plural names
      tasks = Array.prototype.concat(task, tasks)
        .filter(i => !!i)

      debug(`Describing Tasks for: ${cluster}`)
      return ecs.describeServices({cluster, tasks})
    },

    environments (serviceName, cluster) {
      return this.describeContainers(serviceName, cluster)
        .then(containers => {
          if (containers) {
            const containerMap = {}
            containers.forEach(container => {
              const environment = {}
              container.environment.forEach(v => { environment[v.name] = v.value })
              containerMap[container.name] = environment
            })
            return containerMap
          }
        })
    },

    getClusterArn (clusterName) {
      if (clusterArnMask.test(clusterName)) {
        return Promise.resolve(clusterName)
      } else {
        const specificMask = clusterArnMask.specific(clusterName)
        return ecs.listClusters({test: specificMask.test.bind(specificMask)})
      }
    },

    getServiceArn (serviceName, cluster) {
      if (serviceArnMask.test(serviceName)) {
        return Promise.resolve(serviceName)
      } else {
        const specificMask = serviceArnMask.specific(serviceName)
        const params = {test: specificMask.test.bind(specificMask)}
        if (cluster) {
          params.cluster = cluster
        }
        return ecs.listServices(params)
      }
    },

    getTaskDefinitionArn (serviceName, cluster) {
      return this.getServiceArn(serviceName, cluster)
        .then(serviceArn => {
          if (serviceArn) {
            const params = {services: [serviceArn]}
            if (cluster) {
              params.cluster = cluster
            }
            return ecs.describeServices(params)
          }
        })
        .then(data => data && data.map(d => d.taskDefinition).shift())
    },

    listClusters () {
      debug('Listing Clusters')
      return ecs.listClusters()
    },

    listServices (cluster) {
      // unwrap in case of named parameters
      if (cluster && cluster.cluster) {
        cluster = cluster.cluster
      }
      debug(`Listing Services for Cluster: ${cluster}`)
      return ecs.listServices({cluster})
    },

    listTasks (params) {
      debug('Listing Tasks')
      return ecs.listTasks(params)
    },

    registerTaskDefinition (params) {
      debug(`Registering Task Definition: ${params.family}`)
      return ecs.registerTaskDefinition(params)
    },

    updateService (params) {
      if (params.serviceName && !params.service) {
        params.service = params.serviceName
      }
      delete params.serviceName
      debug(`Updating Service: ${params.service}`)
      return ecs.updateService(params)
    },

    waitFor (state, params) {
      debug(`Waiting for: ${state} ${params.services}`)
      return ecs.waitFor(state, params)
    }
  }
}

module.exports = ECS

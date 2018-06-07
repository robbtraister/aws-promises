'use strict'

var { awsify } = require('../utils/awsify')

var debug = require('debug')('aws-promises:elb')

const elbPromises = awsify('ELB', {
  addTags: null,
  deleteLoadBalancer: null,
  describeLoadBalancerAttributes: 'LoadBalancerAttributes',
  describeLoadBalancers: 'LoadBalancerDescriptions'
})

function ELB (options) {
  const elb = elbPromises(options)

  return {
    addTags (LoadBalancerNames, Tags) {
      if (!(LoadBalancerNames instanceof Array)) {
        LoadBalancerNames = [LoadBalancerNames]
      }

      if (!(Tags instanceof Array)) {
        Tags = Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]}))
      }

      debug(`Adding Load Balancer Tags`)
      return elb.addTags({
        LoadBalancerNames,
        Tags
      })
        .then(() => {
          debug(`Successfully added Load Balancer Tags`)
        })
    },

    describeLoadBalancer (LoadBalancerName) {
      return this.describeLoadBalancers(LoadBalancerName)
        .then(elbs => elbs.shift())
    },

    describeLoadBalancerAttributes (LoadBalancerName) {
      return elb.describeLoadBalancerAttributes({LoadBalancerName})
    },

    describeLoadBalancers (LoadBalancerNames) {
      if (!(LoadBalancerNames instanceof Array)) {
        LoadBalancerNames = [LoadBalancerNames]
      }

      return elb.describeLoadBalancers({LoadBalancerNames})
    },

    deleteLoadBalancer (LoadBalancerName) {
      return elb.describeLoadBalancerAttributes({LoadBalancerName})
    },

    removeTags (LoadBalancerNames, Tags) {
      if (!(LoadBalancerNames instanceof Array)) {
        LoadBalancerNames = [LoadBalancerNames]
      }

      if (Tags instanceof Array) {
        Tags = Tags.map(tag => (tag && tag.Key ? tag : {Key: tag}))
      } else if (Tags instanceof Object) {
        Tags = Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]}))
      } else {
        Tags = [{Key: Tags}]
      }

      debug(`Removing Load Balancer Tags`)
      return elb.removeTags({
        LoadBalancerNames,
        Tags
      })
        .then(() => {
          debug(`Successfully removed Load Balancer Tags`)
        })
    }
  }
}

module.exports = ELB

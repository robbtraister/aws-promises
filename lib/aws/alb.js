'use strict'

var debug = require('debug')('aws-promises:alb')

var { arnMask, awsify } = require('../utils/awsify')

var lbArnMask = arnMask({type: 'loadbalancer/app'})
var tgArnMask = arnMask({type: 'targetgroup'})

const albPromises = awsify('ELBv2', {
  addTags: null,
  createListener: 'Listeners',
  createLoadBalancer: 'LoadBalancers',
  createRule: 'Rules',
  createTargetGroup: 'TargetGroups',
  deleteListener: null,
  deleteLoadBalancer: null,
  deleteRule: null,
  deleteTargetGroup: null,
  describeListeners: 'Listeners',
  describeLoadBalancerAttributes: 'Attributes',
  describeLoadBalancers: 'LoadBalancers',
  describeRules: 'Rules',
  describeTags: 'TagDescriptions',
  describeTargetGroupAttributes: 'Attributes',
  describeTargetGroups: 'TargetGroups',
  describeTargetHealth: 'TargetHealthDescriptions',
  modifyListener: 'Listeners',
  modifyLoadBalancerAttributes: 'Attributes',
  modifyTargetGroupAttributes: 'Attributes',
  removeTags: null
})

function ALB (options) {
  const alb = albPromises(options)

  return {
    addTags (ResourceArns, Tags) {
      if (!(ResourceArns instanceof Array)) {
        ResourceArns = [ResourceArns]
      }

      if (!(Tags instanceof Array)) {
        Tags = Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]}))
      }

      debug(`Adding Resource Tags`)
      return alb.addTags({
        ResourceArns,
        Tags
      })
        .then(() => {
          debug(`Successfully added Resource Tags`)
        })
    },

    createListener (LoadBalancerArn, TargetGroupArn, CertificateArn) {
      var params = {
        DefaultActions: [
          {
            TargetGroupArn,
            Type: 'forward'
          }
        ],
        LoadBalancerArn,
        Port: CertificateArn ? 443 : 80,
        Protocol: CertificateArn ? 'HTTPS' : 'HTTP'
      }

      if (CertificateArn) {
        params.Certificates = [{CertificateArn}]
      }

      debug(`Creating ALB Listener for [${TargetGroupArn}] on [${LoadBalancerArn}]`)

      return alb.createListener(params)
        .then(listeners => listeners && listeners.shift())
        .then(listener => {
          if (listener) {
            debug(`Successfully created ALB Listener [${listener.ListenerArn}] on Load Balancer [${listener.LoadBalancerArn}]`)
          }
          return listener
        })
    },

    createLoadBalancer (Name, Subnets, SecurityGroups, Tags) {
      if (!(Tags instanceof Array)) {
        Tags = Tags ? Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]})) : []
      }

      debug(`Creating Load Balancer [${Name}]`)
      return alb.createLoadBalancer({
        Name,
        Subnets,
        IpAddressType: 'ipv4',
        Scheme: 'internet-facing',
        SecurityGroups,
        Tags
      })
        .then(loadBalancers => loadBalancers && loadBalancers.shift())
        .then(loadBalancer => {
          if (loadBalancer) {
            debug(`Successfully created Load Balancer [${loadBalancer.LoadBalancerArn}]`)
          }
          return loadBalancer
        })
    },

    createRule (ListenerArn, hostHeader, TargetGroupArn, Priority) {
      debug(`Creating Rule for: ${TargetGroupArn}`)
      return alb.createRule({
        ListenerArn,
        Conditions: [{
          Field: 'host-header',
          Values: [hostHeader]
        }],
        Actions: [{
          Type: 'forward',
          TargetGroupArn
        }],
        Priority
      })
    },

    createTargetGroup (Name, VpcId, options) {
      debug(`Creating Target Group [${Name}]`)
      return alb.createTargetGroup(Object.assign({
        Name,
        Port: 80,
        Protocol: 'HTTP',
        VpcId,
        HealthCheckIntervalSeconds: 30,
        HealthCheckPath: '/healthcheck.html',
        HealthCheckProtocol: 'HTTP',
        HealthCheckTimeoutSeconds: 5,
        HealthyThresholdCount: 5,
        Matcher: {
          HttpCode: '200'
        },
        UnhealthyThresholdCount: 2
      }, options || {}))
        .then(targetGroups => targetGroups && targetGroups.shift())
        .then(targetGroup => {
          if (targetGroup) {
            debug(`Successfully created Target Group [${targetGroup.TargetGroupArn}]`)
          }
          return targetGroup
        })
    },

    deleteListener (ListenerArn) {
      debug(`Deleting Listener [${ListenerArn}]`)
      return alb.deleteListener({ListenerArn})
        .then(() => {
          debug(`Successfully deleted Listener [${ListenerArn}]`)
        })
    },

    deleteLoadBalancer (loadBalancerNameOrArn) {
      return this.getLoadBalancerArn(loadBalancerNameOrArn)
        .then(LoadBalancerArn => {
          if (LoadBalancerArn) {
            debug(`Deleting Load Balancer [${LoadBalancerArn}]`)
            return alb.deleteLoadBalancer({LoadBalancerArn})
              .then(() => {
                debug(`Successfully deleted Load Balancer [${LoadBalancerArn}]`)
              })
          } else {
            debug(`Load Balancer [${loadBalancerNameOrArn}] does not exist`)
          }
        })
    },

    deleteRule (RuleArn) {
      debug(`Deleting Rule: ${RuleArn}`)
      return alb.deleteRule({RuleArn})
    },

    deleteTargetGroup (targetGroupNameOrArn) {
      return this.getTargetGroupArn(targetGroupNameOrArn)
        .then(TargetGroupArn => {
          if (TargetGroupArn) {
            debug(`Deleting Target Group [${TargetGroupArn}]`)
            return alb.deleteTargetGroup({TargetGroupArn})
              .then(() => {
                debug(`Successfully deleted Target Group [${TargetGroupArn}]`)
              })
          } else {
            debug(`Target Group [${targetGroupNameOrArn}] does not exist`)
          }
        })
    },

    describeListeners (loadBalancerNameOrArn) {
      return this.getLoadBalancerArn(loadBalancerNameOrArn)
        .then(LoadBalancerArn => {
          if (LoadBalancerArn) {
            return alb.describeListeners({LoadBalancerArn})
          }
        })
    },

    describeLoadBalancer (loadBalancerNameOrArn) {
      return this.getLoadBalancerName(loadBalancerNameOrArn)
        .then(loadBalancerName => {
          var specificMask = lbArnMask.specific(loadBalancerName)
          return alb.describeLoadBalancers({
            Names: [loadBalancerName],
            test: (lb) => specificMask.test(lb.LoadBalancerArn)
          })
        })
    },

    describeLoadBalancers (LoadBalancerArns) {
      debug('Describing Load Balancers')
      if (!(LoadBalancerArns instanceof Array)) {
        LoadBalancerArns = [LoadBalancerArns]
      }
      return alb.describeLoadBalancers({LoadBalancerArns})
    },

    describeLoadBalancerAttributes (loadBalancerNameOrArn) {
      return this.getLoadBalancerArn(loadBalancerNameOrArn)
        .then(LoadBalancerArn => {
          return alb.describeLoadBalancerAttributes({LoadBalancerArn})
            .then(attributes => {
              var result = {}
              attributes.forEach(att => { result[att.Key] = att.Value })
              return result
            })
        })
    },

    describeRules (ListenerArn) {
      debug(`Describing Rules for: ${ListenerArn}`)
      return alb.describeRules({ListenerArn})
    },

    describeTags (ResourceArn) {
      debug(`Describing Tags for: ${ResourceArn}`)
      return alb.describeTags({ResourceArns: [ResourceArn]})
        .then(TagDescriptions => TagDescriptions.find(td => td.ResourceArn === ResourceArn))
        .then(TagDescription => TagDescription.Tags)
        .then(Tags => {
          const map = {}
          Tags.forEach(tag => { map[tag.Key] = tag.Value })
          return map
        })
    },

    describeTargetGroupAttributes (targetGroupNameOrArn) {
      return this.getTargetGroupArn(targetGroupNameOrArn)
        .then(TargetGroupArn => {
          return alb.describeTargetGroupAttributes({TargetGroupArn})
            .then(attributes => {
              var result = {}
              attributes.forEach(att => { result[att.Key] = att.Value })
              return result
            })
        })
    },

    describeTargetGroup (targetGroupNameOrArn) {
      return this.getTargetGroupName(targetGroupNameOrArn)
        .then(targetGroupName => {
          var specificMask = tgArnMask.specific(targetGroupName)
          return alb.describeTargetGroups({
            Names: [targetGroupName],
            test: (tg) => specificMask.test(tg.TargetGroupArn)
          })
        })
    },

    describeTargetGroups (TargetGroupArns) {
      if (!(TargetGroupArns instanceof Array)) {
        TargetGroupArns = [TargetGroupArns]
      }
      return alb.describeTargetGroups({TargetGroupArns})
    },

    describeTargetHealth (TargetGroupArn) {
      debug(`Describing Target Health: ${TargetGroupArn}`)
      return alb.describeTargetHealth({TargetGroupArn})
    },

    disableCookieStickiness (TargetGroupArn) {
      return this.modifyTargetGroupAttributes(TargetGroupArn,
        {
          'stickiness.enabled': 'false'
        }
      )
    },

    enableCookieStickiness (TargetGroupArn, duration) {
      return this.modifyTargetGroupAttributes(TargetGroupArn,
        {
          'stickiness.enabled': 'true',
          'stickiness.type': 'lb_cookie',
          'stickiness.lb_cookie.duration_seconds': duration ? duration.toString() : '3600'
        }
      )
    },

    getLoadBalancerArn (loadBalancerName) {
      if (lbArnMask.test(loadBalancerName)) {
        return Promise.resolve(loadBalancerName)
      } else {
        return this.describeLoadBalancer(loadBalancerName)
          .then(lb => lb.LoadBalancerArn)
      }
    },

    getLoadBalancerName (loadBalancerArn) {
      var match = lbArnMask.exec(loadBalancerArn)
      if (match) {
        return Promise.resolve(match[5])
      } else {
        return Promise.resolve(loadBalancerArn)
      }
    },

    getTargetGroupArn (targetGroupName) {
      if (tgArnMask.test(targetGroupName)) {
        return Promise.resolve(targetGroupName)
      } else {
        var specificMask = tgArnMask.specific(targetGroupName)
        return alb.describeTargetGroups({
          Names: [targetGroupName],
          test: (tg) => specificMask.test(tg.TargetGroupArn)
        })
          .then(tg => tg.TargetGroupArn)
      }
    },

    getTargetGroupName (targetGroupArn) {
      var match = tgArnMask.exec(targetGroupArn)
      if (match) {
        return Promise.resolve(match[5])
      } else {
        return Promise.resolve(targetGroupArn)
      }
    },

    listTargets (targetGroupArnOrName) {
      return this.getTargetGroupArn(targetGroupArnOrName)
        .then(TargetGroupArn => {
          return alb.describeTargetHealth({TargetGroupArn})
        })
    },

    modifyLoadBalancerAttributes (LoadBalancerArn, Attributes) {
      if (!(Attributes instanceof Array)) {
        Attributes = Object.keys(Attributes).map(Key => ({Key, Value: Attributes[Key]}))
      }

      return alb.modifyLoadBalancerAttributes({LoadBalancerArn, Attributes})
    },

    modifyTargetGroupAttributes (TargetGroupArn, Attributes) {
      debug(`Modifying Target Group Attributes for: ${TargetGroupArn}`)

      if (!(Attributes instanceof Array)) {
        Attributes = Object.keys(Attributes).map(Key => ({
          Key,
          Value: String(Attributes[Key])
        }))
      }

      return alb.modifyTargetGroupAttributes({
        TargetGroupArn,
        Attributes
      })
    },

    removeTags (ResourceArns, TagKeys) {
      if (!(ResourceArns instanceof Array)) {
        ResourceArns = [ResourceArns]
      }

      if (TagKeys instanceof Array) {
        TagKeys = TagKeys.map(tag => (tag && tag.Key ? tag.Key : tag))
      } else if (TagKeys instanceof Object) {
        TagKeys = Object.keys(TagKeys)
      } else {
        TagKeys = [TagKeys]
      }

      debug(`Removing Resource Tags`)
      return alb.removeTags({
        ResourceArns,
        TagKeys
      })
        .then(() => {
          debug(`Successfully removed Resource Tags`)
        })
    },

    setDefault (ListenerArn, TargetGroupArn) {
      debug(`Setting default for ${ListenerArn} to ${TargetGroupArn}`)
      return alb.modifyListener({
        ListenerArn,
        DefaultActions: [
          {
            TargetGroupArn,
            Type: 'forward'
          }
        ]
      })
    }
  }
}

module.exports = ALB

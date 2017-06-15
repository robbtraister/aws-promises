'use strict'

var debug = require('debug')('aws:alb')

var aws = require('./shared')

var lbArnMask = aws.arnMask({type: 'loadbalancer/app'})
var tgArnMask = aws.arnMask({type: 'targetgroup'})

function ALB (region) {
  if (!(this instanceof ALB)) {
    return new ALB(region)
  }

  this.awsApi = aws.api('ELBv2', {region}, {
    addTags: {},
    createListener: {property: 'Listeners'},
    createLoadBalancer: {property: 'LoadBalancers'},
    createTargetGroup: {property: 'TargetGroups'},
    deleteListener: {},
    deleteLoadBalancer: {},
    deleteTargetGroup: {},
    describeListeners: {property: 'Listeners'},
    describeLoadBalancerAttributes: {property: 'Attributes'},
    describeLoadBalancers: {property: 'LoadBalancers'},
    describeTargetGroupAttributes: {property: 'Attributes'},
    describeTargetGroups: {property: 'TargetGroups'},
    describeTargetHealth: {property: 'TargetHealthDescriptions'},
    modifyLoadBalancerAttributes: {property: 'Attributes'},
    modifyTargetGroupAttributes: {property: 'Attributes'},
    removeTags: {}
  })
}

ALB.prototype.addTags = function addTags (ResourceArns, Tags) {
  if (!(ResourceArns instanceof Array)) {
    ResourceArns = [ResourceArns]
  }

  if (!(Tags instanceof Array)) {
    Tags = Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]}))
  }

  debug(`Adding Resource Tags`)
  return this.awsApi
    .then(api => api.addTags({
      ResourceArns,
      Tags
    }))
    .then(() => {
      debug(`Successfully added Resource Tags`)
    })
}

ALB.prototype.createListener = function createListener (LoadBalancerArn, TargetGroupArn, CertificateArn) {
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

  return this.awsApi
    .then(api => api.createListener(params))
    .then(listeners => listeners && listeners.shift())
    .then(listener => {
      if (listener) {
        debug(`Successfully created ALB Listener [${listener.ListenerArn}] on Load Balancer [${listener.LoadBalancerArn}]`)
      }
      return listener
    })
}

ALB.prototype.createLoadBalancer = function createLoadBalancer (Name, Subnets, SecurityGroups, Tags) {
  if (!(Tags instanceof Array)) {
    Tags = Tags ? Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]})) : []
  }

  debug(`Creating Load Balancer [${Name}]`)
  return this.awsApi
    .then(api => api.createLoadBalancer({
      Name,
      Subnets,
      IpAddressType: 'ipv4',
      Scheme: 'internet-facing',
      SecurityGroups,
      Tags
    }))
    .then(loadBalancers => loadBalancers && loadBalancers.shift())
    .then(loadBalancer => {
      if (loadBalancer) {
        debug(`Successfully created Load Balancer [${loadBalancer.LoadBalancerArn}]`)
      }
      return loadBalancer
    })
}

ALB.prototype.createTargetGroup = function createTargetGroup (Name, Port, VpcId, tags) {
  debug(`Creating Target Group [${Name}]`)
  return this.awsApi
    .then(api => api.createTargetGroup({
      Name,
      Port,
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
    }))
    .then(targetGroups => targetGroups && targetGroups.shift())
    .then(targetGroup => {
      if (targetGroup) {
        debug(`Successfully created Target Group [${targetGroup.TargetGroupArn}]`)
      }
      return targetGroup
    })
}

ALB.prototype.deleteListener = function deleteListener (ListenerArn) {
  debug(`Deleting Listener [${ListenerArn}]`)
  return this.awsApi
    .then(api => api.deleteListener({ListenerArn}))
    .then(() => {
      debug(`Successfully deleted Listener [${ListenerArn}]`)
    })
}

ALB.prototype.deleteLoadBalancer = function deleteLoadBalancer (loadBalancerNameOrArn) {
  return this.getLoadBalancerArn(loadBalancerNameOrArn)
    .then(LoadBalancerArn => {
      if (LoadBalancerArn) {
        debug(`Deleting Load Balancer [${LoadBalancerArn}]`)
        return this.awsApi
          .then(api => api.deleteLoadBalancer({LoadBalancerArn}))
          .then(() => {
            debug(`Successfully deleted Load Balancer [${LoadBalancerArn}]`)
          })
      } else {
        debug(`Load Balancer [${loadBalancerNameOrArn}] does not exist`)
      }
    })
}

ALB.prototype.deleteTargetGroup = function deleteTargetGroup (targetGroupNameOrArn) {
  return this.getTargetGroupArn(targetGroupNameOrArn)
    .then(TargetGroupArn => {
      if (TargetGroupArn) {
        debug(`Deleting Target Group [${TargetGroupArn}]`)
        return this.awsApi
          .then(api => api.deleteTargetGroup({TargetGroupArn}))
          .then(() => {
            debug(`Successfully deleted Target Group [${TargetGroupArn}]`)
          })
      } else {
        debug(`Target Group [${targetGroupNameOrArn}] does not exist`)
      }
    })
}

ALB.prototype.describeListeners = function describeListeners (loadBalancerNameOrArn) {
  return this.getLoadBalancerArn(loadBalancerNameOrArn)
    .then(LoadBalancerArn => {
      if (LoadBalancerArn) {
        return this.awsApi
          .then(api => api.describeListeners({LoadBalancerArn}))
      }
    })
}

ALB.prototype.describeLoadBalancer = function describeLoadBalancer (loadBalancerNameOrArn) {
  return this.getLoadBalancerName(loadBalancerNameOrArn)
    .then(loadBalancerName => {
      var specificMask = lbArnMask.specific(loadBalancerName)
      return this.awsApi
        .then(api => api.describeLoadBalancers({
          Names: [loadBalancerName],
          test: (lb) => specificMask.test(lb.LoadBalancerArn)
        }))
    })
}

ALB.prototype.describeLoadBalancers = function describeLoadBalancers (LoadBalancerArns) {
  if (!(LoadBalancerArns instanceof Array)) {
    LoadBalancerArns = [LoadBalancerArns]
  }
  return this.awsApi
    .then(api => api.describeLoadBalancers({LoadBalancerArns}))
}

ALB.prototype.describeLoadBalancerAttributes = function describeLoadBalancerAttributes (loadBalancerNameOrArn) {
  return this.getLoadBalancerArn(loadBalancerNameOrArn)
    .then(LoadBalancerArn => {
      return this.awsApi
        .then(api => api.describeLoadBalancerAttributes({LoadBalancerArn}))
        .then(attributes => {
          var result = {}
          attributes.forEach(att => { result[att.Key] = att.Value })
          return result
        })
    })
}

ALB.prototype.describeTargetGroupAttributes = function describeTargetGroupAttributes (targetGroupNameOrArn) {
  return this.getTargetGroupArn(targetGroupNameOrArn)
    .then(TargetGroupArn => {
      return this.awsApi
        .then(api => api.describeTargetGroupAttributes({TargetGroupArn}))
        .then(attributes => {
          var result = {}
          attributes.forEach(att => { result[att.Key] = att.Value })
          return result
        })
    })
}

ALB.prototype.describeTargetGroup = function describeTargetGroup (targetGroupNameOrArn) {
  return this.getTargetGroupName(targetGroupNameOrArn)
    .then(targetGroupName => {
      var specificMask = tgArnMask.specific(targetGroupName)
      return this.awsApi
        .then(api => api.describeTargetGroups({
          Names: [targetGroupName],
          test: (tg) => specificMask.test(tg.TargetGroupArn)
        }))
    })
}

ALB.prototype.describeTargetGroups = function describeTargetGroups (TargetGroupArns) {
  if (!(TargetGroupArns instanceof Array)) {
    TargetGroupArns = [TargetGroupArns]
  }
  return this.awsApi
    .then(api => api.describeTargetGroups({TargetGroupArns}))
}

ALB.prototype.disableCookieStickiness = function disableCookieStickiness (TargetGroupArn) {
  return this.modifyTargetGroupAttributes(TargetGroupArn,
    {
      'stickiness.enabled': 'false'
    }
  )
}

ALB.prototype.enableCookieStickiness = function enableCookieStickiness (TargetGroupArn, duration) {
  return this.modifyTargetGroupAttributes(TargetGroupArn,
    {
      'stickiness.enabled': 'true',
      'stickiness.type': 'lb_cookie',
      'stickiness.lb_cookie.duration_seconds': duration ? duration.toString() : '3600'
    }
  )
}

ALB.prototype.getLoadBalancerArn = function getLoadBalancerArn (loadBalancerName) {
  if (lbArnMask.test(loadBalancerName)) {
    return Promise.resolve(loadBalancerName)
  } else {
    return this.describeLoadBalancer(loadBalancerName)
      .then(lb => lb.LoadBalancerArn)
  }
}

ALB.prototype.getLoadBalancerName = function getLoadBalancerName (loadBalancerArn) {
  var match = lbArnMask.exec(loadBalancerArn)
  if (match) {
    return Promise.resolve(match[5])
  } else {
    return Promise.resolve(loadBalancerArn)
  }
}

ALB.prototype.getTargetGroupArn = function getTargetGroupArn (targetGroupName) {
  if (tgArnMask.test(targetGroupName)) {
    return Promise.resolve(targetGroupName)
  } else {
    var specificMask = tgArnMask.specific(targetGroupName)
    return this.awsApi
      .then(api => api.describeTargetGroups({
        Names: [targetGroupName],
        test: (tg) => specificMask.test(tg.TargetGroupArn)
      }))
      .then(tg => tg.TargetGroupArn)
  }
}

ALB.prototype.getTargetGroupName = function getTargetGroupName (targetGroupArn) {
  var match = tgArnMask.exec(targetGroupArn)
  if (match) {
    return Promise.resolve(match[5])
  } else {
    return Promise.resolve(targetGroupArn)
  }
}

ALB.prototype.listTargets = function listTargets (targetGroupArnOrName) {
  return this.getTargetGroupArn(targetGroupArnOrName)
    .then(TargetGroupArn => {
      return this.awsApi
        .then(api => api.describeTargetHealth({TargetGroupArn}))
    })
}

ALB.prototype.modifyLoadBalancerAttributes = function modifyLoadBalancerAttributes (LoadBalancerArn, Attributes) {
  if (!(Attributes instanceof Array)) {
    Attributes = Object.keys(Attributes).map(Key => ({Key, Value: Attributes[Key]}))
  }

  return this.awsApi
    .then(api => api.modifyLoadBalancerAttributes({LoadBalancerArn, Attributes}))
}

ALB.prototype.modifyTargetGroupAttributes = function modifyTargetGroupAttributes (TargetGroupArn, Attributes) {
  if (!(Attributes instanceof Array)) {
    Attributes = Object.keys(Attributes).map(Key => ({Key, Value: Attributes[Key]}))
  }

  return this.awsApi
    .then(api => api.modifyTargetGroupAttributes({TargetGroupArn, Attributes}))
}

ALB.prototype.removeTags = function removeTags (ResourceArns, TagKeys) {
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
  return this.awsApi
    .then(api => api.removeTags({
      ResourceArns,
      TagKeys
    }))
    .then(() => {
      debug(`Successfully removed Resource Tags`)
    })
}

module.exports = aws.regionCache(ALB)

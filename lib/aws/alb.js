var debug = require('debug')('aws:alb');

var aws = require('./shared');


var lbArnMask = aws.arnMask({type: 'loadbalancer/app'});
var tgArnMask = aws.arnMask({type: 'targetgroup'});


function ALB(region) {
  if (!(this instanceof ALB)) {
    return new ALB(region);
  }

  this.awsApi = aws.api('ELBv2', {region}, {
    createListener: {property: 'Listeners'},
    createLoadBalancer: {property: 'LoadBalancers'},
    createTargetGroup: {property: 'TargetGroups'},
    deleteListener: {},
    deleteLoadBalancer: {},
    deleteTargetGroup: {},
    describeListeners: {property: 'Listeners'},
    describeLoadBalancerAttributes: {},
    describeLoadBalancers: {property: 'LoadBalancers'},
    describeTargetGroupAttributes: {},
    describeTargetGroups: {property: 'TargetGroups'},
    modifyLoadBalancerAttributes: {property: 'Attributes'},
    modifyTargetGroupAttributes: {property: 'Attributes'}
  });
}

ALB.prototype.createListener = function createListener(LoadBalancerArn, TargetGroupArn, CertificateArn) {
  var params = {
    DefaultActions: [
      {
        TargetGroupArn,
        Type: 'forward'
      },
    ],
    LoadBalancerArn,
    Port: CertificateArn ? 443 : 80,
    Protocol: CertificateArn ? 'HTTPS' : 'HTTP'
  };

  if (CertificateArn) {
    params.Certificates = [{CertificateArn}];
  }

  debug(`Creating ALB Listener for [${TargetGroupArn}] on [${LoadBalancerArn}]`);

  return this.awsApi
    .then(api => api.createListener(params))
    .then(listeners => listeners && listeners.shift())
    .then(listener => {
      if (listener) {
        debug(`Successfully created ALB Listener [${listener.ListenerArn}] on Load Balancer [${listener.LoadBalancerArn}]`);
      }
      return listener;
    });
}

ALB.prototype.createLoadBalancer = function createLoadBalancer(Name, Subnets, SecurityGroups, Tags) {
  if (!(Tags instanceof Array)) {
    Tags = Object.keys(Tags).map(Key => ({Key, Value: Tags[Key]}));
  }

  debug(`Creating Load Balancer [${Name}]`);
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
        debug(`Successfully created Load Balancer [${loadBalancer.LoadBalancerArn}]`);
      }
      return loadBalancer;
    });
};

ALB.prototype.createTargetGroup = function createTargetGroup(Name, Port, VpcId) {
  debug(`Creating Target Group [${Name}]`);
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
        debug(`Successfully created Target Group [${targetGroup.TargetGroupArn}]`);
      }
      return targetGroup;
    });
};

ALB.prototype.deleteListener = function deleteListener(ListenerArn) {
  debug(`Deleting Listener [${ListenerArn}]`);
  return this.awsApi
    .then(api => api.deleteListener({ListenerArn}))
    .then(() => {
      debug(`Successfully deleted Listener [${ListenerArn}]`);
    });
};

ALB.prototype.deleteLoadBalancer = function deleteLoadBalancer(loadBalancerNameOrArn) {
  return this.getLoadBalancerArn(loadBalancerNameOrArn)
    .then(LoadBalancerArn => {
      if (LoadBalancerArn) {
        debug(`Deleting Load Balancer [${LoadBalancerArn}]`);
        return this.awsApi
          .then(api => api.deleteLoadBalancer({LoadBalancerArn}))
          .then(() => {
            debug(`Successfully deleted Load Balancer [${LoadBalancerArn}]`);
          });
      } else {
        debug(`Load Balancer [${loadBalancerNameOrArn}] does not exist`);
      }
    });
};

ALB.prototype.deleteTargetGroup = function deleteTargetGroup(targetGroupNameOrArn) {
  return this.getTargetGroupArn(targetGroupNameOrArn)
    .then(TargetGroupArn => {
      if (TargetGroupArn) {
        debug(`Deleting Target Group [${TargetGroupArn}]`);
        return this.awsApi
          .then(api => api.deleteTargetGroup({TargetGroupArn}))
          .then(() => {
            debug(`Successfully deleted Target Group [${TargetGroupArn}]`);
          });
      } else {
        debug(`Target Group [${targetGroupNameOrArn}] does not exist`);
      }
    });
};

ALB.prototype.describeListeners = function describeListeners(loadBalancerNameOrArn) {
  return this.getLoadBalancerArn(loadBalancerNameOrArn)
    .then(LoadBalancerArn => {
      if (LoadBalancerArn) {
        return this.awsApi
          .then(api => api.describeListeners({LoadBalancerArn}));
      }
    });
};

ALB.prototype.describeLoadBalancerAttributes = function describeLoadBalancerAttributes(loadBalancer) {
  return this.awsApi
    .then(api => Promise.all([
      this.describeTargetGroupAttributes({TargetGroupArn: loadBalancer.targetGroupArn}),
      this.describeTargetGroups({TargetGroupArns: [loadBalancer.targetGroupArn]})
        .then(data => data && data.map(tg => tg.LoadBalancerArns.shift()).shift())
        .then(LoadBalancerArn => LoadBalancerArn && this.describeLoadBalancerAttributes({LoadBalancerArn}))
    ]))
    .then(data => {
      if (data) {
        var result = {};
        data.forEach(datum => datum.Attributes.forEach(att => {result[att.Key] = att.Value;}));
        return result;
      }
    });
};

ALB.prototype.getLoadBalancer = function getLoadBalancer(loadBalancerName) {
  var specificMask = lbArnMask.specific(loadBalancerName);
  return this.awsApi
    .then(api => this.describeLoadBalancers({
      Names: [loadBalancerName],
      test: (lb) => specificMask.test(lb.LoadBalancerArn)
    }));
};

ALB.prototype.getLoadBalancerArn = function getLoadBalancerArn(loadBalancerName) {
  if (lbArnMask.test(loadBalancerName)) {
    return Promise.resolve(loadBalancerName);
  } else {
    return this.getLoadBalancer(loadBalancerName)
      .then(lb => lb.LoadBalancerArn);
  }
};

ALB.prototype.getTargetGroupArn = function getTargetGroupArn(targetGroupName) {
  if (tgArnMask.test(targetGroupName)) {
    return Promise.resolve(targetGroupName);
  } else {
    var specificMask = tgArnMask.specific(targetGroupName);
    return this.awsApi
      .then(api => this.describeTargetGroups({
        Names: [targetGroupName],
        test: (tg) => specificMask.test(tg.TargetGroupArn)
      }))
      .then(tg => tg.TargetGroupArn);
  }
};

ALB.prototype.modifyLoadBalancerAttributes = function modifyLoadBalancerAttributes(LoadBalancerArn, Attributes) {
  if (!(Attributes instanceof Array)) {
    Attributes = Object.keys(Attributes).map(Key => ({Key, Value: Attributes[Key]}));
  }

  return this.awsApi
    .then(api => api.modifyLoadBalancerAttributes({LoadBalancerArn, Attributes}));
};

ALB.prototype.modifyTargetGroupAttributes = function modifyTargetGroupAttributes(TargetGroupArn, Attributes) {
  if (!(Attributes instanceof Array)) {
    Attributes = Object.keys(Attributes).map(Key => ({Key, Value: Attributes[Key]}));
  }

  return this.awsApi
    .then(api => api.modifyTargetGroupAttributes({TargetGroupArn, Attributes}));
};

ALB.prototype.status = function status(loadBalancer) {
  return this.describeLoadBalancerAttributes(loadBalancer)
    .then(attributes => ({
      accessLogs: attributes && attributes['access_logs.s3.enabled'] === 'true',
      crossZone: true,
      draining: attributes && attributes['deregistration_delay.timeout_seconds'] === '30',
      ws: true
    }));
};


module.exports = aws.regionCache(ALB);

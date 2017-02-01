var crypto = require('crypto');

var debug = require('debug')('aws:route53');

var aws = require('./shared');


function Route53(region) {
  if (!(this instanceof Route53)) {
    return new Route53(region);
  }

  this.awsApi = aws.api('Route53', {region}, {
    changeResourceRecordSets: {property: 'ChangeInfo'},
    createHostedZone: {property: 'HostedZone'},
    deleteHostedZone: {},
    listHostedZonesByName: {property: 'HostedZones'},
    listResourceRecordSets: {property: 'ResourceRecordSets'}
  });
}

Route53.prototype.createHostedZone = function createHostedZone(domain) {
  return this.getHostedZone(domain)
    .then(hostedZone => {
      if (hostedZone) {
        debug(`Hosted Zone already exists [${hostedZone.Id}]`);
        return hostedZone;
      } else {
        debug(`Creating Hosted Zone [${domain}]`);
        return this.awsApi
          .then(api => api.createHostedZone({
            CallerReference: (new Buffer(crypto.randomBytes(20), 'utf8')).toString('hex'),
            Name: domain
          }))
          .then(hostedZone => {
            debug(`Successfully created Hosted Zone [${hostedZone.Id}]`);
            return this.registerHostedZone(domain)
              .then(() => hostedZone)
          });
      }
    });
};

Route53.prototype.createResourceRecordSet = function createResourceRecordSet(HostedZoneId, Name, Type, loadBalancerOrRecordValues) {
  var ResourceRecordSet = {};

  if (Type === 'A') {
    ResourceRecordSet.AliasTarget = {
      DNSName: loadBalancerOrRecordValues.DNSName,
      EvaluateTargetHealth: false,
      HostedZoneId: loadBalancerOrRecordValues.CanonicalHostedZoneId
    }
  } else {
    ResourceRecordSet.ResourceRecords = loadBalancerOrRecordValues.map(Value => {Value});
  }

  var Changes = [{
    Action: 'CREATE',
    ResourceRecordSet
  }];

  debug(`Creating Resource Record Set [${Name}:${Type}]`);
  return this.awsApi
    .then(api => api.changeResourceRecordSets({
      HostedZoneId,
      ChangeBatch: {Changes}
    }))
    .then(() => {
      debug(`Successfully created Resource Record Set [${Name}:${Type}]`);
    })
    ;
};

Route53.prototype.deleteHostedZone = function deleteHostedZone(domain) {
  return this.deregisterHostedZone(domain)
    .then(() => this.getHostedZone(domain))
    .then(hostedZone => this.deleteHostedZone({Id: hostedZone.Id}))
    ;
};

Route53.prototype.deleteResourceRecordSet = function deleteResourceRecordSet(HostedZoneId, Name, Type) {
  var Changes = [{
    Action: 'DELETE',
    ResourceRecordSet: {
      Name,
      Type
    }
  }];

  debug(`Deleting Resource Record Set [${Name}:${Type}]`);
  return this.awsApi
    .then(api => api.changeResourceRecordSets({
      HostedZoneId,
      ChangeBatch: {Changes}
    }))
    .then(() => {
      debug(`Successfully deleted Resource Record Set [${Name}:${Type}]`);
    })
    ;
};

Route53.prototype.deregisterHostedZone = function deregisterHostedZone(domain) {
  var parentDomain = domain.split('.').slice(1).join('.');

  return this.getHostedZone(parentDomain)
    .then(parentZone => this.deleteResourceRecordSet(parentZone.Id, domain, 'NS'))
    ;
};

Route53.prototype.getHostedZone = function getHostedZone(domain) {
  domain = domain.replace(/\.*$/, '.');

  return this.awsApi
    .then(api => api.listHostedZonesByName({
      DNSName: domain,
      MaxItems: '1',
      test: (zone) => zone.Name.toLowerCase() === domain.toLowerCase()
    }));
};

Route53.prototype.getResourceRecordSet = function getResourceRecordSet(HostedZoneId, StartRecordName, StartRecordType) {
  return this.awsApi
    .then(api => api.listResourceRecordSets({
      HostedZoneId,
      StartRecordName,
      StartRecordType,
      MaxItems: '1',
      test: (recordSet) => recordSet.Name === StartRecordName && recordSet.Type === StartRecordType
    }));
};

Route53.prototype.listResourceRecordSets = function listResourceRecordSets(HostedZoneId) {
  return this.awsApi
    .then(api => api.listResourceRecordSets({HostedZoneId}));
};

Route53.prototype.registerHostedZone = function registerHostedZone(domain) {
  var parentDomain = domain.split('.').slice(1).join('.');

  return Promise.all([
    this.getHostedZone(parentDomain),
    this.getHostedZone(domain)
  ]).then(data => {
    var parentZone = data[0];
    var hostedZone = data[1];

    if (parentZone && hostedZone) {
      return Promise.all([
        this.getResourceRecordSet(parentZone.Id, domain, 'NS'),
        this.getResourceRecordSet(hostedZone.Id, domain, 'NS')
      ]).then(data => {
        var parentRecordSet = data[0];
        var hostedRecordSet = data[1];

        if (hostedRecordSet && !parentRecordSet) {
          debug(`Registering Hosted Zone [${domain}] with parent Zone [${parentDomain}]`);
          return this.createResourceRecordSet(
            parentZone.Id,
            domain,
            'NS',
            hostedRecordSet.ResourceRecords.map(rr => rr.Value)
          ).then(() => {
            debug(`Successfully registered Hosted Zone [${domain}] with parent Zone [${parentDomain}]`);
          });
        } else if (!hostedRecordSet) {
          debug(`Hosted Zone [${domain}] does not contain an NS record`);
        } else if (parentRecordSet) {
          debug(`Domain [${domain}] is already registered with Hosted Zone [${parentZone.Id}]`);
        }
      });
    } else if (parentZone) {
      debug(`Could not find Hosted Zone [${domain}]`);
    } else if (hostedZone) {
      debug(`Could not find parent Hosted Zone [${parentDomain}]`);
    } else {
      debug(`Could not find Hosted Zone [${domain}] or parent Hosted Zone [${parentDomain}]`);
    }
  });
};

Route53.prototype.status = function status(domain, lbPrefix) {
  return this.getHostedZone(domain)
    .then(hostedZone => {
      if (hostedZone) {
        return this.listResourceRecordSets(hostedZone.Id)
          .then(recordSets => {
            if (recordSets) {
              var aliasRegExp = new RegExp(`^(dualstack\.)?${lbPrefix}`);

              var dnsRecords = recordSets.filter(record => ['A', 'CNAME'].indexOf(record.Type) >= 0);

              return dnsRecords
                .filter(record => {
                  return record.Name.indexOf(domain) === 0
                      || record.Name.indexOf(`*.${domain}`) === 0
                      || record.Name.indexOf(`\\052.${domain}`) === 0
                })
                .filter(record => record && record.AliasTarget && record.AliasTarget.DNSName)
                .map(record => record.AliasTarget.DNSName)
                .filter(dnsName => aliasRegExp.test(dnsName))
                .length > 1;
            }
          });
      } else {
        var parentDomain = domain.split('.').slice(1).join('.');
        if (parentDomain) {
          return this.status(parentDomain);
        }
      }
    });
};


module.exports = aws.regionCache(Route53);

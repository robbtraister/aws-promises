'use strict'

const crypto = require('crypto')

const debug = require('debug')('aws-promises:route53')

const { awsify } = require('../utils/awsify')

const route53Promises = awsify('Route53', {
  changeResourceRecordSets: 'ChangeInfo',
  createHostedZone: 'HostedZone',
  deleteHostedZone: null,
  listHostedZonesByName: 'HostedZones',
  listResourceRecordSets: 'ResourceRecordSets'
})

function Route53 (options) {
  const route53 = route53Promises(options)

  return {
    createHostedZone (domain) {
      return this.getHostedZone(domain)
        .then(hostedZone => {
          if (hostedZone) {
            debug(`Hosted Zone already exists [${hostedZone.Id}]`)
            return hostedZone
          } else {
            debug(`Creating Hosted Zone [${domain}]`)
            return route53.createHostedZone({
              CallerReference: (Buffer.from(crypto.randomBytes(20), 'utf8')).toString('hex'),
              Name: domain
            })
              .then(hostedZone => {
                debug(`Successfully created Hosted Zone [${hostedZone.Id}]`)
                return hostedZone
              })
          }
        })
        .then(hostedZone => this.registerHostedZone(domain).then(() => hostedZone))
    },

    createResourceRecordSet (HostedZoneId, Name, Type, loadBalancerOrRecordValues, TTL) {
      const ResourceRecordSet = {
        Name,
        Type
      }

      if (Type === 'A') {
        ResourceRecordSet.AliasTarget = {
          DNSName: loadBalancerOrRecordValues.DNSName,
          EvaluateTargetHealth: false,
          HostedZoneId: loadBalancerOrRecordValues.CanonicalHostedZoneId
        }
      } else {
        ResourceRecordSet.ResourceRecords = loadBalancerOrRecordValues.map(Value => ({Value}))
        ResourceRecordSet.TTL = TTL || 300
      }

      const Changes = [{
        Action: 'CREATE',
        ResourceRecordSet
      }]

      debug(`Creating Resource Record Set [${Name}:${Type}]`)
      return route53.changeResourceRecordSets({
        HostedZoneId,
        ChangeBatch: {Changes}
      })
        .then(() => {
          debug(`Successfully created Resource Record Set [${Name}:${Type}]`)
        })
    },

    deleteHostedZone (domain) {
      return this.getHostedZone(domain)
        .then(hostedZone => hostedZone && route53.deleteHostedZone({Id: hostedZone.Id}))
        .then(() => this.deregisterHostedZone(domain))
    },

    deleteResourceRecordSet (HostedZoneId, Name, Type) {
      const Changes = [{
        Action: 'DELETE',
        ResourceRecordSet: {
          Name,
          Type
        }
      }]

      debug(`Deleting Resource Record Set [${Name}:${Type}]`)
      return route53.changeResourceRecordSets({
        HostedZoneId,
        ChangeBatch: {Changes}
      })
        .then(() => {
          debug(`Successfully deleted Resource Record Set [${Name}:${Type}]`)
        })
    },

    deregisterHostedZone (domain) {
      const parentDomain = domain.split('.').slice(1).join('.')

      return this.getHostedZone(parentDomain)
        .then(parentZone => this.deleteResourceRecordSet(parentZone.Id, domain, 'NS'))
    },

    getHostedZone (domain) {
      domain = domain.replace(/\.*$/, '.')

      return route53.listHostedZonesByName({
        DNSName: domain,
        MaxItems: '1',
        test: (zone) => zone.Name.toLowerCase() === domain.toLowerCase()
      })
    },

    getResourceRecordSet (HostedZoneId, StartRecordName, StartRecordType) {
      const recordNameMask = new RegExp(`^${StartRecordName.replace(/\./g, '\\.')}\\.?$`)
      return route53.listResourceRecordSets({
        HostedZoneId,
        StartRecordName,
        StartRecordType,
        MaxItems: '1',
        test: (recordSet) => (recordSet.Type === StartRecordType && recordNameMask.test(recordSet.Name))
      })
    },

    listHostedZones () {
      debug('Listing Hosted Zones')
      return route53.listHostedZones({})
    },

    listResourceRecordSets (HostedZoneId) {
      debug(`Listing Record Sets for Hosted Zone: ${HostedZoneId}`)
      return route53.listResourceRecordSets({HostedZoneId})
    },

    registerHostedZone (domain) {
      const parentDomain = domain.split('.').slice(1).join('.')

      return Promise.all([
        this.getHostedZone(parentDomain),
        this.getHostedZone(domain)
      ]).then(data => {
        const parentZone = data[0]
        const hostedZone = data[1]

        if (parentZone && hostedZone) {
          return Promise.all([
            this.getResourceRecordSet(parentZone.Id, domain, 'NS'),
            this.getResourceRecordSet(hostedZone.Id, domain, 'NS')
          ]).then(data => {
            const parentRecordSet = data[0]
            const hostedRecordSet = data[1]

            if (hostedRecordSet && !parentRecordSet) {
              debug(`Registering Hosted Zone [${domain}] with parent Zone [${parentDomain}]`)
              return this.createResourceRecordSet(
                parentZone.Id,
                domain,
                'NS',
                hostedRecordSet.ResourceRecords.map(rr => rr.Value)
              ).then(() => {
                debug(`Successfully registered Hosted Zone [${domain}] with parent Zone [${parentDomain}]`)
              })
            } else if (!hostedRecordSet) {
              debug(`Hosted Zone [${domain}] does not contain an NS record`)
            } else if (parentRecordSet) {
              debug(`Domain [${domain}] is already registered with Hosted Zone [${parentZone.Id}]`)
            }
          })
        } else if (parentZone) {
          debug(`Could not find Hosted Zone [${domain}]`)
        } else if (hostedZone) {
          debug(`Could not find parent Hosted Zone [${parentDomain}]`)
        } else {
          debug(`Could not find Hosted Zone [${domain}] or parent Hosted Zone [${parentDomain}]`)
        }
      })
    }
  }
}

module.exports = Route53

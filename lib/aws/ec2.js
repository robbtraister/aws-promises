'use strict'

var { awsify } = require('../utils/awsify')

const ec2Promises = awsify('EC2', {
  describeInstances: 'Reservations'
})

function EC2 (options) {
  const ec2 = ec2Promises(options)

  return {
    describeInstance (instanceIdsOrIpsOrName) {
      return this.describeInstances(instanceIdsOrIpsOrName)
        .then(instances => instances.shift())
    },

    describeInstancesById (InstanceIds) {
      return ec2.describeInstances({ InstanceIds })
    },

    describeInstancesByName (Values) {
      return ec2.describeInstances({ Filters: [{ Name: 'tag:Name', Values }] })
    },

    describeInstancesByPrivateIp (Values) {
      return ec2.describeInstances({ Filters: [{ Name: 'private-ip-address', Values }] })
    },

    describeInstancesByPublicIp (Values) {
      return ec2.describeInstances({ Filters: [{ Name: 'ip-address', Values }] })
    },

    describeInstances (instanceIdsOrIpsOrNames) {
      if (!(instanceIdsOrIpsOrNames instanceof Array)) {
        instanceIdsOrIpsOrNames = [instanceIdsOrIpsOrNames]
      }

      var idMask = /^i-/
      var ipMask = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/

      var ids = instanceIdsOrIpsOrNames.filter(instanceIdsOrIpsOrName => idMask.test(instanceIdsOrIpsOrName))
      var ips = instanceIdsOrIpsOrNames.filter(instanceIdsOrIpsOrName => ipMask.test(instanceIdsOrIpsOrName))
      var names = instanceIdsOrIpsOrNames.filter(instanceIdsOrIpsOrName => {
        return !idMask.test(instanceIdsOrIpsOrName) && !ipMask.test(instanceIdsOrIpsOrName)
      })

      var promises = []

      if (ids.length > 0) {
        promises.push(this.describeInstancesById(ids).catch(() => []))
      }

      if (ips.length > 0) {
        promises.push(
          this.describeInstancesByPrivateIp(ips).catch(() => []),
          this.describeInstancesByPublicIp(ips).catch(() => [])
        )
      }

      if (names.length) {
        promises.push(this.describeInstancesByName(names).catch(() => []))
      }

      return Promise.all(promises)
        .then(reservationsSet => [].concat.apply([], reservationsSet))
        .then(reservations => reservations.map(reservation => reservation.Instances))
        .then(instancesSet => [].concat.apply([], instancesSet))
    }
  }
}

module.exports = EC2

'use strict'

var debug = require('debug')('aws-promises:acm')

var { arnMask, awsify } = require('../utils/awsify')

var certificateArnMask = arnMask({type: 'certificate'})

const acmPromises = awsify('ACM', {
  deleteCertificate: null,
  describeCertificate: 'Certificate',
  listCertificates: 'CertificateSummaryList',
  requestCertificate: 'CertificateArn'
})

function ACM (options) {
  const acm = acmPromises(options)

  return {
    describeCertificate (domainOrCertArn) {
      return this.getCertificateArn(domainOrCertArn)
        .then(CertificateArn =>
          (CertificateArn)
            ? acm.describeCertificate({CertificateArn})
            : null
        )
    },

    deleteCertificate (domainOrCertArn) {
      return this.getCertificateArn(domainOrCertArn)
        .then(CertificateArn => {
          if (CertificateArn) {
            debug(`Deleting Certificate [${CertificateArn}]`)
            return acm.deleteCertificate({CertificateArn})
              .then(() => {
                debug(`Successfully deleted Certificate [${CertificateArn}]`)
              })
          } else {
            debug(`Certificate [${domainOrCertArn}] does not exist`)
          }
        })
    },

    getCertificateArn (domainOrCertArn) {
      if (certificateArnMask.test(domainOrCertArn)) {
        return Promise.resolve(domainOrCertArn)
      } else {
        var domain = domainOrCertArn.toLowerCase()
        return acm.listCertificates({
          test: certificate => (certificate.DomainName.toLowerCase() === domain)
        })
          .then(certificate => certificate && certificate.CertificateArn)
      }
    },

    listCertificates (domain) {
      var result = acm.listCertificates()
      if (domain) {
        domain = domain.toLowerCase()
        result = result
          .then(certificates => certificates.filter(certificate => certificate.DomainName.toLowerCase() === domain))
      }
      return result
    },

    requestCertificate (DomainName, subdomains, ValidationDomain) {
      return this.getCertificateArn(DomainName)
        .then(CertificateArn =>
          (CertificateArn)
            ? this.describeCertificate(CertificateArn)
              .then(Certificate =>
                (subdomains.find(subdomain => Certificate.SubjectAlternativeNames.indexOf(`*.${subdomain}.${DomainName}`) < 0))
                  ? null
                  : Certificate
              )
            : null
        )
        .then(Certificate => {
          if (Certificate) {
            debug(`Certificate already exists [${Certificate.CertificateArn}]`)
            return Certificate
          } else {
            var params = {DomainName}

            if (!(subdomains instanceof Array)) {
              subdomains = subdomains ? [subdomains] : []
            }
            params.SubjectAlternativeNames = subdomains.map(subdomain => `*.${subdomain}.${DomainName}`)
            params.SubjectAlternativeNames.unshift(`*.${DomainName}`)

            if (ValidationDomain) {
              params.DomainValidationOptions = [{
                DomainName,
                ValidationDomain
              }]
            }

            debug(`Creating Certificate [${DomainName}]`)
            return acm.requestCertificate(params)
              .then(CertificateArn => {
                debug(`Successfully created Certificate [${CertificateArn}]`)
                return this.describeCertificate(CertificateArn)
              })
          }
        })
    }
  }
}

module.exports = ACM

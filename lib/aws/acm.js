var debug = require('debug')('aws:acm');

var aws = require('./shared');


var certificateArnMask = aws.arnMask({type: 'certificate'});


function ACM(region) {
  if (!(this instanceof ACM)) {
    return new ACM(region);
  }

  this.awsApi = aws.api('ACM', {region}, {
    deleteCertificate: {},
    describeCertificate: {property: 'Certificate'},
    listCertificates: {property: 'CertificateSummaryList'},
    requestCertificate: {property: 'CertificateArn'}
  });
}

ACM.prototype.describeCertificate = function describeCertificate(domainOrCertArn) {
  return this.getCertificateArn(domainOrCertArn)
    .then(CertificateArn => {
      if (CertificateArn) {
        return this.awsApi
          .then(api => api.describeCertificate({CertificateArn}));
      }
    });
};

ACM.prototype.deleteCertificate = function deleteCertificate(domainOrCertArn) {
  return this.getCertificateArn(domainOrCertArn)
    .then(CertificateArn => {
      if (CertificateArn) {
        debug(`Deleting Certificate [${CertificateArn}]`);
        return this.awsApi
          .then(api => api.deleteCertificate({CertificateArn}))
          .then(() => {
            debug(`Successfully deleted Certificate [${CertificateArn}]`);
          });
      } else {
        debug(`Certificate [${domainOrCertArn}] does not exist`)
      }
    });
};

ACM.prototype.getCertificateArn = function getCertificateArn(domainOrCertArn) {
  if (certificateArnMask.test(domainOrCertArn)) {
    return Promise.resolve(domainOrCertArn);
  } else {
    var domain = domainOrCertArn.toLowerCase();
    return this.awsApi.then(api => api.listCertificates({
      test: certificate => (certificate.DomainName.toLowerCase() === domain)
    }))
      .then(certificate => certificate && certificate.CertificateArn);
  }
};

ACM.prototype.listCertificates = function listCertificates(domain) {
  var result = this.awsApi.then(api => api.listCertificates());
  if (domain) {
    domain = domain.toLowerCase();
    result = result
      .then(certificates => certificates.filter(certificate => certificate.DomainName.toLowerCase() === domain))
  }
  return result;
};

ACM.prototype.requestCertificate = function requestCertificate(DomainName, subdomains, ValidationDomain) {
  return this.getCertificateArn(DomainName)
    .then(CertificateArn => {
      if (CertificateArn) {
        return this.describeCertificate(CertificateArn)
          .then(Certificate => {
            if (subdomains.find(subdomain => Certificate.SubjectAlternativeNames.indexOf(`*.${subdomain}.${DomainName}`) < 0)) {
              return null;
            } else {
              return Certificate;
            }
          });
      }
    })
    .then(Certificate => {
      if (Certificate) {
        debug(`Certificate already exists [${Certificate.CertificateArn}]`);
        return Certificate;
      } else {
        var params = {DomainName};

        if (!(subdomains instanceof Array)) {
          subdomains = subdomains ? [subdomains] : [];
        }
        params.SubjectAlternativeNames = subdomains.map(subdomain => `*.${subdomain}.${DomainName}`);
        params.SubjectAlternativeNames.unshift(`*.${DomainName}`);

        if (ValidationDomain) {
          params.DomainValidationOptions = [{
            DomainName,
            ValidationDomain
          }];
        }

        debug(`Creating Certificate [${DomainName}]`);
        return this.awsApi
          .then(api => api.requestCertificate(params))
          .then(CertificateArn => {
            debug(`Successfully created Certificate [${CertificateArn}]`);
            return this.describeCertificate(CertificateArn);
          });
      }
    });
};


module.exports = aws.regionCache(ACM);

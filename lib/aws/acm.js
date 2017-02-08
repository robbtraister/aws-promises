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
    return this.listCertificates(domainOrCertArn)
      .then(data => data && data.CertificateArn);
  }
};

ACM.prototype.listCertificates = function listCertificates(domain) {
  var options = {};
  if (domain) {
    domain = domain.toLowerCase();
    options.test = (certificate) => certificate.DomainName.toLowerCase() === domain;
  }
  return this.awsApi
    .then(api => api.listCertificates(options));
};

ACM.prototype.requestCertificate = function requestCertificate(DomainName, subdomains, validationDomain) {
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
        var params = {
          DomainName,
          DomainValidationOptions: [{
            DomainName,
            ValidationDomain: validationDomain || DomainName
          }]
        };

        if (!(subdomains instanceof Array)) {
          subdomains = subdomains ? [subdomains] : [];
        }
        params.SubjectAlternativeNames = subdomains.map(subdomain => `*.${subdomain}.${DomainName}`);
        params.SubjectAlternativeNames.shift(`*.${DomainName}`);

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

var debug = require('debug')('aws:cert');

var aws = require('./shared');


var certArnMask = aws.arnMask({type: 'certificate'});


function Cert(region) {
  if (!(this instanceof Cert)) {
    return new Cert(region);
  }

  this.awsApi = aws.api('ACM', {region}, {
    deleteCertificate: {},
    describeCertificate: {property: 'Certificate'},
    listCertificates: {property: 'CertificateSummaryList'},
    requestCertificate: {property: 'CertificateArn'}
  });
}

Cert.prototype.describeCertificate = function describeCertificate(domainOrCertArn) {
  return this.getCertificateArn(domainOrCertArn)
    .then(CertificateArn => {
      if (CertificateArn) {
        return this.awsApi
          .then(api => api.describeCertificate({CertificateArn}));
      }
    });
};

Cert.prototype.deleteCertificate = function deleteCertificate(domainOrCertArn) {
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

Cert.prototype.getCertificateArn = function getCertificateArn(domainOrCertArn) {
  if (certArnMask.test(domainOrCertArn)) {
    return Promise.resolve(domainOrCertArn);
  } else {
    return this.listCertificates(domainOrCertArn)
      .then(data => data && data.CertificateArn);
  }
};

Cert.prototype.listCertificates = function listCertificates(domain) {
  var options = {};
  if (domain) {
    domain = domain.toLowerCase();
    options.test = (cert) => cert.DomainName.toLowerCase() === domain;
  }
  return this.awsApi
    .then(api => api.listCertificates(options));
};

Cert.prototype.requestCertificate = function requestCertificate(DomainName, subdomains, validationDomain) {
  return this.getCertificateArn(DomainName)
    .then(CertificateArn => {
      if (CertificateArn) {
        debug(`Certificate already exists [${CertificateArn}]`);
        return CertificateArn;
      } else {
        var params = {
          DomainName,
          DomainValidationOptions: [{
            DomainName,
            ValidationDomain: validationDomain || DomainName
          }]
        };
        if (subdomains && subdomains.length) {
          params.SubjectAlternativeNames = subdomains.map(subdomain => `${subdomain}.${DomainName}`);
        }
        return this.awsApi
          .then(api => api.requestCertificate(params))
          .then(CertificateArn => {
            if (CertificateArn) {
              debug(`Successfully created Certificate [${CertificateArn}]`);
            }
            return CertificateArn;
          })
      }
    })
    .then(CertificateArn => CertificateArn && this.describeCertificate(CertificateArn));
};

Cert.prototype.status = function status(domainOrCertArn) {
  return this.describeCertificate(domainOrCertArn)
    .then(cert => cert ? cert.Status : 'NONE');
};


module.exports = aws.regionCache(Cert);

var aws = require('./shared');


function KMS(region) {
  if (!(this instanceof KMS)) {
    return new KMS(region);
  }

  this.awsApi = aws.api('KMS', {region}, {
    decrypt: {property: 'Plaintext'},
    encrypt: {property: 'CiphertextBlob'}
  });
}

KMS.prototype.decrypt = function decrypt(CiphertextBuffer) {
  return this.awsApi
    .then(api => api.decrypt({CiphertextBlob: CiphertextBuffer}));
};

KMS.prototype.encrypt = function encrypt(KeyId, Plaintext) {
  return this.awsApi
    .then(api => api.encrypt({KeyId, Plaintext}));
};


module.exports = aws.regionCache(KMS);

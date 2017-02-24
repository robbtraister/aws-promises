var aws = require('./shared');


function IAM(region) {
  if (!(this instanceof IAM)) {
    return new IAM(region);
  }

  this.awsApi = aws.api('IAM', {region}, {
    createAccessKey: {property: 'AccessKey'},
    deleteAccessKey: {},
    listAccessKeys: {property: 'AccessKeyMetadata'},
    updateAccessKey: {}
  });
}

IAM.prototype.activateAccessKey = function activateAccessKey(AccessKeyId) {
  return this.awsApi
    .then(api => api.updateAccessKey({
      AccessKeyId,
      Status: 'Active'
    }));
};

IAM.prototype.createAccessKey = function createAccessKey() {
  return this.awsApi
    .then(api => api.createAccessKey());
};

IAM.prototype.deactivateAccessKey = function deactivateAccessKey(AccessKeyId) {
  return this.awsApi
    .then(api => api.updateAccessKey({
      AccessKeyId,
      Status: 'Inactive'
    }));
};

IAM.prototype.deleteAccessKey = function deleteAccessKey(AccessKeyId) {
  return this.awsApi
    .then(api => api.deleteAccessKey({AccessKeyId}));
};

IAM.prototype.listAccessKeys = function listAccessKeys() {
  return this.awsApi
    .then(api => api.listAccessKeys());
};


module.exports = aws.regionCache(IAM);

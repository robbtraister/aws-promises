var aws = require('./shared');


function S3(region) {
  if (!(this instanceof S3)) {
    return new S3(region);
  }

  this.awsApi = aws.api('S3', {region}, {
    getObject: {},
    listObjectsV2: {property: 'Contents'}
  });
}

S3.prototype.getObject = function getObject(Bucket, Key) {
  return this.awsApi
    .then(api => api.getObject({Bucket, Key}));
};

S3.prototype.listObjects = function listObjects(Bucket, Prefix) {
  var params = {Bucket};
  if (Prefix) {
    params.Prefix = Prefix;
  }

  return this.awsApi
    .then(api => api.listObjectsV2(params));
};


module.exports = aws.regionCache(S3);

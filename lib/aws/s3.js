'use strict'

const debug = require('debug')('aws-promises:s3')

const { awsify } = require('../utils/awsify')

const appendKey = Key => object => {
  object.Key = object.Key || Key
  return object
}

const s3Promises = awsify('S3', {
  deleteObject: null,
  deleteObjects: 'Deleted',
  getObject: 'Body',
  getObjectTagging: 'TagSet',
  headObject: null,
  listObjectsV2: null,
  upload: null
})

function S3 (options) {
  const s3 = s3Promises(options)

  return {
    exists (Bucket, Key) {
      debug('Checking Existence', Bucket, Key)
      return this.headObject(Bucket, Key)
        .then(() => true)
        .catch(err => {
          if (err.code === 'NotFound') {
            return false
          } else {
            throw err
          }
        })
    },

    deleteObject (Bucket, Key) {
      debug(`Deleting Object: ${Bucket} ${Key}`)
      return s3.deleteObject({Bucket, Key})
    },

    deleteObjects (Bucket, Keys) {
      debug(`Deleting ${Keys.length} Objects from: ${Bucket}`)
      return s3.deleteObjects({
        Bucket,
        Delete: {
          Objects: Keys.map(Key => ({Key}))
        }
      })
    },

    getObject (Bucket, Key, VersionId) {
      return this.getObjectBody(Bucket, Key, VersionId)
        .then(d => d.toString())
    },

    getObjectBody (Bucket, Key, VersionId) {
      debug(`Retrieving Object: ${Bucket} ${Key}`)
      const params = { Bucket, Key }
      if (VersionId) {
        params.VersionId = VersionId
      }
      return s3.getObject(params)
    },

    getObjectStream (Bucket, Key, VersionId) {
      debug(`Streaming Object: ${Bucket} ${Key}`)
      const params = { Bucket, Key }
      if (VersionId) {
        params.VersionId = VersionId
      }
      return Promise.resolve(s3.sdk.getObject(params))
    },

    getObjectTags (Bucket, Key) {
      debug(`Retrieving Tags: ${Bucket} ${Key}`)
      return s3.getObjectTagging({Bucket, Key})
        .then(Tags => {
          const map = {}
          Tags.forEach(tag => { map[tag.Key] = tag.Value })
          return map
        })
    },

    headObject (Bucket, Key) {
      debug(`Head Object: ${Bucket} ${Key}`)
      return s3.headObject({Bucket, Key})
        .then(appendKey(Key))
    },

    listDirectories (Bucket, Prefix, options) {
      debug(`Listing Directories: ${Bucket} ${Prefix}`)
      return s3.listObjectsV2(Object.assign({}, options, {Bucket, Prefix: Prefix.replace(/\/*$/, '/'), Delimiter: '/'}))
        .then(data => data.CommonPrefixes)
        .then(prefixes => prefixes.map(prefix => prefix.Prefix))
        .then(prefixes => prefixes.map(prefix => prefix.substr(Prefix.length).replace(/^\/*/, '').replace(/\/*$/, '')))
    },

    listObjects (Bucket, Prefix) {
      debug(`Listing Objects: ${Bucket} ${Prefix}`)
      const params = {Bucket}
      if (Prefix) {
        params.Prefix = Prefix
      }
      return s3.listObjectsV2({Bucket, Prefix})
        .then(data => data.Contents)
    },

    upload (Bucket, Key, Body, options) {
      debug(`Uploading To: ${Bucket} ${Key}`)
      return s3.upload(Object.assign({}, options || {}, {Bucket, Key, Body}))
    }
  }
}

module.exports = S3

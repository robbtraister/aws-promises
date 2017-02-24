var child_process = require('child_process');
var fs = require('fs');

var ini = require('ini');

var aws = require('..');

var promisify = require('../lib/utils/promisify')


var execPromise = promisify(child_process.exec.bind(child_process));
var readFilePromise = promisify(fs.readFile.bind(fs));
var writeFilePromise = promisify(fs.writeFile.bind(fs));


var credsFile = process.env.AWS_CREDENTIAL_PROFILES_FILE || `${process.env.HOME}/.aws/credentials`;
var envDir = `${process.env.HOME}/.env`;


function updateEnvDir() {
  return readFilePromise(credsFile)
    .then(credsBuf => credsBuf.toString())
    .then(credsContent => ini.decode(credsContent))
    .then(profiles => Promise.all(
      Object.keys(profiles)
        .filter(p => p !== 'default')
        .map(p => execPromise(`mkdir -p ${envDir}/${p}`)
          .then(() => Promise.all(
            Object.keys(profiles[p])
              .map(k => writeFilePromise(`${envDir}/${p}/${k.toUpperCase()}`, profiles[p][k]))
          ))
        )
    ))
    .then(() => null)
    ;
}


function rotate(profile, keepOldest) {
  var accessKeysPromise = aws.iam.listAccessKeys();

  var profilesPromise = readFilePromise(credsFile)
    .then(credsBuf => credsBuf.toString())
    .then(credsContent => ini.decode(credsContent));

  var profilePromise = process.env.AWS_PROFILE
    ? Promise.resolve(process.env.AWS_PROFILE)
    : Promise.all([
        accessKeysPromise,
        profilesPromise
      ])
        .then(data => {
          var accessKeyIds = data[0].map((k) => k.AccessKeyId);
          var profiles = data[1];

          return Object.keys(profiles)
            .filter(profile => profile !== 'default')
            .find(profile => accessKeyIds.indexOf(profiles[profile].aws_access_key_id) >= 0);
        });

  var result = Promise.all([
    profilesPromise,
    profilePromise,
    aws.iam.createAccessKey()
  ])
    .then((data) => {
      var profiles = data[0];
      var profile = data[1];
      var accessKey = data[2];

      profiles[profile].aws_access_key_id = accessKey.AccessKeyId;
      profiles[profile].aws_secret_access_key = accessKey.SecretAccessKey;
      return profiles;
    })
    .then(profiles => writeFilePromise(credsFile, ini.encode(profiles)))
    .then(updateEnvDir)
    ;

  if (!keepOldest) {
    result = result
      .then(() => accessKeysPromise)
      .then(keys => keys.sort((a, b) => a.CreateDate - b.CreateDate).shift())
      //.then(oldestKey => aws.iam.deactivateAccessKey(oldestKey.AccessKeyId))
      //.then(oldestKey => aws.iam.deleteAccessKey(oldestKey.AccessKeyId))
      ;
  }

  return result;
}


if (module === require.main) {
  rotate.apply(null, process.argv.slice(2))
    .then(null)
    .catch(console.error);
}

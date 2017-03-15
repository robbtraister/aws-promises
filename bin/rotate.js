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


function rotate(profileName, keepOldest) {
  profileName = profileName || process.env.AWS_PROFILE

  var accessKeysPromise = aws.iam.listAccessKeys();

  var profilesPromise = readFilePromise(credsFile)
    .then(credsBuf => credsBuf.toString())
    .then(credsContent => ini.decode(credsContent));

  var profilePromise = profileName
    ? Promise.resolve(profileName)
    : Promise.all([
        accessKeysPromise,
        profilesPromise
      ])
        .then(data => {
          var accessKeyIds = data.shift().map((k) => k.AccessKeyId);
          var profiles = data.shift();

          return Object.keys(profiles)
            .filter(profileName => profileName !== 'default')
            .find(profileName => accessKeyIds.indexOf(profiles[profileName].aws_access_key_id) >= 0);
        });

  var result = Promise.all([
    profilesPromise,
    profilePromise,
    aws.iam.createAccessKey()
  ])
    .then((data) => {
      var profiles = data.shift();
      var profileName = data.shift();
      var accessKey = data.shift();

      profiles[profileName].aws_access_key_id = accessKey.AccessKeyId;
      profiles[profileName].aws_secret_access_key = accessKey.SecretAccessKey;

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

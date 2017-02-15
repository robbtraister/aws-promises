#!/usr/bin/env node

var fs = require('fs');

var ini = require('ini');

var promisify = require('../lib/utils/promisify')

var credsFile = process.env.AWS_CREDENTIAL_PROFILES_FILE || `${process.env.HOME}/.aws/credentials`;

var readFilePromise = promisify(fs.readFile.bind(fs));
var writeFilePromise = promisify(fs.writeFile.bind(fs));


function setProfile(p) {
  return readFilePromise(credsFile)
    .then(creds => ini.decode(creds.toString()))
    .then(profiles => {
      if (!profiles.hasOwnProperty(p)) {
        throw `profile '${p}' could not be found`;
      }

      var profile = profiles[p];
      Object.keys(profile)
        .forEach((k) => {
          profiles['default'][k] = profile[k];
        });

      return writeFilePromise(credsFile, ini.encode(profiles));
    });
}


if (module === require.main) {
  setProfile(process.argv[2])
    .then(null)
    .catch(console.error);
}

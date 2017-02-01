var tokenize = module.exports = function tokenize(promiseFcn, options) {
  options = options || {};
  var property = options.property;

  return function tokenize(params) {
    params = params || {};
    var test = params.test;
    delete params.test;

    function next(params) {
      return promiseFcn(params)
        .then(data => {
          if (property) {
            var result = data[property] || [];

            if (test) {
              var match = result.find(test);
            }

            if (data.nextToken) {
              return match || next(Object.assign({}, params, {nextToken: data.nextToken}))
                       .then(data => test ? data : result.concat(data));
            } else {
              return test ? match : result;
            }
          } else {
            return data;
          }
        });
    }

    return next(params);
  }
};

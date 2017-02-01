var promisify = module.exports = function promisify(fcn) {
  return function() {
    var args = Array.prototype.slice.call(arguments, 0);
    return new Promise((resolve, reject) => {
      fcn.apply(null, args.concat(function(err){
        if (err) {
          return reject(err);
        }
        resolve.apply(null, Array.prototype.slice.call(arguments, 1));
      }));
    });
  };
};

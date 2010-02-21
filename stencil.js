var Mu = require('./lib/mu');

Mu.templateRoot = '';
Mu.templateExtension = '';

exports.compile = function (filename, callback) {
  Mu.compile(filename, callback);
}

exports.render = function (ctx, compiled, stream, options) {
  compiled(ctx, options)
    .addListener('data', function (chunk) { stream.write(chunk); })
    .addListener('end', function () { stream.close(); });
}

var Mu = require('./lib/mu');

Mu.templateRoot = '';
Mu.templateExtension = '';

exports.compile = function (filename, promise) {
  Mu.compile(filename)
    .addCallback(function (compiled) {
      promise.emit('success', compiled);
    })
    .addErrback(function (e) {
      promise.emit('error', e);
    });
}

exports.render = function (ctx, compiled, stream, options) {
  compiled(ctx, options)
    .addListener('data', function (chunk) { stream.write(chunk); })
    .addListener('end', function () { stream.close(); });
}

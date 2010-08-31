var sys      = require('sys'),
    fs       = require('fs'),
    path     = require('path'),
    parser   = require('./mu/parser'),
    renderer = require('./mu/renderer'),
    Stream   = require('./mu/stream'),
    errors   = require('./mu/errors');

var mu = module.exports = {};

mu.root = process.cwd();
mu.cache = {};

mu.fs = function (filename, callback) {
  fs.readFile(path.join(mu.root, filename), 'utf8', callback);
}

mu.compile = function(filename, callback) {
  var parsed;
  
  mu.fs(filename, function (err, contents) {
    if (err) {
      callback(new Error('file_not_found'));//errors.fileNotFound(mu.root, filename, err)));
    }
    
    parsed = parser.parse(contents);
    mu.cache[filename] = parsed;
    callback(undefined, parsed);
  });
}

mu.compileText = function (name, template, callback) {
  var parsed;
  
  callback = callback || function() { /* noop */ };
  
  if (typeof template === 'undefined') {
    template = name;
    name = undefined;
  }
  
  parsed = parser.parse(template);
  if (name) {
    mu.cache[name] = parsed;
  }
  
  callback(undefined, parsed); // this is to unify the API
  return parsed;
}

mu.render = function (filename, view) {
  var stream;
  
  if (mu.cache[filename]) {
    stream = new Stream();
    process.nextTick(function () {
      renderer.render(mu.cache[filename].tokens, view, mu.cache, stream, function () {
        stream.emit('end');
      });
    });
    return stream;
  } else {
    throw new Error('template_not_in_cache'); //errors.templateNotInCache(filename)));
  }
}

mu.renderText = function (template, view, partials, callback) {
  var name, parsed, tokens;
  
  if (typeof callback === 'undefined') {
    callback = partials;
    partials = {};
  }
  
  partials = shallowCopy(partials);
  partials.__proto__ = mu.cache;
  
  for (name in partials) {
    if (partials.hasOwnProperty(name) && !partials[name].tokens) {
      partials[name] = parser.parse(partials[name]);
    }
  }
  
  parsed = parser.parse(template);
  tokens = parsed.tokens;
  
  renderer.render(tokens, view, partials, callback);
}


/// Private API

function shallowCopy(obj) {
  var o = {};
  
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      o[key] = obj[key];
    }
  }
  
  return o;
}

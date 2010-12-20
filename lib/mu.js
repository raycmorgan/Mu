var sys      = require('sys'),
    fs       = require('fs'),
    path     = require('path'),
    Stream   = require('stream').Stream,
    parser   = require('./mu/parser'),
    renderer = require('./mu/renderer'),
    errors   = require('./mu/errors');

var mu = module.exports = {};

mu.root = process.cwd();
mu.cache = {};

mu.fs = function (filename, callback) {
  filename = filename.indexOf('/') === 0 ? filename : path.join(mu.root, filename);
  fs.readFile(filename, 'utf8', callback);
}

/**
 * Compiles a file. The result will be cached as the filename and can be
 * rendered via that name.
 *
 * @param {String} filename The name of the file to compile. If the filename
 *        starts with a '/', the file is assumed to be absolute, else it is
 *        relative to mu.root.
 * @param {Function(err, Parsed)} callback The function to call when the file has been compiled.
 */
mu.compile = function(filename, callback, unique) {
  var parsed,
      unique = unique || {};
  
  mu.fs(filename, function (err, contents) {
    if (err) {
      callback(new Error('file_not_found'));//errors.fileNotFound(mu.root, filename, err)));
    }
    
    parsed = parser.parse(contents);
    mu.cache[filename] = [parsed, unique];

    var i = 0;
    (function next(err) {
      if (err) {
        return callback(err);
      }

      if (i < parsed.partials.length) {
        mu.compile(parsed.partials[i], next, unique);
        i++;
        
      } else {
        callback(undefined, [parsed, {}]);
      }
    }());
  });
}

/**
 * Compiles a string into the parsed form. If `name` is provided the text
 * will be cached by that name. Alternatively you can pass the return
 * into mu.render.
 *
 * @param {String} name (Optional) The name to cache the parsed form as.
 * @param {String} template The template to parse.
 * @param {Function(err, Parsed)} callback (Optional) An optional callback that
 *        will be called when the text is parsed. This is only to unify the
 *        API with mu.compile.
 *
 * @returns {Parsed} The parsed template unless `callback` is provided.
 */
mu.compileText = function (name, template, callback) {
  var parsed;
  
  if (typeof template === 'undefined') {
    template = name;
    name = undefined;
  }
  
  try {
    parsed = parser.parse(template);
    
    if (name) {
      mu.cache[name] = [parsed, {}];
    }

    if (callback) callback(undefined, parsed); else return parsed;
    
  } catch (err) {
    if (callback) callback(err); else throw err;
  }
}

/**
 * Renders the previously parsed filename or the parsed object.
 *
 * @param {String|Parsed} filenameOrParsed Filename or parsed object to render.
 * @param {Object} view The data to use when renderings.
 *
 * @returns {Stream} The render stream.
 * @throws {Error(template_not_in_cache)} If filename was not found in cache.
 */
mu.render = function (filenameOrParsed, view) {
  var stream,
      parsed = typeof filenameOrParsed === 'object' ?
                  filenameOrParsed :
                  mu.cache[filenameOrParsed];
  
  if (parsed) {
    return beginRender(parsed[0].tokens, view, mu.cache);
  } else {
    throw new Error('template_not_in_cache'); //errors.templateNotInCache(filename)));
  }
}

mu.renderText = function (template, view, partials) {
  var name, parsed, tokens, stream;
  
  partials = partials || {};
  partials = shallowCopy(partials);
  partials.__proto__ = mu.cache;
  
  for (name in partials) {
    if (partials.hasOwnProperty(name) && !partials[name].tokens) {
      partials[name] = parser.parse(partials[name]);
    }
  }
  
  parsed = parser.parse(template);
  tokens = parsed.tokens;
  
  return beginRender(tokens, view, partials);
}


/// Private API

var BUFFER_LENGTH = 1024 * 8;

function beginRender(tokens, view, partials) {
  var stream = new Stream();
  var count = 0;
  
  process.nextTick(function () {
    try {
      renderer.render(tokens, view, partials, stream, function () {
        stream.emit('end');
      });
    } catch (err) {
      stream.emit('error', err);
    }
  });
  
  return stream;
}

function shallowCopy(obj) {
  var o = {};
  
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      o[key] = obj[key];
    }
  }
  
  return o;
}

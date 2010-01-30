var Posix = require('posix'),
    Path = require('path'),
    sys = require('sys');
var Mu = exports;
var baseProto = ({}).__proto__;

Mu.Parser       = require('./mu/parser');
Mu.Compiler     = require('./mu/compiler');
Mu.Preprocessor = require('./mu/preprocessor');

Mu.cache = {};
Mu.templateRoot = './';
Mu.templateExtension = 'mu';

/**
 * Compiles a template into a executable function. This performs a parse check
 * to make sure that the template is well formed.
 * 
 * @example
 * 
 * myTemplate.mu
 * 
 *   Hello {{name}}!
 * 
 * run.js
 * 
 *   var sys = require('sys'),
 *        Mu = require('./lib/mu');
 * 
 *   Mu.compile('myTemplate')
 *     .addCallback(function (compiled) {
 *       compiled({name: 'Jim'}).addListener('data', function (c) { sys.print(c) })
 *     });
 * 
 * Running run.js will produce:
 * 
 *   Hello Jim!
 * 
 * 
 * @param {String} filename The filename of the template to load, parse and
 *        compile. This should not include the templateRoot or extension.
 * @returns {Promise} Returns a promise that will emit when the parse/compile
 *        is completed. Emits the compiled function on success.
 */
Mu.compile = function Mu_compile(filename) {
  var promise = new process.Promise();
  
  Mu.Parser.parse(filename, Mu.templateRoot, Mu.templateExtension)
    .addCallback(function (parsed) {
      var pp = Mu.Preprocessor;

      try {
        var compiled = Mu.Compiler.compile(pp.check(pp.clean(parsed)));
        Mu.cache[filename] = compiled
        promise.emit('success', compiled);
      } catch (e) {
        promise.emit('error', e);
      }
    })
    .addErrback(function () {
      promise.emit('error', 'Error parsing file.');
    });
  
  return promise;
}

/**
 * Shorcut to parse, compile and render a template.
 * 
 * @param {String} filename The filename of the template to load, parse and
 *        compile. This should not include the templateRoot or extension.
 * @param {Object} context The data that should be used when rendering the template.
 * @returns {Promise} Returns a promise that will emit when the parse/compile/rendering
 *        is completed. Emits the final result.
 */
Mu.render = function Mu_render(filename, context, options) {
  var promise = new process.Promise();
  
  if (Mu.cache[filename]) {
    process.nextTick(function () {
      try {
        promise.emit('success', Mu.cache[filename](context, options));
      } catch (e) {
        promise.emit('error', e);
      }
    });
  } else {
    Mu.compile(filename)
      .addCallback(function (compiled) {
        try {
          promise.emit('success', compiled(context, options));
        } catch (e) {
          promise.emit('error', e);
        }
      })
      .addErrback(function (e) {
        promise.emit('error', e);
      });
  }
  
  return promise;
}

/**
 * HTML escapes a string.
 * 
 * @param {String} string The string to escape.
 * @returns {String} The escaped string. 
 */
Mu.escape = function Mu_escape(string) {
  return string.replace(/[&<>"]/g, escapeReplace);
}

/**
 * Normalizes the param by calling it if it is a function, calling .toString
 * or simply returning a blank string.
 * 
 * @param {Object} val The value to normalize.
 * @returns {String} The normalized value. 
 */
Mu.normalize = function Mu_normalize(context, name) {
  var val = context[name];
  
  if (typeof val === 'function') {
    val = val.call(context);
  }
  
  return typeof val === 'undefined' ? '' : val.toString();
}

/**
 * Depending on the val passed into this function, different things happen.
 * 
 * If val is a boolean, fn is called if it is true and the return value is
 * returned.
 * If val is an Array, fn is called once for each element in the array and
 * the strings returned from those calls are collected and returned.
 * Else if val is defined fn is called with the val.
 * Otherwise an empty string is returned.
 * 
 * @param {Object} context The context that fn is called with if the val
 *        is a true boolean.
 * @param {Boolean|Array|Object} val The value that decides what happens.
 * @param {Function} fn The callback.
 */
Mu.enumerable = function Mu_enumerable(context, val, fn) {
  if (typeof(val) === 'function') {
    val = val.call(context);
  }
  
  if (typeof val === 'undefined') {
    return '';
  }
  
  if (typeof val === 'boolean') {
    return val ? fn(context) : '';
  }

  if (val instanceof Array) {
    var result = '';
    for (var i = 0, len = val.length; i < len; i++) {
      var oproto = insertProto(val[i], context);
      result += fn(val[i]);
      oproto.__proto__ = baseProto;
    }
    return result;
  }
  
  if (typeof val === 'object') {
    var oproto = insertProto(val, context);
    var ret = fn(val);
    oproto.__proto__ = baseProto;
    
    return ret;
  }

  return '';
}


// Private

function insertProto(obj, newProto, replaceProto) {
  replaceProto = replaceProto || baseProto;
  var proto = obj.__proto__;
  while (proto !== replaceProto) {
    obj = proto;
    proto = proto.__proto__;
  }
  
  obj.__proto__ = newProto;
  return obj;
}


function escapeReplace(char) {
  switch (char) {
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '&': return '&amp;';
    case '"': return '&quot;';
    default: return char;
  }
}

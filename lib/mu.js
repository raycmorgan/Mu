var fs = require('fs'),
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
 *   Mu.compile('myTemplate', function (compiled) {
 *     compiled({name: 'Jim'}).addListener('data', function (c) { sys.print(c) })
 *   });
 * 
 * Running run.js will produce:
 * 
 *   Hello Jim!
 * 
 * 
 * @param {String} filename The filename of the template to load, parse and
 *        compile. This should not include the templateRoot or extension.
 * @param {Function} callback The callback that will be called on success or error.
 */
Mu.compile = function Mu_compile(filename, callback) {
  Mu.Parser.parse(filename, Mu.templateRoot, Mu.templateExtension, 
    function (err, parsed) {
      if (err) {
        return callback(err);
      }
      
      var pp = Mu.Preprocessor;

      try {
        var compiled = Mu.Compiler.compile(pp.check(pp.clean(parsed)));
        Mu.cache[filename] = compiled
        callback(undefined, compiled);
      } catch (e) {
        callback(e);
      }
    });
}

/**
 * Compiles a template as text instead of a filename. You are responsible for
 * providing your own partials as they will not be expanded via files.
 * 
 * @example
 * 
 * var sys = require('sys');
 * var tmpl = "Hello {{> part}}. What is your {{name}}?";
 * var partials = {part: "World"};
 * var compiled = Mu.compileText(tmpl, partials);
 * compiled({name: 'Jim'}).addListener('data', function (c) { sys.puts(c); });
 * 
 * @param {String} text The main template to compile.
 * @param {Object} partials The partials to expand when encountered. The object
 *        takes the form of {partialName: partialText}
 * @returns {Function} The compiled template.
 */
Mu.compileText = function Mu_compileText(text, partials) {
  var parsed = Mu.Parser.parseText(text, "main");
  var parsedPartials = {};
  
  for (var key in partials) {
    if (partials.hasOwnProperty(key)) {
      parsedPartials[key] = Mu.Parser.parseText(partials[key], key);
    }
  }
  
  var pp = Mu.Preprocessor;
  
  return Mu.Compiler.compile(
    pp.check(
      pp.clean(
        pp.expandPartialsFromMap(parsed, parsedPartials))));
}

/**
 * Shorcut to parse, compile and render a template.
 * 
 * @param {String} filename The filename of the template to load, parse and
 *        compile. This should not include the templateRoot or extension.
 * @param {Object} context The data that should be used when rendering the template.
 * @param {Function} callback The callback that will be called on success or error.
 */
Mu.render = function Mu_render(filename, context, options, callback) {
  if (Mu.cache[filename] && options['cached'] !== false) {
    process.nextTick(function () {
      try {
        callback(undefined, Mu.cache[filename](context, options));
      } catch (e) {
        callback(e);
      }
    });
  } else {
    Mu.compile(filename, function (err, compiled) {
      if (err) {
        return callback(err);
      }
      
      try {
        callback(undefined, compiled(context, options));
      } catch (e) {
        callback(e);
      }
    });
  }
}

Mu.renderText = function Mu_renderText(template, partials, context) {
  return Mu.compileText(template, partials)(context);
}

/**
 * HTML escapes a string.
 * 
 * @param {String} string The string to escape.
 * @returns {String} The escaped string. 
 */
Mu.escape = function Mu_escape(string) {
  if (string.filters) { // async response
    string.filters.push(function (val) {
      return val.replace(/[&<>"]/g, escapeReplace);
    });
    return string;
  } else {
    return string.replace(/[&<>"]/g, escapeReplace);
  }
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
    
    if (typeof val === 'function') {
      var async = {filters: []};
      var newContext = {
        render: function (val) {
          val = typeof val === 'undefined' ? '' : val.toString();
          for (var i = 0, len = async.filters.length; i < len; i++) {
            val = async.filters[i](val);
          }
        }
      };
      newContext.__proto__ = context;
      
      val.call(newContext, '', function (res) { newContext.render(res); });
      
      return async;
    }
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
Mu.enumerable = function Mu_enumerable(context, val, fn, next) {
  if (typeof(val) === 'function') {
    val = val.call(context);
  }
  
  if (typeof val === 'undefined') {
    return next();
  }
  
  if (typeof val === 'boolean') {
    return val ? fn(context, next) : next();
  }

  if (val instanceof Array) {
    var i = 0;
    return (function done() {
      if (i++ < val.length) {
        var oproto = insertProto(val[i-1], context);
        fn(val[i-1], function () {
          oproto.__proto__ = baseProto;
          done();
        });
      } else {
        next();
      }
    }());
  }
  
  if (typeof val === 'object') {
    var oproto = insertProto(val, context);
    
    return fn(val, function () {
      oproto.__proto__ = baseProto;
      next();
    });
  }

  return next();
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

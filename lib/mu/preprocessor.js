var Posix = require('posix'),
    Path  = require('path'),
    sys = require('sys'),
    Mu = require('../mu');

exports.expandPartials = expandPartials;
exports.clean = clean;
exports.check = check;
exports.rebuildLines = rebuildLines;
exports.rebuildSource = rebuildSource;

/**
 * Preprocessor that is responsible for expanding partials in the AST.
 * 
 * @param {Parsed} parsed The parsed source.
 * @param {String} root The root that templates should be searched for from.
 * @param {String} ext The extension that should be added to filenames.
 * @returns {Promise} This will emit success with the new AST.
 */
function expandPartials(parsed, root, ext) {
  var promise = new process.Promise();
  
  process.nextTick(function () {
    var partials = getPartials(parsed);
    
    if (!partials.length) {
      return promise.emit('success', parsed);
    }
    
    var pList = new PromiseList();
    
    partials.forEach(function (partial) {
      pList.addPromise(Mu.Parser.parse(partial, root, ext), partial);
    });
    
    pList.addCallback(function (results) {
      var partials = {};
      
      results.forEach(function (result) {
        if (result.type === 'success') {
          partials[result.passthrough] = result.result;
        }
      });
      
      var res = parsed.map(function (line) {
        var number = line.number;
        var source = line.source;
        var filename = line.filename;
        var tokens = line.tokens;
        
        tokens = tokens.map(function (token) {
          return token.type === 'partial' ?
            {type: 'partial', value: partials[token.value] || []} : token;
        });
        
        return {
          number: number,
          source: source,
          filename: filename,
          tokens: tokens
        };
      });
      
      promise.emit('success', res);
    });
  });
  
  return promise;
}

/**
 * Used to verify that the AST is well formed.
 * 
 * @param {Parsed} parsed The parsed source.
 * @returns {Parsed} The parsed source, untouched.
 * @throws {Error} If the source is not well formed.
 */
function check(parsed) {
  var stack = [];
  var lines = rebuildLines(parsed);
  
  parsed.forEach(function (line) {
    var tokens = line.tokens;
    
    tokens.forEach(function (token) {
      if (token.type === 'start_enumerable') {
        stack.push({name: token.value, line: line});
      }
      
      if (token.type === 'end_enumerable') {
        if (!stack.length) {
          var msg = 'Parse Error: ' + line.filename + ': unexpected enumerable end\n' +
                    '  Line: ' + line.number + ' > ' + line.source.replace('\\n', '') + '\n';
          
          throw new Error(msg);
        }
        
        var last = stack.pop();
        if (last.name !== token.value) {
          var msg = 'Parse Error: ' + line.filename + ': unmatched enumerable block\n' +
                    '  Opening Tag - Line: ' + last.line.number + ' > ' + last.line.source.replace('\\n', '') + '\n' +
                    '  Closing Tag - Line: ' + line.number + ' > ' + line.source.replace('\\n', '') + '\n';
          
          throw new Error(msg);
        }
      }
      
    });
  });
  
  if (stack.length) {
    var last = stack.pop();
    var msg = 'Parse Error: ' + last.line.filename + ': unclosed enumerable open tag\n' +
              '    ' + (last.line.number-1) + ': ' + (lines[last.line.number-2] || '').replace('\\n', '') + '\n' +
              '  > ' + last.line.number + ': ' + last.line.source.replace('\\n', '') + '\n' +
              '    ' + (last.line.number+1) + ': ' + (lines[last.line.number] || '_EOF_').replace('\\n', '') + '\n';
    
    throw new Error(msg);
  }
  
  return parsed;
}

/**
 * Preprocessor used to clean extra, useless, tokens from the AST. The parser
 * does a lazy job at ensuring it is perfectly generated, so this function
 * is used to remedy that.
 * 
 * It does the following:
 *   - Remove whitespace and newline when only a tag exists on a line.
 *   - Remove useless empty string tokens that the parser generates.
 *   - Escapes quotes in string tokens as to not break compiling.
 * 
 * @param {Parsed} parsed The parsed source to clean.
 * @returns {Parsed} The cleaned up parsed source. 
 */
function clean(parsed) {
  return parsed.map(function (line) {
    var number = line.number;
    var source = line.source;
    var filename = line.filename;
    var tokens = line.tokens;
    
    return {
      number: number,
      source: source,
      filename: filename,
      tokens: tokens.map(function (token, i) {
        // Removes the whitespace and the newline if the only thing on this line
        // is whitespace and a non variable tag.
        if (tokens.length === 2
            && i === 0
            && token.type === 'string'
            && token.value.trim() === '\\n'
            && tokens[1].type !== 'variable'
            && tokens[1].type !== 'unescaped'
            && tokens[1].type !== 'partial') {
          return null;
        }
        
        // removes useless empty strings
        if (token.type === 'string' && token.value === '') {
          return null;
        }
        
        // escape quotes
        if (token.type === 'string') {
          return {type: 'string', value: token.value.replace(/"/g, "\\\"")};
        }
        
        return token;
      }).filter(filterFalsy)
    };
  });
}

/**
 * Returns a list of the original source's lines.
 * 
 * @param {Parsed} parsed The parsed source.
 * @returns {Array} The original source lines. 
 */
function rebuildLines(parsed) {
  return parsed.map(function (line) {
    return line.source;
  });
}

/**
 * Returns the source in a string format.
 * 
 * @param {Parsed} parsed The parsed source.
 * @returns {String} The raw source that generated the parse tree. 
 */
function rebuildSource(parsed) {
  return rebuildLines(parsed).join('\n');
}


// Private

/**
 * Used with Array.filter to remove falsy items.
 */
function filterFalsy(item) {
  return item;
}

/**
 * Gets a list of all partial names in the parsed tree.
 * 
 * FIXME: returns duplicates if the name appears multiple times.
 * 
 * @param {Parsed} parsed The parsed source.
 * @returns {Array} List of the partial names found.
 */
function getPartials(parsed) {
  var partials = parsed.map(function (line) {
    return line.tokens.map(function (token) {
      return token.type === 'partial' && typeof(token.value) === 'string' ?
        token.value : null;
    }).filter(filterFalsy);
  }).filter(filterFalsy);
  
  return flatten2D(partials);
}

/**
 * Flattens a two dimensional array.
 * 
 * @param {Array} arr The array of arrays to flatten.
 * @returns {Array} The flattened array.
 */
function flatten2D(arr) {
  return Array.prototype.concat.apply([], arr);
}


function PromiseList() {
  this.promises = [];
  this.iter = 0;
  this.finished = 0;
  this.results = [];
  this.cb = null;
}

PromiseList.prototype = {
  addPromise: function (promise, passthrough) {
    var self = this;
    var i = this.iter++;
    
    this.promises.push(promise);
    promise
      .addCallback(function (result) {
        self.promiseFinished(i, 'success', result, passthrough);
      })
      .addErrback(function (err) {
        self.promiseFinished(i, 'error', err, passthrough);
      });
  },
  
  promiseFinished: function (i, type, result, passthrough) {
    this.results[i] = {
      type: type,
      result: result,
      passthrough: passthrough
    };
    
    if (++this.finished === this.promises.length) {
      this.cb(this.results);
    }
  },
  
  addCallback: function (cb) {
    this.cb = cb;
    return this;
  }
};

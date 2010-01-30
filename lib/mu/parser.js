var Posix = require('posix'),
    Path  = require('path'),
    Mu = require('../mu');

exports.parse = parse;
exports.parseText = parseText;

var otag = '{{';
var ctag = '}}';

function parse(filename, root, ext) {
  var promise = new process.Promise();
  
  Posix.cat(extension(root, filename, ext))
    .addCallback(function (contents) {
      Mu.Preprocessor.expandPartials(parseText(contents, filename), root, ext)
        .addCallback(function (parsed) {
          promise.emit('success', parsed);
        })
        .addErrback(function (e) {
          promise.emit('error', e.stack || "File preprocessing failed");
        });
    })
    .addErrback(function (e) {
      promise.emit('error', e.stack || "File not found");
    });
  
  return promise;
}

function parseText(text, filename) {
  filename = filename || "<raw text>";
  var parsed = text.split('\n').map(function (val, i) {
    return parseLine(i+1, val, filename);
  });
  otag = '{{';
  ctag = '}}';
  return parsed;
}

function parseLine(lineNumber, lineText, filename) {
  if (lineNumber !== 1) {
    lineText = '\\n' + lineText;
  }
  
  return {
    number: lineNumber,
    source: lineText,
    filename: filename,
    tokens: actuallyParseLine(lineText)
  };
}

/**
 * Responsible for actually parsing lines. Converts them into the following
 * token form:
 * 
 * [
 *   {'type': 'string', 'value': 'Hello '},
 *   {'type': 'variable', 'value': 'name'}
 * ]
 * 
 * @param {String} text The source text of the line.
 * @returns {Array} The parsed tokens.
 */
function actuallyParseLine(text) {
  var r_otag;
  var r_ctag;
  var r_uctag;
  var r_sdctag;
  
  setTags(otag, ctag);
  
  var ret = [];
  var buffer = '';
  var letter;
  var i = 0;
  
  var state = 'normal';
  
  function setTags(o, c) {
    otag = o;
    ctag = c;
    
    r_otag   = new RegExp(escapeRegex(otag) + '$');
    r_ctag   = new RegExp(escapeRegex(ctag) + '$');
    r_uctag  = new RegExp('}' + escapeRegex(ctag) + '$');
    r_sdctag = new RegExp('=' + escapeRegex(ctag) + '$');
  }
  
  var stateTagLookup = {
    '#': 'start_enumerable',
    '/': 'end_enumerable',
    '>': 'partial',
    '{': 'unescaped',
    '!': 'comment',
    '=': 'set_delimiter'
  };
  
  while (letter = text.charAt(i++)) {
    buffer += letter;
    
    switch (state) {
    
    case 'normal':
      if (buffer.match(r_otag)) {
        ret.push({
          type: 'string',
          value: buffer.substring(0, buffer.length - otag.length)
        });

        buffer = '';
        state = 'start_tag';
      }
      break;
      
    case 'start_tag':
      if (buffer === ' ') {
        buffer = '';
      } else if (buffer in stateTagLookup) {
        state = stateTagLookup[buffer];
        buffer = '';
      } else if (buffer.match(/[a-zA-Z\$_]/)) {
        state = 'variable';
      }
      break;
      
    case 'variable':
    case 'comment':
    case 'start_enumerable':
    case 'end_enumerable':
    case 'partial':
      if (buffer.match(r_ctag)) {
        ret.push({
          type: state,
          value: buffer.substring(0, buffer.length - ctag.length).trim()
        });
        
        buffer = '';
        state = 'normal';
      }
      break;
    
    case 'unescaped':
      if (buffer.match(r_uctag)) {
        ret.push({
          type: 'unescaped',
          value: buffer.substring(0, buffer.length - (ctag.length + 1)).trim()
        });
        
        buffer = '';
        state = 'normal';
      }
      break;
    
    case 'set_delimiter':
      if (buffer.match(r_sdctag)) {
        var data = buffer.substring(0, buffer.length - (ctag.length + 1)).trim();
        data = data.split(/ +/);
        
        if (data.length === 2) {
          setTags(data[0], data[1]);
        }
        
        buffer = '';
        state = 'normal';
      }
    
    }
  }
  
  if (buffer.length) {
    ret.push({type: 'string', value: buffer});
  }
  
  return ret;
}


// Private

function token(type, value) {
  return {type: type, value: value};
}

function escapeRegex(text) {
  // thank you Simon Willison
  if(!arguments.callee.sRE) {
    var specials = [
      '/', '.', '*', '+', '?', '|',
      '(', ')', '[', ']', '{', '}', '\\'
    ];
    arguments.callee.sRE = new RegExp(
      '(\\' + specials.join('|\\') + ')', 'g'
    );
  }
  
  return text.replace(arguments.callee.sRE, '\\$1');
}

function extension(root, filename, ext) {
  return ext ? Path.join(root, filename + '.' + ext) :
               Path.join(root, filename);
}

var BUFFER_LENGTH = 1024 * 8;

var parser = require('./parser');

exports.render = render;

function render(tokens, context, partials, stream, callback) {
  if (!Array.isArray(context)) {
    context = [context];
  }

  return _render(tokens, context, partials, stream, callback);
}

function _render(tokens, context, partials, stream, callback) {
  if (tokens[0] !== 'multi') {
    throw new Error('Mu - WTF did you give me? I expected mustache tokens.');
  }
  
  var i = 1;
  
  function next() {
    try {
    
      if (stream.paused) {
        stream.once('resumed', function () {
          process.nextTick(next);
        });
        return;
      }
    
      var token = tokens[i++];
    
      if (!token) {
        return callback ? callback() : true;
      }
    
      switch (token[0]) {
      case 'static':
        stream.emit('data', token[2]);
        return next();
    
      case 'mustache':    
        switch (token[1]) {
        case 'utag': // Unescaped Tag
          stream.emit('data', s(normalize(context, token[2])));
          return next();
        
        case 'etag': // Escaped Tag
          stream.emit('data', escape(s(normalize(context, token[2]))));
          return next();
      
        case 'section':
          var res = normalize(context, token[2], token[3]);
          if (res) {
            return section(context, token[2], res, token[4], partials, stream, next);
          } else {
            return next();
          }
        
        case 'inverted_section':
          var res = normalize(context, token[2], token[3]);
          if (!res || res.length === 0) {
            return section(context, token[2], true, token[4], partials, stream, next);
          } else {
            return next();
          }
        
        case 'partial':
          var partial = partials[token[2]];
          // console.log(require('util').inspect(partials));
          if (partial) {
            return render(partial[0].tokens, context, partials, stream, next);
          } else {
            return next();
          }
        }
    
      }
    
    } catch (err) {
      stream.emit('error', err);
      next();
    }
  }
  
  next();
}

function s(val) {
  return typeof val === 'undefined' ? '' : val.toString();
}

function escape(string) {
  return string.replace(/[&<>"]/g, escapeReplace);
}

function normalize(context, name, body) {
  var val = walkToFind(context, name);
  
  if (typeof(val) === 'function') {
    val = val.call(smashContext(context), body);
  }
  
  return val;
}

function walkToFind(context, name) {
  var i = context.length;
  while (i--) {
    if (name in context[i]) {
      return context[i][name];
    }
  }

  return undefined;
}

// TODO: if Proxy, make more efficient
// TODO: cache?
function smashContext(context) {
  var obj = {};

  for (var i = 0; i < context.length; i++) {
    var level = context[i];

    for (var k in level) {
      obj[k] = level[k];
    }
  }

  return obj;
}

function section(context, name, val, tokens, partials, stream, callback) {
  if (val instanceof Array) {
    var i = 0;
    
    (function next() {
      var item = val[i++];
      
      if (item) {
        context.push(item);
        _render(tokens, context, partials, stream, function () {
          context.pop();
          next();
        });
      } else {
        callback();
      }
      
    }());
    
    return;
  }
  
  if (typeof val === 'object') {
    context.push(val);
    _render(tokens, context, partials, stream, function () {
      context.pop();
      callback();
    });
    return;
  }
  
  if (val) {
    return _render(tokens, context, partials, stream, callback);
  }
  
  return callback();
}


//
//
//
function findInContext(context, key) {
  var i = context.length;
  while (i--) {
    if (context[i][key]) {
      return context[i][key];
    }
  }

  return undefined;
}


//
//
//
function escapeReplace(char) {
  switch (char) {
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '&': return '&amp;';
    case '"': return '&quot;';
    default: return char;
  }
}

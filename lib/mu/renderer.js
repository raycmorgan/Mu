var parser = require('./parser'),
    sys    = require('sys'),
    baseProto = ({}).__proto__;

exports.render = render;

function render(tokens, context, partials, stream, callback) {
  if (tokens[0] !== 'multi') {
    throw new Error('WTF did you give me?');
  }
  
  var i = 1;
  
  function next() {
    
    if (stream.paused) {
      stream.on('resume', function () {
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
      stream.write(token[2]);
      return next();
    
    case 'mustache':    
      switch (token[1]) {
      case 'utag': // Unescaped Tag
        stream.write(s(normalize(context, token[2])));
        return next();
        
      case 'etag': // Escaped Tag
        stream.write(escape(s(normalize(context, token[2]))));
        return next();
      
      case 'section':
        if (normalize(context, token[2])) {
          return section(context, token[2], token[3], partials, stream, next);
        } else {
          return next();
        }
        
      case 'inverted_section':
        if (!normalize(context, token[2])) {
          return section(context, token[2], token[3], partials, stream, next);
        } else {
          return next();
        }
        
      case 'partial':
        var partial = partials[token[2]];
        if (partial) {
          return render(partial.tokens, context, partials, stream, next);
        } else {
          return next();
        }
      }
    
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

function normalize(view, name) {
  var val = view[name];
  
  if (typeof(val) === 'function') {
    val = view[name]();
  }
  
  return val;
}

function section(view, name, tokens, partials, stream, callback) {
  var val = normalize(view, name);
  
  if (typeof val === 'boolean') {
    return val ? render(tokens, val, partials, stream, callback) : callback();
  }
  
  if (val instanceof Array) {
    var i = 0;
    
    (function next() {
      // if (stream.paused) {
      //   stream.on('resume', function () {
      //     next();
      //   });
      //   return;
      // }
      
      var item = val[i++];
      
      if (item) {
        var proto = insertProto(item, view);
        render(tokens, item, partials, stream, next);
        proto.__proto__ = baseProto;
      } else {
        callback();
      }
      
    }());
    
    return;
  }
  
  if (typeof val === 'object') {
    var proto = insertProto(val, view);
    render(tokens, val, partials, stream, callback);
    proto.__proto__ = baseProto;
    return;
  }
  
  return callback();
}


//
//
//
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

var sys    = require('sys'),
    Buffer = require('buffer').Buffer;
    baseProto = ({}).__proto__;

exports.run = run;
exports.tokenize = tokenize;

function run(tokens, context, callback) {
  if (tokens[0] !== 'multi') {
    throw new Error('WTF did you give me?');
  }

  var i = 1;

  function next() {
    var token = tokens[i++];

    if (!token) {
      return callback ? callback() : sys.print("\n");
    }

    switch (token[0]) {
    case 'static':
      sys.print(token[2]);
      next();
      break;

    case 'mustache':    
      switch (token[1]) {
      case 'utag': // Unescaped Tag
        sys.print(s(normalize(context, token[2])));
        return next();

      case 'etag': // Escaped Tag
        sys.print(escape(s(normalize(context, token[2]))));
        return next();

      case 'section':
        if (normalize(context, token[2])) {
          return section(context, token[2], token[3], next);
        } else {
          return next();
        }

      case 'inverted_section':
        if (!normalize(context, token[2])) {
          return section(context, token[2], token[3], next);
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

function section(view, name, tokens, callback) {
  var val = normalize(view, name);

  if (typeof val === 'boolean') {
    return val ? run(tokens, val, callback) : callback();
  }

  if (val instanceof Array) {
    var i = 0;

    (function next() {
      var item = val[i++];

      if (item) {
        var proto = insertProto(item, view);
        run(tokens, item, next);
        proto.__proto__ = baseProto;
      } else {
        callback();
      }

    }());

    return;
  }

  if (typeof val === 'object') {
    var proto = insertProto(val, view);
    run(tokens, val, callback);
    proto.__proto__ = baseProto;
    return;
  }

  return callback();
}



//
// Parser
//

function tokenize(template, options) {
  var parser = new Parser(template, options);
  return parser.tokenize();
}

function Parser(template, options) {
  this.template = template;
  this.options  = options || {};
  
  this.sections = [];
  this.tokens   = ['multi'];
  this.buffer   = this.template;
  this.state    = 'static'; // 'static' or 'tag'
  
  this.setTag(['{{', '}}']);
}

Parser.prototype = {
  tokenize: function () {
    while (this.buffer) {
      this.state === 'static' ? this.scanText() : this.scanTag();
    }
    
    if (this.sections.length) {
      throw new Error('Encountered an unclosed section.');
    }
    
    return this.tokens;
  },
  
  setTag: function (tags) {
    this.otag = tags[0] || '{{';
    this.ctag = tags[1] || '}}';
  },
  
  scanText: function () {
    var index = this.buffer.indexOf(this.otag);
    
    if (index === -1) {
      index = this.buffer.length;
    }
    
    var content = this.buffer.substring(0, index);
        buffer  = new Buffer(Buffer.byteLength(content));
    
    if (content !== '') {
      buffer.write(content, 'utf8', 0);
      this.tokens.push(['static', content, buffer]);
    }
    
    this.buffer = this.buffer.substring(index + this.otag.length);
    this.state  = 'tag';
  },
  
  scanTag: function () {
    var ctag    = this.ctag,
        matcher = 
      "^" +
      "\\s*" +                           // Skip any whitespace
                                         
      "(#|\\^|/|=|!|<|>|&|\\{)?" +       // Check for a tag type and capture it
      "\\s*" +                           // Skip any whitespace
      "([^(?:\\}?" + e(ctag) + ")]+)" +  // Capture the text inside of the tag
      "\\s*" +                           // Skip any whitespace
      "\\}?" +                           // Skip balancing '}' if it exists
      e(ctag) +                          // Find the close of the tag
                                         
      "(.*)$"                            // Capture the rest of the string
      ;
    matcher = new RegExp(matcher);
    
    var match = this.buffer.match(matcher);
    
    if (!match) {
      throw new Error('Encountered an unclosed tag: "' + this.otag + this.buffer + '"');
    }
    
    var sigil     = match[1],
        content   = match[2].trim(),
        remainder = match[3];
    
    switch (sigil) {
    case undefined:
      this.tokens.push(['mustache', 'etag', content]);
      break;
      
    case '>':
    case '<':
      this.tokens.push(['mustache', 'partial', content]);
      break;
      
    case '{':
    case '&':
      this.tokens.push(['mustache', 'utag', content]);
      break;
    
    case '!':
      // Ignore comments
      break;
    
    case '=':
      sys.puts("Changing tag: " + content)
      this.setTag(content.split(' '));
      break;
    
    case '#':
    case '^':
      var type = sigil === '#' ? 'section' : 'inverted_section';
          block = ['multi'];
      
      this.tokens.push(['mustache', type, content, block]);
      this.sections.push([content, this.tokens]);
      this.tokens = block;
      break;
    
    case '/':
      var res    = this.sections.pop() || [],
          name   = res[0],
          tokens = res[1];
      
      this.tokens = tokens;
      if (!name) {
        throw new Error('Closing unopened ' + name);
      } else if (name !== content) {
        throw new Error("Unclosed section " + name);
      }
      break;
    }
    
    this.buffer   = remainder;
    this.state    = 'static';
    
  }
}


//
// Used to escape RegExp strings
//
function e(text) {
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


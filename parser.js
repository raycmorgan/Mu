var sys = require('sys');

exports.tokenize = function (template, options) {
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
    if (content !== '') {
      this.tokens.push(['static', content]);
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


(function test () {
  
  var template = 
    //"{{title}}: {{= <% %> }} <% top %> <%= {{ }} %> " +
    "Hello {{!dude}} {{name}} {{{cool}}} " + 
    "{{#day}} {{^foo}}bar {{bar}}{{/foo}} {{/day}}!";
  
  sys.puts(sys.inspect(exports.tokenize(template), false, 10));

}());

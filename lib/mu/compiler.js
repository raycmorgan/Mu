var Posix = require('posix'),
    Path  = require('path'),
    Mu = require('../mu');

exports.compile = compile;
exports.compilePartial = compilePartial;

var startBlock = 'var i = 0;\n' +
                 'var a = [\n';

var endBlock   = '];\n' +
                 'function next() {\n' +
                 '  if (i < a.length) {\n' +
                 '    a[i++]();\n' +
                 '  }\n' +
                 '}\n' +
                 'next();';

var endEnumBlock = '];\n' +
                   'function next() {\n' +
                   '  if (i < a.length) {\n' +
                   '    a[i++]();\n' +
                   '  } else { done(); }\n' +
                   '}\n' +
                   'next();';

function compile(parsed) {
  var M = Mu;
  
  var code =
    '(function COMPILED(context, options) {\n' +
    '  options = options || {};\n' +
    '  var Mu = M;\n' +
    '  var REE = new RenderEventEmitter(options);\n' +
    '  process.nextTick(function () {\n' +
         startBlock +
         compilePartial(parsed) + '\n' +
    '    function () { REE.close(); }\n' +
         endBlock +
    '  });\n' +
    '  return REE;\n' +
    '})';
  
  // require('sys').puts(code);
  
  var func = eval(code);
  
  func.LINES  = Mu.Preprocessor.rebuildLines(parsed);
  func.SOURCE = Mu.Preprocessor.rebuildSource(parsed);
  
  return func;
}

function compilePartial(parsed) {
  
  return parsed.map(function (line) {
    var lineNumber = line.number;
    var tokens = line.tokens;
    
    return tokens.map(function (token) {
      var value = token.value;
      
      switch (token.type) {
      
      case 'string':
        return 'function () { REE.write("' + value + '", next); },';
        
      case 'variable':
        return 'function () { REE.write(Mu.escape(Mu.normalize(context, "' + value + '")), next); },';
      
      case 'unescaped':
        return 'function () { REE.write(Mu.normalize(context, "' + value + '"), next); },';
      
      case 'start_enumerable':
        return 'function () { Mu.enumerable(' +
          'context, context.' + value + ', function enum_' + value + '(context, done) {' + startBlock;
      
      case 'end_enumerable':
        return endEnumBlock + '}, next); },';
        
      case 'partial':
        return compilePartial(value);
      
      }
    }).join('');
  }).join('');
  
  return code;
}


function RenderEventEmitter(options) {
  this.bufferLength = options.bufferLength || 1024;
  this.buffer = '';
  this.paused = false;
  this.next = null;
  this.closed = false;
}
process.inherits(RenderEventEmitter, process.EventEmitter);

process.mixin(RenderEventEmitter.prototype, {
  write: function (chunk, next) {
    if (this.closed) {
      return;
    }
    
    this.buffer += chunk;
    
    this.sendChunk(next);
  },
  
  close: function () {
    this.closed = true;
    if (this.buffer.length > 0) {
      this.emit('data', this.buffer);
    }
    this.emit('eof');
  },
  
  pause: function () {
    if (this.closed) {
      return;
    }
    
    this.paused = true;
  },
  
  resume: function () {
    if (this.paused && !this.closed) {
      this.paused = false;
      this.next();
    }
  },
  
  sendChunk: function (next) {
    if (this.paused) {
      this.next = function () {
        this.sendChunk(next);
      }

      return;
    }

    if (this.buffer.length >= this.bufferLength) {
      var chunk = this.buffer.substring(0, this.bufferLength);
      this.buffer = this.buffer.substring(this.bufferLength);

      this.emit('data', chunk);
    }

    if (this.buffer.length >= this.bufferLength) {
      this.sendChunk(next);
    } else {
      if (this.paused) {
        this.next = next;
      } else {
        next();
      }
    }
  }
});

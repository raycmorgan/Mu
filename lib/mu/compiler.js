var Posix = require('posix'),
    Path  = require('path'),
    Mu = require('../mu');

exports.compile = compile;
exports.compilePartial = compilePartial;

function compile(parsed) {
  var M = Mu;
  
  var code =
    '(function COMPILED(context, options) {\n' +
    '  options = options || {};\n' +
    '  var Mu = M;\n' +
    '  var REE = new RenderEventEmitter(options);\n' +
    '  process.nextTick(function () {\n' +
         compilePartial(parsed) + '\n' +
    '    REE.close();\n' +
    '  });\n' +
    '  return REE;\n' +
    '})';
  
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
        return 'REE.write("' + value + '");';
        
      case 'variable':
        return 'REE.write(Mu.escape(Mu.normalize(context, "' + value + '")));';
      
      case 'unescaped':
        return 'REE.write(Mu.normalize(context, "' + value + '"));';
      
      case 'start_enumerable':
        return 'Mu.enumerable(' +
          'context, context.' + value + ', function enum_' + value + '(context) {';
      
      case 'end_enumerable':
        return '});';
        
      case 'partial':
        return compilePartial(value);
      
      }
    }).join('');
  }).join('');
}


function RenderEventEmitter(options) {
  this.chunkSize = options.chunkSize || 1024;
  this.buffer = '';
  this.paused = false;
  this.closed = false;
  this.emittedEOF = false;
}
process.inherits(RenderEventEmitter, process.EventEmitter);

process.mixin(RenderEventEmitter.prototype, {
  write: function (chunk) {
    if (this.closed) {
      return;
    }
    
    this.buffer += chunk;
    this.emitChunks();
  },
  
  close: function () {
    this.closed = true;
    this.emitChunks();
  },
  
  pause: function () {
    this.paused = true;
  },
  
  resume: function () {
    this.paused = false;
    this.emitChunks();
  },
  
  emitChunks: function () {
    while (this.buffer.length >= this.chunkSize) {
      if (this.paused) {
        return;
      }
      
      var chunk = this.buffer.substring(0, this.chunkSize);
      this.buffer = this.buffer.substring(this.chunkSize);
      
      this.emit('data', chunk);
    }
    
    if (this.closed && !this.paused && this.buffer.length) {
      this.emit('data', this.buffer);
      this.buffer = '';
    }
    
    if (this.closed && !this.emittedEOF && !this.buffer.length) {
      this.emittedEOF = true;
      this.emit('end');
    }
  }
});

var Posix = require('posix'),
    Path  = require('path'),
    Mu = require('../mu');

exports.compile = compile;
exports.compilePartial = compilePartial;

function compile(parsed) {
  var M = Mu;
  
  var code = '(function COMPILED(context) {\n var result = "";\n';
  code += 'var Mu = M;\n';
  code += compilePartial(parsed);
  code += '\n return result;\n})';
  
  var code =
    '(function COMPILED(context) {\n' +
    '  var Mu = M;\n' +
    '  var REE = new RenderEventEmitter();\n' +
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


function RenderEventEmitter() {
  this.buffer = '';
}
process.inherits(RenderEventEmitter, process.EventEmitter);

process.mixin(RenderEventEmitter.prototype, {
  write: function (chunk) {
    this.buffer += chunk;
    if (this.buffer.length >= 1024) {
      this.emit('data', this.buffer);
      this.buffer = '';
    }
  },
  
  close: function () {
    if (this.buffer.length > 0) {
      this.emit('data', this.buffer);
    }
    this.emit('eof');
  }
});

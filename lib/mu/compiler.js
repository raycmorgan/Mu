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
        return 'result += "' + value + '";';
        
      case 'variable':
        return 'result += Mu.escape(Mu.normalize(context, "' + value + '"));';
      
      case 'unescaped':
        return 'result += Mu.normalize(context, "' + value + '");';
      
      case 'start_enumerable':
        return 'result += Mu.enumerable(' +
          'context, context.' + value + ', function enum_' + value + '(context) { var result = "";';
      
      case 'end_enumerable':
        return 'return result; });';
        
      case 'partial':
        return compilePartial(value);
      
      }
    }).join('');
  }).join('');
}
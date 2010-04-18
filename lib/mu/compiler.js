var fs = require('fs'),
    sys = require('sys'),
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
var baseProto = ({}).__proto__;

function compile(parsed) {
  var M = Mu;
  
  var code =
    '(function COMPILED(context, options) {\n' +
    '  options = options || {};\n' +
    '  context = deepClone(context || {})\n' +
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
  
  // sys.debug(code);
  
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
      
      case 'start_inverted_enumerable':
        return 'function () { Mu.enumerable(' +
          'context, !context.' + value + ', function enum_' + value + '(context, done) {' + startBlock;
      
      case 'end_enumerable':
        return endEnumBlock + '}, next); },';
        
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
  this.next = null;
  this.closed = false;
  this.emittedEOF = false;
}
sys.inherits(RenderEventEmitter, process.EventEmitter);

mixin(RenderEventEmitter.prototype, {
  write: function (chunk, next) {
    if (this.closed) {
      return;
    }
    
    if (chunk.filters) { // async response
      this.next = next;
      this.pause();
      var self = this;
      chunk.filters.push(function (val) {
        self.buffer = val;
        self.resume();
      })
    } else {
      if (this.paused) {
        this.buffer += chunk;
        this.next = next;
      } else {
        this.emit('data', chunk);
        next();
      }
    }
  },
  
  close: function () {
    if (!this.paused) {
      this.emit('end');
      this.emittedEOF = true;
    }
    this.closed = true;
  },
  
  pause: function () {
    this.paused = true;
  },
  
  resume: function () {
    if (this.paused) {
      if (this.closed && !this.emittedEOF) {
        this.emit('end', this.buffer);
        this.emittedEOF = true;
        return;
      }
      
      this.paused = false;
      this.emit('data', this.buffer);
      this.buffer = '';
      this.next();
    }
  }
});

// Simple shallow object merge.
function mixin(obj1, obj2) {
  for (var key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      obj1[key] = obj2[key];
    }
  }
}

function deepClone(obj) {
  var newObj = copy(obj);
  var newObjProto = newObj;
  var proto = obj.__proto__;
  
  while (proto != baseProto) {
    newObjProto.__proto__ = copy(proto);
    newObjProto = newObjProto.__proto__;
    proto = proto.__proto__;
  }
  
  return newObj;
}

function copy(obj) {
  var newObj = {};
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) {
      newObj[k] = obj[k];
    }
  }
  return newObj;
}
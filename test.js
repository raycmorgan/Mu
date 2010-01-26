var sys = require('sys'),
    posix = require('posix'),
    assert = require('assert');
var Mu = require('./lib/mu');

Mu.templateRoot = "./examples";

[
  'comments',
  'complex',
  'deep_partial',
  'delimiters',
  'error_not_found',
  'escaped',
  'hash_instead_of_array',
  'partial',
  'recursion_with_same_names',
  'reuse_of_enumerables',
  'simple',
  'two_in_a_row',
  'unescaped',
].forEach(function (name) {
  
  try {
    var js = posix.cat('./examples/' + name + '.js').wait();
    var text = posix.cat('./examples/' + name + '.txt').wait();

    js = eval('(' + js + ')');
    
    var compiled = Mu.compile(name + '.html').wait();
    
    assert.equal(compiled(js), text);
    sys.puts(name + ' passed');
  } catch (e) {
    sys.puts("Error in template: " + name);
    sys.puts(e.stack);
  }
  
});

// (function testCompileFile() {
//   var js = eval('(' + posix.cat('./examples/complex.js').wait() + ')');
//   var text = posix.cat('./examples/complex.txt').wait();
//   
//   var promise = Mu.compile('./examples/complex.html')
//     .addCallback(function (compiled) {
//       assert.equal(compiled(js).replace(/[(\n) ]/g, ''), text.replace(/[(\n) ]/g, ''));
//       sys.puts('testCompileFile passed');
//     })
//     .addErrback(function (e) {
//       throw new Error("testCompileFile failed.");
//     })
// })();
// 
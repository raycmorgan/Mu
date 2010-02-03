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
    
    var buffer = '';
    compiled(js).addListener('data', function (c) { buffer += c; })
                .addListener('end', function () {
                  assert.equal(buffer, text);
                  sys.puts(name + ' passed');
                });
  } catch (e) {
    sys.puts("Error in template: " + name);
    sys.puts(e.stack);
  }
  
});

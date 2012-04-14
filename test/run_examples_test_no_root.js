var assert = require('assert'),
    fs     = require('fs'),
    path   = require('path'),
    mu     = require('../lib/mu');

// This tests if Mu also works without using the mu.root variable, and only supplying absolute paths.

mu.root = '/tmp/nonexistant';

[
  'boolean',
  'carriage_return',
  'comments',
  'complex',
  'deep_partial',
  // 'delimiters',
  'error_not_found',
  'escaped',
  'hash_instead_of_array',
  'inverted',
  'partial',
  'recursion_with_same_names',
  'reuse_of_enumerables',
  'simple',
  'twice',
  'two_in_a_row',
  'unescaped'
].forEach(function (name) {
  var js   = fs.readFileSync(path.join(__dirname, 'examples', name + '.js')).toString(),
      text = fs.readFileSync(path.join(__dirname, 'examples', name + '.txt')).toString();
  
  js = eval('(' + js + ')');
  
  var buffer = '';

  mu.compileAndRender(path.join(__dirname, 'examples', name + '.html'), js)
    .on('data', function (c) { buffer += c.toString(); })
    .on('end', function () {
      console.log("Testing: " + name);
      assert.equal(buffer, text);
      console.log(name + ' passed\n');
    });
});

var assert = require('assert'),
    fs     = require('fs'),
    path   = require('path'),
    mu     = require('../lib/mu');

mu.root = path.join(__dirname, 'examples');

[
 'boolean',
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
  'two_in_a_row',
  'unescaped',
].forEach(function (name) {
  
  var js   = fs.readFileSync(path.join(mu.root, name + '.js')).toString(),
      text = fs.readFileSync(path.join(mu.root, name + '.txt')).toString();

  js = eval('(' + js + ')');
  
  mu.compile(name + '.html', function (err, parsed) {
    if (err) {
      throw err;
    }
    
    var buffer = '';
    
    mu.render(parsed, js)
      .on('data', function (c) { buffer += c.toString(); })
      .on('end', function () {
        assert.equal(buffer, text);
        console.log(name + ' passed');
      })
      //.on('error', function (error) {
      //  console.log('Error: ' + error);
      //});
  });
});

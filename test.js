var sys = require('sys'),
    fs = require('fs'),
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
  'inverted',
  'partial',
  'recursion_with_same_names',
  'reuse_of_enumerables',
  'simple',
  'two_in_a_row',
  'unescaped',
].forEach(function (name) {
  
  try {
    var js = fs.readFileSync('./examples/' + name + '.js');
    var text = fs.readFileSync('./examples/' + name + '.txt');

    js = eval('(' + js + ')');
    
    Mu.compile(name + '.html', function (err, compiled) {
      try {
        var buffer = '';
        compiled(js).addListener('data', function (c) { buffer += c; })
                    .addListener('end', function () {
                      assert.equal(buffer, text);
                      sys.puts(name + ' passed');
                    });
      } catch (e) {
        sys.puts("Error in template (render time): " + name);
        sys.puts(e.stack);
      }
    });
  } catch (e) {
    sys.puts("Error in template (compile time): " + name);
    sys.puts(e.stack);
  }
  
});

(function () {
  
  var buffer = '';
  var tmpl = "Hello {{> part}}";
  var partials = {part: "World"};
  
  var compiled = Mu.compileText(tmpl, partials);
  compiled({}).addListener('data', function (c) { buffer += c; })
              .addListener('end', function () {
                assert.equal(buffer, "Hello World");
                sys.puts('compileText passed');
              });
  
}());

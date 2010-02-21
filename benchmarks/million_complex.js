var sys = require('sys')
    fs = require('fs'),
    Path = require('path');
var Mu = require('../lib/mu');

Mu.templateRoot = '';

var name = Path.join(Path.dirname(__filename), "../examples/complex");
var js = fs.readFileSync(name + '.js');

js = eval('(' + js + ')');

sys.puts(name + '.html');

Mu.compile(name + '.html', function (err, compiled) {
  if (err) {
    throw err;
  }
  
  var buffer = '';
  compiled(js).addListener('data', function (c) { buffer += c; })
              .addListener('end', function () { sys.puts(buffer); });

  var i = 0;
  var d = new Date();

  (function go() {
    if (i++ < 1000000) {
      compiled(js).addListener('end', function () { go(); });
    }
  })();

  process.addListener('exit', function () {
    sys.error("Time taken: " + ((new Date() - d) / 1000) + "secs");
  });
});

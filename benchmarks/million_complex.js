var sys = require('sys')
    posix = require('posix'),
    Path = require('path');
var Mu = require('../lib/mu');

Mu.templateRoot = '';

var name = Path.join(Path.dirname(__filename), "../examples/complex");
var js = posix.cat(name + '.js').wait();

js = eval('(' + js + ')');

sys.puts(name + '.html')

var compiled = Mu.compile(name + '.html').wait();

sys.puts(compiled(js));

var d = new Date();
for (var i = 0; i < 1000000; i++) {
  compiled(js);
}
sys.puts("Time taken: " + ((new Date() - d) / 1000) + "secs");

var sys  = require('sys'),
    path = require('path'),
    fs   = require('fs'),
    Mu   = require('./lib/mu');

Mu.templateRoot = '';

var example = process.argv[2];

if (!example) {
  process.exit(0);
}

var name = path.join(__dirname, "examples/" + example);
var js =  eval('(' + fs.readFileSync(name + '.js') + ')');

Mu.render(name + '.html', js, {}, function (err, out) {
  if (err) {
    throw err;
  }
  
  out.addListener('data', function (data) {
    sys.print(data);
  });
  
  out.addListener('end', function () {
    sys.puts('\n\nDONE');
  });
});

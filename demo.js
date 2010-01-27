var sys = require('sys');
var Mu = require('./lib/mu');

Mu.templateRoot = './examples';

var ctx = {
  name: "Chris",
  value: 10000,
  taxed_value: function() {
    return this.value - (this.value * 0.4);
  },
  in_ca: true
};

Mu.render('simple.html', ctx)
  .addCallback(function (output) {
    var buffer = '';
    
    output.addListener('data', function (c) {buffer += c; })
          .addListener('eof', function () { sys.puts(buffer); });
  })
  .addErrback(function (e) {
    sys.puts(e.stack);
  });

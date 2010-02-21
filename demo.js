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

sys.puts("Outputting examples/simple.html.mu with a chunkSize of 10\n");

Mu.render('simple.html', ctx, {chunkSize: 10}, function (err, output) {
  if (err) {
    throw err;
  }
  
  var buffer = '';
  
  output
    .addListener('data', function (c) {
      sys.print(c); // output chunk
      output.pause(); // pause for demo
      setTimeout(function () { // wait 500ms and resume for demo
        output.resume();
      }, 500);
    })
    .addListener('end', function () { sys.puts("\n\nDONE"); });
});

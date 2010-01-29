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

ctx = {
  header: function() {
    return "Colors";
  },
  item: [
      {name: "red", current: true, url: "#Red"},
      {name: "green", current: false, url: "#Green"},
      {name: "blue", current: false, url: "#Blue"}
  ],
  link: function() {
    return this["current"] !== true;
  },
  list: function() {
    return this.item.length !== 0;
  },
  empty: function() {
    return this.item.length === 0;
  }
}


Mu.render('complex.html', ctx, {bufferLength: 10})
  .addCallback(function (output) {
    var buffer = '';
    
    output.addListener('data', function (c) {
      sys.print(c);
      output.pause();
      setTimeout(function () {
        output.resume();
      }, 500);
    })
    .addListener('eof', function () { sys.puts('\nDone'); });
  })
  .addErrback(function (e) {
    sys.puts(e.stack);
  });

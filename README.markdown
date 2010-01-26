Mu - Mustache template compiler for Node.js
===========================================

Mustache is a simply awesome template language inspired by 
[ctemplate](http://code.google.com/p/google-ctemplate/) and 
[et](http://www.ivan.fomichev.name/2008/05/erlang-template-engine-prototype.html).

Mu is a Mustache based template engine for Node.js. Mu compiles mustache
templates into an extremely fast executable function.


Benchmarks
----------

Rendering examples/complex.html.mu 1 million times yields the following results:

    Ruby Mustache - 112 secs  (benchmarks/rb/complex_view.rb)
               Mu -  24 secs  (benchmarks/million_complex.js)

Tested on a 2.4 GHz Intel Core 2 Duo MacBook Pro


Usage (from demo.js)
--------------------

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
        sys.puts(output);
      })
      .addErrback(function (e) {
        sys.puts(e.stack);
      });

Which yields:

    Hello Chris
    You have just won $10000!
    Well, $6000, after taxes.
    

Mustache Documentation
----------------------

See **Tag Types** section at
[http://github.com/defunkt/mustache/](http://github.com/defunkt/mustache/) 
for more information on supported tags.

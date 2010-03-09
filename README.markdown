Mu - Mustache template compiler for Node.js
===========================================

Mustache is a simply awesome template language inspired by 
[ctemplate](http://code.google.com/p/google-ctemplate/) and 
[et](http://www.ivan.fomichev.name/2008/05/erlang-template-engine-prototype.html).

Mu is a Mustache based template engine for Node.js. Mu compiles mustache
templates into an extremely fast executable function.


What makes Mu cool?
-------------------

* It is very fast
* Supports async parsing/compiling
* Rendering is streamed


Benchmarks
----------

Rendering examples/complex.html.mu 1 million times yields the following results:

    Ruby Mustache - 112 secs  (benchmarks/rb/complex_view.rb)
               Mu -  40 secs  (benchmarks/million_complex.js)

Tested on a 2.4 GHz Intel Core 2 Duo MacBook Pro

Mu sync rendering was benchmarking in at 24 secs, but I felt it was much more
important to stream the rendering. Streaming adds a pretty set overhead of
about 14µs (microseconds) to each template render to setup the event emitter.
It also adds a variable extra amount of time due to the additional function calls.
The million_complex.js caused 2µs per render addition.


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

    Mu.render('simple.html', ctx, {}, function (err, output) {
      if (err) {
        throw err;
      }
      
      var buffer = '';

      output.addListener('data', function (c) {buffer += c; })
            .addListener('end', function () { sys.puts(buffer); });
    });
    

Which yields:

    Hello Chris
    You have just won $10000!
    Well, $6000, after taxes.
    
Using Mu.compileText
--------------------

    var sys = require('sys');
    var Mu = require('./lib/mu');

    var tmpl = "Hello {{> part}}. Your name is: {{name}}!";
    var partials = {part: "World"};
    var compiled = Mu.compileText(tmpl, partials);
    
    compiled({name: "Chris"})
      .addListener('data', function (c) { sys.puts(c) });


Mustache Documentation
----------------------

See **Tag Types** section at
[http://github.com/defunkt/mustache/](http://github.com/defunkt/mustache/) 
for more information on supported tags.

Todo
----

* Better parse time errors. Currently they are decent when partials are not involved
  but break down once partials are involved.
* Implement some compile time optimizations. The big one is predetermining when a
  enumerable actually needs to inherit the full context. Cutting this out can be huge.
* Cleanup the Preprocessor methods. They are a bit unwieldy.  

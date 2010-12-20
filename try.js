var sys = require('sys'),
    mu  = require('./lib/mu');

var template = "ÏHello{{#user}} {{name}}{{/user}}! " + 
               "Hello{{^user}} {{name}}{{/user}}! " + 
               "Names: {{#names}}{{name}} {{/names}} " +
               "{{tag}} - {{{tag}}} " +
               "{{goodness}} {{#admin}}(is admin){{/admin}}" +
               "{{>foo.html}}" + '/\\/\\//';

// TODO: Newlines break things

//var tokens = mu.tokenize(template);
var view = {
             user: {name: "Jim"}, 
             names: [
               {name: 'Jim'},
               {name: 'Ray'},
               {name: 'Frank'}
             ],
             tag:   "<html>",
             goodness: Math.floor(Math.random() * 10),
             admin: function () { return this.goodness > 5; }
            };

var partials = {
  //'foo.html': 'Hello from foo.html.'
}

mu.compileText('foo.html', 'Hello from foo');
mu.compileText('bar.html', template);

// sys.puts(sys.inspect(tokens, false, 10));

//mu.renderText(template, view, partials, function () {});

// mu.render('bar.html', view, function (err, stream) {
//   if (err) {
//     console.log(err)
//   }
//   
//   stream
//     .on('data', function () {})
//     .on('end',  function () {})
//     .on('error', function (err) {});
// });

var numErrors = 0;

var stream = mu.render('bar.html', view)
  .on('data', function (data) { 
    sys.print(data);
    //stream.pause();
    //setTimeout(function () { stream.resume(); }, 50);
  })
  .on('end',  function () { sys.print('\nDONE, Errors: ' + numErrors + '\n'); })
  .on('error', function (err) { numErrors++; });




// mu.render(template, partials, view) # => Stream
// mu.render()

// mu.fs = function (resume) {
//   var file = read file;
//   
//   resume(file);
// }


// mu.render('foo.html', {name: 'Jim'});

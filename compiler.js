var sys = require('sys');

exports.compile = function (tokens) {
  return compile(tokens);
}

function compile(tokens) {
  var compiled = {strings: [], buffers: [], tokens: tokens, }
}

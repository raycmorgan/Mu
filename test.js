var sys    = require('sys'),
    ctag   = '}}',
    
    matcher = 
      "^" +
      "\\s*" +                           // Skip any whitespace
                                         
      "(#|^|/|=|!|<|>|&|\\{)?" +         // Check for a tag type and capture it
      "\\s*" +                           // Skip any whitespace
      "([^(?:\\}?" + e(ctag) + ")]+)" +  // Capture the text inside of the tag
      "\\s*" +                           // Skip any whitespace
      "\\}?" +                           // Skip balancing '}' if it exists
      e(ctag) +                          // Find the close of the tag
                                         
      "(.*)$"                            // Capture the rest of the string
      ;
    
    matcher = new RegExp(matcher);
    
    // balancedMather = new RegExp(
    //   "^" +
    //   "\\s*" +                          // Skip any whitespace
    //   
    //   
    //   '^\\s*(\\{)\\s*([^\\s}]*)\\s*\\}' + e(ctag) + '(.*)$'
    // ),
    
var tests = {
  // " #foo }}} bar #baz.": [" #foo }}} bar #baz.", "#", "foo ", " bar #baz."],
  
  " #foo }} bar #baz.":  ["#", "foo ", " bar #baz."],
  " foo }} bar #baz.":   [undefined, "foo ", " bar #baz."],
  "foo }} bar #baz.":    [undefined, "foo ", " bar #baz."],
  " foo}} bar #baz.":    [undefined, "foo", " bar #baz."],
  "foo}} bar #baz.":     [undefined, "foo", " bar #baz."],
  "foo bar}} bar #baz.": [undefined, "foo bar", " bar #baz."],
  
  "{ foo }}} bar #baz.": ["{", "foo ", " bar #baz."],
  "{foo}}} bar #baz.":   ["{", "foo", " bar #baz."],
  "&foo}} bar #baz.":    ["&", "foo", " bar #baz."],
  
  "foo}}}} bar {{baz}}.":[undefined, "foo", "} bar {{baz}}."],
};


for (var k in tests) {
  assert(k, k.match(matcher), [k].concat(tests[k]));
}

sys.puts('All Tests passed')

function assert(name, val1, val2) {
  if (val1) {
    for (var i = 0; i < val1.length; i++) {
      if (val1[i] != val2[i]) {
        throw new Error('[' + val1.join(',') + '] does not equal: [' + val2.join(',') + ']');
      }
    }
  } else {
    throw new Error("Matching '" + name + "' was null.");
  }
}

//[ #foo }}} bar #baz.,, #foo }, bar #baz.,,,]
//[ #foo }}} bar #baz.,#,foo , bar #baz.]


function e(text) {
  // thank you Simon Willison
  if(!arguments.callee.sRE) {
    var specials = [
      '/', '.', '*', '+', '?', '|',
      '(', ')', '[', ']', '{', '}', '\\'
    ];
    arguments.callee.sRE = new RegExp(
      '(\\' + specials.join('|\\') + ')', 'g'
    );
  }
  
  return text.replace(arguments.callee.sRE, '\\$1');
}

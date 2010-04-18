{
  name: function (async) {
    setTimeout(function () {
      async.resume("Jim");
    }, 250);
    
    return async.pause;
  }
}
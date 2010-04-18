{
  name: function () {
    return function () {
      var self = this;
      
      setTimeout(function () {
        self.render("Jim");
      }, 250);
    };
  }
}
var util = require('util')
  , Stream = require('stream').Stream;



function MuStream() {
  Stream.call(this);
  this.paused = false;
}

util.inherits(MuStream, Stream);
module.exports = MuStream;


MuStream.prototype.pause = function () {
  console.log('pause');
  this.paused = true;
}

MuStream.prototype.resume = function() {
  console.log('resume');
  this.paused = false;
  this.emit('resumed');
};

var EventEmitter = require('events').EventEmitter;

module.exports = Stream;

function Stream() {
  //this.events = {data: [], end: [], resume: [], error: []};
  
  this.paused = false;
  this.closed = false;
  this.buffered = [];
  this.emitter = new EventEmitter();
}

Stream.prototype = {
  addListener: function (eventName, listener) {
    this.emitter.on(eventName, listener);
    return this;
  },
  
  removeListener: function (eventName, listener) {
    this.emitter.removeListener(eventName, listener);
    return this;
  },
  
  removeAllListeners: function (eventName) {
    this.emitter.removeAllListeners(eventName);
    return this;
  },
  
  emit: function (eventName, data) {
    this.emitter.emit(eventName, data);
  },
  
  write: function (data) {
    if (this.closed) return false;
    
    if (this.paused) {
      this.buffered.push(data);
      return false;
    } else {
      this.emit('data', data);
      return true;
    }
  },
  
  pause: function () {
    this.paused = true;
  },
  
  resume: function () {
    var buffer
    
    this.paused = false;
    while (!this.paused && this.buffered.length) {
      buffer = this.buffered.shift();
      this.emit('data', buffer);
    }
    
    if (!this.paused) {
      this.emit('resume');
      this.removeAllListeners('resume');
      
      if (!this.paused) {
        if (this.closed) {
          this.end();
        }

        return true;
      }
    }
    
    return false;
  },
  
  end: function () {
    this.closed = true;
    
    if (this.buffered.length === 0) {
      this.emit('end');
    }
  }
};

Stream.prototype.on = Stream.prototype.addListener;


import debug from 'debug';
import EventEmitter from 'event-emitter';
import allOff from 'event-emitter/all-off';

export default class Channel {
  constructor(name) {
    this.name = name;
    this.requestHandlers = {};
    this.emitter = new EventEmitter();
    this.dbg = debug(`transceiver:channel:${name}`);
  }

  reply() {
    if (arguments[0] && typeof(arguments[0]) === 'object') {
      this.createMultipleHandlers(...arguments);
    } else if (arguments[0] && typeof(arguments[0]) === 'string') {
      this.createHandler(...arguments);
    } else {
      throw new Error('Invalid message name');
    }
    return this;
  }

  createHandler(message, callback, context) {
    this.dbg(`Defining new handler for request '${message}'`);
    if (!callback || typeof(callback) !== 'function') {
      throw new Error('Invalid or missing callback');
    }
    if (this.requestHandlers[message]) {
      this.dbg(`Request '${message}' handler will be overwritten`);
    }
    this.requestHandlers[message] = {
      callback,
      context: context || this
    };
  }

  createMultipleHandlers(handlers, context) {
    for (let key of Object.keys(handlers)) {
      this.createHandler(key, handlers[key], context);
    }
  }

  request() {
    if (arguments[0] && Array.isArray(arguments[0])) {
      return this.requestArray(...arguments);
    } else if (arguments[0] && typeof(arguments[0]) === 'object') {
      return this.requestProps(...arguments);
    } else if (arguments[0] && typeof(arguments[0]) === 'string') {
      return this.callHandler(...arguments);
    } else {
      throw new Error('Invalid message name');
    }
  }

  callHandler(message, ...args) {
    if (this.requestHandlers[message]) {
      this.dbg(`Calling '${message}' request handler`);
      return this.requestHandlers[message].callback.apply(this.requestHandlers[message].context, args);
    }
    this.dbg(`Request '${message}' has no handler`);
  }

  requestArray(requests) {
    if (Array.isArray(requests)) {
      return requests.map(this.callHandler, this);
    } else if (typeof(requests) === 'object') {
      const res = [];
      for (let message of Object.keys(requests)) {
        res.push(this.callHandler(message, ...requests[message]));
      }
      return res;
    } else {
      throw new Error('Invalid parameter: requests must be an array or an object of requests');
    }
  }

  requestProps(requests) {
    const res = {};
    if (Array.isArray(requests)) {
      requests.forEach((message) => {
        res[message] = this.callHandler(message);
      });
    } else if (typeof(requests) === 'object') {
      for (let message of Object.keys(requests)) {
        res[message] = this.callHandler(message, ...requests[message]);
      }
    } else {
      throw new Error('Invalid parameter: requests must be an array or an object of requests');
    }
    return res;
  }

  on() {
    this.emitter.on.apply(this.emitter, arguments);
    return this;
  }

  emit() {
    this.emitter.emit.apply(this.emitter, arguments);
    return this;
  }

  off() {
    this.emitter.off.apply(this.emitter, arguments);
    return this;
  }

  reset() {
    this.dbg(`Resetting channel`);
    this.requestHandlers = {};
    allOff(this.emitter);
    return this;
  }
};

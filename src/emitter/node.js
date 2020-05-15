const EventEmitter = require('events').EventEmitter;
const emitter = new EventEmitter();

module.exports.on = (event, name, worker) => {
	emitter.on(event, worker);
}

module.exports.off = event => {
	emitter.removeAllListeners(event);
}

module.exports.trigger = (event, data) => {
	emitter.emit(event, data);
}
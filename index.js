const Redis = require('ioredis');
const emitter = require('./src/emitter');

module.exports = (name, options = {}) => {
	options = Object.assign({}, options);
	options.keyPrefix = (options.keyPrefix || 'karrier') + ':';

	client = new Redis(options);

	Object.assign(module.exports, emitter(client, name));
}
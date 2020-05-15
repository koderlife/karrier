const node = require('./src/emitter/node');

module.exports = (name, options = {}) => {
	const redis = require('./src/emitter/redis');

	options = Object.assign({}, options);
	options.keyPrefix = (options.keyPrefix || 'karrier') + ':';
	options.lazyConnect = true;

	Object.assign(module.exports, redis(name, options));
}

Object.assign(module.exports, node);

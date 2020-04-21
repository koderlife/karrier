const emitter = require('./src/emitter');

module.exports = (name, options = {}) => {
	options = Object.assign({}, options);
	options.keyPrefix = (options.keyPrefix || 'karrier') + ':';
	options.lazyConnect = true;

	Object.assign(module.exports, emitter(name, options));
}
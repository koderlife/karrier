const redis = require('./src/emitter/redis')

const services = {}

module.exports = async (name, options = {}) => {
	if (!services[name]) {
		options = Object.assign({
			keyPrefix: 'karrier:',
			lazyConnect: true
		}, options)

		services[name] = await redis(name, options)
	}

	return services[name]
}

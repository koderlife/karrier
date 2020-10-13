const services = {}
let emitter

module.exports.init = e => emitter = e

module.exports.service = async service => {
	if (!services[service]) {
		return module.exports[service]
		await emitter.init(service)
	}

	module.exports[service] = emitter

	return emitter
}

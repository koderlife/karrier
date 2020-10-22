const { randomBytes } = require('crypto')

let transport

module.exports.init = async (name, trans) => {
	transport = trans

	await transport.init(name)

	setTimeout(transport.health.bind(transport), 1000)
}

module.exports.listen = (event, task) => {
	transport.listen(event, task)
}

module.exports.forget = (event, task) => {
	transport.forget(event, task)
}

module.exports.trigger = async (event, body) => {
	(await transport.getListeners(event)).forEach(listener => transport.send(transport.buildMessage(listener, 'event', body, event)))
}

module.exports.send = (to, body) => {
	return new Promise(resolve => {
		const message = transport.buildMessage(to, 'message', body)

		transport.once(`reply:${message.id}`, resolve)
		transport.send(message)
	})
}

module.exports.onmessage = cb => {
	transport.onmessage(async (message, response) => {
		const body = await cb(message)
		body && (response.body = body)
	})
}

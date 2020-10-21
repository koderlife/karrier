const { randomBytes } = require('crypto')

const instance = uid()
let service
let transport

function buildMessage(to, type, body, action = null) {
	return {
		to,
		type,
		body,
		action: action || `${type}:${to}`,
		id: uid(),
		from: `${service}:${instance}`,
		created_at: (new Date()).getTime(),
	}
}

function uid() {
	return randomBytes(16).toString('hex')
}

module.exports.init = async (name, trans) => {
	service = name
	transport = trans

	await transport.init(service, instance)

	setInterval(() => {
		transport.health()
	}, 10000)
	transport.health()
}

module.exports.listen = (event, task) => {
	transport.listen(event, task)
}

module.exports.forget = (event, task) => {
	transport.forget(event, task)
}

module.exports.trigger = async (event, body) => {
	(await transport.getListeners(event)).forEach(listener => transport.send(buildMessage(listener, 'event', body, 'event:' + event)))
}

module.exports.send = (to, body) => {
	return new Promise(resolve => {
		const message = buildMessage(to, 'message', body)

		transport.once(`reply:${message.id}`, resolve)
		transport.send(message)
	})
}

module.exports.onmessage = cb => {
	transport.onmessage(async message => {
		let response

		//try {
			response = await cb(message)
		/*} catch(e) {
			console.error(e)
			response = {success: false, error: e.message}
		}*/

		message.type === 'message' && transport.send(buildMessage(message.from, 'reply', response || {success: true}, `reply:${message.id}`))
	})
}
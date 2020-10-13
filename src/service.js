const { randomBytes } = require('crypto')
const EventEmitter = require('events').EventEmitter

function uid() {
	return randomBytes(16).toString('hex')
}

function buildMessage(to, from, type, body) {
	return {
		to,
		from,
		type,
		body,
		id: uid(),
		created_at: (new Date()).getTime(),
	}
}

module.exports = async (name, emitter) => {
	const instance = uid()
	const activity = {processed: 0, failed: 0}
	const events = new EventEmitter()

	await emitter.init(name, instance)

	setInterval(() => {
		emitter.health(name, instance, activity)
	}, 10000)

	emitter.health(name, instance, activity)

	 _execute(subscriber) {
		const data = await emitter.getPending(subscriber)

		if (data) {
			try {
				const message = JSON.parse(data)

				if (events.listenerCount(`${message.type}:${message.to}`)) {
					events.emit(`${message.type}:${message.to}`, message)
					activity.processed++
				} else if (message.type === 'event') {
					emitter.forget(message.to)
				}
			} catch(e) {
				console.error(e)
				emitter.failed(subscriber, data)
				activity.failed++
			}

			emitter.done(subscriber, data)
		}
	}

	return {
		listen: (event, task) => {
			events.on('event:' + event, task)
			emitter.listen(event, name)
		}

	}
}
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

module.exports = class {

	constructor(name, emitter) {
		this.service = name
		this.instance = uid()
		this.activity = {processed: 0, failed: 0}
		this.events = new EventEmitter()
		this.emitter = emitter.init(name, instance)

		setInterval(() => {
			emitter.health(name, instance, activity)
		}, 10000)

		emitter.health(name, instance, activity)
	}

	_buildMessage(to, type, body) {
		return {
			to,
			type,
			body,
			from: `${this.service}:${this.instance}`,
			id: uid(),
			created_at: (new Date()).getTime(),
		}
	}

	async _execute(subscriber) {
		const data = await this.emitter.getPending(subscriber)

		if (data) {
			try {
				const message = JSON.parse(data)

				if (events.listenerCount(`${message.type}:${message.to}`)) {
					events.emit(`${message.type}:${message.to}`, message)
					activity.processed++
				} else if (message.type === 'event') {
					emitter.forget(message.to, this.service)
				}
			} catch(e) {
				console.error(e)
				emitter.failed(subscriber, data)
				activity.failed++
			}

			emitter.done(subscriber, data)
		}
	}

	listen(event, task) {
		this.events.on('event:' + event, task)
		this.emitter.listen(event, name)
	}

	send(to, body, onReply = null) {
		const message = this._buildMessage(to, 'message', body)

		if (onReply !== null) {
			this.events.once(`message:${message.from}:${message.id}`, onReply)
		}

		this.emitter.send(message)

		return message
	}

	reply(message, body) {
		this.send(`${message.from}:${message.id}`, body)
	}
}

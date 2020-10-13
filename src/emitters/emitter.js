const EventEmitter = require('events').EventEmitter
const { randomBytes } = require('crypto')

module.exports = class {

	constructor() {
		this.activity = {processed: 0, failed: 0}
		this.listener = new EventEmitter()
	}

	_addListener() {}
	_health() {}
	async _getPending() {}
	async _failed() {}
	async _done() {}
	_listen() {}
	_forget() {}
	_trigger() {}
	_send() {}

	forget(event, service, task) {
		this.listener.off('event:' + event, task)

		if (!this.listener.listenerCount(`event:${event}`)) {
			this._forget(event, service)
		}
	}

	async trigger(event, body) {
		const message = this._buildMessage(event, 'event', body)
		const listeners = await this._getListeners(event)

		listeners.forEach(async listener => {
			this._trigger(listener, message)
		});

		return message
	}

	send(to, body, onReply = null) {
		const message = this._buildMessage(to, 'message', body)

		if (onReply !== null) {
			this.listener.once(`message:${message.from}:${message.id}`, onReply)
		}

		this._send(message)

		return message
	}

	reply(message, body) {
		this.send(`${message.from}:${message.id}`, body)
	}

	message(cb) {
		this.listener.on(`message:${this.service}`, cb)
		this.listener.on(`message:${this.service}:${this.instance}`, cb)
	}
}

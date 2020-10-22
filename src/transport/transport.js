const { EventEmitter } = require('events')
const { randomBytes } = require('crypto')
const cpu = require('../cpu')

module.exports = class extends EventEmitter {

	_uid() {
		return randomBytes(16).toString('hex')
	}

	async _execute(message) {
		const response = {body: {success: true}}

		try {
			await this.emit(message.listener, message, response)
			this.activity.processed++
		} catch(e) {
			console.error(e)
			this.activity.failed++
			this.failed(message)

			response.body.success = false
			response.body.error = e.message
		}

		this.done(message)

		message.type === 'message' && this.reply(message, response.body)
	}

	async _processPending() {
		const message = await this.getPending()

		if (message) {
			message.type === 'event' && this.forget(message.to)
			await this._execute(message)
		}

		return message
	}

	init(service) {
		this.service = service
		this.instance = this._uid()
		this.activity = {processed: 0, failed: 0}
	}

	buildMessage(to, type, body, listener = null) {
		return {
			to,
			type,
			body,
			listener: `${type}:${listener || to}`,
			id: this._uid(),
			from: `${this.service}:${this.instance}`,
			created_at: Date.now(),
		}
	}

	forget(event, task = null) {
		task && this.off('event:' + event, task)
		!this.listenerCount(`event:${event}`) && this._forget(event)
	}

	async health() {
		await this._health({
			service: this.service,
			instance: this.instance,
			pending: await this.countPending(),
			activity: this.activity,
			uptime: process.uptime(),
			memory: process.memoryUsage().heapUsed / 1024 / 1024,
			cpu: cpu()
		})

		while (await this._processPending());

		setTimeout(this.health.bind(this), 10000)
	}

	listen(event, task) {
		this.on('event:' + event, task)
		this._listen(event)
	}

	onmessage(task) {
		this.on(`message:${this.service}`, task)
		this.on(`message:${this.service}:${this.instance}`, task)
	}

	reply(original, body) {
		this.send(this.buildMessage(original.from, 'reply', body, original.id))
	}
}
const { EventEmitter } = require('events')
const Redis = require('ioredis')

const PENDING = ':pending'
const PROCESSING = ':processing'
const FAILED = ':failed'

module.exports = class extends EventEmitter {

	constructor(options) {
		super()

		this.client = new Redis(Object.assign({
			keyPrefix: 'karrier:',
			lazyConnect: true
		}, options))
	}

	async _processPending() {
		const message = await this.getPending()

		if (message) {
			message.type === 'event' && this.forget(message.to)
			await this._execute(message)
		}

		return message
	}

	async _processMessages(client) {
		client.on('message', async (channel, message) => {
			if (channel.includes(this.instance)) {
				await this._execute(JSON.parse(message))
			} else {
				await this._processPending()
			}
		})
	}

	async _execute(message) {
		try {
			await this.emit(message.action, message)
			this.activity.processed++
		} catch(e) {
			console.error(e)
			this.activity.failed++
			this.failed(message)
		}

		this.done(message)
	}

	async init(service, instance) {
		this.service = service
		this.instance = instance
		this.activity = {processed: 0, failed: 0}
		const client = this.client.duplicate()

		this._processMessages(client)

		await Promise.all([
			client.subscribe(`karrier:${service}`),
			client.subscribe(`karrier:${service}:${instance}`),
		]);
	}

	async health() {
		this.client.pipeline()
			.hmset(`service:${this.service}:${this.instance}:health`, {
				service: this.service,
				instance: this.instance,
				pending: await this.client.llen(`service:${this.service}`),
				activity: JSON.stringify(this.activity),
				uptime: process.uptime(),
				memory: JSON.stringify(process.memoryUsage())
			})
			.expire(`service:${this.service}:${this.instance}:health`, 10)
			.sadd(`service:${this.service}:instances`, this.instance)
			.expire(`service:${this.service}:instances`, 10)
			.exec()

		while (await this._processPending());
	}

	async getPending() {
		return JSON.parse(await this.client.rpoplpush(`service:${this.service}${PENDING}`, `service:${this.service}${PROCESSING}`))
	}

	async failed(message) {
		this.client.lpush(`service:${message.to}${FAILED}`, JSON.stringify(message))
	}

	async done(message) {
		this.client.lrem(`service:${message.to}${PROCESSING}`, -1, JSON.stringify(message))
	}

	listen(event, task) {
		this.on('event:' + event, task)
		this.client.sadd(`event:${event}:listeners`, this.service)
	}

	forget(event, task = null) {
		task && this.off('event:' + event, task)
		!this.listenerCount(`event:${event}`) && this.client.srem(`event:${event}:listeners`, this.service)
	}

	async getListeners(event) {
		return await this.client.smembers(`event:${event}:listeners`)
	}

	send(message) {
		if (message.to.includes(':')) {
			this.client.publish(`karrier:${message.to}`, JSON.stringify(message))
		} else {
			this.client.pipeline()
				.lpush(`service:${message.to}` + PENDING, JSON.stringify(message))
				.publish(`karrier:${message.to}`, `service:${message.to}`)
				.exec()
		}
	}

	onmessage(task) {
		this.on(`message:${this.service}`, task)
		this.on(`message:${this.service}:${this.instance}`, task)
	}
}

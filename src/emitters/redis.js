
const Emitter = require('./emitter')
const Redis = require('ioredis')

module.exports = class extends Emitter {

	PENDING = ':pending'
	PROCESSING = ':processing'
	FAILED = ':failed'

	constructor(options) {
		super()

		this.client = new Redis(Object.assign({
			keyPrefix: 'karrier:',
			lazyConnect: true
		}, options))

	}

	async init(service, instance) {
		super.init(service, instance)

		client.on('message', (channel, message) => {
			if (message.includes(`service:${service}`)) {
				this._execute(message)
			}
		})

		await client.subscribe('karrier:' + service)
	}

	health(service, instance, activity) {
		this.client.pipeline()
			.hmset(`service:${service}:${instance}:health`, {
				service,
				instance,
				activity: JSON.stringify(activity),
				uptime: process.uptime(),
				memory: JSON.stringify(process.memoryUsage())
			})
			.expire(`service:${service}:${instance}:health`, 10)
			.exec()
	}

	async getPending(subscriber) {
		return await this.client.rpoplpush(subscriber + this.PENDING, subscriber + this.PROCESSING)
	}

	async failed(subscriber, message) {
		this.client.lpush(subscriber + this.FAILED, message)
	}

	async done(subscriber, message) {
		this.client.lrem(subscriber + this.PROCESSING, -1, message)
	}

	listen(event, service) {
		this.client.sadd(`event:${event}:listeners`, service)
	}

	forget(event, service) {
		client.srem(`event:${event}:listeners`, service)
	}

	async getListeners(event) {
		return await this.client.smembers(`event:${event}:listeners`)
	}

	_send(service, listener, message) {
		this.client.pipeline()
			.lpush(listener + this.PENDING, JSON.stringify(message))
			.publish('karrier:' + service, listener)
			.exec()
	}

	trigger(service, message) {
		this._send(service, `service:${service}:event:${message.to}`, message)
	}

	send(message) {
		this._send(message.to.split(':')[0], `service:${message.to}`, message)
	}
}

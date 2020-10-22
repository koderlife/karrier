const Redis = require('ioredis')
const Transport = require('./transport')

const PENDING = ':pending'
const PROCESSING = ':processing'
const FAILED = ':failed'

module.exports = class extends Transport {

	constructor(options) {
		super()

		this.client = new Redis(Object.assign({
			keyPrefix: 'karrier:',
			lazyConnect: true
		}, options))
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

	_listen(event) {
		this.client.sadd(`event:${event}:listeners`, this.service)
	}

	_forget(event) {
		this.client.srem(`event:${event}:listeners`, this.service)
	}

	async init(service) {
		super.init(service)

		const client = this.client.duplicate()

		this._processMessages(client)

		await Promise.all([
			client.subscribe(`karrier:${service}`),
			client.subscribe(`karrier:${service}:${this.instance}`),
		]);
	}

	async _health(stats) {
		const now = Math.round(Date.now() / 1000)

		stats.activity = JSON.stringify(stats.activity)

		await this.client.pipeline()
			.hmset(`service:${this.service}:${this.instance}:health`, stats)
			.expire(`service:${this.service}:${this.instance}:health`, 10)
			.zremrangebyscore(`service:${this.service}:instances`, 0, now)
			.zremrangebyscore(`services`, 0, now)
			.zadd(`service:${this.service}:instances`, now + 10, this.instance)
			.zadd(`services`, now + 10, this.service)
			.exec()
	}

	async countPending() {
		return await this.client.llen(`service:${this.service}`)
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
}

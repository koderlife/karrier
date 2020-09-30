const crypto = require('crypto')
const EventEmitter = require('events').EventEmitter
const Redis = require('ioredis')

const PENDING = ':pending'
const PROCESSING = ':processing'
const FAILED = ':failed'

const emitter = new EventEmitter();

let activity = {processed: 0, failed: 0}
let client
let instance
let service

function uid() {
	return crypto.randomBytes(16).toString('hex');
}

async function health() {
	client
		.pipeline()
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

async function execute(subscriber) {
	const data = await client.rpoplpush(subscriber + PENDING, subscriber +  PROCESSING)

	if (data) {
		try {
			const message = JSON.parse(data)

			await emitter.emit(`${message.type}:${message.to}`, message)
			activity.processed++
		} catch(e) {
			console.error(e)
			client.lpush(subscriber + FAILED, data)
			activity.failed++
		}

		await client.lrem(subscriber + PROCESSING, -1, data)
	}
}

async function trigger(event, body) {
	const message = JSON.stringify({
		id: uid(),
		from: service,
		to: event,
		type: 'event',
		created_at: (new Date()).getTime(),
		body
	})

	const listeners = await client.smembers(`event:${event}:listeners`)
	const pipeline = client.pipeline()

	listeners.forEach(async listener => {
		if (emitter.listenerCount(`event:${event}`)) {
			pipeline.lpush(listener + PENDING, message)
			pipeline.publish('karrier', listener)
		} else {
			client.srem(`event:${event}:listeners`, listener)
		}
	});

	pipeline.exec()

	return message
}

async function listen(event, job) {
	await client.sadd(`event:${event}:listeners`, `service:${service}:event:${event}`)
	emitter.on('event:' + event, job)
}

async function forget(event, job) {
	emitter.off('event:' + event, job)
}

module.exports = async (name, options) => {
	service = name
	instance = uid()
	client = new Redis(options)

	setInterval(health, 10000)
	health()

	const listener = client.duplicate()

	listener.on('message', async (channel, message) => {
		if (message.includes(`service:${service}`)) {
			execute(message)
		}
	})

	await listener.subscribe('karrier')

	return {
		listen,
		forget,
		trigger
	}
}

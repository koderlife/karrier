const crypto = require('crypto')
const Redis = require('ioredis')

const PENDING = ':pending'
const PROCESSING = ':processing'
const FAILED = ':failed'
const workers = {}

let client
let service
let subscribed = false

async function execute(subscriber) {
	if (workers[subscriber]) {
		const data = await client.rpoplpush(subscriber + PENDING, subscriber +  PROCESSING)

		try {
			const message = JSON.parse(data)
			await workers[subscriber](message.payload, message)
		} catch(e) {
			console.error(e)
			await client.lpush(subscriber + FAILED, payload)
		}

		await client.lrem(subscriber + PROCESSING, -1, payload)
	}
}

async function processPending(subscriber) {
	const llen = await client.llen(subscriber +  PENDING)

	for (let i = 0; i < llen; i++) {
		execute(subscriber)
	}
}

async function subscribe() {
	if (!subscribed) {
		subscribed = true
		const subscriber = client.duplicate()

		subscriber.on('message', async (channel, message) => {
			await Promise.all(Object.keys(workers).map(subscriber => execute(subscriber)))
		})

		subscriber.subscribe('karrier:event')
	}
}

async function trigger(event, payload) {
	const id = crypto.randomBytes(20).toString('hex')
	payload = JSON.stringify({
		id,
		created_at: (new Date().getTime()),
		payload: payload
	})

	const subscribers = await client.smembers(`subscribers:${event}`)

	await client.pipeline(subscribers.map(subscriber => ['lpush', `${subscriber}:pending`, payload])).exec()
	await client.publish('karrier:event', event)

	return id
}

async function on(event, name, job) {
	const subscriber = `${service}:${event}:${name}`

	workers[subscriber] = job

	await Promise.all([
		client.sadd(`subscribers:${event}`, subscriber),
		subscribe(),
		processPending(subscriber)
	])
}

async function off(event, name) {
	const subscriber = `${service}:${event}:${name}`

	delete workers[subscriber]

	await client.pipeline()
		.srem(`subscribers:${event}`, subscriber)
		.del(subscriber + PENDING)
		.exec()
}

module.exports = (name, options) => {
	client = new Redis(options)
	service = name

	return {
		on,
		off,
		trigger
	}
}
const crypto = require('crypto')
const util = require('util')
const EventEmitter = require('events').EventEmitter;
const Redis = require('ioredis')

const PENDING = ':pending'
const PROCESSING = ':processing'
const FAILED = ':failed'

const emitter = new EventEmitter();

let client
let service

function uid() {
	return crypto.randomBytes(16).toString('hex');
}

async function execute(subscriber) {
	const data = await client.rpoplpush(subscriber + PENDING, subscriber +  PROCESSING)

	if (data) {
		try {
			const message = JSON.parse(data)
			await emitter.emit(`${message.type}:${message.to}`, message)

			client.hincrby(`${service}:health`, 'processed', 1)
		} catch(e) {
			console.error(e)
			await client.lpush(subscriber + FAILED, data)
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

	client.smembers('services').then(async members => {
		members.forEach(service => {
			await client.lpush(`${service}:event:${event}` + PENDING, message)
			await client.publish('karrier', `${service}:event:${event}`)
		});
	});

	return message
}

async function listen(event, job) {
	emitter.on('event:' + event, job);
}

async function forget(event, job) {
	emitter.off('event:' + event, job)
}

module.exports = async (name, options) => {
	service = name
	client = new Redis(options)

	await client.sadd('services', service)
	client.hset(`${service}:health`, 'processed', 0)

	setInterval(() => {
		client.hmset(`${service}:health`, {
			service,
			instance,
			uptime: process.uptime(),
			memory: util.inspect(process.memoryUsage())
		})
	}, 10000);

	const listener = client.duplicate()

	listener.on('message', async (channel, message) => {
		const parts = message.split(':')

		if (parts[0] === service) {
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

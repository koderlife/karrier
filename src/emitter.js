const worker = require('./worker');

let client;

async function execute(event) {
	const subscribers = await client.smembers(`${event}:subscribers`);

	await Promise.all(subscribers.map(subscriber => worker.execute(client, subscriber)));
}

async function recover(subscriber) {
	const llen = await client.llen(`${subscriber}:pending`);
	const tasks = [];

	for (let i = 0; i < llen; i++) {
		tasks.push(worker.execute(client, subscriber));
	}

	await Promise.all(tasks);
}

async function trigger(event, payload) {
	if (typeof payload === 'object') {
		payload = JSON.stringify(payload);
	}

	const subscribers = await client.smembers(`${event}:subscribers`);

	await Promise.all(subscribers.map(async subscriber => await client.lpush(`${subscriber}:pending`, payload)));
	await client.publish('karrier:event', event);
}

async function on(event, name, job) {
	const subscriber = `${event}:${name}`;

	worker.add(subscriber, job);

	await Promise.all([
		client.sadd(`${event}:subscribers`, subscriber),
		recover(subscriber)
	]);
}

async function off(event, name) {
	const subscriber = `${event}:${name}`;

	worker.delete(subscriber);

	await Promise.all([
		client.sadd(`${event}:subscribers`, subscriber),
		client.del(`${subscriber}:pending`)
	]);
}

module.exports = redis => {
	client = redis;

	return {
		on,
		off,
		execute,
		trigger
	}
}
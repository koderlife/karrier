const Redis = require('ioredis');
const emitter = require('./src/emitter');

module.exports = (name, options = {}) => {
	options = Object.assign({}, options);
	options.keyPrefix = (options.keyPrefix || 'karrier') + `:${name}:`;

	client = new Redis(options);
	const events = emitter(client);

	const subscriber = new Redis(options);

	subscriber.on('message', async (channel, message) => {
		await events.execute(message);
	});

	subscriber.subscribe('karrier:event');

	process.on('exit', () => {
		client.disconnect();
		subscriber.disconnect();
	});

	Object.assign(module.exports, events);
}
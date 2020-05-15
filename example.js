const karrier = require('./');
const { promisify } = require('util');

const sleep = promisify(setTimeout);

karrier('example');

karrier.on('foo', 'log', async function(data) {
	await sleep(data.sleep)

	console.log(data.msg);
});

karrier.trigger('foo', {msg: 'hello', sleep: 1000});
karrier.trigger('foo', {msg: 'world', sleep: 3000});

const karrier = require('./');
const { promisify } = require('util');

const sleep = promisify(setTimeout);

karrier('example_application');

karrier.on('foo', 'log', async data => {
	await sleep(data.sleep)

	console.log(data.msg);
});


karrier.trigger('foo', {msg: 'world', sleep: 3000});
karrier.trigger('foo', {msg: 'hello', sleep: 1000});
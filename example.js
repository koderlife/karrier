const karrier = require('./')
const { promisify } = require('util')

const sleep = promisify(setTimeout)

karrier('example', {
	port: 6379,
	host: "localhost",
	db: 0
}).then(async service => {
	await service.listen('foo', async function(data) {
		await sleep(data.body.sleep)

		console.log(data.body)
	})

	service.trigger('foo', {msg: 'hello', sleep: 1000})
	service.trigger('foo', {msg: 'world', sleep: 3000})
})

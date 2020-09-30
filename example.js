const karrier = require('./')
const { promisify } = require('util')

const sleep = promisify(setTimeout)

karrier('example', {
	port: 6379,
	host: "localhost",
	db: 0
}).then(service => {
	service.listen('foo', async function(data) {
		await sleep(data.body.sleep)

		console.log(data)
	})

	service.trigger('foo', {msg: 'hello', sleep: 1000})
	service.trigger('foo', {msg: 'world', sleep: 3000})
})

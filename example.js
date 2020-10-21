const karrier = require('./')
const RedisTransport = require('./src/transport/redis')
const { promisify } = require('util')

const sleep = promisify(setTimeout)

karrier.init('example', new RedisTransport({
	port: 6379,
	host: "localhost",
	db: 0
})).then(async () => {
	karrier.listen('foo', async data => {
		console.log('got it')
		await sleep(data.body.sleep)

		karrier.send('example', 'testing message')
	})

	karrier.onmessage(message => {
		console.log('MESSAGE', message.body)
		return 'ack'
	})

	karrier.trigger('foo', {sleep: 1000})
})

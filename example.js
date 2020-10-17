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
		await sleep(data.body.sleep)

		karrier.send('example', data.body)
	})

	karrier.onMessage(message => {
		console.log('MESSAGE', message.body)
		return message.body[0] + message.body[1]
	})

	karrier.trigger('foo', {sleep: 1000})
})

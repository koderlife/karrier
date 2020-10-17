const karrier = require('./')
const RedisTransport = require('./src/transport/redis')

karrier.init('example2', new RedisTransport({
	port: 6379,
	host: "localhost",
	db: 0
})).then(async () => {
	karrier.trigger('foo', {msg: 'hello', sleep: 1000})
	karrier.trigger('foo', {msg: 'world', sleep: 3000})

	karrier.onMessage(console.log)

	const res = await karrier.send('example', [1, 2])
	console.log('REPLY', res.body)
})

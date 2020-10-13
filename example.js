const karrier = require('./')
const RedisEmitter = require('./src/emitters/redis')
const { promisify } = require('util')

const sleep = promisify(setTimeout)

karrier('example', new RedisEmitter({
	port: 6379,
	host: "localhost",
	db: 0
})).then(async service => {
	await service.listen('foo', async function(data) {
		await sleep(data.body.sleep)

		console.log(data.body)
	})

	service.trigger('foo', {msg: 'hello', sleep: 1000})
	service.trigger('foo', {msg: 'world', sleep: 3000})

	service.message(message => {
		console.log('MESSAGE', message.body)
		service.reply(message, message.body[0] + message.body[1])
	})

	service.send('example', [1, 2], message => {
		console.log('REPLY', message.body)
	})
})

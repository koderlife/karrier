let time = Date.now()
let usage = process.cpuUsage()

module.exports = () => {
	const now = Date.now()
	const elapsed = Date.now() - time

	usage = process.cpuUsage(usage)
	time = Date.now()

	return 100 * (usage.user + usage.system) / (elapsed * 1000)
}

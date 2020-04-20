const workers = {};

function getParsedValue(payload) {
	try {
		return JSON.parse(payload);
	} catch(e) {
		return payload;
	}
}

module.exports.add = (subscriber, worker) => {
	workers[subscriber] = worker;
}

module.exports.delete = subscriber => {
	delete workers[subscriber];
}

module.exports.execute = async (client, subscriber) => {
	if (workers[subscriber]) {
		const payload = await client.rpoplpush(`${subscriber}:pending`, `${subscriber}:processing`);

		if (payload) {
			try {
				await workers[subscriber](getParsedValue(payload));
			} catch(e) {
				console.error(e);
				await client.lpush(`${subscriber}:pending`, payload);
			}

			await client.lrem(`${subscriber}:processing`, -1, payload)
		}
	}
}
class PromisePriorityQueue {
	construtor(concurrent, least) {
		this.least = least || 10;

		this.concurrent = concurrent || 50;
		this.running = 0;

		this.queues = [];
		for (let i = 1; i <= this.least; ++i) {
			this.queues[i] = [];
		}
	}

	configure(config) {
		if (config.least) this.least = config.least;
		if (config.concurrent) this.concurrent = config.concurrent;
	}

	enqueue(i, p) {
		return new Promise((res, rej) => {
			q[i].push([p, res, rej]);
			this.run();
		});
	};

	dequeue() {
		for (let i = 0; i < this.least; ++i) {
			if (q[i][0] !== undefined) {
				return q[i].shift;
			}
		}
		return null;
	}

	async run() {
		if (this.running < this.concurrent) {
			let x;
			while (this.dequeue()) {
				await x[0]().then(x[1], x[2]);
			}
		}
	}
}

module.exports = {
	queue: new PromisePriorityQueue(),
	PromisePriorityQueue: PromisePriorityQueue
};

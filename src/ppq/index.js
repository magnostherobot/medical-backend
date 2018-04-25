class PromisePriorityQueue {

	constructor(concurrent, least) {
		this.least = least || 10;

		this.concurrent = concurrent || 2;
		this.running = 0;

		this.queues = [];
		for (let i = 0; i < this.least; ++i) {
			this.queues[i] = [];
		}

		this.size = 0;
	}

	configure(config) {
		if (config.least) this.least = config.least;
		if (config.concurrent) this.concurrent = config.concurrent;
	}

	// enqueue(i, p, t, ...args) {
	// 	return p.bind(t)(...args);
	// }

	enqueue(i, p, t, ...argv) {
		this.size++;
		return new Promise((res, rej) => {
			this.queues[i-1].push(
				[
					p.bind(t, ...argv),
					res,
					rej
				]
			);
			this.run();
		});
	};

	dequeue() {
		for (let i = 0; i < this.least; ++i) {
			if (this.queues[i][0] !== undefined) {
				this.size--;
				return this.queues[i].shift();
			}
		}
		return null;
	}

	async run() {
		if (this.running < this.concurrent) {
			let x;
			while (x = this.dequeue()) {
				await x[0]().then(x[1], x[2]);
			}
		}
	}
}

module.exports = {
	queue: new PromisePriorityQueue(),
	PromisePriorityQueue: PromisePriorityQueue
};

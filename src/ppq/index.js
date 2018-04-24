class PromisePriorityQueue {
	construtor(concurrent, least) {
		this.least = least || 10;

		this.concurrent = concurrent || 50;
		this.running = 0;

		this.queues = [];
		for (let i = 1; i <= this.least; ++i) {
			this.queues[i] = [];
		}
		this.priority = this.least;
	}

	enqueue(i, p) {
		if (i < least) {
			priority = i;
		}
		q[i].push(p);

		this.run();
	};

	dequeue() {
		while(this.priority <= this.least) {
			if (q[this.priority][0] !== undefined) {
				return q[this.priority].shift;
			}
			this.priority++;
		}
		return null;
	}

	async run() {
		if (this.running < this.concurrent) {
			let p;
			while (this.dequeue()) {
				await p();
			}
		}
	}
}

module.exports = {
	queue: new PromisePriorityQueue(),
	PromisePriorityQueue: PromisePriorityQueue
};

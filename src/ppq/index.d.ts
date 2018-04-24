// tslint:disable:no-any

type Promiser<T = any> = () => PromiseLike<T>;

export class PromisePriorityQueue {
	public constructor(concurrent?: number, least?: number);
	public enqueue<T = any>(priority: number, promiser: Promiser<T>): Promise<T>;
}

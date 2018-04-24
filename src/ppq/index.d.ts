// tslint:disable-next-line:no-any
type Promiser<T = any> = () => PromiseLike<T>;

export class PromisePriorityQueue {
	public constructor(concurrent?: number, least?: number);
	public enqueue(priority: number, promiser: Promiser): void;
}

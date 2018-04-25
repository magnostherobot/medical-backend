// tslint:disable:no-any

export type Promiser<T = any> = (args: any) => PromiseLike<T>;

export class PromisePriorityQueue {
	public constructor(concurrent?: number, least?: number);
	public enqueue<T = any>(priority: number, promiser: Promiser<T>, binding: any, ...argv: any[]): Promise<T>;
	public readonly size: number;
}

export const queue: PromisePriorityQueue;

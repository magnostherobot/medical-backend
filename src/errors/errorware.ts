import { NextFunction,  Request, Response } from 'express';

export interface ErrorResponseBlock {
	status: string;
	error: string;
	error_description?: string;
	user_message?: string;
	// tslint:disable-next-line:no-any
	error_data?: any;
}

export class RequestError extends Error {
	public code: number;
	public userMessage?: string;
	// tslint:disable-next-line:no-any
	public errorData?: any;

	public constructor(
		errCode: number = 500,
		errName: string = 'internal_server_error',
		errDescription?: string,
		errUserMessage?: string,
		// tslint:disable-next-line:no-any
		errData?: any
	) {
		super(errDescription);
		this.code = errCode;
		this.name = errName;
		this.userMessage = errUserMessage;
		this.errorData = errData;
	}

	public responseBlock(): ErrorResponseBlock {
		return {
			status: 'error',
			error: this.name,
			error_description: this.message,
			user_message: this.userMessage,
			error_data: this.errorData
		};
	}
}

type Errorware =
	(err: Error, req: Request, res: Response, next: NextFunction) => void;

export const errorHandler: Errorware =
	(err: Error, req: Request, res: Response, next: NextFunction): void => {
	if ((err as RequestError).responseBlock) {
		const rerr: RequestError = err as RequestError;
		res.status(rerr.code)
			.json(rerr.responseBlock());
		} else {
			res.send(err);
		}
};

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
	public static is(test: Object): test is RequestError {
		const err: RequestError = test as RequestError;
		return err.code !== undefined
			&& err.name !== undefined
			&& err.responseBlock !== undefined;
	}

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

export type Errorware =
	(err: Error, req: Request, res: Response, next: NextFunction) => void;

export const errorHandler: Errorware =
	(err: Error, req: Request, res: Response, next: NextFunction): void => {
	console.log(err);
	if (RequestError.is(err)) {
		console.log('fewkuihfklsfv');
		res.status(err.code)
			.json(err.responseBlock());
	} else {
		res.send(err);
	}
};

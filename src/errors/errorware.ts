import { NextFunction,  Request, Response } from 'express';

/**
 * General error and error-handling logic for the middleware stack.
 */

/**
 * The body of the response to a client on errors.
 */
export interface ErrorResponseBlock {
	status: string;
	error: string;
	error_description?: string;
	user_message?: string;
	// tslint:disable-next-line:no-any
	error_data?: any;
}

/**
 * The custom-made Error format, containing enough information to send in
 * response to a client.
 */
export class RequestError extends Error {
	/**
	 * Used to check that an object is specifically a RequestError.
	 *
	 * @param test The object to test.
	 * @returns `true` if the object is a [[RequestError]]; `false`
	 *   otherwise.
	 */
	public static is(test: Object): test is RequestError {
		return (test as Partial<RequestError>).code !== undefined
			&& (test as Partial<RequestError>).name !== undefined
			&& (test as Partial<RequestError>).responseBlock !== undefined;
	}

	/**
	 * The http response code associated with the error.
	 */
	public code: number;

	/**
	 * The user-friendly message that describes the error.
	 */
	public userMessage?: string;

	/**
	 * Miscellaneous data associated with the error.
	 */
	// tslint:disable-next-line:no-any
	public errorData?: any;

	/**
	 * Constructs a [[RequestError]] using information intended to be sent
	 * to the client.
	 *
	 * @param errCode The http error-code.
	 * @param errName The descriptive name of the problem, for further
	 *   detail from the error-code.
	 * @param errDescription A more verbose description based on the error
	 *   name.
	 * @param errUserMessage A user-friendly version of the description, to
	 *   possibly be displayed to the user.
	 * @param errData Miscellaneous data related to the error; probably
	 *   used more during development.
	 */
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

/**
 * The outside shell of an Express error-handling (_4-arity_) function.
 *
 * @param err The Error to act on.
 * @param req The Express http request.
 * @param res The Express http response.
 * @param next The next Express middleware function to use; probably another
 *   [[Errorware]].
 */
export type Errorware =
	(err: Error, req: Request, res: Response, next: NextFunction) => void;

/**
 * A terminal [[Errorware]] for sending errors to the user.
 * Has special functionality for handling [[RequestError]]s, but can handle
 * regular Errors too.
 *
 * @param err The Error to act on.
 * @param req The Express http request.
 * @param res The Express http response.
 */
export const errorHandler: Errorware =
	(err: Error, req: Request, res: Response): void => {
	if (RequestError.is(err)) {
		res.status(err.code)
			.json(err.responseBlock());
	} else {
		res.send(err);
	}
};

/* tslint:disable:no-any */

import * as colors from 'colors/safe';
import * as winston from 'winston';

import { logPath } from './files';
import { QueryOptions } from 'sequelize';

type Colour = (s: string) => string;

type LogLevel =
	| '7'
	| 'debug'
	| 'minor'
	| 'silly'
	| 'testing'
	| 'verbose'
	| '6'
	| 'information'
	| 'inform'
	| 'info'
	| '5'
	| 'note'
	| 'notice'
	| 'notify'
	| 'success'
	| 'security'
	| '4'
	| 'warn'
	| 'warning'
	| '3'
	| 'err'
	| 'failure'
	| 'fail'
	| 'error'
	| '2'
	| 'crit'
	| 'severe'
	| 'critical'
	| '1'
	| 'alert'
	| 'breach'
	| '0'
	| 'fatal'
	| 'emerg'
	| 'emergency'
	| 'shutdown';

const LOG_LEVELS: winston.LoggerOptions = {
	7: 7,
	debug: 7,
	minor: 7,
	silly: 7,
	testing: 7,
	verbose: 7,
	6: 6,
	information: 6,
	inform: 6,
	info: 6,
	5: 5,
	note: 5,
	notice: 5,
	notify: 5,
	success: 5,
	security: 5,
	4: 4,
	warn: 4,
	warning: 4,
	3: 3,
	err: 3,
	failure: 3,
	fail: 3,
	error: 3,
	2: 2,
	crit: 2,
	severe: 2,
	critical: 2,
	1: 1,
	alert: 1,
	breach: 1,
	0: 0,
	fatal: 0,
	emerg: 0,
	emergency: 0,
	shutdown: 0
};

const LEVEL_COLOURS: {
	[key: number]: Colour;
} = {
	7: colors.cyan,
	6: colors.blue,
	5: colors.green,
	4: colors.yellow,
	3: colors.red,
	2: colors.magenta,
	1: colors.black,
	0: colors.white
};

const LOG_LEVEL_COLOURS: {
	[key: string]: Colour;
} = {};
Object.keys(LOG_LEVELS).forEach((k: string): void => {
	LOG_LEVEL_COLOURS[k] = LEVEL_COLOURS[LOG_LEVELS[k]];
});

interface LoggingMetadata {
	component?: string;
	user?: string;
	[key: string]: any;
}

export let enabled: boolean = true;

const consoleTransport: winston.TransportInstance =
	new winston.transports.Console({
	name: 'consoleTransport',
	level: 'verbose',
	silent: process.env.NODE_ENV === 'test',
	handleExceptions: true,
	humanReadableUncaughtException: true,
	formatter: (
		{ level, message }:
			{ level: string; message: string }
	): string => {
		let out: string = '';
		const stamp: string = new Date().toLocaleTimeString();
		out += `[${LOG_LEVEL_COLOURS[level](`${stamp} ${level}`)}] `;
		out += (level === 'critical')
			? colors.red(message)
			: message;
		return out;
	},
	stderrLevels: [ 'error', 'critical' ]
});

const basicFileTransport: winston.TransportInstance =
	new winston.transports.File({
	name: 'basicFileTransport',
	level: 'debug',
	label: 'Basic File Transport',
	silent: false,
	colorize: false,
	timestamp: true,
	filename: './logs/general/basic', //logPath('basic'),
	maxSize: 1000000,
	maxFiles: 100,
	stream: undefined,
	json: true,
	eol: '\n',
	prettyPrint: false,
	depth: null,
	logstash: false,
	showLevel: true,
	formatter: undefined,
	tailable: true,
	maxRetries: 2,
	zippedArchive: true,
	options: {
		flags: 'a'
	}
});

const criticalFileTransport: winston.TransportInstance =
	new winston.transports.File({
	name: 'criticalFileTransport',
	level: 'critical',
	label: 'Critical Reporter',
	silent: false,
	colorize: false,
	timestamp: true,
	filename: './logs/general/critical', //logPath('critical'),
	maxSize: 1000000,
	maxFiles: 10,
	stream: undefined,
	json: true,
	eol: '\n',
	prettyPrint: false,
	depth: null,
	handleExceptions: true,
	logstash: false,
	showLevel: true,
	formatter: undefined,
	tailable: true,
	maxRetries: 2,
	zippedArchive: true,
	options: {
		flags: 'a'
	}
});

const queryFileTransport: winston.TransportInstance =
	new winston.transports.File({
	name: 'queryFileTransport',
	level: 'debug',
	label: 'Query Logs',
	silent: false,
	colorize: false,
	timestamp: true,
	filename: './logs/general/queries', //logPath('queries'),
	maxSize: 1000000,
	maxFiles: 100,
	stream: undefined,
	json: true,
	eol: '\n',
	prettyPrint: false,
	depth: null,
	handleExceptions: false,
	logstash: false,
	showLevel: false,
	formatter: undefined,
	tailable: true,
	maxRetries: 2,
	zippedArchive: true,
	options: {
		flags: 'a'
	}
});

const basicLogger: winston.LoggerInstance = new winston.Logger({
	transports: [
		consoleTransport,
		basicFileTransport,
		criticalFileTransport
	],
	levels: LOG_LEVELS
});

const queryLogger: winston.LoggerInstance = new winston.Logger({
	transports: [
		queryFileTransport
	],
	levels: {
		info: 0
	}
});

type LogFunction = (message: string, meta?: LoggingMetadata) => void;

const makeLogFunction: (level: LogLevel) => LogFunction = (
	level: LogLevel
): LogFunction => {
	return (
		message: string, meta: LoggingMetadata = {}
	): void => {
		if (!enabled) {
			return;
		}
		meta.user = meta.user || '_BE4_system';
		meta.component = meta.component || 'core';
		basicLogger.log(level, message, meta);
	};
};

function forwardLog(level: LogLevel, message: string, meta: LoggingMetadata)
 : any {
	basicLogger.log(level, message, meta);
}

interface FetchParams {
	before?: Date;
	after?: Date;
}

interface LogItem {
	component: string;
	level: LogLevel;
	value: string;
	username: string;
	timestamp: string;
}

/* tslint:disable */
const fetchLogs2: (level?: LogLevel, params?: FetchParams) => Promise<LogItem[]> = (level?: LogLevel, params: FetchParams = {}): Promise<LogItem[]> => {
	const options: winston.QueryOptions = {
		from: params.after,
		until: params.before,
		start: 0,
		order: 'desc',
		fields: ['user', 'component', 'level', 'message', 'label', 'timestamp']
	};

	return new Promise((res, rej): void => {
		basicLogger.query(options, function (err, results) {
			if (err) {
				/* TODO: handle me */
				throw err;
			}
			res(results.basicFileTransport);
		});
	});
};
/* tslint:enable */

export const logger: {
	7: LogFunction;
	debug: LogFunction;
	minor: LogFunction;
	silly: LogFunction;
	testing: LogFunction;
	verbose: LogFunction;
	6: LogFunction;
	information: LogFunction;
	inform: LogFunction;
	info: LogFunction;
	5: LogFunction;
	note: LogFunction;
	notice: LogFunction;
	notify: LogFunction;
	success: LogFunction;
	security: LogFunction;
	4: LogFunction;
	warn: LogFunction;
	warning: LogFunction;
	3: LogFunction;
	err: LogFunction;
	failure: LogFunction;
	fail: LogFunction;
	error: LogFunction;
	2: LogFunction;
	crit: LogFunction;
	severe: LogFunction;
	critical: LogFunction;
	1: LogFunction;
	alert: LogFunction;
	breach: LogFunction;
	0: LogFunction;
	fatal: LogFunction;
	emerg: LogFunction;
	emergency: LogFunction;
	shutdown: LogFunction;
	isEnabled: () => boolean;
	forward: (level: LogLevel, message: string, meta: LoggingMetadata) => void;
	fetch: (level: LogLevel, params?: FetchParams) => Promise<LogItem[]>;
} = {
	7: makeLogFunction('7'),
	debug: makeLogFunction('debug'),
	minor: makeLogFunction('minor'),
	silly: makeLogFunction('silly'),
	testing: makeLogFunction('testing'),
	verbose: makeLogFunction('verbose'),
	6: makeLogFunction('6'),
	information: makeLogFunction('information'),
	inform: makeLogFunction('inform'),
	info: makeLogFunction('info'),
	5: makeLogFunction('5'),
	note: makeLogFunction('note'),
	notice: makeLogFunction('notice'),
	notify: makeLogFunction('notify'),
	success: makeLogFunction('success'),
	security: makeLogFunction('security'),
	4: makeLogFunction('4'),
	warn: makeLogFunction('warn'),
	warning: makeLogFunction('warning'),
	3: makeLogFunction('3'),
	err: makeLogFunction('err'),
	failure: makeLogFunction('failure'),
	fail: makeLogFunction('fail'),
	error: makeLogFunction('error'),
	2: makeLogFunction('2'),
	crit: makeLogFunction('crit'),
	severe: makeLogFunction('severe'),
	critical: makeLogFunction('critical'),
	1: makeLogFunction('1'),
	alert: makeLogFunction('alert'),
	breach: makeLogFunction('breach'),
	0: makeLogFunction('0'),
	fatal: makeLogFunction('fatal'),
	emerg: makeLogFunction('emerg'),
	emergency: makeLogFunction('emergency'),
	shutdown: makeLogFunction('shutdown'),
	isEnabled: (): boolean => !basicFileTransport.silent,
	forward: forwardLog,
	fetch: fetchLogs2
};

export const logQuery: (query: string, duration: string) => void = (
	query: string, duration: string
): void => {
	queryLogger.info(query, {
		duration
	});
};

/* tslint:disable:no-any */

import * as colors from 'colors/safe';
import * as winston from 'winston';

import { files } from './files';

type LogLevel = 'critical' | 'error' | 'warning' | 'security' | 'info';

const LOG_LEVELS: winston.LoggerOptions = {
	info: 4,
	security: 3,
	warning: 2,
	error: 1,
	critical: 0
};

const LOG_LEVEL_COLOURS: {
	[key: string]: (s: string) => string;
} = {
	info: colors.cyan,
	security: colors.blue,
	warning: colors.yellow,
	error: colors.red,
	critical: colors.red
};

interface LoggingMetadata {
	component?: string;
	user?: string;
	[key: string]: any;
}

const consoleTransport: winston.TransportInstance =
	new winston.transports.Console({
	name: 'consoleTransport',
	level: 'info',
	silent: false,
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
	level: 'info',
	label: 'Basic File Transport',
	silent: false,
	colorize: false,
	timestamp: true,
	filename: files.logPath('basic'),
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
	filename: files.logPath('critical'),
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
	level: 'info',
	label: 'Query Logs',
	silent: false,
	colorize: false,
	timestamp: true,
	filename: files.logPath('queries'),
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
		meta.user = meta.user || '_BE4_system';
		meta.component = meta.component || 'core';
		basicLogger.log(level, message, meta);
	};
};

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

const fetchLogs: (level: LogLevel, params?: FetchParams) => LogItem[] = (
	level: LogLevel, params: FetchParams = {}
): LogItem[] => {
	const matches: (log: any, level: LogLevel, params?: FetchParams) => boolean = (
		log: any, minLevel: LogLevel, fetchParams: FetchParams = {}
	): boolean => {
		const time: Date = new Date(log.timestamp);
		if (params.before && params.before < time) {
			return false;
		} else if (params.after && params.after > time) {
			return false;
		} else {
			return true;
		}
	};
	const out: LogItem[] = [];
	basicLogger.stream({ level }).on('log', (log: any): void => {
		if (matches(log, level, params)) {
			out.push({
				component: log.meta.component,
				level: log.level,
				value: log.message,
				username: log.user,
				timestamp: log.timestamp
			});
		}
	});
	return out;
};

export const logger: {
	info: LogFunction;
	security: LogFunction;
	warning: LogFunction;
	error: LogFunction;
	critical: LogFunction;
	isEnabled: () => boolean;
	forward: (level: LogLevel, message: string, meta: LoggingMetadata) => void;
	fetch: (level: LogLevel, params?: FetchParams) => LogItem[];
} = {
	info: makeLogFunction('info'),
	security: makeLogFunction('security'),
	warning: makeLogFunction('warning'),
	error: makeLogFunction('error'),
	critical: makeLogFunction('critical'),
	isEnabled: (): boolean => !basicFileTransport.silent,
	forward: basicLogger.log,
	fetch: fetchLogs
};

export const logQuery: (query: string, duration: string) => void = (
	query: string, duration: string
): void => {
	queryLogger.info(query, {
		duration
	});
};

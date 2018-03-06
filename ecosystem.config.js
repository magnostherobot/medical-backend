module.exports = {
	/**
	 * Application configuration section
	 * http://pm2.keymetrics.io/docs/usage/application-declaration/
	 */
	apps : [
		{
			name: 'JHBE4',
			script: 'src/index.ts',
			// cwd: '.',
			args: '',
			instances: -1,
			watch: false,
			ignore_watch: '',
			max_memory_restart: '1G',
			// min_uptime: '60000',
			listen_timeout: 3000,
			kill_timeout: 3000,
			wait_ready: false,
			max_restarts: 4,
			restart_delay: 1000,
			autorestart: true,
			// cron_restart: '1 0 * * *'?
			vizion: true,
			post_update: [],
			force: false,
			source_map_support: true,
			env: {
				COMMON_VARIABLE: 'true'
			},
			env_production: {
				NODE_ENV: 'production'
			}
		},
	],

	/**
	 * Deployment section
	 * http://pm2.keymetrics.io/docs/usage/deployment/
	 */
	deploy: {
		production: {
			user: 'node',
			host: '212.83.163.1',
			ref: 'origin/master',
			repo: 'git@github.com:repo.git',
			path: '/var/www/production',
			'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
		},
		dev: {
			user: 'node',
			host: '212.83.163.1',
			ref: 'origin/master',
			repo: 'git@github.com:repo.git',
			path: '/var/www/development',
			'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env dev',
			env: {
				NODE_ENV: 'dev'
			}
		}
	}
};

import * as chai from 'chai';
chai.should();

const sample_project: any = null;
const sample_user: any = null;
const sample_file: any = null;

// tslint:disable-next-line:no-require-imports
describe('database:', () => {
	describe('SQL Model', () => {
		// before each test initialise the database
		let database;
		beforeEach(function() {
			// import database
		});

		context('initialisation', () => {
			it('should complete successfully', () => {
				// check no errors were thrown on import / answers to ping
			});
			it('should recreate schema', () => {
				// check all tables and functions are present according to some schema
			});
			it('should be empty', () => {
				// check projects, users, etc tables are empty
			});
			it('should have initial admin user', () => {
				// check admin user exists
			});
		});
		context('usage', () => {
			context('users', () => {
				it('should be possible to add users', () => {
					// add sample user and check no error was thrown
				});
				it('should be possible to retreive users', () => {
					// add sample user and retreive user, then compare username, uuid, etc
				});
			});
			context('projects', () => {
				it('should be possible to add projects', () => {
					// add sample project and check no error was thrown
				});
				it('should be possible to retreive projects', () => {
					// add sample project and retreive project, then compare properties
				});
			});
			context('files', () => {
				it('should be possible to add files', () => {
					// add sample file and check no error was thrown
				});
				it('should be possible to retreive files', () => {
					// add sample file and retreive file, then compare properties
				});
			});
			// to be expanded
		});
		// to be expaned
	});
	describe('ORM Model', () => {
		// to be expanded
	});
});

import { default as ContributorGroup } from './ContributorGroup';
import { default as File } from './File';
import { BelongsTo, BelongsToMany, Column, CreatedAt, ForeignKey,
		Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { default as User } from './User';
import { default as UserJoinsProject } from './UserJoinsProject';

@Table
export default class Project extends Model<Project> {

	@PrimaryKey
	@Column
	public name: string = '';

	@BelongsToMany(() => User, () => UserJoinsProject)
	public contributors: User[] = [];

	@ForeignKey(() => File)
	@Column
	public rootFolderId: string = '';

	@BelongsTo(() => File)
	public rootFolder: File = new File();

	@CreatedAt
	@Column
	public creationDate: Date = new Date();

	@UpdatedAt
	@Column
	public lastActivity: Date = new Date();

	public getAccessLevel(user: User): ContributorGroup {
		throw new Error(`unimplemented, ${this}`);
	}

	public getUserInfo(user: User): UserInfo {
		return {
			username: user.username,
			access_level: this.getAccessLevel(user)
				.toString()
		};
	}

	public getProjectFullInfo(): ProjectFullInfo {
		return {
			project_name: this.name,
			users: this.contributors
			.map<UserInfo>(
				(u: User) => this.getUserInfo(u)
			),
			public_metadata: {
				creation_date: this.creationDate
			},
			// TODO: Check if we have anything to use these for yet?
			private_metadata: {},
			admin_metadata: {}
		};
	}
}

interface Metadata {}

interface UserInfo {
	username: string;
	access_level: string;
}

export interface ProjectFullInfo {
	project_name: string;
	users: UserInfo[];
	public_metadata: Metadata;
	private_metadata?: Metadata;
	admin_metadata?: Metadata;
}

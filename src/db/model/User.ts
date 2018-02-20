import { default as File } from './File';
import { default as Project } from './Project';
import { BelongsTo, BelongsToMany, Column, CreatedAt, ForeignKey, HasMany,
		Model, PrimaryKey, Table } from 'sequelize-typescript';
import { default as UserGroup } from './UserGroup';
import { default as UserJoinsProject } from './UserJoinsProject';

@Table
export default class User extends Model<User> {
	@PrimaryKey
	@Column
	public username: string = '';

	@Column
	public password: string = '';

	@ForeignKey(() => UserGroup)
	@Column
	public userGroupId: number = 0;

	@BelongsTo(() => UserGroup)
	public userGroup: UserGroup = new UserGroup();

	@BelongsToMany(() => Project, () => UserJoinsProject)
	public projects: Project[] = [];

	@HasMany(() => File)
	public createdFiles: File[] = [];

	@CreatedAt
	@Column
	public creationDate: Date = new Date();

	// TODO implement
	public getAccessLevel(project: Project): string {
		throw new Error(`unimplemented, ${this}`);
	}

	public getProjectInfo(project: Project): ProjectInfo {
		return {
			project_name: project.name,
			access_level: this.getAccessLevel(project)
		};
	}

	public getUserFullInfo(): UserFullInfo {
		return {
			username : this.username,
			privileges: [`${this.userGroup.name}`],
			projects : this.projects.map<ProjectInfo>(
				(p: Project) => this.getProjectInfo(p)
			),
			// TODO: Check if we have anything to use these for yet?
			public_user_metadata: {},
			private_user_metadata: {},
			public_admin_metadata: {},
			private_admin_metadata: {}
		};
	}
}

// TODO MAKE PRETTY below
interface Metadata {}

interface ProjectInfo {
	project_name: string;
	access_level: string;
}

export interface UserFullInfo {
	username: string;
	privileges: string[];
	projects: ProjectInfo[];
	public_user_metadata: Metadata;
	private_user_metadata: Metadata;
	public_admin_metadata: Metadata;
	private_admin_metadata: Metadata;
}

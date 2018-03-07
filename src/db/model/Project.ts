import { default as ContributorGroup } from './ContributorGroup';
import { default as File } from './File';
import { BelongsTo, BelongsToMany, Column, CreatedAt, DataType, ForeignKey,
		Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { default as User } from './User';
import { default as UserJoinsProject } from './UserJoinsProject';

@Table
export default class Project extends Model<Project> {
	@PrimaryKey
	@Column
	public name!: string;

	@BelongsToMany(() => User, () => UserJoinsProject)
	public contributors?: User[];

	@ForeignKey(() => File)
	@Column
	public rootFolderId!: string;

	@BelongsTo(() => File)
	private readonly rootFolderInternal?: File;

	@CreatedAt
	@Column(DataType.DATE)
	public creationDate!: Date;

	@UpdatedAt
	@Column(DataType.DATE)
	public lastActivity!: Date;

	public get rootFolder(): File {
		if (this.rootFolderInternal === undefined) {
			throw new Error('rootFolderInternal is undefined');
		}
		return this.rootFolderInternal;
	}

	public get metadata(): {
		public_metadata?: Metadata;
		private_metadata?: Metadata;
		admin_metadata?: Metadata;
	} {
		return {
			public_metadata: this.publicMetadata,
			private_metadata: this.privateMetadata,
			admin_metadata: this.adminMetadata
		};
	}

	public set metadata(newMetadata: {
		public_metadata?: Metadata;
		private_metadata?: Metadata;
		admin_metadata?: Metadata;
	}) {
		if (newMetadata.public_metadata) {
			this.publicMetadata = newMetadata.public_metadata;
		}
		if (newMetadata.private_metadata) {
			this.privateMetadata = newMetadata.private_metadata;
		}
		if (newMetadata.admin_metadata) {
			this.adminMetadata = newMetadata.admin_metadata;
		}
	}

	public get publicMetadata(): Metadata {
		return {};
	}

	public set publicMetadata(newMetadata: Metadata) {
		return;
	}

	public get privateMetadata(): Metadata {
		return {};
	}

	public set privateMetadata(newMetadata: Metadata) {
		return;
	}

	public get adminMetadata(): Metadata {
		return {};
	}

	public set adminMetadata(newMetadata: Metadata) {
		return;
	}

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

	public get fullInfo(): ProjectFullInfo {
		if (this.contributors === undefined) {
			throw new Error('contributors undefined');
		}
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

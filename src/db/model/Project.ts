import { default as ContributorGroup } from './ContributorGroup';
import { default as File } from './File';
import { NotVoid } from 'lodash';
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

	public get properties(): object {
		return this;
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

	public async hasAccessLevel(user: User, accessLevel: string): Promise<boolean> {
		const ujps: UserJoinsProject[] | null = await UserJoinsProject.findAll({
			include: [ ContributorGroup],
			where: {
				username: user.username,
				projectName: this.name
			}
		});
		if (ujps != null) {
			const adders: ContributorGroup[] = await ujps.map((ujp: UserJoinsProject): ContributorGroup => {
					if (ujp.contributorGroup != null) {
						return ujp.contributorGroup;
					} else {
						throw new Error('Missing contributor group');
					}
			});
			if (adders.some((cg: ContributorGroup): boolean => cg.name == accessLevel)) {
				return true;
			}

			switch (accessLevel) {
				case 'canCreateFiles':
					return adders.some(
						(cg: ContributorGroup): boolean => cg.canCreateFiles
					);
				case 'canDeleteFiles':
					return adders.some(
						(cg: ContributorGroup): boolean => cg.canDeleteFiles
					);
				case 'canViewFiles':
					return adders.some(
						(cg: ContributorGroup): boolean => cg.canViewFiles
					);
				case 'canAddUsers':
					return adders.some(
						(cg: ContributorGroup): boolean => cg.canAddUsers
					);
				case 'canRemoveUsers':
					return adders.some(
						(cg: ContributorGroup): boolean => cg.canRemoveUsers
					);
				case 'canEditUserPermissions':
					return adders.some(
						(cg: ContributorGroup): boolean => cg.canEditUserPermissions
					);
				case 'canDeleteProject':
					return adders.some(
						(cg: ContributorGroup): boolean => cg.canDeleteProject
					);
				default:
					throw new Error('invalid access role');
			}
		} else {
			return(false);
		}
	}

	public async getAccessLevel(user: User): Promise<String[]> {
		const ujps: UserJoinsProject[] | null = await UserJoinsProject.findAll({
			include: [ ContributorGroup],
			where: {
				username: user.username,
				projectName: this.name
			}
		});
		const listContributors: String[] = await ujps.map((ujp: UserJoinsProject): String => {
			if (ujp.contributorGroup != undefined) {
				return ujp.contributorGroupName;
			} else {
				throw new Error('Invalid access');
			}
		});
		return listContributors;
	}

	public async getUserInfo(user: User): Promise<UserInfo> {
		return {
			username: user.username,
			access_level: (await this.getAccessLevel(user)).join()
		};
	}

	public async getFullInfo(): Promise<ProjectFullInfo> {
		if (this.contributors === undefined) {
			throw new Error('contributors undefined');
		}
		return {
			project_name: this.name,
			users: await Promise.all(this.contributors
			.map( (u: User): Promise<UserInfo> => this.getUserInfo(u))),
			public_metadata: {
				creation_date: this.creationDate
			},
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

import { RequestError } from '../../errors/errorware';
import { default as File } from './File';
import { default as Project } from './Project';
import { BelongsToMany, Column, CreatedAt, DataType, HasMany,
		Model, PrimaryKey, Table } from 'sequelize-typescript';
import { default as UserGroup } from './UserGroup';
import { default as UserHasPrivilege } from './UserHasPrivilege';
import { default as UserJoinsProject } from './UserJoinsProject';

import ContributorGroup from './ContributorGroup';
import { truncateFile } from '../../files';

@Table
export default class User extends Model<User> {
	@PrimaryKey
	@Column
	public username!: string;

	@Column
	private passwordInternal!: string;

	@BelongsToMany(() => UserGroup, () => UserHasPrivilege)
	public userGroups?: UserGroup[];

	@BelongsToMany(() => Project, () => UserJoinsProject)
	public projects?: Project[];

	@HasMany(() => File)
	public createdFiles?: File[];

	@CreatedAt
	@Column(DataType.DATE)
	public creationDate!: Date;

	// TODO: Implement
	public get properties(): UserProperty[] {
		return [];
	}

	// TODO: Implement
	public set properties(newProps: UserProperty[]) {
		return;
	}

	public get metadata(): {
		public_user_metadata?: Metadata;
		private_user_metadata?: Metadata;
		public_admin_metadata?: Metadata;
		private_admin_metadata?: Metadata;
	} {
		return {
			public_user_metadata: this.publicUserMetadata,
			private_user_metadata: this.privateUserMetadata,
			public_admin_metadata: this.publicAdminMetadata,
			private_admin_metadata: this.privateAdminMetadata
		};
	}

	public set metadata(newMetadata: {
		public_user_metadata?: Metadata;
		private_user_metadata?: Metadata;
		public_admin_metadata?: Metadata;
		private_admin_metadata?: Metadata;
	}) {
		if (newMetadata.public_user_metadata) {
			this.publicUserMetadata = newMetadata.public_user_metadata;
		}
		if (newMetadata.private_user_metadata) {
			this.privateUserMetadata = newMetadata.private_user_metadata;
		}
		if (newMetadata.public_admin_metadata) {
			this.publicAdminMetadata = newMetadata.public_admin_metadata;
		}
		if (newMetadata.private_admin_metadata) {
			this.privateAdminMetadata = newMetadata.private_admin_metadata;
		}
	}

	public get publicUserMetadata(): Metadata {
		return {};
	}

	public set publicUserMetadata(newMetadata: Metadata) {
		return;
	}

	public get privateUserMetadata(): Metadata {
		return {};
	}

	public set privateUserMetadata(newMetadata: Metadata) {
		return;
	}

	public get publicAdminMetadata(): Metadata {
		return {};
	}

	public set publicAdminMetadata(newMetadata: Metadata) {
		return;
	}

	public get privateAdminMetadata(): Metadata {
		return {};
	}

	public set privateAdminMetadata(newMetadata: Metadata) {
		return;
	}

	public hasPrivilege(privilege: string): boolean {
		if (this.userGroups === undefined) {
			throw new Error('usergroups undefined');
		}
		if (this.userGroups.some((ug: UserGroup): boolean => ug.name == privilege)) {
			return true;
		}
		switch (privilege) {
			case 'canCreateUsers':
				return this.userGroups.some(
					(ug: UserGroup): boolean => ug.canCreateUsers
				);
			case 'canDeleteUsers':
				return this.userGroups.some(
					(ug: UserGroup): boolean => ug.canDeleteUsers
				);
			case 'canEditUsers':
				return this.userGroups.some(
					(ug: UserGroup): boolean => ug.canEditUsers
				);
			case 'canCreateProjects':
				return this.userGroups.some(
					(ug: UserGroup): boolean => ug.canCreateProjects
				);
			case 'canDeleteProjects':
				return this.userGroups.some(
					(ug: UserGroup): boolean => ug.canDeleteProjects
				);
			case 'canEditProjects':
				return this.userGroups.some(
					(ug: UserGroup): boolean => ug.canEditProjects
				);
			case 'canAccessLogs':
				return this.userGroups.some(
					(ug: UserGroup): boolean => ug.canAccessLogs
				);
			default:
				throw new Error('privilege undefined');
			}
	}

	public async getAccessLevel(project: Project): Promise<string> {
		return (await project.getAccessLevel(this)).join();
	}

	public async getProjectInfo(project: Project): Promise<ProjectInfo> {
		return {
			project_name: project.name,
			access_level: await this.getAccessLevel(project)
		};
	}

	public async getFullInfo(): Promise<UserFullInfo> {
		// FIXME: Fetch these things if they aren't already present
		if (this.userGroups === undefined) {
			this.userGroups = [];
		} else if (this.projects === undefined) {
			this.projects = [];
		}
		return {
			username : this.username,
			privileges: this.userGroups
				.filter((ug: UserGroup): boolean => ug.name !== null)
				.map((ug: UserGroup): string => ug.name as string),
			projects : await Promise.all( this.projects!.map(
				(p: Project): Promise<ProjectInfo> => this.getProjectInfo(p))
			),
			// TODO: Check if we have anything to use these for yet?
			public_user_metadata: {},
			private_user_metadata: {},
			public_admin_metadata: {},
			private_admin_metadata: {}
		};
	}

	public updateInfo(newInfo: {
		password?: { old: string; new: string };
		public_user_metadata?: Metadata;
		private_user_metadata?: Metadata;
	}): void {
		if (newInfo.password !== undefined) {
			if (!this.authenticate(newInfo.password.old)) {
				this.passwordInternal = newInfo.password.new;
			} else {
				throw new RequestError(400, 'invalid_password');
			}
		}
	}

	public authenticate(password: string): boolean {
		// TODO use salting (and maybe even constant-time comparison?)
		return password === this.passwordInternal;
	}

	public get password(): string {
		return this.passwordInternal;
	}

	public set password(newPassword: string) {
		// TODO use salting
		this.passwordInternal = newPassword;
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

export interface UserProperty {}

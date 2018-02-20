import { AllowNull, Column, DataType, HasMany, Model, Table
	} from 'sequelize-typescript';
import { default as UserJoinsProject } from './UserJoinsProject';

@Table
export default class ContributorGroup extends Model<ContributorGroup> {
	@AllowNull
	@Column(DataType.TEXT)
	public name: string | null = null;

	/* "Error: Foreign key for "ContributorGroup"
	 * is missing on "UserJoinsProject"." */
	@HasMany(() => UserJoinsProject, 'contributorGroupId')
	public uses: UserJoinsProject[] = [];

	@Column
	public canCreateFiles: boolean = false;

	@Column
	public canDeleteFiles: boolean = false;

	@Column
	public canViewFiles: boolean = false;

	@Column
	public canAddUsers: boolean = false;

	@Column
	public canRemoveUsers: boolean = false;

	@Column
	public canEditUserPermissions: boolean = false;

	@AllowNull
	@Column(DataType.TEXT)
	public description: string | null = null;

	@Column
	public isInternal: boolean = true;

	public getContributorGroupFullInfo(): ContributorGroupFullInfo {
		return {
			role: `${this.name}`,
			description: `${this.description}`,
			internal: this.isInternal
		};
	}
}

export interface ContributorGroupFullInfo {
	role: string;
	description: string;
	internal: boolean;
}

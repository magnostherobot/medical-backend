import { AllowNull, Column, DataType, HasMany, Model, Table
	} from 'sequelize-typescript';
import { default as UserJoinsProject } from './UserJoinsProject';

@Table
export default class ContributorGroup extends Model<ContributorGroup> {
	@AllowNull
	@Column(DataType.TEXT)
	public name!: string | null;

	/* "Error: Foreign key for "ContributorGroup"
	 * is missing on "UserJoinsProject"." */
	@HasMany(() => UserJoinsProject, 'contributorGroupId')
	public uses?: UserJoinsProject[];

	@Column
	public canCreateFiles!: boolean;

	@Column
	public canDeleteFiles!: boolean;

	@Column
	public canViewFiles!: boolean;

	@Column
	public canAddUsers!: boolean;

	@Column
	public canRemoveUsers!: boolean;

	@Column
	public canEditUserPermissions!: boolean;

	@AllowNull
	@Column(DataType.TEXT)
	public description!: string | null;

	@Column
	public isInternal!: boolean;

	public get fullInfo(): ContributorGroupFullInfo {
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

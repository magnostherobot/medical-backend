import { AllowNull, BelongsToMany, Column, DataType, Model, Table,
	Unique } from 'sequelize-typescript';
import { default as User } from './User';
import { default as UserHasPrivilege } from './UserHasPrivilege';

export interface UserPrivilege {
	privilege: string;
	description: string;
	internal: boolean;
}

@Table
export default class UserGroup extends Model<UserGroup> {
	@AllowNull
	@Unique
	@Column(DataType.TEXT)
	public name!: string | null;

	@BelongsToMany(() => User, () => UserHasPrivilege)
	public users?: User[];

	@Column
	public canCreateUsers!: boolean;

	@Column
	public canDeleteUsers!: boolean;

	@Column
	public canEditUsers!: boolean;

	@Column
	public canCreateProjects!: boolean;

	@Column
	public canDeleteProjects!: boolean;

	@Column
	public canEditProjects!: boolean;

	@Column
	public isInternal!: boolean;

	@AllowNull
	@Column(DataType.TEXT)
	public description!: string | null;

	public getPrivilege(): UserPrivilege {
		return {
			privilege : `${this.name}`,
			description : `${this.description}`,
			internal : this.isInternal
		};
	}
}

import { AllowNull, Column, DataType, HasMany, Model, Table
	} from 'sequelize-typescript';
import { default as User } from './User';

interface UserPrivilege {
	privilege: string;
	description: string;
	internal: boolean;
}

@Table
export default class UserGroup extends Model<UserGroup> {
	@AllowNull
	@Column(DataType.TEXT)
	public name: string | null = null;

	@HasMany(() => User)
	public users: User[] = [];

	@Column
	public canCreateUsers: boolean = false;

	@Column
	public canDeleteUsers: boolean = false;

	@Column
	public canEditUsers: boolean = false;

	@Column
	public canCreateProjects: boolean = false;

	@Column
	public canDeleteProjects: boolean = false;

	@Column
	public canEditProjects: boolean = false;

	@Column
	public isInternal: boolean = true;

	@AllowNull
	@Column(DataType.TEXT)
	public description: string | null = null;

	public getPrivelege(): UserPrivilege {
		return {
			privilege : `${this.name}`,
			description : `${this.description}`,
			internal : this.isInternal
		};
	}
}

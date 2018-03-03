import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { default as User } from './User';
import { default as Privilege } from './UserGroup';

@Table
export default class UserHasPrivilege extends Model<UserHasPrivilege> {
	@ForeignKey(() => User)
	@Column
	public username!: string;

	@ForeignKey(() => Privilege)
	@Column
	public privilegeId!: number;
}

import { default as Project } from './Project';
import { BelongsTo, Column, CreatedAt, ForeignKey, Model, Table
	} from 'sequelize-typescript';
import { default as User } from './User';
import { default as ContributorGroup } from './UserGroup';

@Table
export default class UserJoinsProject extends Model<UserJoinsProject> {
	@ForeignKey(() => User)
	@Column
	public username!: string;

	@ForeignKey(() => Project)
	@Column
	public projectName!: string;

	@CreatedAt
	@Column
	public joinDate!: Date;

	@ForeignKey(() => ContributorGroup)
	@Column
	public contributorGroupId!: number;

	@BelongsTo(() => ContributorGroup)
	public contributorGroup?: ContributorGroup;
}

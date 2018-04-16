import { default as Project } from './Project';
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table
	} from 'sequelize-typescript';
import { default as User } from './User';
import { default as ContributorGroup } from './ContributorGroup';

@Table
export default class UserJoinsProject extends Model<UserJoinsProject> {
	@ForeignKey(() => User)
	@Column
	public username!: string;

	@ForeignKey(() => Project)
	@Column
	public projectName!: string;

	@CreatedAt
	@Column(DataType.DATE)
	public joinDate!: Date;

	@ForeignKey(() => ContributorGroup)
	@Column
	public contributorGroupId!: number;

	@BelongsTo(() => ContributorGroup)
	public contributorGroup?: ContributorGroup;
}

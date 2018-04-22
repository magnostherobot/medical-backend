import { default as ContributorGroup } from './ContributorGroup';
import { default as Project } from './Project';
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table
	} from 'sequelize-typescript';
import { default as User } from './User';

@Table
export default class UserJoinsProject extends Model<UserJoinsProject> {
	@ForeignKey(() => User)
	@Column
	public username!: string;

	@ForeignKey(() => Project)
	@Column
	public projectName!: string;

	@ForeignKey(() => ContributorGroup)
	@Column
	public contributorGroupName!: string;

	@CreatedAt
	@Column(DataType.DATE)
	public joinDate!: Date;

	@BelongsTo(() => ContributorGroup)
	public contributorGroup?: ContributorGroup;
}

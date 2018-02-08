import {Table, Model, Column, ForeignKey, CreatedAt, BelongsTo} from 'sequelize-typescript';
import { default as User } from './User';
import { default as Project } from './Project';
import { default as ContributorGroup } from './UserGroup';

@Table
export default class UserJoinsProject extends Model<UserJoinsProject> {
  @ForeignKey(() => User)
  @Column
  username: string;

  @ForeignKey(() => Project)
  @Column
  projectName: string;

  @CreatedAt
  @Column
  joinDate: Date;

  @ForeignKey(() => ContributorGroup)
  @Column
  contributorGroupId: number;

  @BelongsTo(() => ContributorGroup)
  contributorGroup: ContributorGroup;
}

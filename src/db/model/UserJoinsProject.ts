import * from 'sequelize-typescript';
import { default as User } from './User';
import { default as Project } from './Project';
import { default as ContributorGroup } from './UserGroup';

@Table
export default class UserJoinsProject extends Model<UserJoinsProject> {
  @Column
  @ForeignKey(() => User)
  username: string;

  @Column
  @ForeignKey(() => Project)
  projectName: string;

  @Column
  @CreatedAt
  joinDate: Date;

  @Column
  @ForeignKey(() => ContributorGroup)
  userGroupId: number;
}

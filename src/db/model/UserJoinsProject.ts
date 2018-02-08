import * from 'sequelize-typescript';

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
  @ForeignKey(() => UserGroup)
  userGroupId: number;
}

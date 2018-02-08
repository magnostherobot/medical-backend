import * from 'sequelize-typescript';

@Table
export default class User extends Model<User> {
  @Column
  @PrimaryKey
  username: string;

  @Column
  @NotNull
  password: string;

  @Column
  @ForeignKey(() => UserGroup)
  userGroupId: number;

  @BelongsTo(() => UserGroup)
  userGroup: UserGroup;

  @BelongsToMany(() => Project, () => UserJoinsProject)
  projects: Project[];

  @CreatedAt
  creationDate: Date;
}

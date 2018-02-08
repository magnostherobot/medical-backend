import * from 'sequelize-typescript';
import { default as UserGroup } from './UserGroup';
import { default as Project } from './Project';
import { default as UserJoinsProject } './UserJoinsProject';
import { default as File } './File';

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

  @HasMany(() => File)
  createdFiles: File[];

  @CreatedAt
  creationDate: Date;
}

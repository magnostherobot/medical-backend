import * from 'sequelize-typescript';
import { default as User } from './User';
import { default as UserJoinsProject } from './UserJoinsProject';
import { default as File } from './File';

@Table
export default class Project extends Model<Project> {
  @Column
  @PrimaryKey
  name: string;

  @Column
  @BelongsToMany(() => User, () => UserJoinsProject)
  contributors: User[];

  @Column
  @ForeignKey(() => File)
  rootFolderId: string;

  @BelongsTo(() => File)
  rootFolder: File;

  @Column
  @CreatedAt
  creationDate: Date;

  @Column
  @UpdatedAt
  lastActivity: Date;
}

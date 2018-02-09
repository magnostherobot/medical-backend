import {Table, Model, Column, PrimaryKey, BelongsToMany,
        ForeignKey, BelongsTo, CreatedAt, UpdatedAt} from 'sequelize-typescript';
import { default as User } from './User';
import { default as UserJoinsProject } from './UserJoinsProject';
import { default as File } from './File';

@Table
export default class Project extends Model<Project> {

  @PrimaryKey
  @Column
  name: string;

  @BelongsToMany(() => User, () => UserJoinsProject)
  contributors: User[];

  @ForeignKey(() => File)
  @Column
  rootFolderId: string;

  @BelongsTo(() => File)
  rootFolder: File;

  @CreatedAt
  @Column
  creationDate: Date;

  @UpdatedAt
  @Column
  lastActivity: Date;

  getAccessLevel(arg0: any): any {
      return "unimplemented, Will be db query on UserJoinsProject table";
  }

  getUserInfo(user: User): UserInfo {
      return {
          username: user.username,
          access_level: this.getAccessLevel(user)
      }
  }

  getProjectFullInfo(): ProjectFullInfo {
      return {
          project_name: this.name,
          users: this.contributors.map<UserInfo>(
              (u: User) => this.getUserInfo(u)
          ),
          public_metadata: {
              creation_date: this.creationDate
          },
          //TODO: Check if we have anything to use these for yet?
          private_metadata: {},
          admin_metadata: {}
      };
  }
}

type metadata = {};

type UserInfo = {
    username: string,
    access_level: string
};

type ProjectFullInfo = {
    project_name: string,
    users: UserInfo[],
    public_metadata: metadata,
    private_metadata?: metadata,
    admin_metadata?: metadata
};

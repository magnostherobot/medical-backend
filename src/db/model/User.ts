import {Table, Model, Column, PrimaryKey, ForeignKey, BelongsTo,
        BelongsToMany, HasMany, CreatedAt} from 'sequelize-typescript';
import { default as UserGroup } from './UserGroup';
import { default as Project } from './Project';
import { default as UserJoinsProject } from './UserJoinsProject';
import { default as File } from './File';


@Table
export default class User extends Model<User> {
  @PrimaryKey
  @Column
  username: string;

  @Column
  password: string;

  @ForeignKey(() => UserGroup)
  @Column
  userGroupId: number;

  @BelongsTo(() => UserGroup)
  userGroup: UserGroup;

  @BelongsToMany(() => Project, () => UserJoinsProject)
  projects: Project[];

  @HasMany(() => File)
  createdFiles: File[];

  @CreatedAt
  @Column
  creationDate: Date;

  //TODO implement
  getAccessLevel(project: Project): string {
      return "null";
  }

  getProjectInfo(project: Project): ProjectInfo {
      return {
          project_name: project.name,
          access_level: this.getAccessLevel(project)
      };
  }

  getUserFullInfo() : UserFullInfo {
      return {
          username : this.username,
          privileges : [this.userGroup.name],
          projects : this.projects.map<ProjectInfo>(
              (p: Project) => this.getProjectInfo(p)
          ),
          //TODO: Check if we have anything to use these for yet?
          public_user_metadata: {},
          private_user_metadata: {},
          public_admin_metadata: {},
          private_admin_metadata: {}
      };
  }
}

//TODO MAKE PRETTY below
type metadata = {};

type ProjectInfo = {
    project_name: string,
    access_level: string
};

type UserFullInfo = {
    username: string,
    privileges: string[],
    projects: ProjectInfo[],
    public_user_metadata: metadata,
    private_user_metadata: metadata,
    public_admin_metadata: metadata,
    private_admin_metadata: metadata
};

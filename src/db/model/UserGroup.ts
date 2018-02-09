import {Table, Model, Column, HasMany} from 'sequelize-typescript';
import { default as User } from './User';

type UserPrivilege = {
    privilege: string,
    description: string,
    internal: boolean
}

@Table
export default class UserGroup extends Model<UserGroup> {
  @Column
  name: string;

  @HasMany(() => User)
  users: User[];

  @Column
  canCreateUsers: boolean;

  @Column
  canDeleteUsers: boolean;

  @Column
  canEditUsers: boolean;

  @Column
  canCreateProjects: boolean;

  @Column
  canDeleteProjects: boolean;

  @Column
  canEditProjects: boolean;

  @Column
  isInternal: boolean

  @Column
  description: string;

  getPrivelege() : UserPrivilege {
      return {
          privilege : this.name,
          description : this.description,
          internal : this.isInternal
      }
  }
}

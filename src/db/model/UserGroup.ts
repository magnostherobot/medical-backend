import * from 'sequelize-typescript';
import { default as User } from './User';

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
}

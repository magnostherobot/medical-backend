import * from 'sequelize-typescript';
import { default as User } from './User';

export default class UserGroup extends Model<UserGroup> {
  @Column
  name: string;

  @HasMany(() => User)
  users: User[];

  @Column
  @NotNull
  canCreateUsers: boolean;

  @Column
  @NotNull
  canDeleteUsers: boolean;

  @Column
  @NotNull
  canEditUsers: boolean;

  @Column
  @NotNull
  canCreateProjects: boolean;

  @Column
  @NotNull
  canDeleteProjects: boolean;

  @Column
  @NotNull
  canEditProjects: boolean;
}

import * from 'sequelize-typescript';
import { default as UserJoinsProject } from './UserJoinsProject';

export default class ContributorGroup extends Model<ContributorGroup> {
  @Column
  name: string;

  @HasMany(() => UserJoinsProject)
  uses: UserJoinsProject[];

  @Column
  @NotNull
  canCreateFiles: boolean;

  @Column
  @NotNull
  canDeleteFiles: boolean;

  @Column
  @NotNull
  canViewFiles: boolean;

  @Column
  @NotNull
  canAddUsers: boolean;

  @Column
  @NotNull
  canRemoveUsers: boolean;

  @Column
  @NotNull
  canEditUserPermissions: boolean;
}

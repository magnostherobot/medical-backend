import * from 'sequelize-typescript';
import { default as UserJoinsProject } from './UserJoinsProject';

export default class ContributorGroup extends Model<ContributorGroup> {
  @Column
  @AllowNull
  name: string;

  @HasMany(() => UserJoinsProject)
  uses: UserJoinsProject[];

  @Column
  canCreateFiles: boolean;

  @Column
  canDeleteFiles: boolean;

  @Column
  canViewFiles: boolean;

  @Column
  canAddUsers: boolean;

  @Column
  canRemoveUsers: boolean;

  @Column
  canEditUserPermissions: boolean;
}

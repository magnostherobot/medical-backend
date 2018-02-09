import {Table, Model, Column, AllowNull, HasMany} from 'sequelize-typescript';
import { default as UserJoinsProject } from './UserJoinsProject';

@Table
export default class ContributorGroup extends Model<ContributorGroup> {
  @AllowNull
  @Column
  name: string;

  // "Error: Foreign key for "ContributorGroup" is missing on "UserJoinsProject"."
  @HasMany(() => UserJoinsProject, 'contributorGroupId')
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

  @Column
  description: string;

  @Column
  isInternal: boolean;

  getGroupFullInfo(): GroupFullInfo {
      return {
          role: this.name,
          description: this.description,
          internal: this.isInternal
      };
  }
}

type GroupFullInfo = {
    role: string,
    description: string,
    internal: boolean
};

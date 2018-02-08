import * from 'sequelize-typescript';

@Table
export default class Project extends Model<Project> {
  @Column
  @PrimaryKey
  name: string;

  @Column
  @BelongsToMany(() => User, () => UserJoinsProject)
  contributors: User[];

  @Column
  @CreatedAt
  creationDate: Date;

  @Column
  @UpdatedAt
  lastActivity: Date;
}

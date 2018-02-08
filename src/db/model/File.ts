import * from 'sequelize-typescript';
import { default as User } from './User';
import { default as Project } from './Project';

@Table
export default class File extends Model<File> {
  @Column
  @Unique
  name: string;

  @Column
  @PrimaryKey
  uuid: string;

  @Column
  mimetype: string;

  @Column
  @ForeignKey(() => File)
  @AllowNull
  parentFolderId: string;

  @BelongsTo(() => File)
  @AllowNull
  parentFolder: File;

  @HasMany(() => File)
  containedFiles: File[];

  @Column
  @ForeignKey(() => User)
  @AllowNull
  creatorName: string;

  @BelongsTo(() => User)
  creator: User;

  @BelongsTo(() => Project)
  rootFolderOf: Project;

  @Column
  @CreatedAt
  uploadDate: Date;

  @Column
  @UpdatedAt
  modifyDate: Date;
}

import * from 'sequelize-typescript';
import { default as User } from './User';
import { default as Project } from './Project';

@Table
export default class File extends Model<File> {
  @Column
  @Unique
  @NotNull
  name: string;

  @Column
  @PrimaryKey
  uuid: string;

  @Column
  mimetype: string;

  @Column
  @ForeignKey(() => File)
  parentFolderId: string;

  @BelongsTo(() => File)
  parentFolder: File;

  @HasMany(() => File)
  containedFiles: File[];

  @Column
  @ForeignKey(() => User)
  creatorName: string;

  @BelongsTo(() => User)
  creator: User;

  @BelongsTo(() => Project)
  rootFolderOf: Project;

  @CreatedAt
  uploadDate: Date;

  @UpdatedAt
  modifyDate: Date;
}

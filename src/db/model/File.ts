import {Table, Model, Column, Unique, PrimaryKey, ForeignKey, AllowNull,
        HasMany, BelongsTo, CreatedAt, UpdatedAt, HasOne} from 'sequelize-typescript';
import { default as User } from './User';
import { default as Project } from './Project';

@Table
export default class File extends Model<File> {
  @Column
  name: string;

  @PrimaryKey
  @Column
  uuid: string;

  @Column
  mimetype: string;

  @ForeignKey(() => File)
  @AllowNull
  @Column
  parentFolderId: string;

  @BelongsTo(() => File)
  parentFolder: File;

  @HasMany(() => File)
  containedFiles: File[];

  @ForeignKey(() => User)
  @AllowNull
  @Column
  creatorName: string;

  @BelongsTo(() => User)
  creator: User;
 
  @HasOne(() => Project)
  rootFolderOf: Project;

  @CreatedAt
  @Column
  uploadDate: Date;

  @UpdatedAt
  @Column
  modifyDate: Date;
}

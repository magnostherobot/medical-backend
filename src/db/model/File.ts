import * from 'sequelize-typescript';

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

  @CreatedAt
  uploadDate: Date;

  @UpdatedAt
  modifyDate: Date;
}

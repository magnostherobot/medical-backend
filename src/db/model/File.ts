import { default as Project } from './Project';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany,
		HasOne, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { default as User } from './User';

@Table
export default class File extends Model<File> {
	@AllowNull
	@Column
	public name!: string;

	@PrimaryKey
	@Column
	public uuid!: string;

	@Column
	public mimetype!: string;

	@ForeignKey(() => File)
	@AllowNull
	@Column(DataType.TEXT)
	public parentFolderId!: string | null;

	@BelongsTo(() => File)
	public parentFolder?: File;

	@HasMany(() => File)
	public containedFilesInternal?: File[];

	@ForeignKey(() => User)
	@AllowNull
	@Column(DataType.TEXT)
	public creatorName!: string | null;

	@BelongsTo(() => User)
	public creator?: User;

	@HasOne(() => Project)
	public rootFolderOf?: Project;

	@CreatedAt
	@Column(DataType.DATE)
	public uploadDate!: Date;

	@UpdatedAt
	@Column(DataType.DATE)
	public modifyDate!: Date;

	public get containedFiles(): File[] {
		if (this.containedFilesInternal === undefined) {
			throw new Error('containedFiles is undefined');
		}
		return this.containedFilesInternal;
	}

	public set containedFiles(files: File[]) {
		this.containedFilesInternal = files;
	}
}

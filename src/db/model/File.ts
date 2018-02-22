import { default as Project } from './Project';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany,
		HasOne, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { default as User } from './User';

@Table
export default class File extends Model<File> {
	@Column
	public name: string = '';

	@PrimaryKey
	@Column
	public uuid: string = '';

	@Column
	public mimetype: string = '';

	@ForeignKey(() => File)
	@AllowNull
	@Column(DataType.TEXT)
	public parentFolderId: string | null = null;

	@BelongsTo(() => File)
	public parentFolder: File = new File();

	@HasMany(() => File)
	public containedFiles: File[] = [];

	@ForeignKey(() => User)
	@AllowNull
	@Column(DataType.TEXT)
	public creatorName: string | null = null;

	@BelongsTo(() => User)
	public creator: User = new User();

	@HasOne(() => Project)
	public rootFolderOf: Project = new Project();

	@CreatedAt
	@Column
	public uploadDate: Date = new Date();

	@UpdatedAt
	@Column
	public modifyDate: Date = new Date();
}

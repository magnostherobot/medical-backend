import { default as Project } from './Project';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany,
		HasOne, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { default as User } from './User';

import { FileTypeName, mimes } from '../../files';

/*
 * attributes:
 * 	- nameInternal
 *  - fullPathInternal
 * 	- uuid
 * 	- type
 *  - size
 * 	- parentFolderId
 *  - containedFilesInternal
 * 	- creatorName
 *  - creator
 *  - rootFolderOf
 *  - uploadDate
 *  - modifyDate
 *  - status
 *  - metadataInternal
*/

@Table
export default class File extends Model<File> {
	@AllowNull
	@Column
	private nameInternal!: string;

	@AllowNull
	@Column
	private fullPathInternal!: string;

	@PrimaryKey
	@Column
	public uuid!: string;

	@Column(DataType.TEXT)
	public type!: FileTypeName;

	@Column
	public size!: number;

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

	@Column
	public status!: string;

	@Column
	private metadataInternal!: string;

	public get name(): string {
		return this.nameInternal;
	}

	public set name(name: string) {
		this.nameInternal = name;
		this.fullPathInternal = this.fullPathInternal.substring(
			0,
			this.fullPathInternal.lastIndexOf('/') + 1
		) + this.name;
	}

	public get fullPath(): string {
		return this.fullPathInternal;
	}

	public set fullPath(path: string) {
		this.fullPathInternal = path;
		this.nameInternal = this.fullPath.substring(
			this.fullPathInternal.lastIndexOf('/') + 1
		);
	}

	public get containedFiles(): File[] {
		if (this.containedFilesInternal === undefined) {
			throw new Error('containedFiles is undefined');
		}
		return this.containedFilesInternal;
	}

	public set containedFiles(files: File[]) {
		this.containedFilesInternal = files;
	}

	public get metadata(): object {
		return JSON.parse(this.metadataInternal);
	}

	public set metadata(metadata: object) {
		this.metadataInternal = JSON.stringify(metadata);
	}

	public set mimetype(mime: string) {
		this.type = mimes.get(mime) || 'generic';
	}
}

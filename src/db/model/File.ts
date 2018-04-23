import { default as Project } from './Project';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany,
		HasOne, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';
import { default as User } from './User';

import { RequestError } from '../../errors';
import { FileTypeName, INITIAL_METADATA, Metadata, mimes } from '../../files';
import { match, metadata } from '../../matcher';

/*
 * attributes:
 * 	- nameInternal
 *  - fullPathInternal
 * 	- uuid
 * 	- type
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
	public nameInternal!: string;

	@AllowNull
	@Column
	public fullPathInternal!: string;

	@PrimaryKey
	@Column
	public uuid!: string;

	@Column(DataType.TEXT)
	public type!: FileTypeName;

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
	public originalMimetype!: string;

	@Column
	private metadataInternal!: string;

	public get name(): string {
		return this.nameInternal;
	}

	public set name(name: string) {
		this.nameInternal = name;
		if (this.fullPathInternal) {
			this.fullPathInternal = this.fullPathInternal.substring(
				0,
				this.fullPathInternal.lastIndexOf('/') + 1
			) + this.name;
		} else {
			this.fullPathInternal = this.name;
		}
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

	public get metadata(): Metadata {
		return !!(this.metadataInternal) ? JSON.parse(this.metadataInternal)
		: INITIAL_METADATA;
	}

	public set metadata(md: Metadata) {
		const oldMD: Metadata = this.metadata;
		const newMD: Metadata = md;
		if (!match(metadata, newMD)) {
			throw new RequestError(400, 'invalid_request');
		}
		if (newMD.version !== oldMD.version + 1) {
			throw new RequestError(400, 'invalid_request');
		}
		this.metadataInternal = JSON.stringify(newMD);
	}
	public setMetadataInternal(md: Metadata): void {
		this.metadataInternal = JSON.stringify(md);
	}

	public set mimetype(mime: string) {
		this.originalMimetype = mime;
		this.type = mimes.get(mime) || 'generic';
	}
}

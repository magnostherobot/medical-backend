import * as fromData from 'file-type';
import { lookup as fromName } from 'mime-types';

const DEFAULT_MIMETYPE: string = 'application/octet-stream';

export const mimetype: (
	contentType?: string, data?: Buffer, name?: string
) => string = (
	contentType?: string, data?: Buffer, name?: string
): string => {
	if (contentType && contentType !== DEFAULT_MIMETYPE) {
		return contentType;
	}
	if (data) {
		const fType: fromData.FileTypeResult = fromData(data);
		if (fType) {
			return fType.mime;
		}
	}
	if (name) {
		const mType: string | false = fromName(name);
		if (mType) {
			return mType;
		}
	}
	return DEFAULT_MIMETYPE;
};

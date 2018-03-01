import { v4 } from 'uuid';

export const uuid: {
	generate: () => string;
} = {
	generate: v4
};

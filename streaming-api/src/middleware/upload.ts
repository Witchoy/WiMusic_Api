import multer from 'multer';
import type { Request as ExpressRequest } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Configure disk storage for uploaded files
const storage = multer.diskStorage({
	destination: (
		_: ExpressRequest,
		__: Express.Multer.File,
		callback: CallableFunction,
	) => {
		// Save files to 'media' folder
		callback(null, 'media');
	},
	filename: (_, file, callback) => {
		// Generate a unique filename with original extension
		const extension = file.originalname.split('.').pop() || 'mp3';
		callback(null, `${uuidv4()}.${extension}`);
	},
});

// Filter to allow only mp3 files
const fileFilter = (
	_: ExpressRequest,
	file: Express.Multer.File,
	callback: CallableFunction,
) => {
	if (!file.originalname.match(/\.(mp3)$/))
		// Reject non-mp3 files
		return callback(
			new Error('Only mp3 files are allowed'),
			false,
		);
	// Accept mp3 files
	callback(null, true);
};

// Export multer configuration
export const configurationStorage = () => multer({ storage, fileFilter });
import path from "path";
import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env file
dotenvConfig();

const validateRequiredEnvVars = (): void => {
	const requiredEnvVars = [
		'DATABASE_URL'
	];

	const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
	
	if (missingVars.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missingVars.join(', ')}\n` +
			'Please check your .env file and ensure all required variables are set.'
		);
	}
};

const validateEnvValues = (): void => {
	const port = process.env.PORT;
	if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
		throw new Error(`Invalid PORT value: ${port}. Must be a number between 1 and 65535.`);
	}
};

if (process.env.NODE_ENV !== 'test') {
	validateRequiredEnvVars();
	validateEnvValues();
}

export const config = {
	mediaRoot: path.resolve('./media'),
	port: Number(process.env.PORT) || 3000,
	databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
	nodeEnv: process.env.NODE_ENV || 'development',
};
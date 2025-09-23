import path from "path";

export const config = {
	mediaRoot: path.resolve('./media'),
	port: process.env.PORT || 3000,
	databaseUrl: process.env.DATABASE_URL || 'file:./dev.db'
};
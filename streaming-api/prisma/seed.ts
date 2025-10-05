import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Starting database seeding...');

	try {
		console.log('Seeding file is empty.')
	} catch (error) {
		console.error('❌ Error during seeding:', error);
		throw error;
	}
}

main()
	.then(async () => {
		console.log('🏁 Seeding completed successfully!');
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error('💥 Seeding failed:', e);
		await prisma.$disconnect();
		process.exit(1);
	});
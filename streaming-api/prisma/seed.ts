import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
	console.log('🌱 Starting database seeding...');

	try {
		console.log('🧹 Clearing existing data...');
		await prisma.artistTrack.deleteMany();
		await prisma.trackAlbum.deleteMany();
		await prisma.artistAlbum.deleteMany();
		await prisma.track.deleteMany();
		await prisma.artist.deleteMany();
		await prisma.album.deleteMany();

		// Seed artists
		console.log('🎤 Creating artists...');
		await prisma.artist.createMany({
			data: [
				{ name: 'Alex MakeMusic' },
			]
		});

		// Seed albums
		console.log('💽 Creating albums...');
		await prisma.album.createMany({
			data: [
				{ title: 'nothing' },
			]
		});

		// Seed tracks
		console.log('🎵 Creating tracks...');
		await prisma.track.createMany({
			data: [
				{ title: 'Running Night', filePath: './media/running-night.mp3' },
			]
		});

		// Get the created records to use their IDs for relationships
		const artists = await prisma.artist.findMany();
		const albums = await prisma.album.findMany();
		const tracks = await prisma.track.findMany();

		// Create relationships using the actual IDs
		console.log('🔗 Creating relationships...');

		// Artist-Track relationships
		await prisma.artistTrack.createMany({
			data: [
				{
					artistId: artists.find(a => a.name === 'Alex MakeMusic')!.id,
					trackId: tracks.find(t => t.title === 'Running Night')!.id
				}
			]
		});

		// Track-Album relationships
		await prisma.trackAlbum.createMany({
			data: [
				{
					trackId: tracks.find(t => t.title === 'Running Night')!.id,
					albumId: albums.find(a => a.title === 'nothing')!.id
				}
			]
		});

		// Artist-Album relationships
		await prisma.artistAlbum.createMany({
			data: [
				{
					artistId: artists.find(a => a.name === 'Alex MakeMusic')!.id,
					albumId: albums.find(a => a.title === 'nothing')!.id
				}
			]
		});

		console.log('✅ Database seeded successfully!');
		console.log(`Created ${artists.length} artists, ${albums.length} albums, ${tracks.length} tracks`);

	} catch (error) {
		console.error('❌ Error during seeding:', error);
		throw error;
	}
}

main()
	.then(async () => {
		console.log('🏁 Seeding completed');
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error('💥 Seeding failed:', e);
		await prisma.$disconnect();
		process.exit(1);
	});
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
				{ name: 'System Of A Down' },
				{ name: 'Vundabar' },
			]
		});

		// Seed albums
		console.log('💽 Creating albums...');
		await prisma.album.createMany({
			data: [
				{ title: 'Toxicity' }, // System Of A Down
				{ title: 'Antics' }, // Vundabar Album 1
				{ title: 'Either Light' }, // Vundabar Album 2
			]
		});

		// Seed tracks
		console.log('🎵 Creating tracks...');
		await prisma.track.createMany({
			data: [
				// System Of A Down - Toxicity (2 songs)
				{ title: 'Chop Suey!', filePath: './media/chop-suey.mp3' },
				{ title: 'Toxicity', filePath: './media/toxicity.mp3' },
				
				// Vundabar - Antics (1 song)
				{ title: 'Kalidasa', filePath: './media/kalidasa.mp3' },
				
				// Vundabar - Either Light (2 songs)
				{ title: 'Alien Blues', filePath: './media/alien-blues.mp3' },
				{ title: 'Cotton Kid', filePath: './media/cotton-kid.mp3' },
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
				// System Of A Down tracks
				{
					artistId: artists.find(a => a.name === 'System Of A Down')!.id,
					trackId: tracks.find(t => t.title === 'Chop Suey!')!.id
				},
				{
					artistId: artists.find(a => a.name === 'System Of A Down')!.id,
					trackId: tracks.find(t => t.title === 'Toxicity')!.id
				},
				// Vundabar tracks
				{
					artistId: artists.find(a => a.name === 'Vundabar')!.id,
					trackId: tracks.find(t => t.title === 'Kalidasa')!.id
				},
				{
					artistId: artists.find(a => a.name === 'Vundabar')!.id,
					trackId: tracks.find(t => t.title === 'Alien Blues')!.id
				},
				{
					artistId: artists.find(a => a.name === 'Vundabar')!.id,
					trackId: tracks.find(t => t.title === 'Cotton Kid')!.id
				}
			]
		});

		// Track-Album relationships
		await prisma.trackAlbum.createMany({
			data: [
				// System Of A Down - Toxicity album
				{
					trackId: tracks.find(t => t.title === 'Chop Suey!')!.id,
					albumId: albums.find(a => a.title === 'Toxicity')!.id
				},
				{
					trackId: tracks.find(t => t.title === 'Toxicity')!.id,
					albumId: albums.find(a => a.title === 'Toxicity')!.id
				},
				// Vundabar - Antics album
				{
					trackId: tracks.find(t => t.title === 'Kalidasa')!.id,
					albumId: albums.find(a => a.title === 'Antics')!.id
				},
				// Vundabar - Either Light album
				{
					trackId: tracks.find(t => t.title === 'Alien Blues')!.id,
					albumId: albums.find(a => a.title === 'Either Light')!.id
				},
				{
					trackId: tracks.find(t => t.title === 'Cotton Kid')!.id,
					albumId: albums.find(a => a.title === 'Either Light')!.id
				}
			]
		});

		// Artist-Album relationships
		await prisma.artistAlbum.createMany({
			data: [
				// System Of A Down - Toxicity
				{
					artistId: artists.find(a => a.name === 'System Of A Down')!.id,
					albumId: albums.find(a => a.title === 'Toxicity')!.id
				},
				// Vundabar - Antics
				{
					artistId: artists.find(a => a.name === 'Vundabar')!.id,
					albumId: albums.find(a => a.title === 'Antics')!.id
				},
				// Vundabar - Either Light
				{
					artistId: artists.find(a => a.name === 'Vundabar')!.id,
					albumId: albums.find(a => a.title === 'Either Light')!.id
				}
			]
		});

		console.log('✅ Database seeded successfully!');
		console.log(`Created ${artists.length} artists, ${albums.length} albums, ${tracks.length} tracks`);
		console.log('🎵 Artists: System Of A Down, Vundabar');
		console.log('💽 Albums: Toxicity, Antics, Either Light');
		console.log('🎶 Tracks: Chop Suey!, Toxicity, Kalidasa, Alien Blues, Cotton Kid');

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
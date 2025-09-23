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
        { name: 'The Skallywags' },
        { name: 'Vundabar' },
      ]
    });

    // Seed albums
    console.log('💽 Creating albums...');
    await prisma.album.createMany({
      data: [
        { title: 'Toxicity' },
        { title: 'Estate of Intent' },
        { title: 'Devil for the Fire' },
      ]
    });

    // Seed tracks
    console.log('🎵 Creating tracks...');
    await prisma.track.createMany({
      data: [
        { title: 'Chop Suey!' },
        { title: 'Don\'t Preach to Me' },
        { title: 'Ringing Bell' },
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
          artistId: artists.find(a => a.name === 'System Of A Down')!.id, 
          trackId: tracks.find(t => t.title === 'Chop Suey!')!.id 
        },
        { 
          artistId: artists.find(a => a.name === 'The Skallywags')!.id, 
          trackId: tracks.find(t => t.title === 'Don\'t Preach to Me')!.id 
        },
        { 
          artistId: artists.find(a => a.name === 'Vundabar')!.id, 
          trackId: tracks.find(t => t.title === 'Ringing Bell')!.id 
        },
      ]
    });

    // Track-Album relationships
    await prisma.trackAlbum.createMany({
      data: [
        { 
          trackId: tracks.find(t => t.title === 'Chop Suey!')!.id,
          albumId: albums.find(a => a.title === 'Toxicity')!.id 
        },
        { 
          trackId: tracks.find(t => t.title === 'Don\'t Preach to Me')!.id,
          albumId: albums.find(a => a.title === 'Estate of Intent')!.id 
        },
        { 
          trackId: tracks.find(t => t.title === 'Ringing Bell')!.id,
          albumId: albums.find(a => a.title === 'Devil for the Fire')!.id 
        },
      ]
    });

    // Artist-Album relationships
    await prisma.artistAlbum.createMany({
      data: [
        { 
          artistId: artists.find(a => a.name === 'System Of A Down')!.id,
          albumId: albums.find(a => a.title === 'Toxicity')!.id 
        },
        { 
          artistId: artists.find(a => a.name === 'The Skallywags')!.id,
          albumId: albums.find(a => a.title === 'Estate of Intent')!.id 
        },
        { 
          artistId: artists.find(a => a.name === 'Vundabar')!.id,
          albumId: albums.find(a => a.title === 'Devil for the Fire')!.id 
        },
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
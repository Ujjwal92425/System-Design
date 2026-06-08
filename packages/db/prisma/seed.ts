import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');
  
  // Seed an Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sdos.academy' },
    update: {},
    create: {
      email: 'admin@sdos.academy',
      name: 'OS Architect',
      role: 'ADMIN',
    }
  });

  // Seed Track 1
  const track1 = await prisma.track.upsert({
    where: { slug: 'system-design-foundations' },
    update: {},
    create: {
      slug: 'system-design-foundations',
      name: 'System Design Foundations',
      description: 'Master the fundamental building blocks of scalable, distributed systems.',
      level: 1,
      order: 1,
      isPublished: true
    }
  });

  console.log('Database seeding completed. Admin User:', admin.email, 'Track 1:', track1.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

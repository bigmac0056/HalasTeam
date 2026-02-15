const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            name: 'Test User',
            password: 'password123',
        },
    });

    const device = await prisma.device.create({
        data: {
            userId: user.id,
            name: 'Living Room Light',
            room: 'Living Room',
            type: 'Light',
            source: 'Phillips Hue',
            status: false,
        },
    });

    console.log({ user, device });
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })

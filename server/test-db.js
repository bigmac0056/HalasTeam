const { addUser, findUserByEmail, prisma } = require('./state');

async function test() {
    try {
        console.log('Testing DB connection...');
        const email = `test-${Date.now()}@example.com`;
        console.log(`Attempting to add user: ${email}`);

        const user = await addUser({
            email,
            password: 'hashedpassword123',
            name: 'Test User'
        });

        console.log('User created successfully:', user);

        const found = await findUserByEmail(email);
        console.log('User found by email:', found);

    } catch (error) {
        console.error('TEST FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();

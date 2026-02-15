const { setHomeMode, addDevice, updateDevice, findDeviceById, deleteDevice } = require('./state');

async function verifyNightMode() {
    console.log('--- Starting Night Mode Verification ---');

    // 1. Create a dummy light
    const mockUserId = 'test-user-id'; // We might need a real user ID or mock the DB calls if no user exists. 
    // Wait, state.js uses prisma. If I run this standalone, I need a valid user ID. 
    // I'll assume there's at least one user or I capture one.

    // Actually, let's use the existing state.js functions. 
    // I need to fetch a user first to get a valid ID.
    const { prisma } = require('./state');
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error('No users found in DB. Cannot test.');
        process.exit(1);
    }

    const userId = user.id;
    console.log(`Using User ID: ${userId}`);

    // 2. Add a test light
    const device = await addDevice({
        userId,
        name: 'Test Night Light',
        room: 'Test Room',
        type: 'Light',
        source: 'Test',
        status: true // Initially ON
    });
    console.log(`Created Test Device: ${device.name} (ID: ${device.id}) - Status: ${device.status}`);

    // 3. Set Home Mode to Night
    console.log('Setting Home Mode to Night...');
    const result = await setHomeMode(userId, 'Night');
    console.log('Mode update result:', result);

    // 4. Verify Device Status
    const updatedDevice = await findDeviceById(device.id, userId);
    console.log(`Updated Device Status: ${updatedDevice.status}`);

    if (updatedDevice.status === false) {
        console.log('SUCCESS: Light turned off in Night Mode.');
    } else {
        console.error('FAILURE: Light remained ON in Night Mode.');
    }

    // 5. Cleanup
    await deleteDevice(device.id, userId);
    console.log('Test device deleted.');

    // Reset mode to Home to not mess up state
    await setHomeMode(userId, 'Home');
    console.log('Mode reset to Home.');

    await prisma.$disconnect();
}

verifyNightMode().catch(e => {
    console.error(e);
    process.exit(1);
});

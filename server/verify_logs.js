const axios = require('axios');

const API_URL = 'http://localhost:3000';
const EMAIL = 'admin@example.com';
const PASSWORD = 'password123';

async function run() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('Logged in.');

        // 2. Test Anti-spam
        const msg = `Test Log ${Date.now()}`;
        console.log(`Sending log: "${msg}"`);
        await axios.post(`${API_URL}/automation/logs`, { message: msg }, { headers });

        console.log('Sending duplicate log (should be skipped/ignored by backend logic)...');
        try {
            await axios.post(`${API_URL}/automation/logs`, { message: msg }, { headers });
        } catch (e) {
            // It might not throw error, just verified by count later or backend logs
            console.log('Duplicate request sent.');
        }

        // 3. Check Logs
        const logsRes = await axios.get(`${API_URL}/automation/logs`, { headers });
        const logs = logsRes.data.logs;
        const matching = logs.filter(l => l.message === msg);
        console.log(`Found ${matching.length} entries for "${msg}"`);
        if (matching.length === 1) {
            console.log('✅ Anti-spam verified: Only 1 log entry found.');
        } else {
            console.log('❌ Anti-spam failed: Found ' + matching.length);
        }

        // 4. Test Delete
        console.log('Deleting all logs...');
        const delRes = await axios.delete(`${API_URL}/automation/logs?all=true`, { headers });
        console.log(`Deleted ${delRes.data.count} logs.`);

        const emptyRes = await axios.get(`${API_URL}/automation/logs`, { headers });
        // The delete action itself adds a log "Logs cleared", so we expect 1 log
        if (emptyRes.data.logs.length === 1 && emptyRes.data.logs[0].message.includes('Журнал очищен')) {
            console.log('✅ Delete verified: Only "cleared" log remains.');
        } else if (emptyRes.data.logs.length === 0) {
            console.log('✅ Delete verified: Logs empty.');
        } else {
            console.log('❌ Delete failed. Logs remaining: ' + emptyRes.data.logs.length);
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

run();

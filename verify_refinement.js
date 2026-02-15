const TariffService = require('./server/services/tariffService');

async function verify() {
    console.log("--- Verifying TariffService Refinement ---");

    // 1. Pavlodar Geolocation
    const pavlodarCoords = { lat: 52.287, lon: 76.967 };
    console.log(`\nTesting Geolocation for Pavlodar (Lat: ${pavlodarCoords.lat}, Lon: ${pavlodarCoords.lon})...`);

    const region = await TariffService.resolveRegion(pavlodarCoords.lat, pavlodarCoords.lon);
    console.log(`Resolved Region: ${region}`);

    if (region === 'Pavlodar') {
        console.log("✅ SUCCESS: Pavlodar correctly identified.");
    } else {
        console.error(`❌ FAILURE: Expected 'Pavlodar', got '${region}'`);
    }

    // 2. Cost Calculation (Real Data Simulation)
    console.log("\nTesting Cost Calculation for 250 kWh in Pavlodar...");
    // Note: We might not have a dedicated Pavlodar provider in tariffs.json yet.
    // If not, it might fall back or error. Let's see.
    // If no provider, resolveTariff returns error.
    // For the purpose of the test, if it returns error, we know we need to add Pavlodar provider to json.
    // But the Mock/Manual parser might handle it if we seeded it? 
    // Wait, I didn't add Pavlodar to tariffs.json.
    // I only added it to resolveRegion.
    // If I want it to work end-to-end, I should probably add a mock provider for Pavlodar or fallback to a default provider?
    // TariffService.getProviderByRegion looks for region match.
    // If I return 'Pavlodar', and 'Pavlodar' isn't in tariffs.json, it will fail.

    // Let's check if it fails.
    const tariff = await TariffService.resolveTariff({
        ...pavlodarCoords,
        monthlyKwh: 250,
        stoveType: 'electric',
        peopleCount: 3
    });

    console.log("Tariff Result:", JSON.stringify(tariff, null, 2));

    if (tariff.error) {
        console.warn("⚠️  Tariff resolution returned error (expected if Pavlodar data missing).");
        console.warn("Action: Add Pavlodar provider to tariffs.json for completeness.");
    } else {
        console.log(`✅ Cost: ${tariff.totalKzt} KZT`);
    }
}

verify();

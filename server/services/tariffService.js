const fs = require('fs');
const path = require('path');
const BaseParser = require('./parsers/BaseParser');
const ManualParser = require('./parsers/ManualParser');
const EkrecParser = require('./parsers/EkrecParser');

const DATA_FILE = path.join(__dirname, '../data/tariffs.json');

// Helper to load data
const loadData = () => {
    if (!fs.existsSync(DATA_FILE)) return { providers: [], snapshots: {} };
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

const getParser = (provider) => {
    switch (provider.parser) {
        case 'ekrec': return new EkrecParser(provider.id, provider.region);
        case 'manual': return new ManualParser(provider.id, provider.region);
        default: return new ManualParser(provider.id, provider.region);
    }
};

const TariffService = {
    refreshTariffs: async () => {
        const data = loadData();
        const results = [];
        console.log("Starting tariff refresh...");

        for (const provider of data.providers) {
            try {
                const parser = getParser(provider);
                const snapshot = await parser.parse();
                data.snapshots[provider.id] = snapshot;
                results.push({ provider: provider.id, status: 'updated', date: snapshot.effectiveDate });
            } catch (err) {
                console.error(`Failed to refresh ${provider.id}:`, err.message);
                results.push({ provider: provider.id, status: 'failed', error: err.message });
            }
        }
        // fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); // Mock save
        return results;
    },

    // Get all supported cities
    getAllSupportedCities: function () {
        const providers = this.getProviders();
        return providers.map(p => ({
            city: p.city,
            region: p.region,
            name: p.name,
            lat: p.coordinates?.lat,
            lon: p.coordinates?.lon
        }));
    },

    // Geocoding: maps lat/lon to a known region
    resolveRegion: async (lat, lon) => {
        const providers = TariffService.getProviders();
        if (!providers || providers.length === 0) return null;

        const R = 6371; // Radius of the earth in km
        let closestCity = null;
        let minDistance = Infinity;
        const MAX_DISTANCE_KM = 250; // Threshold

        providers.forEach(p => {
            if (p.coordinates) {
                const dLat = (p.coordinates.lat - lat) * (Math.PI / 180);
                const dLon = (p.coordinates.lon - lon) * (Math.PI / 180);
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat * (Math.PI / 180)) * Math.cos(p.coordinates.lat * (Math.PI / 180)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = R * c;

                if (d < minDistance) {
                    minDistance = d;
                    closestCity = p.city;
                }
            }
        });

        if (closestCity && minDistance <= MAX_DISTANCE_KM) {
            return closestCity;
        }

        return null; // Unknown region
    },

    getProviders: () => {
        const data = loadData();
        return data.providers;
    },

    getProviderByRegion: (region) => {
        const data = loadData();
        return data.providers.find(p => p.region.toLowerCase() === region.toLowerCase() || p.city.toLowerCase() === region.toLowerCase());
    },

    resolveTariff: async ({ lat, lon, monthlyKwh, stoveType = 'electric', peopleCount = 1 }) => {
        const region = await TariffService.resolveRegion(lat, lon);

        if (!region) {
            return {
                error: "Region not identified",
                city: "Не определен",
                region: "Unknown",
                provider: "Нет данных",
                totalKzt: 0,
                tariffBreakdown: [],
                enteredLocation: { lat, lon }
            };
        }

        const provider = TariffService.getProviderByRegion(region);

        if (!provider) {
            return {
                error: "Provider not found for this region",
                region,
                city: region,
                calculatedLocation: { lat, lon }
            };
        }

        // Use new tariff structure from JSON
        const tariffs = provider.tariffs?.electric?.tiers;

        if (!tariffs) {
            return {
                error: "Tariff data unavailable for this provider",
                provider: provider.name,
                region,
                city: provider.city
            };
        }

        // Calculate Cost
        let remainingKwh = Number(monthlyKwh);
        let totalCost = 0;
        const breakdown = [];
        let previousLimit = 0;

        for (const tier of tariffs) {
            if (remainingKwh <= 0) break;

            // Tier limits in JSON are usually "up to X".
            // null limit means "rest".
            // We apply per-person scaling logic if it's small (<=150)

            const rawLimit = tier.limit === null ? Infinity : tier.limit;
            let effectiveLimit = rawLimit;

            // Simple heuristic: if limit is small (<200), it's likely per person.
            // If it's big (>500), it's likely per household?
            // For now, let's assume raw limits are per person (standard KZ practice).
            if (rawLimit !== Infinity) {
                effectiveLimit = rawLimit * peopleCount;
            }

            // Calculate tier size (delta)
            // Previous limit also needs scaling
            // Wait, usually tiers are "0-90", "90-140", "140+".
            // So Tier 1 size = 90. Tier 2 size = 140 - 90 = 50.
            // If scaled: Tier 1 size = 90*N. Tier 2 size = 50*N.
            // Let's calculate the 'tier bucket size'

            // Actually, the structure in JSON is slightly ambiguous: "limit: 90" means "0 to 90" or "chunk size 90"?
            // Usually it means "up to 90".
            // So:
            // Tier 1: 0 -> 90.
            // Tier 2: 90 -> 140.
            // Tier 3: 140 -> Infinity.

            // Let's implement this standard interpretation.

            const previousLimitScaled = previousLimit * peopleCount;
            const currentLimitScaled = rawLimit === Infinity ? Infinity : rawLimit * peopleCount;

            const tierCapacity = currentLimitScaled === Infinity ? Infinity : (currentLimitScaled - previousLimitScaled);

            const kwhInThisTier = Math.min(remainingKwh, tierCapacity);
            const costForTier = kwhInThisTier * tier.price;

            breakdown.push({
                tier: breakdown.length + 1,
                kwh: Number(kwhInThisTier.toFixed(1)),
                price: tier.price,
                cost: Math.round(costForTier)
            });

            totalCost += costForTier;
            remainingKwh -= kwhInThisTier;
            previousLimit = rawLimit;
        }

        return {
            city: provider.city,
            region: provider.region,
            provider: provider.name,
            effectiveDate: "2024-03-01",
            vatIncluded: true,
            tariffBreakdown: breakdown,
            totalKzt: Math.round(totalCost),
            sourceUrl: provider.website,
            dataStatus: 'fresh'
        };
    }
};

module.exports = TariffService;

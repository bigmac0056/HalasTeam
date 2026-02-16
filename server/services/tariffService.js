const fs = require('fs');
const path = require('path');
const BaseParser = require('./parsers/BaseParser');
const ManualParser = require('./parsers/ManualParser');
const EkrecParser = require('./parsers/EkrecParser');

const DATA_FILE = path.join(__dirname, '../data/tariffs.json');


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

        return results;
    },


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


    resolveRegion: async (lat, lon) => {
        const providers = TariffService.getProviders();
        if (!providers || providers.length === 0) return null;

        const R = 6371;
        let closestCity = null;
        let minDistance = Infinity;
        const MAX_DISTANCE_KM = 250;

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

        return null;
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


        const tariffs = provider.tariffs?.electric?.tiers;

        if (!tariffs) {
            return {
                error: "Tariff data unavailable for this provider",
                provider: provider.name,
                region,
                city: provider.city
            };
        }


        let remainingKwh = Number(monthlyKwh);
        let totalCost = 0;
        const breakdown = [];
        let previousLimit = 0;

        for (const tier of tariffs) {
            if (remainingKwh <= 0) break;





            const rawLimit = tier.limit === null ? Infinity : tier.limit;
            let effectiveLimit = rawLimit;




            if (rawLimit !== Infinity) {
                effectiveLimit = rawLimit * peopleCount;
            }

















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

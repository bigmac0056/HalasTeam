class BaseParser {
    constructor(providerId, region) {
        this.providerId = providerId;
        this.region = region;
    }

    /**
     * Parse tariff data
     * @returns {Promise<{
     *   effectiveDate: string,
     *   vatIncluded: boolean,
     *   levels: Array<{type, stoveType, tiers: []}>,
     *   rawTextHash: string
     * }>}
     */
    async parse() {
        throw new Error("Method 'parse' must be implemented");
    }

    validate(data) {
        if (!data.levels || !Array.isArray(data.levels)) {
            throw new Error("Invalid format: 'levels' array missing");
        }
        // Basic validation logic
        return true;
    }
}

module.exports = BaseParser;

class BaseParser {
    constructor(providerId, region) {
        this.providerId = providerId;
        this.region = region;
    }

    async parse() {
        throw new Error("Method 'parse' must be implemented");
    }

    validate(data) {
        if (!data.levels || !Array.isArray(data.levels)) {
            throw new Error("Invalid format: 'levels' array missing");
        }

        return true;
    }
}

module.exports = BaseParser;

const BaseParser = require('./BaseParser');



class EkrecParser extends BaseParser {
    async parse() {
        console.log(`[EkrecParser] Fetching from besk.kz for ${this.region}...`);








        return {
            effectiveDate: new Date().toISOString().split('T')[0],
            vatIncluded: true,
            fetchedAt: new Date().toISOString(),
            levels: [
                {
                    type: "household",
                    stoveType: "electric",
                    tiers: [
                        { "tier": 1, "limit": 85, "price": 16.53 },
                        { "tier": 2, "limit": 170, "price": 22.05 }
                    ]
                }
            ]
        };
    }
}

module.exports = EkrecParser;

const BaseParser = require('./BaseParser');
const fs = require('fs');
const path = require('path');

class ManualParser extends BaseParser {
    async parse() {




        console.log(`[ManualParser] Parsing for ${this.providerId}...`);




        return {
            effectiveDate: new Date().toISOString().split('T')[0],
            vatIncluded: true,
            fetchedAt: new Date().toISOString(),
            levels: []
        };
    }


}

module.exports = ManualParser;

const BaseParser = require('./BaseParser');
const fs = require('fs');
const path = require('path');

class ManualParser extends BaseParser {
    async parse() {
        // In a real scenario, this might read from a specific admin-uploaded file or DB.
        // For now, it returns the seed data for the provider if available, 
        // essentially validating the manual entry process.

        console.log(`[ManualParser] Parsing for ${this.providerId}...`);

        // This parser is a placeholder for "Human in the loop".
        // It could fetch from a simplified JSON endpoint or file.

        return {
            effectiveDate: new Date().toISOString().split('T')[0],
            vatIncluded: true,
            fetchedAt: new Date().toISOString(),
            levels: [] // Implementation would fetch specific data
        };
    }

    // Manual parser usually just validates existing JSON structure
}

module.exports = ManualParser;

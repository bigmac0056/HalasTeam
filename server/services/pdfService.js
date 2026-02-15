const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '../assets/fonts');

const isValidFontFile = (fontPath) => {
    try {
        if (!fs.existsSync(fontPath)) return false;
        const fd = fs.openSync(fontPath, 'r');
        const header = Buffer.alloc(4);
        fs.readSync(fd, header, 0, 4, 0);
        fs.closeSync(fd);
        const signature = header.toString('ascii');
        // TrueType/OpenType signatures
        return signature === 'OTTO' || signature === 'ttcf' || signature === 'true' || header.equals(Buffer.from([0x00, 0x01, 0x00, 0x00]));
    } catch {
        return false;
    }
};

const isUsablePair = (pair) => isValidFontFile(pair.regular) && isValidFontFile(pair.bold);

const resolveFonts = () => {
    const robotoRegular = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
    const robotoBold = path.join(FONTS_DIR, 'Roboto-Bold.ttf');

    if (isUsablePair({ regular: robotoRegular, bold: robotoBold })) {
        return { regular: robotoRegular, bold: robotoBold };
    }

    // Fallback candidates
    const CANDIDATES = [
        { regular: '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf', bold: '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf' },
        { regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' },
        { regular: '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', bold: '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' },
        { regular: '/System/Library/Fonts/Supplemental/Arial Unicode.ttf', bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf' },
        { regular: '/System/Library/Fonts/Supplemental/Arial.ttf', bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf' }
    ];

    const selected = CANDIDATES.find((pair) => isUsablePair(pair));

    if (selected) return selected;

    console.warn('[pdfService] Unicode fonts not found. Using Helvetica (Cyrillic may fail).');
    return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
};

const generateEnergyReport = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            const fonts = resolveFonts();

            let fontRegular = 'Helvetica';
            let fontBold = 'Helvetica-Bold';
            if (fonts.regular !== 'Helvetica') {
                try {
                    doc.registerFont('Regular', fonts.regular);
                    doc.registerFont('Bold', fonts.bold);
                    fontRegular = 'Regular';
                    fontBold = 'Bold';
                } catch (fontError) {
                    console.warn('[pdfService] Font registration failed, fallback to Helvetica:', fontError.message);
                }
            }

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Title
            doc.font(fontBold).fontSize(20).text('Energy Report', { align: 'center' });
            doc.moveDown();

            doc.fontSize(12).font(fontRegular).text(`Period: ${data.periodDays} days`, { align: 'center' });
            doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.moveDown();
            doc.moveDown();

            // Tariff Info
            if (data.tariff) {
                doc.font(fontBold).fontSize(14).text('Tariff Information');
                doc.fontSize(12).font(fontRegular);
                doc.text(`Provider: ${data.tariff.provider}`);
                doc.text(`Region: ${data.tariff.city} (${data.tariff.region})`);
                doc.moveDown();
            }

            // Consumption Summary
            doc.font(fontBold).fontSize(14).text('Consumption Summary');
            doc.fontSize(12).font(fontRegular);
            doc.text(`Total Consumption: ${data.totalConsumption.toFixed(2)} kWh`);
            doc.text(`Estimated Cost: ${data.totalCost} KZT`);
            doc.text(`Average Daily: ${data.avgDaily.toFixed(2)} kWh`);
            doc.moveDown();

            // Top Consumers
            doc.font(fontBold).fontSize(14).text('Top Consumers');
            doc.fontSize(12).font(fontRegular);
            if (data.topConsumers.length > 0) {
                data.topConsumers.forEach((device, i) => {
                    doc.text(`${i + 1}. ${device.name}: ${device.kwh.toFixed(2)} kWh`);
                });
            } else {
                doc.text('No active devices recorded.');
            }
            doc.moveDown();

            // AI Recommendations
            if (data.recommendations && data.recommendations.length > 0) {
                doc.font(fontBold).fontSize(14).text('AI Recommendations');
                doc.fontSize(12).font(fontRegular);
                data.recommendations.forEach(rec => {
                    doc.text(`• ${rec.title}`);
                    doc.fontSize(10).text(`  Reason: ${rec.reason}`);
                    doc.fontSize(10).text(`  Potential Savings: ~${rec.estimatedKwhSaveMonth} kWh/month`);
                    doc.moveDown(0.5);
                    doc.fontSize(12);
                });
            }

            doc.moveDown();
            doc.fontSize(10).fillColor('grey').text('Generated by SmartSphere AI', { align: 'center' });

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = { generateEnergyReport };

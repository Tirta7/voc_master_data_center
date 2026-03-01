const sharp = require('sharp');
const path = require('path');

async function checkMetadata() {
    try {
        const metadata = await sharp('assets/templates/membership/card_template.png').metadata();
        console.log(`${metadata.width}x${metadata.height}`);
    } catch (err) {
        console.error(err);
    }
}

checkMetadata();

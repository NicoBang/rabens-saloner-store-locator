// Multi-Shop Store Updater
// Auto-genereret for Rabens Saloner

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

const CONFIG = {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME || 'Sheet1',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITHUB_REPO: process.env.GITHUB_REPO,
    
    // Shop konfigurationer
    SHOPS: {
            "int": {
                    "domain": "rabenssaloner.myshopify.com",
                    "countries": [],
                    "currency": "EUR",
                    "language": "en",
                    "outputFile": "stores-int.json"
            },
            "dk": {
                    "domain": "rabenssaloner-dkk-da.myshopify.dk",
                    "countries": [],
                    "currency": "DKK",
                    "language": "da",
                    "outputFile": "stores-dk.json"
            }
    }
};

async function fetchFromGoogleSheets() {
    console.log('📊 Henter data fra Google Sheets...');
    
    const range = `${CONFIG.GOOGLE_SHEET_NAME}!A1:Z1000`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}?key=${CONFIG.GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Sheets API fejl: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const rows = data.values;
    
    if (!rows || rows.length === 0) {
        throw new Error('Ingen data fundet i Google Sheets');
    }
    
    // Konverter til JSON
    const headers = rows[0];
    const stores = rows.slice(1).map(row => {
        const store = {};
        headers.forEach((header, index) => {
            store[header] = row[index] || '';
        });
        return store;
    });
    
    console.log(`✅ Hentet ${stores.length} butikker total`);
    return stores;
}

function filterStoresForShop(allStores, shopConfig) {
    if (!shopConfig.countries || shopConfig.countries.length === 0) {
        return allStores;
    }
    
    return allStores.filter(store => {
        return shopConfig.countries.includes(store.Country);
    });
}

function convertToCSV(stores) {
    if (!stores || stores.length === 0) return '';
    
    const headers = Object.keys(stores[0] || {});
    const csvRows = [headers.join(',')];
    
    stores.forEach(store => {
        const row = headers.map(header => {
            const value = store[header] || '';
            if (value.toString().includes(',') || value.toString().includes('"')) {
                return `"${value.toString().replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

async function main() {
    console.log('🚀 Multi-Shop Store Locator Update');
    console.log(`📅 ${new Date().toISOString()}\n`);
    
    try {
        // Hent alle butikker én gang
        const allStores = await fetchFromGoogleSheets();
        
        // Process hver shop
        for (const [shopKey, shopConfig] of Object.entries(CONFIG.SHOPS)) {
            console.log(`\n📦 Processing ${shopKey.toUpperCase()}:`);
            
            // Filtrer butikker for denne shop
            const filteredStores = filterStoresForShop(allStores, shopConfig);
            console.log(`   ${filteredStores.length} butikker for ${shopConfig.domain}`);
            
            // Gem JSON filer
            fs.writeFileSync(shopConfig.outputFile, JSON.stringify(filteredStores, null, 2));
            fs.writeFileSync(shopConfig.outputFile.replace('.json', '.min.json'), JSON.stringify(filteredStores));
            
            // Gem CSV
            const csv = convertToCSV(filteredStores);
            fs.writeFileSync(shopConfig.outputFile.replace('.json', '.csv'), csv);
            
            console.log(`   ✅ ${shopConfig.outputFile} oprettet`);
        }
        
        // Gem også en samlet fil med alle butikker
        fs.writeFileSync('stores-all.json', JSON.stringify(allStores, null, 2));
        fs.writeFileSync('stores-all.min.json', JSON.stringify(allStores));
        fs.writeFileSync('stores-all.csv', convertToCSV(allStores));
        
        console.log('\n📊 CDN URLs efter GitHub push:');
        for (const [shopKey, shopConfig] of Object.entries(CONFIG.SHOPS)) {
            console.log(`${shopKey}: https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}@main/${shopConfig.outputFile.replace('.json', '.min.json')}`);
        }
        console.log(`all: https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}@main/stores-all.min.json`);
        
    } catch (error) {
        console.error('\n❌ Fejl:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };

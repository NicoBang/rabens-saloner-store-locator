// Store Locator Data Updater
// Auto-genereret for Rabens Saloner

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

const CONFIG = {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME || 'Sheet1',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITHUB_REPO: process.env.GITHUB_REPO
};

async function fetchFromGoogleSheets() {
    console.log('📊 Henter data fra Google Sheets...');
    
    const range = `${CONFIG.GOOGLE_SHEET_NAME}!A1:Z1000`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}?key=${CONFIG.GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Google Sheets API fejl: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values;
    
    if (!rows || rows.length === 0) {
        throw new Error('Ingen data fundet');
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
    
    console.log(`✅ Hentet ${stores.length} butikker`);
    return stores;
}

function convertToCSV(stores) {
    if (!stores.length) return '';
    
    const headers = Object.keys(stores[0]);
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
    console.log('🚀 Starter Store Locator opdatering...');
    console.log(`📅 ${new Date().toISOString()}\n`);
    
    try {
        const stores = await fetchFromGoogleSheets();
        
        // Gem JSON
        fs.writeFileSync('stores.json', JSON.stringify(stores, null, 2));
        fs.writeFileSync('stores.min.json', JSON.stringify(stores));
        
        // Gem CSV
        const csv = convertToCSV(stores);
        fs.writeFileSync('stores.csv', csv);
        
        // CDN URLs
        console.log('\n✅ Filer oprettet!');
        console.log('\n📦 CDN URLs (efter GitHub push):');
        console.log(`JSON: https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}@main/stores.min.json`);
        console.log(`CSV: https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}@main/stores.csv`);
        
    } catch (error) {
        console.error('❌ Fejl:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

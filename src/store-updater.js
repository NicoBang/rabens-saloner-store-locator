// Store Updater for Rabens Saloner
// Simpel version - én fil til alle shops

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

// Kolonnerne frontend forventer, i sheet'ets rækkefølge
const DEFAULT_HEADERS = ['Company', 'Address', 'Postal Code', 'City', 'Country', 'Phone'];

async function fetchFromGoogleSheets() {
    console.log('📊 Henter data fra Google Sheets...');
    
    const range = `${CONFIG.GOOGLE_SHEET_NAME}!A:Z`;
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
    
    // Overskriftsrækken kan ende midt i data, hvis sheet'et sorteres med den
    // markeret. Find den hvor den står, så den hverken bliver feltnavne eller en butik
    const headerIndex = rows.findIndex(row =>
        row.some(cell => (cell || '').trim().toLowerCase() === 'company')
    );
    if (headerIndex === -1) {
        console.warn('⚠️ Overskriftsrække mangler i sheet - bruger standardkolonner');
    } else if (headerIndex > 0) {
        console.warn(`⚠️ Overskriftsrække fundet i række ${headerIndex + 1} i stedet for række 1`);
    }
    const headers = headerIndex === -1 ? DEFAULT_HEADERS : rows[headerIndex];
    const dataRows = rows.filter((_, index) => index !== headerIndex);

    // Konverter til JSON
    const stores = dataRows.map(row => {
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
    if (!stores || stores.length === 0) return '';
    
    const headers = Object.keys(stores[0]);
    const csvRows = [headers.join(',')];
    
    stores.forEach(store => {
        const row = headers.map(header => {
            const value = store[header] || '';
            if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
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
        
        // Gem JSON (formateret og minified)
        fs.writeFileSync('stores.json', JSON.stringify(stores, null, 2));
        fs.writeFileSync('stores.min.json', JSON.stringify(stores));
        
        // Gem CSV
        const csv = convertToCSV(stores);
        fs.writeFileSync('stores.csv', csv);
        
        console.log('\n✅ Filer oprettet:');
        console.log('   • stores.json (formateret)');
        console.log('   • stores.min.json (minified)');
        console.log('   • stores.csv');
        
        console.log('\n📦 CDN URL (efter GitHub push):');
        console.log(`   https://cdn.jsdelivr.net/gh/${CONFIG.GITHUB_USERNAME}/${CONFIG.GITHUB_REPO}@main/stores.min.json`);
        
    } catch (error) {
        console.error('\n❌ Fejl:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };

// Test Connection Script
require('dotenv').config();
const fetch = require('node-fetch');

async function test() {
    console.log('🧪 Testing Google Sheets connection...\n');
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${process.env.GOOGLE_SHEET_NAME}!A1:A1?key=${process.env.GOOGLE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log('✅ Google Sheets connection OK');
            const data = await response.json();
            console.log(`   Sheet: "${process.env.GOOGLE_SHEET_NAME}"\n`);
        } else {
            console.log('❌ Google Sheets error:', response.status);
            const error = await response.text();
            console.log('   ', error.substring(0, 200));
        }
    } catch (e) {
        console.log('❌ Connection error:', e.message);
    }
    
    console.log('📋 Configuration:');
    console.log('   Client:', process.env.CLIENT_NAME);
    console.log('   GitHub:', `${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}`);
    console.log('   Sheet ID:', process.env.GOOGLE_SHEET_ID);
}

test();

// Test Connection Script
require('dotenv').config();
const fetch = require('node-fetch');

async function test() {
    console.log('🧪 Testing connections...\n');
    
    // Test Google Sheets
    console.log('1️⃣ Testing Google Sheets API...');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${process.env.GOOGLE_SHEET_NAME}!A1:A1?key=${process.env.GOOGLE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log('   ✅ Google Sheets connection OK');
            const data = await response.json();
            console.log(`   Found sheet: "${process.env.GOOGLE_SHEET_NAME}"\n`);
        } else {
            console.log('   ❌ Google Sheets error:', response.status);
            const error = await response.text();
            console.log('   ', error.substring(0, 200));
        }
    } catch (e) {
        console.log('   ❌ Connection error:', e.message);
    }
    
    // Show configuration
    console.log('2️⃣ Configuration:');
    console.log('   Client:', process.env.CLIENT_NAME);
    console.log('   Multi-shop:', process.env.IS_MULTI_SHOP === 'true' ? 'Yes' : 'No');
    console.log('   Shops:', process.env.SHOP_COUNT);
    console.log('   GitHub:', `${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}`);
    
    console.log('\n3️⃣ Next steps:');
    console.log('   1. Run: npm run update');
    console.log('   2. Push to GitHub');
    console.log('   3. Add secrets to GitHub repo');
}

test();

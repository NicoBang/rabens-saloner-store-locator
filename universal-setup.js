#!/usr/bin/env node
// universal-setup.js - Store Locator Universal Setup
// Håndterer både single og multi-shop projekter
// Kør: node universal-setup.js

const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Farver for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    red: '\x1b[31m'
};

console.log(`${colors.blue}${colors.bright}
╔════════════════════════════════════════╗
║     🚀 STORE LOCATOR UNIVERSAL SETUP   ║
║     Single & Multi-Shop Support        ║
╚════════════════════════════════════════╝
${colors.reset}`);

let config = {
    shops: []
};

// Hjælpefunktion til at stille spørgsmål
async function askQuestion(question, defaultValue = '') {
    return new Promise((resolve) => {
        const prompt = defaultValue 
            ? `${question} [${defaultValue}]: `
            : `${question}: `;
        
        rl.question(prompt, (answer) => {
            resolve(answer.trim() || defaultValue);
        });
    });
}

// Indsaml basis information
async function collectBasicInfo() {
    console.log(`\n${colors.yellow}📋 BASIS INFORMATION${colors.reset}\n`);
    
    config.CLIENT_NAME = await askQuestion('Klient navn (f.eks. "Rabens Saloner")');
    
    config.GOOGLE_API_KEY = await askQuestion('Google API Key');
    while (!config.GOOGLE_API_KEY.startsWith('AIza')) {
        console.log(`${colors.red}API key skal starte med AIza...${colors.reset}`);
        config.GOOGLE_API_KEY = await askQuestion('Google API Key');
    }
    
    config.GOOGLE_SHEET_URL = await askQuestion('Google Sheets URL');
    
    // Ekstract Sheet ID fra URL
    const match = config.GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    config.GOOGLE_SHEET_ID = match ? match[1] : config.GOOGLE_SHEET_URL;
    console.log(`   ${colors.green}Sheet ID: ${config.GOOGLE_SHEET_ID}${colors.reset}`);
    
    config.GOOGLE_SHEET_NAME = await askQuestion('Ark/fane navn i Google Sheet (se nederst)', 'Sheet1');
    
    config.GITHUB_USERNAME = await askQuestion('GitHub brugernavn', 'NicoBang');
    
    // Auto-generer repo navn
    config.GITHUB_REPO = `${config.CLIENT_NAME.toLowerCase().replace(/\s+/g, '-')}-store-locator`;
    console.log(`   ${colors.green}Repo navn: ${config.GITHUB_REPO}${colors.reset}`);
}

// Indsaml shop information
async function collectShopInfo() {
    console.log(`\n${colors.yellow}📦 SHOP KONFIGURATION${colors.reset}\n`);
    
    const shopCount = await askQuestion('Antal Shopify shops (1 for single, 2+ for multi)', '1');
    config.IS_MULTI_SHOP = parseInt(shopCount) > 1;
    
    if (config.IS_MULTI_SHOP) {
        console.log(`\n${colors.blue}MULTI-SHOP SETUP${colors.reset}`);
        console.log('For hver shop skal du angive hvilke lande den dækker.\n');
        
        for (let i = 0; i < parseInt(shopCount); i++) {
            console.log(`\n${colors.bright}Shop ${i + 1}:${colors.reset}`);
            const shop = {};
            
            shop.key = await askQuestion('  Shop identifier (f.eks. dk, de, eu, us)');
            shop.domain = await askQuestion('  Shopify domæne (xxx.myshopify.com)');
            
            const countriesInput = await askQuestion('  Lande koder (komma-separeret, f.eks. DK,SE,NO eller blank for alle)');
            shop.countries = countriesInput ? countriesInput.split(',').map(c => c.trim().toUpperCase()) : [];
            
            shop.currency = await askQuestion('  Valuta', 'EUR');
            shop.language = await askQuestion('  Primært sprog (da/en/de/etc)', 'en');
            
            config.shops.push(shop);
        }
    } else {
        console.log(`\n${colors.blue}SINGLE SHOP SETUP${colors.reset}\n`);
        const shop = {};
        
        shop.key = 'main';
        shop.domain = await askQuestion('Shopify domæne (xxx.myshopify.com)');
        shop.countries = [];  // Alle lande for single shop
        shop.currency = await askQuestion('Valuta', 'DKK');
        shop.language = await askQuestion('Primært sprog (da/en/de/etc)', 'da');
        
        config.shops.push(shop);
    }
}

// Opret projekt struktur
function createProjectStructure() {
    console.log(`\n${colors.blue}📁 Opretter projekt struktur...${colors.reset}`);
    
    const dirs = ['src', 'docs', '.github/workflows', 'scripts'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   ✅ ${dir}/`);
        }
    });
}

// Opret .env fil
function createEnvFile() {
    console.log(`${colors.blue}📝 Opretter .env fil...${colors.reset}`);
    
    const envContent = `# Store Locator Configuration
# Client: ${config.CLIENT_NAME}
# Generated: ${new Date().toISOString()}

# Google Sheets
GOOGLE_API_KEY=${config.GOOGLE_API_KEY}
GOOGLE_SHEET_ID=${config.GOOGLE_SHEET_ID}
GOOGLE_SHEET_NAME=${config.GOOGLE_SHEET_NAME}

# GitHub
GITHUB_USERNAME=${config.GITHUB_USERNAME}
GITHUB_REPO=${config.GITHUB_REPO}

# Client
CLIENT_NAME=${config.CLIENT_NAME}

# Shop Configuration
IS_MULTI_SHOP=${config.IS_MULTI_SHOP}
SHOP_COUNT=${config.shops.length}
${config.shops.map((shop, i) => `
# Shop ${i + 1}
SHOP_${i}_KEY=${shop.key}
SHOP_${i}_DOMAIN=${shop.domain}
SHOP_${i}_COUNTRIES=${shop.countries.join(',')}
SHOP_${i}_CURRENCY=${shop.currency}
SHOP_${i}_LANGUAGE=${shop.language}`).join('')}
`;
    
    fs.writeFileSync('.env', envContent);
    console.log(`   ✅ .env`);
}

// Opret updater script baseret på single/multi shop
function createUpdaterScript() {
    console.log(`${colors.blue}🔧 Opretter updater script...${colors.reset}`);
    
    let scriptContent;
    
    if (config.IS_MULTI_SHOP) {
        scriptContent = createMultiShopScript();
    } else {
        scriptContent = createSingleShopScript();
    }
    
    fs.writeFileSync('src/store-updater.js', scriptContent);
    console.log(`   ✅ src/store-updater.js`);
}

// Single shop script
function createSingleShopScript() {
    return `// Single Shop Store Updater
// Auto-genereret for ${config.CLIENT_NAME}

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
    
    const range = \`\${CONFIG.GOOGLE_SHEET_NAME}!A1:Z1000\`;
    const url = \`https://sheets.googleapis.com/v4/spreadsheets/\${CONFIG.GOOGLE_SHEET_ID}/values/\${encodeURIComponent(range)}?key=\${CONFIG.GOOGLE_API_KEY}\`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(\`Google Sheets API fejl: \${response.status} - \${error}\`);
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
    
    console.log(\`✅ Hentet \${stores.length} butikker\`);
    return stores;
}

function convertToCSV(stores) {
    if (!stores || stores.length === 0) return '';
    
    const headers = Object.keys(stores[0]);
    const csvRows = [headers.join(',')];
    
    stores.forEach(store => {
        const row = headers.map(header => {
            const value = store[header] || '';
            if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\\n')) {
                return \`"\${value.toString().replace(/"/g, '""')}"\`;
            }
            return value;
        });
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\\n');
}

async function main() {
    console.log('🚀 Starter Store Locator opdatering...');
    console.log(\`📅 \${new Date().toISOString()}\\n\`);
    
    try {
        const stores = await fetchFromGoogleSheets();
        
        // Gem JSON
        fs.writeFileSync('stores.json', JSON.stringify(stores, null, 2));
        fs.writeFileSync('stores.min.json', JSON.stringify(stores));
        
        // Gem CSV
        const csv = convertToCSV(stores);
        fs.writeFileSync('stores.csv', csv);
        
        console.log('\\n✅ Filer oprettet!');
        console.log('📦 CDN URLs (efter GitHub push):');
        console.log(\`   JSON: https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/stores.min.json\`);
        console.log(\`   CSV: https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/stores.csv\`);
        
    } catch (error) {
        console.error('\\n❌ Fejl:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
`;
}

// Multi shop script
function createMultiShopScript() {
    const shopsConfig = {};
    config.shops.forEach(shop => {
        shopsConfig[shop.key] = {
            domain: shop.domain,
            countries: shop.countries,
            currency: shop.currency,
            language: shop.language,
            outputFile: `stores-${shop.key}.json`
        };
    });
    
    return `// Multi-Shop Store Updater
// Auto-genereret for ${config.CLIENT_NAME}

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
    SHOPS: ${JSON.stringify(shopsConfig, null, 8).replace(/\n/g, '\n    ')}
};

async function fetchFromGoogleSheets() {
    console.log('📊 Henter data fra Google Sheets...');
    
    const range = \`\${CONFIG.GOOGLE_SHEET_NAME}!A1:Z1000\`;
    const url = \`https://sheets.googleapis.com/v4/spreadsheets/\${CONFIG.GOOGLE_SHEET_ID}/values/\${encodeURIComponent(range)}?key=\${CONFIG.GOOGLE_API_KEY}\`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(\`Google Sheets API fejl: \${response.status} - \${error}\`);
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
    
    console.log(\`✅ Hentet \${stores.length} butikker total\`);
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
                return \`"\${value.toString().replace(/"/g, '""')}"\`;
            }
            return value;
        });
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\\n');
}

async function main() {
    console.log('🚀 Multi-Shop Store Locator Update');
    console.log(\`📅 \${new Date().toISOString()}\\n\`);
    
    try {
        // Hent alle butikker én gang
        const allStores = await fetchFromGoogleSheets();
        
        // Process hver shop
        for (const [shopKey, shopConfig] of Object.entries(CONFIG.SHOPS)) {
            console.log(\`\\n📦 Processing \${shopKey.toUpperCase()}:\`);
            
            // Filtrer butikker for denne shop
            const filteredStores = filterStoresForShop(allStores, shopConfig);
            console.log(\`   \${filteredStores.length} butikker for \${shopConfig.domain}\`);
            
            // Gem JSON filer
            fs.writeFileSync(shopConfig.outputFile, JSON.stringify(filteredStores, null, 2));
            fs.writeFileSync(shopConfig.outputFile.replace('.json', '.min.json'), JSON.stringify(filteredStores));
            
            // Gem CSV
            const csv = convertToCSV(filteredStores);
            fs.writeFileSync(shopConfig.outputFile.replace('.json', '.csv'), csv);
            
            console.log(\`   ✅ \${shopConfig.outputFile} oprettet\`);
        }
        
        // Gem også en samlet fil med alle butikker
        fs.writeFileSync('stores-all.json', JSON.stringify(allStores, null, 2));
        fs.writeFileSync('stores-all.min.json', JSON.stringify(allStores));
        fs.writeFileSync('stores-all.csv', convertToCSV(allStores));
        
        console.log('\\n📊 CDN URLs efter GitHub push:');
        for (const [shopKey, shopConfig] of Object.entries(CONFIG.SHOPS)) {
            console.log(\`\${shopKey}: https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/\${shopConfig.outputFile.replace('.json', '.min.json')}\`);
        }
        console.log(\`all: https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/stores-all.min.json\`);
        
    } catch (error) {
        console.error('\\n❌ Fejl:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
`;
}

// Opret package.json
function createPackageJson() {
    console.log(`${colors.blue}📦 Opretter package.json...${colors.reset}`);
    
    const packageJson = {
        name: config.GITHUB_REPO,
        version: "1.0.0",
        description: `Store Locator for ${config.CLIENT_NAME}`,
        main: "src/store-updater.js",
        scripts: {
            "update": "node src/store-updater.js",
            "test": "node scripts/test-connection.js",
            "deploy": "npm run update && git add . && git commit -m 'Update stores' && git push"
        },
        dependencies: {
            "node-fetch": "^2.6.7",
            "dotenv": "^16.0.3"
        },
        keywords: ["store-locator", "shopify", config.CLIENT_NAME.toLowerCase()],
        author: "",
        license: "MIT"
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log(`   ✅ package.json`);
}

// Opret GitHub Action
function createGitHubAction() {
    console.log(`${colors.blue}🤖 Opretter GitHub Action...${colors.reset}`);
    
    const actionContent = `name: Update Store Data

on:
  schedule:
    - cron: '0 6 * * *'  # Dagligt kl 06:00 UTC (07:00 CET / 08:00 CEST)
  workflow_dispatch:      # Manuel trigger

jobs:
  update:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Update store data
      env:
        GOOGLE_API_KEY: \${{ secrets.GOOGLE_API_KEY }}
        GOOGLE_SHEET_ID: \${{ secrets.GOOGLE_SHEET_ID }}
        GOOGLE_SHEET_NAME: \${{ secrets.GOOGLE_SHEET_NAME }}
      run: npm run update
    
    - name: Commit and push if changed
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add stores*.json stores*.csv
        git diff --quiet && git diff --staged --quiet || (git commit -m "Auto-update: \$(date +'%Y-%m-%d %H:%M')" && git push)
`;
    
    fs.writeFileSync('.github/workflows/update.yml', actionContent);
    console.log(`   ✅ .github/workflows/update.yml`);
}

// Opret test script
function createTestScript() {
    console.log(`${colors.blue}🧪 Opretter test script...${colors.reset}`);
    
    const testScript = `// Test Connection Script
require('dotenv').config();
const fetch = require('node-fetch');

async function test() {
    console.log('🧪 Testing connections...\\n');
    
    // Test Google Sheets
    console.log('1️⃣ Testing Google Sheets API...');
    const url = \`https://sheets.googleapis.com/v4/spreadsheets/\${process.env.GOOGLE_SHEET_ID}/values/\${process.env.GOOGLE_SHEET_NAME}!A1:A1?key=\${process.env.GOOGLE_API_KEY}\`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log('   ✅ Google Sheets connection OK');
            const data = await response.json();
            console.log(\`   Found sheet: "\${process.env.GOOGLE_SHEET_NAME}"\\n\`);
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
    console.log('   GitHub:', \`\${process.env.GITHUB_USERNAME}/\${process.env.GITHUB_REPO}\`);
    
    console.log('\\n3️⃣ Next steps:');
    console.log('   1. Run: npm run update');
    console.log('   2. Push to GitHub');
    console.log('   3. Add secrets to GitHub repo');
}

test();
`;
    
    fs.writeFileSync('scripts/test-connection.js', testScript);
    console.log(`   ✅ scripts/test-connection.js`);
}

// Opret README
function createReadme() {
    console.log(`${colors.blue}📚 Opretter README...${colors.reset}`);
    
    let shopSection = '';
    
    if (config.IS_MULTI_SHOP) {
        shopSection = `## 🌍 Multi-Shop Configuration

| Shop | Domain | Countries | CDN URL |
|------|--------|-----------|---------|
${config.shops.map(shop => 
    `| ${shop.key.toUpperCase()} | ${shop.domain} | ${shop.countries.length ? shop.countries.join(', ') : 'All'} | [stores-${shop.key}.min.json](https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores-${shop.key}.min.json) |`
).join('\n')}
| ALL | - | All countries | [stores-all.min.json](https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores-all.min.json) |`;
    } else {
        shopSection = `## 🛍️ Shop Configuration

- **Domain:** ${config.shops[0].domain}
- **Currency:** ${config.shops[0].currency}
- **Language:** ${config.shops[0].language}
- **CDN URL:** https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json`;
    }
    
    const readmeContent = `# ${config.CLIENT_NAME} Store Locator

${shopSection}

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Test connection
npm test

# Update store data
npm run update

# Deploy to GitHub
npm run deploy
\`\`\`

## 📊 Data Source

- **Google Sheet:** [View/Edit](https://docs.google.com/spreadsheets/d/${config.GOOGLE_SHEET_ID})
- **Sheet Name:** ${config.GOOGLE_SHEET_NAME}

## 🔄 Automation

Updates automatically every day at 07:00 CET via GitHub Actions.

### Manual Update

1. Edit data in Google Sheet
2. Run \`npm run update\`
3. Push to GitHub: \`git push\`

## 🔧 Configuration

All settings are in \`.env\` file (not committed to Git).

## 📁 Output Files

${config.IS_MULTI_SHOP ? `### Per Shop
${config.shops.map(shop => `- \`stores-${shop.key}.json\` - ${shop.countries.length ? shop.countries.join(', ') : 'All countries'}`).join('\n')}
- \`stores-all.json\` - All stores combined` : '- `stores.json` - All stores\n- `stores.min.json` - Minified version\n- `stores.csv` - CSV format'}

## 📝 Required Google Sheet Columns

- Company
- Address
- Postal Code
- City
- Country${config.IS_MULTI_SHOP ? ' (Required for filtering)' : ' (Optional)'}
- Phone
- Website
- Email (Optional)
- Physical (Mark with "X")
- Online (Mark with "X")

## 🔒 Security

- API keys are stored in \`.env\` (never committed)
- GitHub Secrets are used for automation
- Google Sheet must be shared as "Anyone with link can view"

## 📞 Support

For issues or questions, contact the developer.

---
Generated: ${new Date().toISOString()}
`;
    
    fs.writeFileSync('README.md', readmeContent);
    console.log(`   ✅ README.md`);
}

// Opret .gitignore
function createGitIgnore() {
    console.log(`${colors.blue}🔒 Opretter .gitignore...${colors.reset}`);
    
    const gitignoreContent = `.env
.env.local
node_modules/
.DS_Store
*.log
*.tmp
.vscode/
.idea/
`;
    
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log(`   ✅ .gitignore`);
}

// Vis næste skridt
function showNextSteps() {
    console.log(`\n${colors.green}${colors.bright}
╔════════════════════════════════════════╗
║         ✅ SETUP COMPLETE!             ║
╚════════════════════════════════════════╝
${colors.reset}

${colors.yellow}📋 NÆSTE SKRIDT:${colors.reset}

${colors.bright}1️⃣  Install dependencies:${colors.reset}
    ${colors.blue}npm install${colors.reset}

${colors.bright}2️⃣  Test connection:${colors.reset}
    ${colors.blue}npm test${colors.reset}

${colors.bright}3️⃣  Kør første update:${colors.reset}
    ${colors.blue}npm run update${colors.reset}

${colors.bright}4️⃣  Opret GitHub repo:${colors.reset}
    ${colors.blue}git init
    git add .
    git commit -m "Initial setup for ${config.CLIENT_NAME}"
    gh repo create ${config.GITHUB_REPO} --public --source=. --push${colors.reset}
    
    Eller manuelt på github.com/new

${colors.bright}5️⃣  Setup GitHub Secrets:${colors.reset}
    Gå til: ${colors.blue}github.com/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}/settings/secrets${colors.reset}
    
    Tilføj disse secrets:
    • GOOGLE_API_KEY = ${config.GOOGLE_API_KEY.substring(0, 10)}...
    • GOOGLE_SHEET_ID = ${config.GOOGLE_SHEET_ID}
    • GOOGLE_SHEET_NAME = ${config.GOOGLE_SHEET_NAME}

${config.IS_MULTI_SHOP ? `${colors.bright}📊 MULTI-SHOP CDN URLs:${colors.reset}
${config.shops.map(shop => 
    `   ${colors.blue}${shop.key}:${colors.reset} https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores-${shop.key}.min.json`
).join('\n')}
   ${colors.blue}all:${colors.reset} https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores-all.min.json
` : `${colors.bright}📊 CDN URL:${colors.reset}
   ${colors.blue}https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json${colors.reset}
`}
${colors.green}Alt er klar! God fornøjelse 🎉${colors.reset}
`);
}

// Main execution
async function main() {
    try {
        await collectBasicInfo();
        await collectShopInfo();
        
        console.log(`\n${colors.bright}🔧 Opretter projekt filer...${colors.reset}\n`);
        
        createProjectStructure();
        createEnvFile();
        createPackageJson();
        createUpdaterScript();
        createGitHubAction();
        createTestScript();
        createReadme();
        createGitIgnore();
        
        showNextSteps();
        
    } catch (error) {
        console.error(`${colors.red}❌ Fejl: ${error.message}${colors.reset}`);
    } finally {
        rl.close();
    }
}

// Start programmet
main();
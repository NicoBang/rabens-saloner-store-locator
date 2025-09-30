#!/usr/bin/env node
// simple-setup.js - Store Locator Setup (Simplified)
// Kør: node simple-setup.js

const readline = require('readline');
const fs = require('fs');

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
║     🚀 STORE LOCATOR SIMPLE SETUP      ║
╚════════════════════════════════════════╝
${colors.reset}`);

let config = {};

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

// Indsaml kun det nødvendige
async function collectInfo() {
    console.log(`\n${colors.yellow}📋 KONFIGURATION${colors.reset}\n`);
    
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
    
    config.GOOGLE_SHEET_NAME = await askQuestion('Ark/fane navn i Google Sheet', 'Sheet1');
    
    config.GITHUB_USERNAME = await askQuestion('GitHub brugernavn', 'NicoBang');
    
    // Auto-generer repo navn
    config.GITHUB_REPO = `${config.CLIENT_NAME.toLowerCase().replace(/\s+/g, '-')}-store-locator`;
    console.log(`   ${colors.green}Repo navn: ${config.GITHUB_REPO}${colors.reset}`);
}

// Opret projekt struktur
function createProjectStructure() {
    console.log(`\n${colors.blue}📁 Opretter projekt struktur...${colors.reset}`);
    
    const dirs = ['src', '.github/workflows', 'scripts'];
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
`;
    
    fs.writeFileSync('.env', envContent);
    console.log(`   ✅ .env`);
}

// Opret updater script
function createUpdaterScript() {
    console.log(`${colors.blue}🔧 Opretter updater script...${colors.reset}`);
    
    const scriptContent = `// Store Updater for ${config.CLIENT_NAME}
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
        
        // Gem JSON (formateret og minified)
        fs.writeFileSync('stores.json', JSON.stringify(stores, null, 2));
        fs.writeFileSync('stores.min.json', JSON.stringify(stores));
        
        // Gem CSV
        const csv = convertToCSV(stores);
        fs.writeFileSync('stores.csv', csv);
        
        console.log('\\n✅ Filer oprettet:');
        console.log('   • stores.json (formateret)');
        console.log('   • stores.min.json (minified)');
        console.log('   • stores.csv');
        
        console.log('\\n📦 CDN URL (efter GitHub push):');
        console.log(\`   https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/stores.min.json\`);
        
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
    
    fs.writeFileSync('src/store-updater.js', scriptContent);
    console.log(`   ✅ src/store-updater.js`);
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
    - cron: '0 6 * * *'  # Dagligt kl 06:00 UTC
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
    console.log('🧪 Testing Google Sheets connection...\\n');
    
    const url = \`https://sheets.googleapis.com/v4/spreadsheets/\${process.env.GOOGLE_SHEET_ID}/values/\${process.env.GOOGLE_SHEET_NAME}!A1:A1?key=\${process.env.GOOGLE_API_KEY}\`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log('✅ Google Sheets connection OK');
            const data = await response.json();
            console.log(\`   Sheet: "\${process.env.GOOGLE_SHEET_NAME}"\\n\`);
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
    console.log('   GitHub:', \`\${process.env.GITHUB_USERNAME}/\${process.env.GITHUB_REPO}\`);
    console.log('   Sheet ID:', process.env.GOOGLE_SHEET_ID);
}

test();
`;
    
    fs.writeFileSync('scripts/test-connection.js', testScript);
    console.log(`   ✅ scripts/test-connection.js`);
}

// Opret README
function createReadme() {
    console.log(`${colors.blue}📚 Opretter README...${colors.reset}`);
    
    const readmeContent = `# ${config.CLIENT_NAME} Store Locator

Simpel store locator der henter data fra Google Sheets og gør det tilgængeligt via CDN.

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Test connection
npm test

# Update store data
npm run update

# Deploy til GitHub
npm run deploy
\`\`\`

## 📦 CDN URL

Efter data er pushed til GitHub, er det tilgængeligt på:

\`\`\`
https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json
\`\`\`

## 📊 Data Source

- **Google Sheet:** [View/Edit](https://docs.google.com/spreadsheets/d/${config.GOOGLE_SHEET_ID})
- **Sheet Name:** ${config.GOOGLE_SHEET_NAME}

## 🔄 Automatisk Opdatering

Data opdateres automatisk hver dag kl. 07:00 CET via GitHub Actions.

### Manuel opdatering

1. Rediger data i Google Sheet
2. Kør: \`npm run update\`
3. Push til GitHub: \`git push\`

## 📁 Output Filer

- \`stores.json\` - Formateret JSON (læsbar)
- \`stores.min.json\` - Minified JSON (til produktion)
- \`stores.csv\` - CSV format

## 📝 Google Sheet Kolonner

Påkrævede kolonner:
- Company
- Address
- Postal Code
- City
- Country
- Phone
- Website

Valgfrie kolonner:
- Email
- Physical (marker med "X")
- Online (marker med "X")
- Enhver anden kolonne du ønsker

## 🔒 Sikkerhed

- API keys gemmes i \`.env\` (committes aldrig)
- GitHub Secrets bruges til automation
- Google Sheet skal være delt som "Alle med link kan se"

## 🛠️ Shopify Integration

I din Shopify butik kan du bruge data sådan:

\`\`\`javascript
fetch('https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json')
  .then(response => response.json())
  .then(stores => {
    // Brug stores data til at vise butikker
    console.log(stores);
  });
\`\`\`

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

${colors.bright}2️⃣  Test forbindelse:${colors.reset}
    ${colors.blue}npm test${colors.reset}

${colors.bright}3️⃣  Kør første update:${colors.reset}
    ${colors.blue}npm run update${colors.reset}

${colors.bright}4️⃣  Opret GitHub repository:${colors.reset}
    ${colors.blue}git init
    git add .
    git commit -m "Initial setup for ${config.CLIENT_NAME}"
    gh repo create ${config.GITHUB_REPO} --public --source=. --push${colors.reset}
    
    Eller manuelt på: github.com/new

${colors.bright}5️⃣  Setup GitHub Secrets:${colors.reset}
    Gå til: ${colors.blue}github.com/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}/settings/secrets${colors.reset}
    
    Tilføj disse secrets:
    • GOOGLE_API_KEY = ${config.GOOGLE_API_KEY.substring(0, 10)}...
    • GOOGLE_SHEET_ID = ${config.GOOGLE_SHEET_ID}
    • GOOGLE_SHEET_NAME = ${config.GOOGLE_SHEET_NAME}

${colors.bright}📊 CDN URL (når data er på GitHub):${colors.reset}
    ${colors.blue}https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json${colors.reset}

${colors.green}God fornøjelse! 🎉${colors.reset}
`);
}

// Main execution
async function main() {
    try {
        await collectInfo();
        
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
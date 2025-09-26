#!/usr/bin/env node

// complete-setup.js
// Alt-i-én setup script - opretter ALLE filer selv
// Kør: node complete-setup.js

const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Farver for terminal
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
║     🚀 STORE LOCATOR SETUP             ║
║     Complete Edition - Alt inkluderet  ║
╚════════════════════════════════════════╝
${colors.reset}`);

// Konfiguration spørgsmål
const questions = [
    {
        key: 'CLIENT_NAME',
        question: 'Klient navn (f.eks. "Nordal"): ',
        validate: (v) => v.length > 0
    },
    {
        key: 'GOOGLE_API_KEY',
        question: 'Google API Key (starter med AIza...): ',
        validate: (v) => v.startsWith('AIza')
    },
    {
        key: 'GOOGLE_SHEET_URL',
        question: 'Google Sheets URL: ',
        validate: (v) => v.includes('docs.google.com/spreadsheets'),
        transform: (url) => {
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            return match ? match[1] : url;
        }
    },
    {
        key: 'GITHUB_USERNAME',
        question: 'GitHub brugernavn: ',
        default: 'NicoBang'
    },
    {
        key: 'PRIMARY_COLOR',
        question: 'Primary farve (hex): ',
        default: '#000000'
    }
];

let config = {};

function ask(question) {
    return new Promise((resolve) => {
        const defaultValue = question.default || '';
        const prompt = defaultValue 
            ? `${question.question}[${defaultValue}] `
            : question.question;
        
        rl.question(prompt, (answer) => {
            answer = answer.trim() || defaultValue;
            
            if (question.validate && !question.validate(answer)) {
                console.log(`${colors.red}❌ Ugyldig værdi. Prøv igen.${colors.reset}`);
                resolve(ask(question));
            } else {
                if (question.transform) {
                    answer = question.transform(answer);
                }
                resolve(answer);
            }
        });
    });
}

async function collectAnswers() {
    for (const q of questions) {
        config[q.key] = await ask(q);
    }
    
    // Generer afledte værdier
    config.GITHUB_REPO = `${config.CLIENT_NAME.toLowerCase().replace(/\s+/g, '-')}-store-locator`;
    config.GOOGLE_SHEET_ID = config.GOOGLE_SHEET_URL;
    
    console.log(`\n${colors.green}✓ Konfiguration komplet!${colors.reset}\n`);
}

// ============================================
// OPRET ALLE FILER DIREKTE
// ============================================

function createAllFiles() {
    console.log(`${colors.blue}📁 Opretter projekt struktur...${colors.reset}`);
    
    // Opret mapper
    ['src', 'docs', '.github/workflows'].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // 1. .env fil
    console.log(`📝 Opretter .env...`);
    const envContent = `# Store Locator Configuration
GOOGLE_API_KEY=${config.GOOGLE_API_KEY}
GOOGLE_SHEET_ID=${config.GOOGLE_SHEET_ID}
GOOGLE_SHEET_NAME=Sheet1
GITHUB_USERNAME=${config.GITHUB_USERNAME}
GITHUB_REPO=${config.GITHUB_REPO}
`;
    fs.writeFileSync('.env', envContent);
    
    // 2. package.json
    console.log(`📦 Opretter package.json...`);
    const packageJson = {
        name: config.GITHUB_REPO,
        version: "1.0.0",
        description: `Store Locator for ${config.CLIENT_NAME}`,
        scripts: {
            "update": "node src/shopify-store-updater.js",
            "test": "node src/shopify-store-updater.js test"
        },
        dependencies: {
            "node-fetch": "^2.6.7",
            "dotenv": "^16.0.3"
        }
    };
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
    // 3. Hovedscript - shopify-store-updater.js
    console.log(`🔧 Opretter update script...`);
    const updaterScript = `// Store Locator Data Updater
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
        throw new Error(\`Google Sheets API fejl: \${response.status}\`);
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
    
    console.log(\`✅ Hentet \${stores.length} butikker\`);
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
        
        // CDN URLs
        console.log('\\n✅ Filer oprettet!');
        console.log('\\n📦 CDN URLs (efter GitHub push):');
        console.log(\`JSON: https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/stores.min.json\`);
        console.log(\`CSV: https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/stores.csv\`);
        
    } catch (error) {
        console.error('❌ Fejl:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
`;
    fs.writeFileSync('src/shopify-store-updater.js', updaterScript);
    
    // 4. Store Locator HTML
    console.log(`🎨 Opretter Store Locator HTML...`);
    const htmlContent = `<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.CLIENT_NAME} - Find Butik</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
        }
        
        .store-locator {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        h1 {
            text-align: center;
            color: ${config.PRIMARY_COLOR};
            margin-bottom: 30px;
        }
        
        .search-box {
            width: 100%;
            padding: 15px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .stores-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .store-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .store-name {
            font-weight: bold;
            color: ${config.PRIMARY_COLOR};
            margin-bottom: 10px;
        }
        
        .store-info {
            color: #666;
            line-height: 1.6;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
        }
    </style>
</head>
<body>
    <div class="store-locator">
        <h1>Find ${config.CLIENT_NAME} Forhandler</h1>
        <input type="text" class="search-box" id="searchBox" placeholder="Søg efter by eller butik...">
        <div id="storesContainer" class="loading">Henter butikker...</div>
    </div>
    
    <script>
        const STORES_URL = 'https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json';
        let allStores = [];
        
        async function loadStores() {
            try {
                const response = await fetch(STORES_URL);
                const stores = await response.json();
                allStores = stores;
                displayStores(stores);
            } catch (error) {
                console.error('Fejl:', error);
                document.getElementById('storesContainer').innerHTML = '<p>Kunne ikke hente butikker</p>';
            }
        }
        
        function displayStores(stores) {
            const container = document.getElementById('storesContainer');
            
            if (stores.length === 0) {
                container.innerHTML = '<p>Ingen butikker fundet</p>';
                return;
            }
            
            container.innerHTML = '<div class="stores-grid">' + 
                stores.map(store => \`
                    <div class="store-card">
                        <div class="store-name">\${store.Company || 'Ukendt'}</div>
                        <div class="store-info">
                            \${store.Address ? \`<div>\${store.Address}</div>\` : ''}
                            \${store.City ? \`<div>\${store['Postal Code'] || ''} \${store.City}</div>\` : ''}
                            \${store.Country ? \`<div>\${store.Country}</div>\` : ''}
                            \${store.Phone ? \`<div>📞 \${store.Phone}</div>\` : ''}
                            \${store.Website ? \`<div>🌐 <a href="\${store.Website}" target="_blank">Website</a></div>\` : ''}
                        </div>
                    </div>
                \`).join('') + '</div>';
        }
        
        // Søgefunktion
        document.getElementById('searchBox').addEventListener('input', function(e) {
            const search = e.target.value.toLowerCase();
            const filtered = allStores.filter(store => {
                const searchString = \`\${store.Company} \${store.City} \${store.Country}\`.toLowerCase();
                return searchString.includes(search);
            });
            displayStores(filtered);
        });
        
        // Start
        loadStores();
    </script>
</body>
</html>`;
    fs.writeFileSync('docs/index.html', htmlContent);
    
    // 5. GitHub Action
    console.log(`🤖 Opretter GitHub Action...`);
    const actionContent = `name: Update Store Data

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm run update
      env:
        GOOGLE_API_KEY: \${{ secrets.GOOGLE_API_KEY }}
        GOOGLE_SHEET_ID: \${{ secrets.GOOGLE_SHEET_ID }}
    - uses: EndBug/add-and-commit@v9
      with:
        add: 'stores*.json stores*.csv'
        message: 'Auto-update store data'
        default_author: github_actions
`;
    fs.writeFileSync('.github/workflows/update.yml', actionContent);
    
    // 6. .gitignore
    console.log(`📄 Opretter .gitignore...`);
    fs.writeFileSync('.gitignore', `.env
node_modules/
.DS_Store
*.log
`);
    
    // 7. README
    console.log(`📚 Opretter README...`);
    const readmeContent = `# ${config.CLIENT_NAME} Store Locator

## 🚀 Quick Start
\`\`\`bash
npm install
npm run update
\`\`\`

## 📊 Google Sheet
[Rediger data her](https://docs.google.com/spreadsheets/d/${config.GOOGLE_SHEET_ID})

## 🌐 CDN URLs
- JSON: https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json
- CSV: https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.csv

## 🤖 Automation
Opdaterer automatisk hver dag kl 07:00 dansk tid.
`;
    fs.writeFileSync('README.md', readmeContent);
    
    console.log(`${colors.green}✓ Alle filer oprettet!${colors.reset}`);
}

// Installer dependencies
function installDependencies() {
    console.log(`\n${colors.blue}📦 Installerer dependencies...${colors.reset}`);
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log(`${colors.green}✓ Dependencies installeret${colors.reset}`);
    } catch {
        console.log(`${colors.yellow}⚠️  Kør 'npm install' manuelt${colors.reset}`);
    }
}

// Git setup
function setupGit() {
    console.log(`\n${colors.blue}🐙 Initialiserer Git...${colors.reset}`);
    try {
        execSync('git init', { stdio: 'inherit' });
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "Initial setup for ${config.CLIENT_NAME}"`, { stdio: 'inherit' });
        console.log(`${colors.green}✓ Git repository klar${colors.reset}`);
        
        console.log(`\n${colors.yellow}Opret GitHub repo manuelt:${colors.reset}`);
        console.log(`1. Gå til: https://github.com/new`);
        console.log(`2. Navn: ${config.GITHUB_REPO}`);
        console.log(`3. Kør derefter:`);
        console.log(`   git remote add origin https://github.com/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}.git`);
        console.log(`   git push -u origin main`);
    } catch {
        console.log(`${colors.yellow}⚠️  Git setup fejlede${colors.reset}`);
    }
}

// Vis næste skridt
function showNextSteps() {
    console.log(`
${colors.green}${colors.bright}
╔════════════════════════════════════════╗
║         ✅ SETUP KOMPLET!              ║
╚════════════════════════════════════════╝
${colors.reset}

${colors.bright}📋 NÆSTE SKRIDT:${colors.reset}

1️⃣  Test data hentning:
    ${colors.yellow}npm run update${colors.reset}

2️⃣  Push til GitHub:
    ${colors.yellow}git remote add origin https://github.com/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}.git
    git push -u origin main${colors.reset}

3️⃣  GitHub Secrets (for automation):
    https://github.com/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}/settings/secrets
    • GOOGLE_API_KEY
    • GOOGLE_SHEET_ID

4️⃣  Test CDN URL:
    https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json

5️⃣  Tilføj til Shopify:
    Kopier indhold fra docs/index.html

${colors.green}Alt er klar! 🎉${colors.reset}
`);
}

// Main
async function main() {
    try {
        await collectAnswers();
        createAllFiles();
        installDependencies();
        setupGit();
        showNextSteps();
    } catch (error) {
        console.error(`${colors.red}❌ Fejl: ${error.message}${colors.reset}`);
    } finally {
        rl.close();
    }
}

main();
# 📍 Store Locator - Komplet Setup Guide
## For Single-Shop eller Multi-Shop Projekter

---

# FASE 1: FORBEREDELSE (15 min)

## Step 1: Indsaml Information
Før du starter, skal du have disse informationer klar:

### Basis info:
- [ ] Klient navn (f.eks. "Rabens Saloner")
- [ ] Google API Key (genbruges for alle projekter)
- [ ] GitHub brugernavn

### Shop info:
- [ ] Antal Shopify shops (1 eller flere)
- [ ] For HVER shop:
  - Shopify domæne (xxx.myshopify.com)
  - Målgruppe lande (f.eks. DK/SE/NO for nordisk shop)
  - Sprog
  - Valuta

### Google Sheet:
- [ ] URL til Google Sheet
- [ ] Navn på ark/fane (f.eks. "forhandlere", "Sheet1")
- [ ] Er der en "Country" kolonne? (påkrævet for multi-shop)

## Step 2: Opret Google Sheet
```
Påkrævede kolonner:
- Company (butiksnavn)
- Address
- Postal Code
- City  
- Country (VIGTIG for multi-shop - brug ISO koder: DK, SE, DE, etc.)
- Phone
- Website
- Email (valgfri)
- Physical (sæt "X" hvis fysisk butik)
- Online (sæt "X" hvis online)
```

**VIGTIGT:** Del sheet som "Anyone with link can view"

---

# FASE 2: PROJECT SETUP (10 min)

## Step 3: Opret projekt mappe
```bash
mkdir [klient-navn]-store-locator
cd [klient-navn]-store-locator
```

## Step 4: Download og kør Universal Setup Script

Gem dette som `universal-setup.js`:

```javascript
#!/usr/bin/env node
// universal-setup.js - Håndterer både single og multi-shop

const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`
╔════════════════════════════════════════╗
║     🚀 STORE LOCATOR UNIVERSAL SETUP   ║
║     Single & Multi-Shop Support        ║
╚════════════════════════════════════════╝
`);

let config = {
    shops: []
};

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

async function collectBasicInfo() {
    config.CLIENT_NAME = await askQuestion('Klient navn (f.eks. "Rabens Saloner")');
    config.GOOGLE_API_KEY = await askQuestion('Google API Key');
    config.GOOGLE_SHEET_URL = await askQuestion('Google Sheets URL');
    
    // Ekstract Sheet ID
    const match = config.GOOGLE_SHEET_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
    config.GOOGLE_SHEET_ID = match ? match[1] : config.GOOGLE_SHEET_URL;
    
    config.GOOGLE_SHEET_NAME = await askQuestion('Ark navn i Google Sheet', 'Sheet1');
    config.GITHUB_USERNAME = await askQuestion('GitHub brugernavn', 'NicoBang');
    config.GITHUB_REPO = `${config.CLIENT_NAME.toLowerCase().replace(/\s+/g, '-')}-store-locator`;
}

async function collectShopInfo() {
    const shopCount = await askQuestion('Antal Shopify shops (1 for single, 2+ for multi)', '1');
    config.IS_MULTI_SHOP = parseInt(shopCount) > 1;
    
    if (config.IS_MULTI_SHOP) {
        console.log('\n📦 MULTI-SHOP SETUP\n');
        
        for (let i = 0; i < parseInt(shopCount); i++) {
            console.log(`\nShop ${i + 1}:`);
            const shop = {};
            
            shop.key = await askQuestion('  Shop identifier (dk, de, eu, us, etc.)');
            shop.domain = await askQuestion('  Shopify domæne (xxx.myshopify.com)');
            shop.countries = await askQuestion('  Lande koder (komma-separeret, f.eks. DK,SE,NO)');
            shop.countries = shop.countries.split(',').map(c => c.trim());
            shop.currency = await askQuestion('  Valuta', 'EUR');
            shop.language = await askQuestion('  Primært sprog', 'en');
            
            config.shops.push(shop);
        }
    } else {
        console.log('\n📦 SINGLE SHOP SETUP\n');
        const shop = {};
        
        shop.key = 'main';
        shop.domain = await askQuestion('Shopify domæne (xxx.myshopify.com)');
        shop.countries = [];  // Alle lande for single shop
        shop.currency = await askQuestion('Valuta', 'EUR');
        shop.language = await askQuestion('Primært sprog', 'da');
        
        config.shops.push(shop);
    }
}

function createProjectStructure() {
    const dirs = ['src', 'docs', '.github/workflows', 'scripts'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function createEnvFile() {
    const envContent = `# Store Locator Configuration
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

# Shop Details
${config.shops.map((shop, i) => `
SHOP_${i}_KEY=${shop.key}
SHOP_${i}_DOMAIN=${shop.domain}
SHOP_${i}_COUNTRIES=${shop.countries.join(',')}
SHOP_${i}_CURRENCY=${shop.currency}
SHOP_${i}_LANGUAGE=${shop.language}`).join('')}
`;
    
    fs.writeFileSync('.env', envContent);
}

function createUpdaterScript() {
    let scriptContent;
    
    if (config.IS_MULTI_SHOP) {
        scriptContent = createMultiShopScript();
    } else {
        scriptContent = createSingleShopScript();
    }
    
    fs.writeFileSync('src/store-updater.js', scriptContent);
}

function createSingleShopScript() {
    return `// Single Shop Store Updater
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

const CONFIG = {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME,
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

async function main() {
    try {
        const stores = await fetchFromGoogleSheets();
        
        // Gem JSON
        fs.writeFileSync('stores.json', JSON.stringify(stores, null, 2));
        fs.writeFileSync('stores.min.json', JSON.stringify(stores));
        
        console.log('\\n✅ Filer oprettet!');
        console.log(\`📦 CDN URL: https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/stores.min.json\`);
        
    } catch (error) {
        console.error('❌ Fejl:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
`;
}

function createMultiShopScript() {
    return `// Multi-Shop Store Updater
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

const CONFIG = {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITHUB_REPO: process.env.GITHUB_REPO,
    
    // Shop configurations
    SHOPS: ${JSON.stringify(
        config.shops.reduce((acc, shop) => {
            acc[shop.key] = {
                domain: shop.domain,
                countries: shop.countries,
                currency: shop.currency,
                language: shop.language,
                outputFile: `stores-${shop.key}.json`
            };
            return acc;
        }, {}), null, 2
    )}
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

async function main() {
    try {
        const allStores = await fetchFromGoogleSheets();
        
        // Process hver shop
        for (const [shopKey, shopConfig] of Object.entries(CONFIG.SHOPS)) {
            console.log(\`\\n📦 Processing \${shopKey}:\`);
            
            const filteredStores = filterStoresForShop(allStores, shopConfig);
            console.log(\`   \${filteredStores.length} butikker for \${shopConfig.domain}\`);
            
            // Gem JSON filer
            fs.writeFileSync(shopConfig.outputFile, JSON.stringify(filteredStores, null, 2));
            fs.writeFileSync(shopConfig.outputFile.replace('.json', '.min.json'), JSON.stringify(filteredStores));
            
            console.log(\`   ✅ \${shopConfig.outputFile} oprettet\`);
        }
        
        // Gem også en samlet fil
        fs.writeFileSync('stores-all.json', JSON.stringify(allStores, null, 2));
        fs.writeFileSync('stores-all.min.json', JSON.stringify(allStores));
        
        console.log('\\n📊 CDN URLs efter GitHub push:');
        for (const [shopKey, shopConfig] of Object.entries(CONFIG.SHOPS)) {
            console.log(\`\${shopKey}: https://cdn.jsdelivr.net/gh/\${CONFIG.GITHUB_USERNAME}/\${CONFIG.GITHUB_REPO}@main/\${shopConfig.outputFile.replace('.json', '.min.json')}\`);
        }
        
    } catch (error) {
        console.error('❌ Fejl:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
`;
}

function createPackageJson() {
    const packageJson = {
        name: config.GITHUB_REPO,
        version: "1.0.0",
        description: `Store Locator for ${config.CLIENT_NAME}`,
        scripts: {
            "update": "node src/store-updater.js",
            "test": "node scripts/test-connection.js",
            "build": "node scripts/build-html.js",
            "deploy": "npm run update && git add . && git commit -m 'Update stores' && git push"
        },
        dependencies: {
            "node-fetch": "^2.6.7",
            "dotenv": "^16.0.3"
        }
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
}

function createGitHubAction() {
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
        git add stores*.json
        git diff --quiet && git diff --staged --quiet || (git commit -m "Auto-update: \$(date +'%Y-%m-%d %H:%M')" && git push)
`;
    
    fs.writeFileSync('.github/workflows/update.yml', actionContent);
}

function createTestScript() {
    const testScript = `// test-connection.js
require('dotenv').config();
const fetch = require('node-fetch');

async function test() {
    console.log('🧪 Testing connections...\\n');
    
    // Test Google Sheets
    console.log('Testing Google Sheets API...');
    const url = \`https://sheets.googleapis.com/v4/spreadsheets/\${process.env.GOOGLE_SHEET_ID}/values/\${process.env.GOOGLE_SHEET_NAME}!A1:A1?key=\${process.env.GOOGLE_API_KEY}\`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log('✅ Google Sheets connection OK\\n');
        } else {
            console.log('❌ Google Sheets error:', response.status);
            const error = await response.text();
            console.log(error);
        }
    } catch (e) {
        console.log('❌ Connection error:', e.message);
    }
    
    // Show configuration
    console.log('Configuration:');
    console.log('- Client:', process.env.CLIENT_NAME);
    console.log('- Multi-shop:', process.env.IS_MULTI_SHOP === 'true' ? 'Yes' : 'No');
    console.log('- Shops:', process.env.SHOP_COUNT);
}

test();
`;
    
    fs.writeFileSync('scripts/test-connection.js', testScript);
}

function createReadme() {
    let shopSection = '';
    
    if (config.IS_MULTI_SHOP) {
        shopSection = `## 🌍 Shops

| Shop | Domain | Countries | CDN URL |
|------|--------|-----------|---------|
${config.shops.map(shop => 
    `| ${shop.key.toUpperCase()} | ${shop.domain} | ${shop.countries.join(', ') || 'All'} | [stores-${shop.key}.min.json](https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores-${shop.key}.min.json) |`
).join('\n')}`;
    } else {
        shopSection = `## 🛍️ Shop

- **Domain:** ${config.shops[0].domain}
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

Google Sheet: [View Sheet](https://docs.google.com/spreadsheets/d/${config.GOOGLE_SHEET_ID})

## 🔄 Automation

Updates automatically every day at 07:00 CET via GitHub Actions.

## 📝 Manual Update

1. Edit data in Google Sheet
2. Run \`npm run update\`
3. Push to GitHub: \`git push\`

## 🔧 Configuration

See \`.env\` file for all settings.
`;
    
    fs.writeFileSync('README.md', readmeContent);
}

function showNextSteps() {
    console.log(`
╔════════════════════════════════════════╗
║         ✅ SETUP COMPLETE!             ║
╚════════════════════════════════════════╝

📋 NÆSTE SKRIDT:

1️⃣  Install dependencies:
    npm install

2️⃣  Test connection:
    npm test

3️⃣  Kør første update:
    npm run update

4️⃣  Opret GitHub repo:
    git init
    git add .
    git commit -m "Initial setup"
    gh repo create ${config.GITHUB_REPO} --public --source=. --push

5️⃣  Setup GitHub Secrets:
    Gå til: github.com/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}/settings/secrets
    Tilføj: GOOGLE_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SHEET_NAME

${config.IS_MULTI_SHOP ? `
📊 MULTI-SHOP URLs:
${config.shops.map(shop => 
    `   ${shop.key}: https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores-${shop.key}.min.json`
).join('\n')}
` : `
📊 SHOP URL:
   https://cdn.jsdelivr.net/gh/${config.GITHUB_USERNAME}/${config.GITHUB_REPO}@main/stores.min.json
`}
`);
}

// Main execution
async function main() {
    try {
        await collectBasicInfo();
        await collectShopInfo();
        
        console.log('\n🔧 Creating project files...\n');
        
        createProjectStructure();
        createEnvFile();
        createPackageJson();
        createUpdaterScript();
        createGitHubAction();
        createTestScript();
        createReadme();
        
        // Create .gitignore
        fs.writeFileSync('.gitignore', `.env
node_modules/
.DS_Store
*.log
.env.local
`);
        
        showNextSteps();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
    }
}

main();
```

## Step 5: Kør setup
```bash
node universal-setup.js
```

Scriptet spørger automatisk om:
- Single eller multi-shop
- Hvis multi: hvilke lande hver shop dækker
- Genererer automatisk de rigtige scripts

---

# FASE 3: TEST & VERIFICER (5 min)

## Step 6: Test forbindelser
```bash
npm install
npm test
```

Tjek at du får:
- ✅ Google Sheets connection OK

## Step 7: Kør første data update
```bash
npm run update
```

Verificer at du ser:
- ✅ Hentet X butikker
- ✅ Filer oprettet

For multi-shop, tjek at du har:
- stores-dk.json (kun DK/SE/NO butikker)
- stores-de.json (kun DE/AT/CH butikker)
- stores-all.json (alle butikker)

---

# FASE 4: GITHUB & CDN (5 min)

## Step 8: Push til GitHub
```bash
git init
git add .
git commit -m "Initial setup for [klient navn]"
gh repo create [repo-navn] --public --source=. --push
```

Eller manuelt:
1. Opret repo på github.com
2. `git remote add origin [url]`
3. `git push -u origin main`

## Step 9: Setup GitHub Secrets
1. Gå til: `github.com/[username]/[repo]/settings/secrets`
2. Tilføj:
   - `GOOGLE_API_KEY`
   - `GOOGLE_SHEET_ID` 
   - `GOOGLE_SHEET_NAME`

---

# FASE 5: SHOPIFY INTEGRATION (10 min)

## Step 10: Tilføj Store Locator til Shopify

### For SINGLE shop:
```javascript
// I theme.liquid eller page template
<script>
const STORES_URL = 'https://cdn.jsdelivr.net/gh/[USERNAME]/[REPO]@main/stores.min.json';

fetch(STORES_URL)
  .then(r => r.json())
  .then(stores => {
    // Din store locator kode
  });
</script>
```

### For MULTI-shop:
Hver Shopify shop får sin egen URL:

**Dansk Shopify:**
```javascript
const STORES_URL = '.../stores-dk.min.json';
```

**Tysk Shopify:**
```javascript
const STORES_URL = '.../stores-de.min.json';
```

---

# FASE 6: AUTOMATION (2 min)

## Step 11: Verificer automation
GitHub Action kører automatisk hver dag kl 07:00.

Manuel trigger:
1. Gå til Actions tab i GitHub
2. Vælg "Update Store Data"
3. Klik "Run workflow"

---

# BESLUTNINGS TRÆ

## Hvornår skal jeg vælge hvad?

### Vælg SINGLE SHOP hvis:
- ✅ Kun én Shopify butik
- ✅ Alle lande vises sammen
- ✅ Simpel opsætning ønskes

### Vælg MULTI-SHOP hvis:
- ✅ Flere Shopify butikker (rabens-dk, rabens-de, etc.)
- ✅ Forskellige lande per shop
- ✅ Forskellige sprog/valuta per marked
- ✅ Geografisk segmentering ønskes

---

# FEJLFINDING

## Problem: "Google Sheets API fejl 400"
**Løsning:** Check ark navn i .env matcher Google Sheet

## Problem: "No stores found"
**Løsning:** Check Country kolonne har korrekte ISO koder

## Problem: "Command not found: gh"
**Løsning:** Installer GitHub CLI eller opret repo manuelt

## Problem: Multi-shop viser forkerte lande
**Løsning:** Verificer Country værdier i Google Sheet

---

# LEVERANCE CHECKLIST

## Før levering:
- [ ] Google Sheet delt korrekt
- [ ] Alle shops tester OK
- [ ] CDN URLs verificeret
- [ ] Automation kører
- [ ] README opdateret

## Til klient:
- [ ] Google Sheet adgang
- [ ] GitHub repo link (read-only)
- [ ] CDN URLs til hver shop
- [ ] Instruktioner for data opdatering
- [ ] Support kontakt info

---

# EKSEMPEL PROJEKTER

## Single Shop (simpel):
```
nordal-store-locator/
├── stores.json         # Alle 755 butikker
├── stores.min.json     # Minified version
└── store-locator.html  # Enkelt HTML
```

## Multi-Shop (Rabens):
```
rabens-store-locator/
├── stores-dk.json      # 127 nordiske butikker
├── stores-de.json      # 89 DACH butikker
├── stores-eu.json      # 234 EU butikker
├── stores-us.json      # 45 US butikker
└── stores-all.json     # 495 butikker total
```

---

# PRIS KALKULATION

## Basis setup (2-3 timer):
- Google Sheets opsætning: 30 min
- Script setup: 30 min
- GitHub & CDN: 30 min
- Shopify integration: 30 min
- Test & dokumentation: 30 min

## Multi-shop tillæg (+1-2 timer):
- Lande segmentering: 30 min
- Per-shop konfiguration: 30 min
- Ekstra test: 30 min

## Suggested priser:
- **Single shop:** 2.500-5.000 kr
- **Multi-shop (2-3 shops):** 4.000-7.500 kr
- **Multi-shop (4+ shops):** 6.000-10.000 kr
- **Vedligeholdelse:** 200-500 kr/måned

---

# TIPS & TRICKS

## Performance:
- Brug alltid `.min.json` versioner i produktion
- Cache i sessionStorage for hurtigere load
- Lazy load store locator på større sider

## Sikkerhed:
- Aldrig commit `.env` fil
- Brug GitHub Secrets for API keys
- Begræns Google API key til Sheets API

## Skalering:
- Over 1000 butikker? Split i regionale filer
- Over 5000 butikker? Overvej database løsning
- Mange shops? Lav central admin dashboard
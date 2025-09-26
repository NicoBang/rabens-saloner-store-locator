# Store Locator Template System
## For nye Shopify shops

---

## 📦 PAKKE STRUKTUR
```
store-locator-template/
├── setup/
│   ├── config.template.env          # Environment variables skabelon
│   ├── setup-wizard.js              # Interaktiv opsætnings guide
│   └── README.md                     # Dokumentation
├── src/
│   ├── shopify-store-updater.js     # Hoved script (universal)
│   ├── store-locator.html           # Frontend (tilpasses design)
│   └── store-locator-embed.liquid   # Shopify Liquid version
├── automation/
│   ├── github-action.yml            # GitHub Actions workflow
│   ├── deploy.sh                    # Manuel deploy script
│   └── vercel.json                  # Vercel cron alternativ
└── examples/
    ├── google-sheet-template.csv    # Google Sheets skabelon
    └── demo-stores.json              # Test data
```

---

## 🎯 DEL 1: UNIVERSAL BASE (Genbruges hver gang)

### 1. Google Sheets Skabelon
**Kolonner (skal være ens for alle):**
- Company
- Address  
- Postal Code (med mellemrum)
- City
- Country (ISO koder: DK, SE, NO, etc.)
- Phone
- Website
- Email (valgfri)
- Physical (X hvis fysisk butik)
- Online (X hvis online)

### 2. Base Scripts (behøver ingen ændringer)

**shopify-store-updater.js** - Universel version:
```javascript
// Universal Store Locator Updater
// Version 2.0 - Template Edition

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

// Alle konfigurationer kommer fra .env fil
const CONFIG = {
    // Google Sheets (fra .env)
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
    GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME || 'Sheet1',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    
    // GitHub (fra .env)
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITHUB_REPO: process.env.GITHUB_REPO,
    
    // Shop info (fra .env)
    SHOP_NAME: process.env.SHOP_NAME,
    SHOP_DOMAIN: process.env.SHOP_DOMAIN
};

// Resten af koden forbliver den samme...
```

---

## 🛠️ DEL 2: SHOP-SPECIFIK TILPASNING

### For hver ny shop skal du:

### 1. Opret `.env` fil:
```env
# Google Sheets
GOOGLE_API_KEY=AIza...                           # Genbruges for alle shops
GOOGLE_SHEET_ID=1ABC...                          # Unikt per shop
GOOGLE_SHEET_NAME=Sheet1                         # Normalt Sheet1

# GitHub  
GITHUB_USERNAME=ClientName                       # Client's GitHub eller dit
GITHUB_REPO=clientname-store-locator            # Unikt repo navn

# Shop Info
SHOP_NAME=Client Shop Name
SHOP_DOMAIN=client-shop.myshopify.com
SHOP_PRIMARY_COLOR=#000000                      # Brand farver
SHOP_SECONDARY_COLOR=#666666
```

### 2. Tilpas HTML design:
```html
<!-- store-locator.html - Tilpasses til brand -->
<style>
    :root {
        --primary-color: #000000;      /* Fra .env eller manuel */
        --secondary-color: #666666;
        --font-family: 'Client Font', sans-serif;
    }
    
    .search-btn {
        background: var(--primary-color);
    }
</style>
```

### 3. GitHub Repository Setup:
```bash
# For hver ny client
gh repo create [client]-store-locator --public
git init
git remote add origin https://github.com/[username]/[client]-store-locator
```

---

## 🚀 SETUP PROCES (Step-by-step)

### FASE 1: Forberedelse (15 min)

1. **Klon template**:
```bash
git clone https://github.com/YourUsername/store-locator-template
cd store-locator-template
mv store-locator-template client-name-stores
cd client-name-stores
```

2. **Opret Google Sheet**:
   - Kopier template: [Template Sheet](https://docs.google.com/spreadsheets/d/TEMPLATE_ID)
   - Del som "Anyone with link can view"
   - Kopier Sheet ID fra URL

3. **Setup GitHub repo**:
```bash
rm -rf .git
git init
gh repo create client-store-locator --public
git remote add origin https://github.com/USERNAME/client-store-locator
```

### FASE 2: Konfiguration (10 min)

4. **Udfyld `.env`**:
```bash
cp setup/config.template.env .env
nano .env  # Rediger med client's info
```

5. **Tilpas design** (valgfrit):
   - Opdater farver i `store-locator.html`
   - Tilføj client's logo
   - Match deres Shopify tema

6. **Test lokalt**:
```bash
npm install
node shopify-store-updater.js test
# Verificer at Google Sheets connection virker
```

### FASE 3: Deploy (10 min)

7. **Initial push**:
```bash
git add .
git commit -m "Initial setup for [Client Name]"
git push -u origin main
```

8. **GitHub Secrets** (for automation):
   - Go to Settings → Secrets → Actions
   - Add: `GOOGLE_API_KEY`, `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_NAME`

9. **Setup automation**:
```bash
cp automation/github-action.yml .github/workflows/update-stores.yml
git add .github
git commit -m "Add automation"
git push
```

10. **Verificer CDN**:
```
https://cdn.jsdelivr.net/gh/[USERNAME]/[REPO]@main/stores.min.json
```

### FASE 4: Shopify Integration (15 min)

11. **Tilføj til Shopify**:
    - Online Store → Themes → Edit code
    - Create new template: `page.store-locator.liquid`
    - Paste HTML kode
    - Create page: "Find Store" → use template

12. **Eller brug embed**:
```liquid
<!-- Embed direkte i enhver Shopify side -->
<div id="store-locator-app"></div>
<script src="https://cdn.jsdelivr.net/gh/[USERNAME]/[REPO]@main/store-locator.min.js"></script>
```

---

## ⚡ QUICK START SCRIPT

### setup-wizard.js - Interaktiv opsætning:
```javascript
#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 Store Locator Setup Wizard\n');

const questions = [
    { key: 'SHOP_NAME', q: 'Shop navn: ' },
    { key: 'SHOP_DOMAIN', q: 'Shopify domæne (xxx.myshopify.com): ' },
    { key: 'GOOGLE_SHEET_ID', q: 'Google Sheet ID: ' },
    { key: 'GITHUB_USERNAME', q: 'GitHub brugernavn: ' },
    { key: 'GITHUB_REPO', q: 'Repository navn: ' }
];

let config = {
    GOOGLE_API_KEY: 'AIza...' // Din fælles API key
};

async function askQuestions(index = 0) {
    if (index >= questions.length) {
        createEnvFile();
        return;
    }
    
    rl.question(questions[index].q, (answer) => {
        config[questions[index].key] = answer;
        askQuestions(index + 1);
    });
}

function createEnvFile() {
    const envContent = Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    fs.writeFileSync('.env', envContent);
    console.log('\n✅ .env fil oprettet!');
    
    console.log('\n📦 Installerer dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('\n🔧 Opretter GitHub repo...');
    execSync(`gh repo create ${config.GITHUB_REPO} --public`, { stdio: 'inherit' });
    
    console.log('\n✅ Setup komplet! Næste skridt:');
    console.log('1. Kør: node shopify-store-updater.js');
    console.log('2. Push til GitHub: git push -u origin main');
    console.log('3. Tilføj til Shopify tema');
    
    rl.close();
}

askQuestions();
```

---

## 📊 PRIS SKABELON

### For klienter:
- **Setup**: 2-3 timer × din timepris
- **Tilpasning**: 1-2 timer ekstra for custom design
- **Vedligeholdelse**: 30 min/måned eller inkluder i hosting

### Hvad klienten får:
- ✅ Automatisk synk med deres Google Sheet
- ✅ CDN hosting (lynhurtigt globally)
- ✅ Daglige automatiske opdateringer
- ✅ Fuld kontrol over data
- ✅ Ingen månedlige app fees

---

## 🎨 TILPASNINGS MULIGHEDER

### Basis (Inkluderet):
- Standard design
- Søgning og filtrering
- Land dropdown
- Responsive layout

### Premium tilpasninger:
- Custom design matching tema (+ 2 timer)
- Google Maps integration (+ 3 timer)
- Multi-sprog support (+ 2 timer)
- Distance beregning (+ 2 timer)
- Åbningstider system (+ 3 timer)

---

## 📝 LEVERANCE CHECKLIST

- [ ] Google Sheet oprettet og delt
- [ ] GitHub repo oprettet
- [ ] Automation sat op
- [ ] CDN URL verificeret
- [ ] Shopify integration komplet
- [ ] Client har adgang til Google Sheet
- [ ] Client kan se GitHub repo (read access)
- [ ] Test på mobil + desktop
- [ ] Dokumentation leveret
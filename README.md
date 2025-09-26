# Rabens Saloner Store Locator

## 🌍 Multi-Shop Configuration

| Shop | Domain | Countries | CDN URL |
|------|--------|-----------|---------|
| INT | rabenssaloner.myshopify.com | All | [stores-int.min.json](https://cdn.jsdelivr.net/gh/NicoBang/rabens-saloner-store-locator@main/stores-int.min.json) |
| DK | rabenssaloner-dkk-da.myshopify.dk | All | [stores-dk.min.json](https://cdn.jsdelivr.net/gh/NicoBang/rabens-saloner-store-locator@main/stores-dk.min.json) |
| ALL | - | All countries | [stores-all.min.json](https://cdn.jsdelivr.net/gh/NicoBang/rabens-saloner-store-locator@main/stores-all.min.json) |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Test connection
npm test

# Update store data
npm run update

# Deploy to GitHub
npm run deploy
```

## 📊 Data Source

- **Google Sheet:** [View/Edit](https://docs.google.com/spreadsheets/d/1hjVPF4fAlZJpdA314T2N-NH1ZU_1kfFn1Htn3FmPcYg)
- **Sheet Name:** forhandlere

## 🔄 Automation

Updates automatically every day at 07:00 CET via GitHub Actions.

### Manual Update

1. Edit data in Google Sheet
2. Run `npm run update`
3. Push to GitHub: `git push`

## 🔧 Configuration

All settings are in `.env` file (not committed to Git).

## 📁 Output Files

### Per Shop
- `stores-int.json` - All countries
- `stores-dk.json` - All countries
- `stores-all.json` - All stores combined

## 📝 Required Google Sheet Columns

- Company
- Address
- Postal Code
- City
- Country (Required for filtering)
- Phone
- Website
- Email (Optional)
- Physical (Mark with "X")
- Online (Mark with "X")

## 🔒 Security

- API keys are stored in `.env` (never committed)
- GitHub Secrets are used for automation
- Google Sheet must be shared as "Anyone with link can view"

## 📞 Support

For issues or questions, contact the developer.

---
Generated: 2025-09-26T12:09:05.123Z

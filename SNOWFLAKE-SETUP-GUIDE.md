# Snowflake Integration Setup Guide

## Overview
Your Comments App now supports storing rich text data in Snowflake with automatic localStorage fallback. The app preserves all HTML formatting (colors, highlights, etc.) in the database.

## 🏗️ Database Setup

### 1. Run the SQL Setup Script
Execute the commands in `snowflake-setup.sql` in your Snowflake environment:

```sql
-- This creates the database structure
CREATE DATABASE IF NOT EXISTS TABLEAU_EXTENSIONS;
USE DATABASE TABLEAU_EXTENSIONS;
CREATE SCHEMA IF NOT EXISTS COMMENTS_APP;
USE SCHEMA COMMENTS_APP;

-- Creates POSTS table (stores rich HTML content)
-- Creates COMMENTS table (stores plain text)
-- Creates indexes for performance
-- Creates a view with comment counts
```

### 2. Configure Connection Settings
Update `snowflake-config.js` with your Snowflake details:

```javascript
const SNOWFLAKE_CONFIG = {
    account: 'YOUR_ACCOUNT.snowflakecomputing.com',
    database: 'TABLEAU_EXTENSIONS',
    schema: 'COMMENTS_APP',
    warehouse: 'COMPUTE_WH'
};
```

## 🔐 Authentication Options

### Option A: OAuth (Recommended for Production)
- Set up OAuth application in Snowflake
- Configure client ID and redirect URI
- Most secure for office environment

### Option B: Service Account (Alternative)
- Create dedicated service account
- Use key-pair authentication
- Good for automated environments

### Option C: Development Mode
- Uses localStorage fallback
- No Snowflake connection required
- Perfect for testing

## 🚀 Deployment Architecture

```
Office Environment:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tableau       │    │   GitHub Pages  │    │   Snowflake     │
│   Dashboard     │───▶│   (Comments App)│───▶│   Database      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Rich Text Data Storage

### Posts Table Structure:
- `CONTENT` field stores complete HTML with formatting
- Colors: `<span style="color: #ff0000">red text</span>`
- Highlights: `<span style="background-color: #ffff00">highlighted</span>`
- All formatting preserved exactly as entered

### Data Flow:
1. User creates post with rich text formatting
2. HTML content sent to Snowflake API
3. Stored in POSTS.CONTENT as TEXT field
4. Retrieved and rendered with formatting intact

## 🔧 Configuration Steps for Office

### 1. Snowflake Setup
```sql
-- Run the setup script
\copy snowflake-setup.sql
```

### 2. Update Configuration
```javascript
// Edit snowflake-config.js
account: 'your-office-account.snowflakecomputing.com'
warehouse: 'YOUR_OFFICE_WAREHOUSE'
```

### 3. Deploy Updated Files
```bash
git add .
git commit -m "Add Snowflake integration"
git push
```

### 4. Test Integration
- Open app in Tableau
- Create a post with colors/highlights
- Verify data appears in Snowflake tables

## 🛡️ Fallback Behavior

The app automatically handles connection issues:

1. **Snowflake Available**: All data stored in database
2. **Snowflake Unavailable**: Falls back to localStorage
3. **Mixed Mode**: Reads from both sources seamlessly

## 🎯 Benefits for Office Use

✅ **Centralized Data**: All comments stored in your Snowflake instance
✅ **Rich Text Preserved**: Colors and formatting maintained
✅ **Multi-User**: Shared data across all office users
✅ **Backup**: Data persists beyond browser storage
✅ **Analytics**: Query comment data with SQL
✅ **Security**: Uses your existing Snowflake security

## 📝 Next Steps

1. **Setup Snowflake database** using provided SQL script
2. **Configure authentication** method for your environment
3. **Update configuration files** with your Snowflake details
4. **Deploy to GitHub Pages** with updated code
5. **Test in office environment** with TREX file

## 🆘 Troubleshooting

- **Connection fails**: App falls back to localStorage automatically
- **Authentication issues**: Check OAuth/credentials configuration
- **Data not syncing**: Verify Snowflake permissions and network access
- **Rich text lost**: Ensure CONTENT field is TEXT type, not VARCHAR

## 📞 Support Files Created

- `snowflake-setup.sql` - Database setup script
- `snowflake-config.js` - Connection configuration
- `snowflake-api.js` - API integration layer
- `SNOWFLAKE-SETUP-GUIDE.md` - This guide

Your Comments App is now enterprise-ready with Snowflake integration! 🎉
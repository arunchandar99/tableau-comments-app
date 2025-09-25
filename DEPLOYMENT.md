# Live Snowflake Integration Deployment Guide

This guide will help you deploy a **server-side API** that enables **true writeback functionality** between your Tableau extension and Snowflake database.

## 🎯 What This Achieves

✅ **Automatic, real-time sync** between Tableau and Snowflake
✅ **No manual copy/paste** - everything happens automatically
✅ **True writeback** - users can add/edit/delete directly from dashboard
✅ **Live connection** - changes appear instantly
✅ **Professional grade** - enterprise-ready solution

## 🚀 Step 1: Deploy to Vercel (Free)

### 1.1 Install Vercel CLI
```bash
npm i -g vercel
```

### 1.2 Login to Vercel
```bash
vercel login
```

### 1.3 Deploy the API
From your comments-app folder:
```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Y
- **Which scope?** → Your personal account
- **Link to existing project?** → N
- **Project name?** → tableau-comments-api
- **Directory?** → ./ (current directory)

### 1.4 Note Your API URL
After deployment, you'll get a URL like:
```
https://tableau-comments-api.vercel.app
```

## 🔧 Step 2: Update Client Configuration

### 2.1 Edit snowflake-live-api.js
Replace this line:
```javascript
this.baseURL = 'https://your-app.vercel.app/api';
```

With your actual Vercel URL:
```javascript
this.baseURL = 'https://tableau-comments-api.vercel.app/api';
```

### 2.2 Update HTML to Use Live API
In `comments-app.html`, change:
```html
<script src="snowflake-webhook-api.js"></script>
```

To:
```html
<script src="snowflake-live-api.js"></script>
```

## 📤 Step 3: Deploy Updated Client

### 3.1 Commit and Push
```bash
git add .
git commit -m "Add live Snowflake API integration"
git push origin main
```

Your GitHub Pages will automatically update with the live integration.

## ✅ Step 4: Test Live Integration

1. **Open your Tableau dashboard** with the comments extension
2. **Look for the "Live Snowflake" status panel** (top-right corner)
3. **Should show "🟢 Live Connected"** if deployment worked
4. **Create a new post** with rich text formatting
5. **Check Snowflake immediately** - data should appear automatically!

## 🛠️ Troubleshooting

### Status Shows "🔴 Connection Failed"
- Check your Vercel deployment URL is correct
- Verify Snowflake credentials in `vercel.json`
- Check browser console for specific error messages

### "Server not deployed yet" Message
- Complete Step 1 first (deploy to Vercel)
- Update the baseURL in Step 2.1

### Snowflake Connection Issues
- Verify your Snowflake account details in `vercel.json`
- Ensure your Snowflake user has proper permissions
- Check warehouse and role settings

## 🔐 Security Notes

For production, consider:
- Using Snowflake OAuth instead of username/password
- Environment variables for credentials (not in code)
- API key authentication for the server endpoint

## 💡 Alternative Deployment Options

Instead of Vercel, you can also deploy to:
- **AWS Lambda** + API Gateway
- **Google Cloud Functions**
- **Azure Functions**
- **Heroku**

The `server-api.js` file can be adapted for any serverless platform.

---

## 🎉 Success!

Once deployed, you'll have:
- ✅ **True writeback capability**
- ✅ **Real-time sync** with Snowflake
- ✅ **No manual intervention** required
- ✅ **Enterprise-grade reliability**

Users can now add, edit, and delete comments directly from the Tableau dashboard, and all changes will automatically sync to your Snowflake database in real-time!
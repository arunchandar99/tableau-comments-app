#!/bin/bash

# GitHub Pages Deployment Script for Tableau Comments App
# Run this script after creating your GitHub repository

echo "🚀 Deploying Tableau Comments App to GitHub Pages..."

# Check if we have a GitHub username
if [ -z "$1" ]; then
    echo "❌ Please provide your GitHub username:"
    echo "Usage: ./deploy.sh YOUR_GITHUB_USERNAME"
    echo "Example: ./deploy.sh arunchandar"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="tableau-comments-app"

echo "📝 Updating TREX file with GitHub Pages URL..."

# Update the TREX file with the correct GitHub Pages URL
sed -i '' "s/YOUR_GITHUB_USERNAME/$GITHUB_USERNAME/g" comments-app.trex

echo "✅ TREX file updated!"

echo "🔗 Setting up Git remote..."

# Add GitHub remote
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git

echo "📤 Pushing to GitHub..."

# Push to GitHub
git add .
git commit -m "Update TREX file for GitHub Pages deployment

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>" || true

git branch -M main
git push -u origin main

echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "2. Go to Settings > Pages"
echo "3. Set Source to 'Deploy from a branch'"
echo "4. Choose 'main' branch and '/ (root)' folder"
echo "5. Click Save"
echo ""
echo "🌐 Your app will be live at:"
echo "https://$GITHUB_USERNAME.github.io/$REPO_NAME/comments-app.html"
echo ""
echo "📁 Use this TREX file in your office:"
echo "$(pwd)/comments-app.trex"
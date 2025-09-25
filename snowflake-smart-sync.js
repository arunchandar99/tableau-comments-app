// Smart Snowflake Sync - Enhanced Batch with Auto-Copy
class SmartSnowflakeSync {
    constructor() {
        this.config = {
            database: 'TABLEAU_EXTENSIONS',
            schema: 'COMMENTS_APP'
        };
        this.pendingPosts = [];
        this.createSmartPanel();
    }

    createSmartPanel() {
        // Create an enhanced control panel
        const smartPanel = document.createElement('div');
        smartPanel.id = 'smart-snowflake-panel';
        smartPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 340px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 16px;
            color: white;
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
        `;

        smartPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="margin: 0; color: white; font-size: 16px; font-weight: 600;">
                    <i class="fas fa-bolt" style="margin-right: 8px; color: #ffd700;"></i>Smart Snowflake Sync
                </h4>
                <button onclick="document.getElementById('smart-snowflake-panel').style.display='none'"
                        style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px;">×</button>
            </div>

            <div id="smart-status" style="margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.15); border-radius: 8px; border-left: 4px solid #ffd700;">
                <strong style="color: #ffd700;">⚡ Ready for Smart Sync</strong><br>
                <span style="color: rgba(255,255,255,0.9); font-size: 12px;">Posts auto-queue and sync with one click</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="color: rgba(255,255,255,0.9);">
                    Queued: <span id="smart-pending-count" style="font-weight: 600; color: #ffd700;">0</span> posts
                </div>
                <div id="smart-auto-copy" style="color: rgba(255,255,255,0.7); font-size: 11px;">
                    Auto-copy enabled
                </div>
            </div>

            <div style="display: flex; gap: 8px;">
                <button id="smart-sync-btn" onclick="window.snowflakeAPI.smartSync()"
                        style="flex: 1; padding: 10px; background: linear-gradient(45deg, #ffd700, #ffed4a); color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">
                    <i class="fas fa-sync" style="margin-right: 6px;"></i>Smart Sync
                </button>
                <button onclick="window.snowflakeAPI.viewSQL()"
                        style="padding: 10px 12px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                    <i class="fas fa-code"></i>
                </button>
            </div>

            <div id="smart-instructions" style="margin-top: 12px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; font-size: 11px; color: rgba(255,255,255,0.8); display: none;">
                <strong>Next Steps:</strong><br>
                1. Open Snowflake worksheet<br>
                2. Paste (Ctrl+V) - SQL is copied!<br>
                3. Execute to sync all posts
            </div>
        `;

        // Add show button when panel is hidden
        const showButton = document.createElement('button');
        showButton.id = 'show-smart-btn';
        showButton.innerHTML = '<i class="fas fa-bolt"></i>';
        showButton.title = 'Smart Snowflake Sync';
        showButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffd700;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: none;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-size: 18px;
        `;
        showButton.onclick = () => {
            smartPanel.style.display = 'block';
            showButton.style.display = 'none';
        };

        // Update hide button
        smartPanel.querySelector('button').onclick = () => {
            smartPanel.style.display = 'none';
            showButton.style.display = 'block';
        };

        // Add to page
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(smartPanel);
                document.body.appendChild(showButton);
            });
        } else {
            document.body.appendChild(smartPanel);
            document.body.appendChild(showButton);
        }
    }

    updateCounter() {
        const countElement = document.getElementById('smart-pending-count');
        if (countElement) {
            countElement.textContent = this.pendingPosts.length;
        }

        const syncBtn = document.getElementById('smart-sync-btn');
        if (syncBtn) {
            if (this.pendingPosts.length === 0) {
                syncBtn.innerHTML = '<i class="fas fa-check" style="margin-right: 6px;"></i>All Synced';
                syncBtn.style.opacity = '0.6';
                syncBtn.disabled = true;
            } else {
                syncBtn.innerHTML = `<i class="fas fa-sync" style="margin-right: 6px;"></i>Sync ${this.pendingPosts.length} Posts`;
                syncBtn.style.opacity = '1';
                syncBtn.disabled = false;
            }
        }
    }

    async initialize() {
        console.log('⚡ Smart Snowflake Sync initialized');
        this.updateCounter();

        // Show welcome message
        if (typeof showNotification === 'function') {
            showNotification('⚡ Smart Sync ready - posts will queue automatically!');
        }

        return true;
    }

    async savePosts(posts) {
        if (!Array.isArray(posts) || posts.length === 0) {
            return true;
        }

        try {
            let newPosts = 0;

            // Add posts to queue (avoid duplicates)
            for (const post of posts) {
                const existingIndex = this.pendingPosts.findIndex(p => p.id === post.id);
                if (existingIndex >= 0) {
                    // Update existing post
                    this.pendingPosts[existingIndex] = post;
                } else {
                    // Add new post
                    this.pendingPosts.push(post);
                    newPosts++;
                }
            }

            this.updateCounter();

            // Smart notification
            if (newPosts > 0) {
                const message = newPosts === 1 ?
                    `✨ ${newPosts} post queued for Smart Sync!` :
                    `✨ ${newPosts} posts queued for Smart Sync!`;

                if (typeof showNotification === 'function') {
                    showNotification(message);
                }

                console.log(`✨ ${newPosts} new posts added to Smart Sync queue`);
            }

            return true;

        } catch (error) {
            console.error('❌ Error queuing posts:', error);
            return false;
        }
    }

    generateCleanSQL(post) {
        // Generate super clean SQL
        const cleanContent = post.content
            .replace(/'/g, "''")
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ');

        const timestamp = parseInt(post.timestamp) || Date.now();

        return `-- ${post.metricLabel || post.id} (${new Date(timestamp).toLocaleString()})
INSERT INTO ${this.config.database}.${this.config.schema}.POSTS
(ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
VALUES (
    '${String(post.id || '').replace(/'/g, "''")}',
    '${String(post.type || '').replace(/'/g, "''")}',
    '${String(post.metricValue || '').replace(/'/g, "''")}',
    '${String(post.metricLabel || '').replace(/'/g, "''")}',
    '${cleanContent}',
    '${String(post.author || 'Tableau User').replace(/'/g, "''")}',
    ${timestamp},
    ${parseInt(post.likes) || 0}
);`;
    }

    smartSync() {
        if (this.pendingPosts.length === 0) {
            alert('✅ No posts to sync - all caught up!');
            return;
        }

        try {
            // Generate SQL with context
            const sqlHeader = `-- Smart Snowflake Sync - Generated ${new Date().toLocaleString()}
-- Posts: ${this.pendingPosts.length} | Database: ${this.config.database}.${this.config.schema}

USE DATABASE ${this.config.database};
USE SCHEMA ${this.config.schema};

`;

            const sqlStatements = this.pendingPosts.map(post => this.generateCleanSQL(post)).join('\n\n');
            const fullSQL = sqlHeader + sqlStatements;

            // Auto-copy to clipboard
            this.copyToClipboard(fullSQL);

            // Show smart instructions
            const instructionsElement = document.getElementById('smart-instructions');
            if (instructionsElement) {
                instructionsElement.style.display = 'block';
            }

            // Smart notification with instructions
            const count = this.pendingPosts.length;
            alert(`⚡ Smart Sync Complete!\n\n✅ SQL for ${count} posts copied to clipboard\n\n📋 Next Steps:\n1. Open Snowflake worksheet\n2. Paste (Ctrl+V) - SQL ready!\n3. Execute to sync all posts\n\n💡 Click "Mark as Synced" when done`);

            // Add completion button
            this.addCompletionButton();

        } catch (error) {
            console.error('❌ Smart Sync error:', error);
            alert('❌ Smart Sync failed - check console for details');
        }
    }

    addCompletionButton() {
        const syncBtn = document.getElementById('smart-sync-btn');
        if (syncBtn) {
            syncBtn.innerHTML = '<i class="fas fa-check" style="margin-right: 6px;"></i>Mark as Synced';
            syncBtn.onclick = () => this.markAsSynced();
        }
    }

    markAsSynced() {
        this.pendingPosts = [];
        this.updateCounter();

        const statusElement = document.getElementById('smart-status');
        if (statusElement) {
            statusElement.innerHTML = `
                <strong style="color: #4ade80;">✅ Sync Complete</strong><br>
                <span style="color: rgba(255,255,255,0.9); font-size: 12px;">All posts synced to Snowflake</span>
            `;
        }

        const instructionsElement = document.getElementById('smart-instructions');
        if (instructionsElement) {
            instructionsElement.style.display = 'none';
        }

        // Reset button
        const syncBtn = document.getElementById('smart-sync-btn');
        if (syncBtn) {
            syncBtn.innerHTML = '<i class="fas fa-sync" style="margin-right: 6px;"></i>Smart Sync';
            syncBtn.onclick = () => window.snowflakeAPI.smartSync();
        }

        if (typeof showNotification === 'function') {
            showNotification('🎉 All posts marked as synced!');
        }

        console.log('🎉 Smart Sync completed - all posts marked as synced');
    }

    copyToClipboard(text) {
        try {
            // Modern clipboard API
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
                return true;
            }

            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, 99999);
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }

    viewSQL() {
        if (this.pendingPosts.length === 0) {
            alert('No SQL to view - create some posts first!');
            return;
        }

        const sqlHeader = `-- Smart Snowflake Sync Preview
-- Posts: ${this.pendingPosts.length} | Generated: ${new Date().toLocaleString()}

USE DATABASE ${this.config.database};
USE SCHEMA ${this.config.schema};

`;

        const sqlStatements = this.pendingPosts.map(post => this.generateCleanSQL(post)).join('\n\n');
        const fullSQL = sqlHeader + sqlStatements;

        // Show in a new window for easy copying
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        newWindow.document.write(`
            <html>
                <head>
                    <title>Smart Snowflake Sync - SQL Preview</title>
                    <style>
                        body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                        pre { background: #2d2d2d; padding: 15px; border-radius: 8px; overflow: auto; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                        .copy-btn { background: #4ade80; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Smart Snowflake Sync - SQL Preview</h2>
                        <p>Posts: ${this.pendingPosts.length} | Ready for execution in Snowflake</p>
                    </div>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('sql-content').textContent); alert('SQL copied to clipboard!')">Copy All SQL</button>
                    <pre id="sql-content">${fullSQL}</pre>
                </body>
            </html>
        `);
    }

    // Standard interface methods
    async loadPosts() {
        return [];
    }

    async deletePost(postId) {
        console.log(`🗑️ Delete SQL: DELETE FROM ${this.config.database}.${this.config.schema}.POSTS WHERE ID = '${postId}';`);
        return true;
    }

    async saveComment(postId, comment) {
        const sql = `INSERT INTO ${this.config.database}.${this.config.schema}.COMMENTS (ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
VALUES ('${comment.id}', '${postId}', '${comment.author || 'Tableau User'}', '${comment.content.replace(/'/g, "''")}', ${comment.timestamp});`;

        console.log('💬 Comment SQL:', sql);
        return true;
    }
}

// Initialize Smart Snowflake Sync
const smartSnowflakeSync = new SmartSnowflakeSync();
window.snowflakeAPI = smartSnowflakeSync;

console.log('⚡ Smart Snowflake Sync loaded - enhanced batch processing ready!');
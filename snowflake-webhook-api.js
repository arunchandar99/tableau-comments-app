// Hybrid Snowflake API with Webhook Integration
class WebhookSnowflakeAPI {
    constructor() {
        this.config = {
            database: 'TABLEAU_EXTENSIONS',
            schema: 'COMMENTS_APP'
        };
        this.pendingPosts = [];
        this.createControlPanel();
    }

    createControlPanel() {
        // Create a control panel for batch operations
        const controlPanel = document.createElement('div');
        controlPanel.id = 'snowflake-control-panel';
        controlPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 320px;
            background: #ffffff;
            border: 2px solid #0066cc;
            border-radius: 8px;
            padding: 12px;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        controlPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #0066cc; font-size: 14px;">
                    <i class="fas fa-database"></i> Snowflake Sync
                </h4>
                <button onclick="document.getElementById('snowflake-control-panel').style.display='none'"
                        style="background: none; border: none; font-size: 16px; cursor: pointer; color: #999;">×</button>
            </div>

            <div id="sync-status" style="margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #28a745;">
                <strong style="color: #28a745;">✅ Ready</strong><br>
                <span style="color: #666; font-size: 11px;">Posts will auto-generate SQL for Snowflake</span>
            </div>

            <div id="pending-count" style="margin-bottom: 10px; font-weight: 500; color: #333;">
                Pending posts: <span id="pending-number">0</span>
            </div>

            <button id="sync-all-btn" onclick="window.snowflakeAPI.executeAllPendingSQL()"
                    style="width: 100%; padding: 8px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; margin-bottom: 8px;">
                <i class="fas fa-sync"></i> Execute All SQL in Snowflake
            </button>

            <button onclick="window.snowflakeAPI.showAllSQL()"
                    style="width: 100%; padding: 6px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                <i class="fas fa-code"></i> View All SQL
            </button>

            <div id="sql-output" style="max-height: 200px; overflow-y: auto; margin-top: 10px; display: none;">
                <!-- SQL will appear here -->
            </div>
        `;

        // Add show button when panel is hidden
        const showButton = document.createElement('button');
        showButton.id = 'show-control-btn';
        showButton.innerHTML = '<i class="fas fa-database"></i>';
        showButton.title = 'Show Snowflake Control Panel';
        showButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: none;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        showButton.onclick = () => {
            controlPanel.style.display = 'block';
            showButton.style.display = 'none';
        };

        // Update hide button to show the show button
        controlPanel.querySelector('button').onclick = () => {
            controlPanel.style.display = 'none';
            showButton.style.display = 'block';
        };

        // Add to page when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(controlPanel);
                document.body.appendChild(showButton);
            });
        } else {
            document.body.appendChild(controlPanel);
            document.body.appendChild(showButton);
        }
    }

    updatePendingCount() {
        const countElement = document.getElementById('pending-number');
        if (countElement) {
            countElement.textContent = this.pendingPosts.length;
        }

        const syncBtn = document.getElementById('sync-all-btn');
        if (syncBtn) {
            syncBtn.disabled = this.pendingPosts.length === 0;
            if (this.pendingPosts.length === 0) {
                syncBtn.style.opacity = '0.5';
                syncBtn.style.cursor = 'not-allowed';
            } else {
                syncBtn.style.opacity = '1';
                syncBtn.style.cursor = 'pointer';
            }
        }
    }

    async initialize() {
        console.log('🔗 Webhook Snowflake API initialized');
        this.updatePendingCount();
        return true;
    }

    async savePosts(posts) {
        if (!Array.isArray(posts) || posts.length === 0) {
            return true;
        }

        try {
            // Add posts to pending queue
            for (const post of posts) {
                // Check if post already exists in pending
                const existingIndex = this.pendingPosts.findIndex(p => p.id === post.id);
                if (existingIndex >= 0) {
                    // Update existing post
                    this.pendingPosts[existingIndex] = post;
                } else {
                    // Add new post
                    this.pendingPosts.push(post);
                }
            }

            this.updatePendingCount();

            // Show success notification
            if (typeof showNotification === 'function') {
                showNotification(`${posts.length} post(s) ready for Snowflake sync!`);
            }

            console.log(`✅ ${posts.length} posts queued for Snowflake sync`);
            return true;

        } catch (error) {
            console.error('❌ Error queuing posts:', error);
            return false;
        }
    }

    generateSQL(post) {
        // Clean the content for SQL
        const cleanContent = post.content
            .replace(/'/g, "''")
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ');

        const timestamp = parseInt(post.timestamp) || Date.now();

        return `-- Post: ${post.metricLabel || post.id}
USE DATABASE ${this.config.database};
USE SCHEMA ${this.config.schema};

INSERT INTO POSTS
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

    showAllSQL() {
        const sqlOutput = document.getElementById('sql-output');
        if (!sqlOutput) return;

        if (this.pendingPosts.length === 0) {
            sqlOutput.innerHTML = '<p style="color: #666; font-style: italic;">No pending posts</p>';
            sqlOutput.style.display = 'block';
            return;
        }

        const allSQL = this.pendingPosts.map(post => this.generateSQL(post)).join('\n\n');

        sqlOutput.innerHTML = `
            <div style="margin-bottom: 10px;">
                <button onclick="
                    const sql = this.parentElement.nextElementSibling.textContent;
                    navigator.clipboard.writeText(sql).then(() => {
                        alert('All SQL copied to clipboard!');
                    }).catch(() => {
                        this.parentElement.nextElementSibling.select();
                        document.execCommand('copy');
                        alert('All SQL copied to clipboard!');
                    });
                " style="width: 100%; padding: 6px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    <i class="fas fa-copy"></i> Copy All SQL
                </button>
            </div>
            <textarea readonly style="width: 100%; height: 150px; font-family: monospace; font-size: 10px; border: 1px solid #ddd; padding: 5px;">${allSQL}</textarea>
        `;
        sqlOutput.style.display = 'block';
    }

    executeAllPendingSQL() {
        if (this.pendingPosts.length === 0) {
            alert('No pending posts to sync!');
            return;
        }

        const allSQL = this.pendingPosts.map(post => this.generateSQL(post)).join('\n\n');

        // Copy to clipboard and show instructions
        navigator.clipboard.writeText(allSQL).then(() => {
            const count = this.pendingPosts.length;
            alert(`✅ SQL for ${count} posts copied to clipboard!\n\n📋 Next steps:\n1. Open Snowflake\n2. Paste (Ctrl+V) in worksheet\n3. Run the SQL\n4. Click "Clear Queue" when done`);
        }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = allSQL;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);

            const count = this.pendingPosts.length;
            alert(`✅ SQL for ${count} posts copied to clipboard!\n\n📋 Next steps:\n1. Open Snowflake\n2. Paste (Ctrl+V) in worksheet\n3. Run the SQL\n4. Click "Clear Queue" when done`);
        });

        // Add clear queue button
        setTimeout(() => {
            if (confirm('Mark all posts as synced and clear the queue?')) {
                this.clearQueue();
            }
        }, 5000);
    }

    clearQueue() {
        this.pendingPosts = [];
        this.updatePendingCount();

        const statusElement = document.getElementById('sync-status');
        if (statusElement) {
            statusElement.innerHTML = `
                <strong style="color: #28a745;">✅ Synced</strong><br>
                <span style="color: #666; font-size: 11px;">All posts synced to Snowflake</span>
            `;
        }

        console.log('✅ Queue cleared - all posts marked as synced');
    }

    async loadPosts() {
        // Return empty to use local storage, but could be enhanced to query Snowflake
        return [];
    }

    async deletePost(postId) {
        console.log(`🗑️ Delete SQL: DELETE FROM POSTS WHERE ID = '${postId}';`);
        return true;
    }

    async saveComment(postId, comment) {
        const sql = `INSERT INTO COMMENTS (ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
VALUES ('${comment.id}', '${postId}', '${comment.author || 'Tableau User'}', '${comment.content.replace(/'/g, "''")}', ${comment.timestamp});`;

        console.log('💬 Comment SQL:', sql);
        return true;
    }
}

// Initialize the webhook Snowflake API
const webhookSnowflakeAPI = new WebhookSnowflakeAPI();
window.snowflakeAPI = webhookSnowflakeAPI;

console.log('🔗 Webhook Snowflake API loaded - posts will queue for batch sync!');
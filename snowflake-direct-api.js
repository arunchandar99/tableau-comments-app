// Direct Snowflake REST API Integration (Browser-based)
class DirectSnowflakeAPI {
    constructor() {
        this.config = {
            account: 'ZDDMCAD-FGC62251',
            username: 'ARUNCHANDAR99',
            password: 'Arunchandar@99',
            database: 'TABLEAU_EXTENSIONS',
            schema: 'COMMENTS_APP',
            warehouse: 'COMPUTE_WH',
            role: 'ACCOUNTADMIN'
        };
        this.sessionToken = null;
        this.tokenExpiry = null;
        this.isConnected = false;
        this.createStatusPanel();
    }

    createStatusPanel() {
        const statusPanel = document.createElement('div');
        statusPanel.id = 'direct-status-panel';
        statusPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 12px 16px;
            background: #ffffff;
            border: 2px solid #ff6b35;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 280px;
        `;

        statusPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0; color: #ff6b35; font-size: 14px;">
                        <i class="fas fa-lightning-bolt"></i> Direct Snowflake
                    </h4>
                    <div id="direct-connection-status" style="margin-top: 5px;">
                        <span style="color: #ff9500;">🟡 Connecting...</span>
                    </div>
                </div>
                <button onclick="document.getElementById('direct-status-panel').style.display='none'"
                        style="background: none; border: none; font-size: 16px; cursor: pointer; color: #999;">×</button>
            </div>
            <div id="direct-sync-info" style="margin-top: 8px; font-size: 11px; color: #666;">
                Attempting direct connection to Snowflake REST API...
            </div>
            <div id="connection-details" style="margin-top: 8px; font-size: 10px; color: #888; display: none;">
                Account: ${this.config.account}<br>
                Database: ${this.config.database}.${this.config.schema}
            </div>
        `;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(statusPanel);
            });
        } else {
            document.body.appendChild(statusPanel);
        }
    }

    updateStatus(status, message, showDetails = false) {
        const statusElement = document.getElementById('direct-connection-status');
        const infoElement = document.getElementById('direct-sync-info');
        const detailsElement = document.getElementById('connection-details');

        if (statusElement && infoElement) {
            switch(status) {
                case 'connecting':
                    statusElement.innerHTML = '<span style="color: #ff9500;">🟡 Connecting...</span>';
                    infoElement.textContent = message || 'Establishing connection...';
                    break;
                case 'connected':
                    statusElement.innerHTML = '<span style="color: #28a745;">🟢 Connected!</span>';
                    infoElement.textContent = message || 'Direct connection established - automatic sync active!';
                    if (detailsElement) detailsElement.style.display = showDetails ? 'block' : 'none';
                    break;
                case 'failed':
                    statusElement.innerHTML = '<span style="color: #dc3545;">🔴 Connection Failed</span>';
                    infoElement.textContent = message || 'Direct connection not available';
                    if (detailsElement) detailsElement.style.display = showDetails ? 'block' : 'none';
                    break;
                case 'fallback':
                    statusElement.innerHTML = '<span style="color: #6c757d;">⚪ Fallback Mode</span>';
                    infoElement.textContent = message || 'Using alternative sync method';
                    break;
            }
        }
    }

    async getAuthToken() {
        // Check if we have a valid token
        if (this.sessionToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.sessionToken;
        }

        try {
            const authUrl = `https://${this.config.account}.snowflakecomputing.com/session/v1/login-request`;

            // Create a proxy request to avoid CORS (this might not work due to CORS policies)
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'TableauCommentsApp/1.0',
                    'X-Snowflake-Authorization-Token-Timeout': '3600'
                },
                body: JSON.stringify({
                    data: {
                        CLIENT_APP_ID: 'TableauCommentsApp',
                        CLIENT_APP_VERSION: '1.0.0',
                        ACCOUNT_NAME: this.config.account,
                        LOGIN_NAME: this.config.username,
                        PASSWORD: this.config.password
                    }
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Auth failed: ${response.status} - ${response.statusText}`);
            }

            const authData = await response.json();

            if (authData.success && authData.data && authData.data.token) {
                this.sessionToken = authData.data.token;
                this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour
                this.isConnected = true;
                return this.sessionToken;
            } else {
                throw new Error('Invalid auth response');
            }

        } catch (error) {
            console.error('❌ Direct auth failed:', error);
            throw error;
        }
    }

    async executeSQL(sql, bindings = []) {
        const token = await this.getAuthToken();

        try {
            const queryUrl = `https://${this.config.account}.snowflakecomputing.com/queries/v1/query-request`;

            const response = await fetch(queryUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Snowflake Token="${token}"`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'TableauCommentsApp/1.0'
                },
                body: JSON.stringify({
                    sqlText: sql,
                    bindings: bindings || [],
                    asyncExec: false,
                    sequenceId: Date.now()
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`Query failed: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(`SQL error: ${data.message || 'Unknown error'}`);
            }

            return data.data;

        } catch (error) {
            console.error('❌ SQL execution failed:', error);
            throw error;
        }
    }

    async initialize() {
        this.updateStatus('connecting', 'Attempting direct Snowflake connection...');

        try {
            console.log('🚀 Attempting direct Snowflake connection...');

            // Try to authenticate
            await this.getAuthToken();

            // Set context
            await this.executeSQL(`USE DATABASE ${this.config.database}`);
            await this.executeSQL(`USE SCHEMA ${this.config.schema}`);
            await this.executeSQL(`USE WAREHOUSE ${this.config.warehouse}`);

            // Test with a simple query
            await this.executeSQL('SELECT CURRENT_TIMESTAMP()');

            this.updateStatus('connected', 'Direct connection successful!', true);
            console.log('✅ Direct Snowflake connection established!');

            if (typeof showNotification === 'function') {
                showNotification('🚀 Direct Snowflake connection established!');
            }

            return true;

        } catch (error) {
            console.error('❌ Direct connection failed:', error.message);

            this.updateStatus('failed', `Connection failed: ${error.message.slice(0, 50)}...`, true);

            // Fallback to batch mode
            this.fallbackToBatchMode();

            return false;
        }
    }

    fallbackToBatchMode() {
        console.log('🔄 Falling back to batch sync mode...');

        setTimeout(() => {
            this.updateStatus('fallback', 'Using batch sync mode - click sync button to save to Snowflake');

            // Load the webhook API as fallback
            if (window.WebhookSnowflakeAPI) {
                const webhookAPI = new window.WebhookSnowflakeAPI();
                window.snowflakeAPI = webhookAPI;
                console.log('🔄 Switched to batch sync mode');
            }
        }, 2000);
    }

    async savePosts(posts) {
        if (!this.isConnected) {
            console.log('⚠️ Not connected - posts saved locally only');
            return true;
        }

        if (!Array.isArray(posts) || posts.length === 0) {
            return true;
        }

        try {
            for (const post of posts) {
                // Clean the content
                const cleanContent = post.content
                    .replace(/'/g, "''")
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, '')
                    .replace(/\t/g, ' ');

                const sql = `INSERT INTO POSTS
(ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                const bindings = [
                    String(post.id || ''),
                    String(post.type || ''),
                    String(post.metricValue || ''),
                    String(post.metricLabel || ''),
                    cleanContent,
                    String(post.author || 'Tableau User'),
                    parseInt(post.timestamp) || Date.now(),
                    parseInt(post.likes) || 0
                ];

                console.log('💾 Saving post directly to Snowflake...', post.metricLabel);
                await this.executeSQL(sql, bindings);
                console.log('✅ Post saved successfully!');
            }

            if (typeof showNotification === 'function') {
                showNotification(`✅ ${posts.length} post(s) automatically saved to Snowflake!`);
            }

            return true;

        } catch (error) {
            console.error('❌ Failed to save posts:', error);

            if (typeof showNotification === 'function') {
                showNotification(`❌ Save failed: ${error.message}`);
            }

            return false;
        }
    }

    async loadPosts() {
        if (!this.isConnected) {
            console.log('⚠️ Not connected - using local data only');
            return [];
        }

        try {
            const sql = `SELECT ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT,
                               AUTHOR, TIMESTAMP_MS, LIKES
                        FROM POSTS ORDER BY TIMESTAMP_MS DESC`;

            console.log('📖 Loading posts directly from Snowflake...');
            const rows = await this.executeSQL(sql);

            const posts = (rows || []).map(row => ({
                id: row[0],
                type: row[1],
                metricValue: row[2],
                metricLabel: row[3],
                content: row[4],
                author: row[5],
                timestamp: row[6],
                likes: row[7] || 0,
                comments: []
            }));

            console.log('✅ Loaded', posts.length, 'posts from Snowflake');
            return posts;

        } catch (error) {
            console.error('❌ Failed to load posts:', error);
            return [];
        }
    }

    async deletePost(postId) {
        if (!this.isConnected) return false;

        try {
            await this.executeSQL('DELETE FROM COMMENTS WHERE POST_ID = ?', [postId]);
            await this.executeSQL('DELETE FROM POSTS WHERE ID = ?', [postId]);

            console.log('✅ Post deleted from Snowflake');

            if (typeof showNotification === 'function') {
                showNotification('✅ Post deleted from Snowflake!');
            }

            return true;
        } catch (error) {
            console.error('❌ Failed to delete post:', error);
            return false;
        }
    }

    async saveComment(postId, comment) {
        if (!this.isConnected) return false;

        try {
            const sql = `INSERT INTO COMMENTS (ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
                        VALUES (?, ?, ?, ?, ?)`;

            const bindings = [
                String(comment.id),
                String(postId),
                String(comment.author || 'Tableau User'),
                String(comment.content),
                parseInt(comment.timestamp) || Date.now()
            ];

            await this.executeSQL(sql, bindings);
            console.log('✅ Comment saved to Snowflake');

            if (typeof showNotification === 'function') {
                showNotification('✅ Comment saved to Snowflake!');
            }

            return true;
        } catch (error) {
            console.error('❌ Failed to save comment:', error);
            return false;
        }
    }
}

// Initialize the Direct Snowflake API
const directSnowflakeAPI = new DirectSnowflakeAPI();
window.snowflakeAPI = directSnowflakeAPI;

console.log('⚡ Direct Snowflake API loaded - attempting direct connection...');
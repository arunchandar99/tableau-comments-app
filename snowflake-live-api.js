// Live Snowflake API with Server Backend
class LiveSnowflakeAPI {
    constructor() {
        // This will be your deployed server URL
        this.baseURL = 'https://comments-iwud2flzo-arun-chandars-projects.vercel.app/api/snowflake'; // Working credentials API
        this.isConnected = false;
        this.createStatusPanel();
    }

    createStatusPanel() {
        // Create a simple status indicator
        const statusPanel = document.createElement('div');
        statusPanel.id = 'live-status-panel';
        statusPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px 15px;
            background: #ffffff;
            border: 2px solid #ff9500;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 250px;
        `;

        statusPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0; color: #ff9500; font-size: 14px;">
                        <i class="fas fa-bolt"></i> Live Snowflake
                    </h4>
                    <div id="connection-status" style="margin-top: 5px;">
                        <span style="color: #ff9500;">🟡 Connecting...</span>
                    </div>
                </div>
                <button onclick="document.getElementById('live-status-panel').style.display='none'"
                        style="background: none; border: none; font-size: 16px; cursor: pointer; color: #999;">×</button>
            </div>
            <div id="sync-info" style="margin-top: 8px; font-size: 11px; color: #666;">
                Establishing live connection to Snowflake...
            </div>
            <div id="debug-info" style="margin-top: 8px; font-size: 10px; color: #888; background: #f5f5f5; padding: 5px; border-radius: 3px; font-family: monospace;">
                API: ${this.baseURL}
            </div>
        `;

        // Add to page when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(statusPanel);
            });
        } else {
            document.body.appendChild(statusPanel);
        }
    }

    updateStatus(isConnected, message) {
        const statusElement = document.getElementById('connection-status');
        const infoElement = document.getElementById('sync-info');
        const debugElement = document.getElementById('debug-info');

        if (statusElement && infoElement) {
            if (isConnected) {
                statusElement.innerHTML = '<span style="color: #28a745;">🟢 Live Connected</span>';
                infoElement.textContent = message || 'Real-time sync active';
                if (debugElement) {
                    debugElement.innerHTML = `✅ API: ${this.baseURL}<br>✅ Connection successful`;
                }
            } else {
                statusElement.innerHTML = '<span style="color: #dc3545;">🔴 Connection Failed</span>';
                infoElement.textContent = message || 'Check server deployment';
                if (debugElement) {
                    debugElement.innerHTML = `❌ API: ${this.baseURL}<br>❌ Error: ${message}`;
                }
            }
        }
    }

    async apiCall(action, data = {}) {
        try {
            const url = `${this.baseURL}?action=${action}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'API call failed');
            }

            return result;

        } catch (error) {
            console.error(`API call failed for ${action}:`, error);
            throw error;
        }
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Professional Snowflake API...');
            console.log('🔗 API URL:', this.baseURL);

            // Test connection with health check
            const result = await this.apiCall('health');
            console.log('✅ Health Check Response:', result);

            this.isConnected = result.success;

            if (this.isConnected) {
                this.updateStatus(true, 'Direct Snowflake connection established');
                console.log('✅ Professional Snowflake API connected successfully!');

                // Show success notification
                if (typeof showNotification === 'function') {
                    showNotification('🚀 Professional Snowflake API connected - automatic writeback enabled!');
                }
            } else {
                this.updateStatus(false, result.error || 'Health check failed');
                console.log('⚠️ Snowflake health check failed:', result.error);
            }

            return this.isConnected;

        } catch (error) {
            console.error('❌ Failed to connect to Snowflake API:', error);
            console.error('❌ Full error details:', error.message);
            console.error('❌ API URL being used:', this.baseURL);

            this.isConnected = false;
            this.updateStatus(false, `Connection Error: ${error.message}`);

            // Show error notification with instructions
            if (typeof showNotification === 'function') {
                showNotification('⚠️ Snowflake API Connection Failed - Check console for details');
            }

            return false;
        }
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
            console.log('💾 Saving posts to Snowflake via live API...', posts.length);

            const result = await this.apiCall('savePosts', { posts });

            console.log('✅ Posts saved successfully to Snowflake!');

            // Show save results with hybrid approach
            if (result.isSnowflakeAvailable !== undefined) {
                const debugElement = document.getElementById('debug-info');
                if (debugElement) {
                    if (result.isSnowflakeAvailable) {
                        debugElement.innerHTML = `
                            ✅ API: ${this.baseURL}<br>
                            🚀 ${result.executedCount}/${posts.length} posts saved directly to Snowflake
                        `;
                    } else {
                        debugElement.innerHTML = `
                            ✅ API: ${this.baseURL}<br>
                            📋 ${result.queuedCount}/${posts.length} posts queued - <button onclick="window.snowflakeAPI.getSQL()" style="font-size: 10px; padding: 2px 4px; background: #ff9500; color: white; border: none; border-radius: 2px; cursor: pointer;">Get SQL</button>
                        `;
                    }
                }

                // Show notification based on execution mode
                if (typeof showNotification === 'function') {
                    if (result.isSnowflakeAvailable) {
                        showNotification(`🚀 ${result.executedCount} post(s) automatically saved to Snowflake!`);
                    } else {
                        showNotification(`📋 ${result.queuedCount} post(s) queued for manual sync - click "Get SQL"`);
                    }
                }
            } else {
                // Fallback notification
                if (typeof showNotification === 'function') {
                    showNotification(`✅ ${posts.length} post(s) processed!`);
                }
            }

            return true;

        } catch (error) {
            console.error('❌ Failed to save posts:', error);

            // Show error notification
            if (typeof showNotification === 'function') {
                showNotification(`❌ Failed to save posts: ${error.message}`);
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
            console.log('📖 Loading posts from Snowflake...');

            const result = await this.apiCall('loadPosts');

            console.log('✅ Loaded', result.posts.length, 'posts from Snowflake');

            return result.posts || [];

        } catch (error) {
            console.error('❌ Failed to load posts:', error);
            return [];
        }
    }

    async deletePost(postId) {
        if (!this.isConnected) {
            return false;
        }

        try {
            console.log('🗑️ Deleting post from Snowflake...', postId);

            const result = await this.apiCall('deletePost', { postId });

            console.log('✅ Post deleted successfully from Snowflake!');

            // Show success notification
            if (typeof showNotification === 'function') {
                showNotification('✅ Post deleted from Snowflake!');
            }

            return true;

        } catch (error) {
            console.error('❌ Failed to delete post:', error);

            // Show error notification
            if (typeof showNotification === 'function') {
                showNotification(`❌ Failed to delete post: ${error.message}`);
            }

            return false;
        }
    }

    async saveComment(postId, comment) {
        if (!this.isConnected) {
            return false;
        }

        try {
            console.log('💬 Saving comment to Snowflake...', postId);

            const result = await this.apiCall('saveComment', { postId, comment });

            console.log('✅ Comment saved successfully to Snowflake!');

            // Show success notification
            if (typeof showNotification === 'function') {
                showNotification('✅ Comment saved to Snowflake!');
            }

            return true;

        } catch (error) {
            console.error('❌ Failed to save comment:', error);

            // Show error notification
            if (typeof showNotification === 'function') {
                showNotification(`❌ Failed to save comment: ${error.message}`);
            }

            return false;
        }
    }

    async loadComments(postId) {
        if (!this.isConnected) {
            return [];
        }

        try {
            const result = await this.apiCall('loadComments', { postId });
            return result.comments || [];

        } catch (error) {
            console.error('❌ Failed to load comments:', error);
            return [];
        }
    }

    async getSQL() {
        try {
            console.log('📋 Getting sync SQL from API...');

            const result = await this.apiCall('getSQL');

            if (result.success && result.sql) {
                // Copy to clipboard
                try {
                    navigator.clipboard.writeText(result.sql);
                    console.log('✅ SQL copied to clipboard');
                } catch (clipError) {
                    console.log('⚠️ Could not auto-copy SQL');
                }

                // Show SQL in new window
                const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>Snowflake Sync SQL</title>
                            <style>
                                body {
                                    font-family: 'Courier New', monospace;
                                    padding: 20px;
                                    background: #1e1e1e;
                                    color: #d4d4d4;
                                    line-height: 1.4;
                                }
                                .header {
                                    background: linear-gradient(135deg, #ff9500, #ff6b00);
                                    color: white;
                                    padding: 20px;
                                    border-radius: 8px;
                                    margin-bottom: 20px;
                                }
                                .sql-container {
                                    background: #2d2d2d;
                                    padding: 20px;
                                    border-radius: 8px;
                                    overflow: auto;
                                    white-space: pre-wrap;
                                    border-left: 4px solid #ff9500;
                                }
                                .copy-btn {
                                    background: #ff9500;
                                    color: white;
                                    border: none;
                                    padding: 12px 24px;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    margin: 10px 0;
                                    font-size: 14px;
                                }
                                .copy-btn:hover { background: #e68500; }
                                .instructions {
                                    background: rgba(255, 149, 0, 0.1);
                                    border: 1px solid #ff9500;
                                    padding: 15px;
                                    border-radius: 5px;
                                    margin-bottom: 20px;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h2>🗲 Snowflake Sync SQL</h2>
                                <p>Execute this SQL in your Snowflake worksheet to sync ${result.statements} statements</p>
                                <p><strong>Status:</strong> ${result.isSnowflakeAvailable ? 'Direct connection failed' : 'Using fallback mode'}</p>
                            </div>

                            <div class="instructions">
                                <h3>📋 Instructions:</h3>
                                <ol>
                                    <li>Copy the SQL below (click Copy button or Ctrl+A, Ctrl+C)</li>
                                    <li>Open your Snowflake account: <strong>ZDDMCAD-FGC62251.snowflakecomputing.com</strong></li>
                                    <li>Create a new worksheet</li>
                                    <li>Paste the SQL and click "Run All"</li>
                                    <li>Verify data appears in your POSTS table</li>
                                </ol>
                            </div>

                            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('sql-content').textContent).then(() => alert('✅ SQL copied to clipboard!'))">
                                📋 Copy All SQL
                            </button>

                            <div class="sql-container" id="sql-content">${result.sql}</div>
                        </body>
                    </html>
                `);

                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification(`📋 SQL opened in new window (${result.statements} statements) - Copy and run in Snowflake!`);
                }

                return true;
            } else {
                alert('No SQL statements to sync.');
                return false;
            }

        } catch (error) {
            console.error('❌ Failed to get sync SQL:', error);
            if (typeof showNotification === 'function') {
                showNotification(`❌ Failed to get SQL: ${error.message}`);
            }
            return false;
        }
    }
}

// Initialize the Live Snowflake API
const liveSnowflakeAPI = new LiveSnowflakeAPI();
window.snowflakeAPI = liveSnowflakeAPI;

console.log('🚀 Live Snowflake API loaded - connecting to server...');
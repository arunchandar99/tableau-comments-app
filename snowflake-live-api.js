// Live Snowflake API with Server Backend
class LiveSnowflakeAPI {
    constructor() {
        // This will be your deployed server URL
        this.baseURL = 'https://comments-qt39brf22-arun-chandars-projects.vercel.app/api/snowflake'; // Replace with actual deployed URL
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

        if (statusElement && infoElement) {
            if (isConnected) {
                statusElement.innerHTML = '<span style="color: #28a745;">🟢 Live Connected</span>';
                infoElement.textContent = message || 'Real-time sync active';
            } else {
                statusElement.innerHTML = '<span style="color: #dc3545;">🔴 Connection Failed</span>';
                infoElement.textContent = message || 'Check server deployment';
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
            console.log('🚀 Initializing Live Snowflake connection...');
            console.log('🔗 API URL:', this.baseURL);

            // Test connection by attempting to load posts
            const result = await this.apiCall('loadPosts');
            console.log('✅ API Response:', result);

            this.isConnected = true;
            this.updateStatus(true, 'Live connection established');
            console.log('✅ Live Snowflake API connected successfully!');

            // Show success notification
            if (typeof showNotification === 'function') {
                showNotification('🚀 Live Snowflake connection established!');
            }

            return true;

        } catch (error) {
            console.error('❌ Failed to connect to live API:', error);
            console.error('❌ Full error details:', error.message);
            console.error('❌ API URL being used:', this.baseURL);

            this.isConnected = false;
            this.updateStatus(false, `Connection Error: ${error.message}`);

            // Show error notification with instructions
            if (typeof showNotification === 'function') {
                showNotification('⚠️ API Connection Failed - Check console for details');
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

            // Show success notification
            if (typeof showNotification === 'function') {
                showNotification(`✅ ${posts.length} post(s) automatically saved to Snowflake!`);
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
}

// Initialize the Live Snowflake API
const liveSnowflakeAPI = new LiveSnowflakeAPI();
window.snowflakeAPI = liveSnowflakeAPI;

console.log('🚀 Live Snowflake API loaded - connecting to server...');
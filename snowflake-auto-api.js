// Automatic Snowflake API Integration
class AutoSnowflakeAPI {
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
        this.isConnected = false;
        this.requestId = 0;
    }

    async initialize() {
        try {
            console.log('🔌 Connecting to Snowflake automatically...');

            // Try to authenticate with Snowflake
            const authUrl = `https://${this.config.account}.snowflakecomputing.com/session/v1/login-request`;

            const authResponse = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'TableauCommentsApp/1.0'
                },
                body: JSON.stringify({
                    data: {
                        CLIENT_APP_ID: 'TableauCommentsApp',
                        CLIENT_APP_VERSION: '1.0.0',
                        ACCOUNT_NAME: this.config.account,
                        LOGIN_NAME: this.config.username,
                        PASSWORD: this.config.password
                    }
                })
            });

            if (authResponse.ok) {
                const authData = await authResponse.json();
                this.sessionToken = authData.data.token;
                this.isConnected = true;
                console.log('✅ Snowflake connected successfully!');

                // Set session context
                await this.executeSQL(`USE DATABASE ${this.config.database}`);
                await this.executeSQL(`USE SCHEMA ${this.config.schema}`);
                await this.executeSQL(`USE WAREHOUSE ${this.config.warehouse}`);

                return true;
            } else {
                console.error('❌ Snowflake connection failed:', authResponse.status);
                // Fall back to debug mode
                console.log('🔄 Falling back to debug mode...');
                this.fallbackToDebug();
                return false;
            }
        } catch (error) {
            console.error('❌ Connection error:', error);
            console.log('🔄 Falling back to debug mode...');
            this.fallbackToDebug();
            return false;
        }
    }

    fallbackToDebug() {
        // Load the debug version if connection fails
        const script = document.createElement('script');
        script.src = 'debug-snowflake.js';
        document.head.appendChild(script);

        setTimeout(() => {
            if (window.debugSnowflakeAPI) {
                window.snowflakeAPI = window.debugSnowflakeAPI;
                console.log('🐛 Switched to debug mode');
            }
        }, 1000);
    }

    async executeSQL(sql) {
        if (!this.isConnected || !this.sessionToken) {
            throw new Error('Not connected to Snowflake');
        }

        try {
            this.requestId++;
            const queryUrl = `https://${this.config.account}.snowflakecomputing.com/queries/v1/query-request`;

            const response = await fetch(queryUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Snowflake Token="${this.sessionToken}"`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'TableauCommentsApp/1.0'
                },
                body: JSON.stringify({
                    sqlText: sql,
                    asyncExec: false,
                    sequenceId: this.requestId
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.data;
                } else {
                    throw new Error(`SQL error: ${data.message}`);
                }
            } else {
                throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ SQL execution failed:', error);
            throw error;
        }
    }

    async savePosts(posts) {
        if (!this.isConnected) {
            console.log('⚠️ Not connected to Snowflake - posts saved locally only');
            return true;
        }

        if (!Array.isArray(posts) || posts.length === 0) {
            return true;
        }

        try {
            for (const post of posts) {
                // Clean the data
                const cleanContent = post.content
                    .replace(/'/g, "''")
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, '')
                    .replace(/\t/g, ' ');

                const timestamp = parseInt(post.timestamp) || Date.now();

                const sql = `INSERT INTO POSTS
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
)`;

                console.log('💾 Saving post to Snowflake...', post.metricLabel);
                await this.executeSQL(sql);
                console.log('✅ Post saved successfully!');
            }

            // Show success notification
            if (typeof showNotification === 'function') {
                showNotification('Posts automatically saved to Snowflake!');
            }

            return true;
        } catch (error) {
            console.error('❌ Failed to save posts:', error);

            // Show error notification
            if (typeof showNotification === 'function') {
                showNotification('Error saving to Snowflake - check console');
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
            const sql = `SELECT ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES
                        FROM POSTS
                        ORDER BY TIMESTAMP_MS DESC`;

            console.log('📖 Loading posts from Snowflake...');
            const result = await this.executeSQL(sql);

            if (result && result.length > 0) {
                const posts = result.map(row => ({
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
            }

            return [];
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
            const sql = `DELETE FROM POSTS WHERE ID = '${String(postId).replace(/'/g, "''")}'`;
            await this.executeSQL(sql);
            console.log('✅ Post deleted from Snowflake');
            return true;
        } catch (error) {
            console.error('❌ Failed to delete post:', error);
            return false;
        }
    }

    async saveComment(postId, comment) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const sql = `INSERT INTO COMMENTS (ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
VALUES (
    '${String(comment.id).replace(/'/g, "''")}',
    '${String(postId).replace(/'/g, "''")}',
    '${String(comment.author || 'Tableau User').replace(/'/g, "''")}',
    '${String(comment.content).replace(/'/g, "''")}',
    ${parseInt(comment.timestamp) || Date.now()}
)`;

            await this.executeSQL(sql);
            console.log('✅ Comment saved to Snowflake');
            return true;
        } catch (error) {
            console.error('❌ Failed to save comment:', error);
            return false;
        }
    }
}

// Initialize the automatic Snowflake API
const autoSnowflakeAPI = new AutoSnowflakeAPI();
window.snowflakeAPI = autoSnowflakeAPI;

console.log('🚀 Auto Snowflake API loaded - attempting automatic connection...');
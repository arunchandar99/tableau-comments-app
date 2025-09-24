// Real Snowflake REST API Integration
class SnowflakeRestAPI {
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
    }

    async initialize() {
        try {
            console.log('🔌 Connecting to Snowflake REST API...');

            // Authenticate with Snowflake
            const authResponse = await fetch(`https://${this.config.account}.snowflakecomputing.com/session/v1/login-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        CLIENT_APP_ID: 'Comments_App',
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
                console.log('✅ Snowflake authentication successful');

                // Set session context
                await this.executeSQL(`USE DATABASE ${this.config.database}`);
                await this.executeSQL(`USE SCHEMA ${this.config.schema}`);
                await this.executeSQL(`USE WAREHOUSE ${this.config.warehouse}`);

                return true;
            } else {
                console.error('❌ Snowflake authentication failed:', authResponse.statusText);
                return false;
            }
        } catch (error) {
            console.error('❌ Snowflake connection error:', error);
            return false;
        }
    }

    async executeSQL(sql, bindings = []) {
        if (!this.isConnected || !this.sessionToken) {
            throw new Error('Not connected to Snowflake');
        }

        try {
            const response = await fetch(`https://${this.config.account}.snowflakecomputing.com/queries/v1/query-request`, {
                method: 'POST',
                headers: {
                    'Authorization': `Snowflake Token="${this.sessionToken}"`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    sqlText: sql,
                    bindings: bindings
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                throw new Error(`SQL execution failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ SQL execution error:', error);
            throw error;
        }
    }

    async savePost(post) {
        if (!this.isConnected) return false;

        try {
            const sql = `
                INSERT INTO POSTS (ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const bindings = [
                post.id,
                post.type,
                post.metricValue,
                post.metricLabel,
                post.content, // Rich HTML content
                post.author || 'Tableau User',
                post.timestamp,
                post.likes || 0
            ];

            console.log('💾 Saving post to Snowflake...');
            console.log('Rich Content:', post.content);

            const result = await this.executeSQL(sql, bindings);
            console.log('✅ Post saved successfully:', result);
            return true;

        } catch (error) {
            console.error('❌ Error saving post:', error);
            return false;
        }
    }

    async loadPosts() {
        if (!this.isConnected) return [];

        try {
            const sql = `
                SELECT p.*, COALESCE(c.COMMENT_COUNT, 0) as COMMENT_COUNT
                FROM POSTS p
                LEFT JOIN (
                    SELECT POST_ID, COUNT(*) as COMMENT_COUNT
                    FROM COMMENTS
                    GROUP BY POST_ID
                ) c ON p.ID = c.POST_ID
                ORDER BY p.TIMESTAMP_MS DESC
            `;

            console.log('📖 Loading posts from Snowflake...');
            const result = await this.executeSQL(sql);

            if (result.data && result.data.length > 0) {
                const posts = result.data.map(row => ({
                    id: row[0],           // ID
                    type: row[1],         // POST_TYPE
                    metricValue: row[2],  // METRIC_VALUE
                    metricLabel: row[3],  // METRIC_LABEL
                    content: row[4],      // CONTENT (Rich HTML)
                    author: row[5],       // AUTHOR
                    timestamp: row[6],    // TIMESTAMP_MS
                    likes: row[7] || 0,   // LIKES
                    comments: []          // Will load separately
                }));

                console.log('✅ Loaded', posts.length, 'posts from Snowflake');
                return posts;
            }

            return [];

        } catch (error) {
            console.error('❌ Error loading posts:', error);
            return [];
        }
    }

    async deletePost(postId) {
        if (!this.isConnected) return false;

        try {
            // Delete comments first
            await this.executeSQL('DELETE FROM COMMENTS WHERE POST_ID = ?', [postId]);

            // Delete post
            const result = await this.executeSQL('DELETE FROM POSTS WHERE ID = ?', [postId]);

            console.log('✅ Post deleted successfully');
            return true;

        } catch (error) {
            console.error('❌ Error deleting post:', error);
            return false;
        }
    }

    async saveComment(postId, comment) {
        if (!this.isConnected) return false;

        try {
            const sql = `
                INSERT INTO COMMENTS (ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
                VALUES (?, ?, ?, ?, ?)
            `;

            const bindings = [
                comment.id,
                postId,
                comment.author || 'Tableau User',
                comment.content,
                comment.timestamp
            ];

            console.log('💬 Saving comment to Snowflake...');
            await this.executeSQL(sql, bindings);
            console.log('✅ Comment saved successfully');
            return true;

        } catch (error) {
            console.error('❌ Error saving comment:', error);
            return false;
        }
    }
}

// Replace the existing API with the REST API version
const snowflakeRestAPI = new SnowflakeRestAPI();
window.snowflakeAPI = snowflakeRestAPI;
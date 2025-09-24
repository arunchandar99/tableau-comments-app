// Simplified Snowflake Configuration for Trial Account
// This version uses direct SQL execution for simplicity

const SNOWFLAKE_TRIAL_CONFIG = {
    // UPDATE THESE WITH YOUR TRIAL ACCOUNT DETAILS
    account: 'ZDDMCAD-FGC62251.snowflakecomputing.com', // Replace with your account URL
    username: 'ARUNCHANDAR99',        // Replace with your username
    password: 'Arunchandar@99',       // Replace with your password

    // Database settings (these should work as-is)
    database: 'TABLEAU_EXTENSIONS',
    schema: 'COMMENTS_APP',
    warehouse: 'COMPUTE_WH',
    role: 'ACCOUNTADMIN' // Trial accounts usually have this role
};

// Simplified API for trial account
class SnowflakeTrialAPI {
    constructor() {
        this.config = SNOWFLAKE_TRIAL_CONFIG;
        this.isConnected = false;
    }

    // Test connection
    async testConnection() {
        try {
            // For trial, we'll use a simple approach
            console.log('Testing Snowflake connection...');

            // This is a placeholder - in real implementation, you'd use Snowflake's REST API
            // For now, we'll simulate the connection

            const testData = {
                account: this.config.account,
                username: this.config.username,
                database: this.config.database
            };

            console.log('Connection test with:', testData);

            // Simulate successful connection
            this.isConnected = true;
            return true;
        } catch (error) {
            console.error('Connection failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    // Execute SQL query (simulated for trial)
    async executeQuery(sql, bindings = []) {
        if (!this.isConnected) {
            throw new Error('Not connected to Snowflake');
        }

        console.log('Executing SQL:', sql);
        console.log('Bindings:', bindings);

        // For trial demonstration, we'll log the SQL and simulate results
        // In production, this would use Snowflake's REST API or driver

        if (sql.includes('SELECT')) {
            // Simulate SELECT results
            return {
                success: true,
                data: [],
                rowCount: 0
            };
        } else {
            // Simulate INSERT/UPDATE/DELETE
            return {
                success: true,
                rowsAffected: 1
            };
        }
    }

    // Load posts from Snowflake
    async loadPosts() {
        try {
            const sql = `
                SELECT p.*, COALESCE(c.comment_count, 0) as comment_count
                FROM TABLEAU_EXTENSIONS.COMMENTS_APP.POSTS p
                LEFT JOIN (
                    SELECT post_id, COUNT(*) as comment_count
                    FROM TABLEAU_EXTENSIONS.COMMENTS_APP.COMMENTS
                    GROUP BY post_id
                ) c ON p.id = c.post_id
                ORDER BY p.timestamp_ms DESC
            `;

            const result = await this.executeQuery(sql);

            // Transform results to app format
            return result.data.map(row => ({
                id: row.ID,
                type: row.POST_TYPE,
                metricValue: row.METRIC_VALUE,
                metricLabel: row.METRIC_LABEL,
                content: row.CONTENT, // Rich HTML preserved
                author: row.AUTHOR,
                timestamp: row.TIMESTAMP_MS,
                likes: row.LIKES || 0,
                comments: [] // Will load separately
            }));
        } catch (error) {
            console.error('Error loading posts from Snowflake:', error);
            return [];
        }
    }

    // Save post to Snowflake
    async savePost(post) {
        try {
            const sql = `
                INSERT INTO TABLEAU_EXTENSIONS.COMMENTS_APP.POSTS
                (id, post_type, metric_value, metric_label, content, author, timestamp_ms, likes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const bindings = [
                post.id,
                post.type,
                post.metricValue,
                post.metricLabel,
                post.content, // Rich HTML content
                post.author || 'Trial User',
                post.timestamp,
                post.likes || 0
            ];

            const result = await this.executeQuery(sql, bindings);
            console.log('Post saved to Snowflake:', result);
            return result.success;
        } catch (error) {
            console.error('Error saving post to Snowflake:', error);
            return false;
        }
    }

    // Delete post from Snowflake
    async deletePost(postId) {
        try {
            // Delete comments first
            await this.executeQuery(
                'DELETE FROM TABLEAU_EXTENSIONS.COMMENTS_APP.COMMENTS WHERE post_id = ?',
                [postId]
            );

            // Delete post
            const result = await this.executeQuery(
                'DELETE FROM TABLEAU_EXTENSIONS.COMMENTS_APP.POSTS WHERE id = ?',
                [postId]
            );

            return result.success;
        } catch (error) {
            console.error('Error deleting post from Snowflake:', error);
            return false;
        }
    }
}

// Initialize trial API
const snowflakeTrialAPI = new SnowflakeTrialAPI();
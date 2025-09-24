// Manual Snowflake Sync - Generates SQL for you to run
class SnowflakeManualSync {
    constructor() {
        this.config = {
            database: 'TABLEAU_EXTENSIONS',
            schema: 'COMMENTS_APP'
        };
        this.pendingInserts = [];
    }

    async initialize() {
        console.log('📋 Manual Snowflake Sync initialized');
        console.log('✅ Will generate SQL statements for manual execution');
        return true;
    }

    async savePost(post) {
        try {
            // Generate INSERT SQL
            const sql = `INSERT INTO ${this.config.database}.${this.config.schema}.POSTS
(ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
VALUES (
    '${post.id}',
    '${post.type}',
    '${post.metricValue.replace(/'/g, "''")}',
    '${post.metricLabel.replace(/'/g, "''")}',
    '${post.content.replace(/'/g, "''")}',
    '${post.author || 'Tableau User'}',
    ${post.timestamp},
    ${post.likes || 0}
);`;

            console.log('📝 COPY THIS SQL TO SNOWFLAKE:');
            console.log('==========================================');
            console.log(sql);
            console.log('==========================================');

            // Store for batch processing
            this.pendingInserts.push({
                type: 'POST',
                sql: sql,
                data: post
            });

            // Show user-friendly message
            alert(`Post created! Copy this SQL to Snowflake:\n\n${sql}`);

            return true;
        } catch (error) {
            console.error('Error generating SQL:', error);
            return false;
        }
    }

    async loadPosts() {
        // For now, return empty array so it uses sample data
        console.log('📖 To load posts from Snowflake, run:');
        console.log(`SELECT * FROM ${this.config.database}.${this.config.schema}.POSTS ORDER BY TIMESTAMP_MS DESC;`);
        return [];
    }

    async deletePost(postId) {
        const sql = `DELETE FROM ${this.config.database}.${this.config.schema}.POSTS WHERE ID = '${postId}';`;

        console.log('🗑️ COPY THIS SQL TO SNOWFLAKE:');
        console.log('==========================================');
        console.log(sql);
        console.log('==========================================');

        alert(`To delete post, copy this SQL to Snowflake:\n\n${sql}`);
        return true;
    }

    async saveComment(postId, comment) {
        const sql = `INSERT INTO ${this.config.database}.${this.config.schema}.COMMENTS
(ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
VALUES (
    '${comment.id}',
    '${postId}',
    '${comment.author || 'Tableau User'}',
    '${comment.content.replace(/'/g, "''")}',
    ${comment.timestamp}
);`;

        console.log('💬 COPY THIS SQL TO SNOWFLAKE:');
        console.log('==========================================');
        console.log(sql);
        console.log('==========================================');

        return true;
    }

    // Get all pending SQL statements
    getAllPendingSQL() {
        const allSQL = this.pendingInserts.map(item => item.sql).join('\n\n');
        console.log('📋 ALL PENDING SQL STATEMENTS:');
        console.log('==========================================');
        console.log(allSQL);
        console.log('==========================================');
        return allSQL;
    }

    // Clear pending statements
    clearPending() {
        this.pendingInserts = [];
        console.log('✅ Pending statements cleared');
    }
}

// Replace the existing API
const snowflakeManualSync = new SnowflakeManualSync();
window.snowflakeAPI = snowflakeManualSync;

// Add a global function to get all SQL
window.getSnowflakeSQL = () => {
    return snowflakeManualSync.getAllPendingSQL();
};

console.log('🔧 Manual Snowflake Sync loaded');
console.log('💡 Create posts in the app, then copy the SQL from console to Snowflake!');
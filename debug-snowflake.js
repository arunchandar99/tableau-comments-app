// Debug version that shows SQL in the UI
class DebugSnowflakeAPI {
    constructor() {
        this.config = {
            database: 'TABLEAU_EXTENSIONS',
            schema: 'COMMENTS_APP'
        };
        this.sqlLog = [];
        this.createDebugPanel();
    }

    createDebugPanel() {
        // Create a debug panel in the UI
        const debugPanel = document.createElement('div');
        debugPanel.id = 'snowflake-debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            max-height: 400px;
            background: #f0f0f0;
            border: 2px solid #333;
            border-radius: 5px;
            padding: 10px;
            font-family: monospace;
            font-size: 10px;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        debugPanel.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">Snowflake Debug</h4>
            <div id="sql-output" style="background: white; padding: 5px; border: 1px solid #ccc; min-height: 100px; max-height: 300px; overflow-y: auto;"></div>
            <button onclick="document.getElementById('snowflake-debug-panel').style.display='none'" style="margin-top: 5px;">Hide</button>
        `;

        // Add to page when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(debugPanel);
            });
        } else {
            document.body.appendChild(debugPanel);
        }
    }

    logSQL(sql, description) {
        console.log(description, sql);

        const timestamp = new Date().toLocaleTimeString();
        const sqlOutput = document.getElementById('sql-output');

        if (sqlOutput) {
            sqlOutput.innerHTML += `
                <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <strong>${timestamp}</strong><br>
                    <em>${description}</em><br>
                    <textarea readonly style="width: 100%; height: 60px; font-size: 9px;">${sql}</textarea>
                </div>
            `;
            sqlOutput.scrollTop = sqlOutput.scrollHeight;
        }

        this.sqlLog.push({ timestamp, description, sql });
    }

    async initialize() {
        this.logSQL('-- Snowflake Debug API initialized', 'INIT');
        return true;
    }

    async savePost(post) {
        try {
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

            this.logSQL(sql, 'SAVE POST');

            // Show notification in the app
            if (typeof showNotification === 'function') {
                showNotification('SQL generated! Check debug panel in top-right corner.');
            }

            return true;
        } catch (error) {
            this.logSQL(`ERROR: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async loadPosts() {
        const sql = `SELECT * FROM ${this.config.database}.${this.config.schema}.POSTS ORDER BY TIMESTAMP_MS DESC;`;
        this.logSQL(sql, 'LOAD POSTS');
        return []; // Return empty to use sample data
    }

    async deletePost(postId) {
        const sql = `DELETE FROM ${this.config.database}.${this.config.schema}.POSTS WHERE ID = '${postId}';`;
        this.logSQL(sql, 'DELETE POST');
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

        this.logSQL(sql, 'SAVE COMMENT');
        return true;
    }
}

// Replace the existing API
const debugSnowflakeAPI = new DebugSnowflakeAPI();
window.snowflakeAPI = debugSnowflakeAPI;

console.log('🐛 Debug Snowflake API loaded - check top-right corner for SQL output!');
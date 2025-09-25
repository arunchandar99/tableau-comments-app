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
            bottom: 10px;
            right: 10px;
            width: 300px;
            max-height: 300px;
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
            <h4 style="margin: 0 0 10px 0;">Snowflake Debug
                <button onclick="document.getElementById('snowflake-debug-panel').style.display='none'" style="float: right; font-size: 8px; padding: 2px 4px;">Hide</button>
            </h4>
            <div id="sql-output" style="background: white; padding: 5px; border: 1px solid #ccc; min-height: 80px; max-height: 200px; overflow-y: auto;">
                <div style="color: blue; font-weight: bold; margin: 5px 0;">🔵 Debug script loaded at ${new Date().toLocaleTimeString()}</div>
            </div>
        `;

        // Add a show button when panel is hidden
        const showButton = document.createElement('button');
        showButton.id = 'show-debug-btn';
        showButton.innerHTML = 'SQL Debug';
        showButton.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            padding: 5px 10px;
            background: #333;
            color: white;
            border: none;
            border-radius: 3px;
            font-size: 10px;
            cursor: pointer;
            display: none;
            z-index: 10000;
        `;
        showButton.onclick = () => {
            debugPanel.style.display = 'block';
            showButton.style.display = 'none';
        };

        // Update hide button to show the show button
        debugPanel.querySelector('button').onclick = () => {
            debugPanel.style.display = 'none';
            showButton.style.display = 'block';
        };

        // Add to page when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(debugPanel);
                document.body.appendChild(showButton);
            });
        } else {
            document.body.appendChild(debugPanel);
            document.body.appendChild(showButton);
        }
    }

    logSQL(sql, description) {
        console.log(description, sql);

        const timestamp = new Date().toLocaleTimeString();
        const sqlOutput = document.getElementById('sql-output');

        if (sqlOutput) {
            // Create a clean SQL display with copy button
            const sqlDiv = document.createElement('div');
            sqlDiv.style.cssText = 'margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;';

            sqlDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${timestamp}</strong><br>
                        <em>${description}</em>
                    </div>
                    <button onclick="
                        const sqlText = this.parentElement.nextElementSibling.textContent;
                        const textArea = document.createElement('textarea');
                        textArea.value = sqlText;
                        document.body.appendChild(textArea);
                        textArea.select();
                        textArea.setSelectionRange(0, 99999);
                        try {
                            document.execCommand('copy');
                            alert('SQL copied to clipboard!');
                        } catch(e) {
                            alert('Copy failed. Please select and copy the SQL text manually.');
                        }
                        document.body.removeChild(textArea);
                    " style="font-size: 8px; padding: 2px 4px; background: #007acc; color: white; border: none; border-radius: 2px; cursor: pointer;">
                        Copy SQL
                    </button>
                </div>
                <textarea readonly onclick="this.select()" style="width: 100%; height: 80px; font-family: monospace; font-size: 9px; background: #f8f8f8; border: 1px solid #ddd; padding: 5px; resize: vertical;">${sql}</textarea>
            `;

            sqlOutput.appendChild(sqlDiv);
            sqlOutput.scrollTop = sqlOutput.scrollHeight;
        }

        this.sqlLog.push({ timestamp, description, sql });
    }

    async initialize() {
        this.logSQL('-- Snowflake Debug API initialized', 'INIT');
        console.log('🐛 DebugSnowflakeAPI initialized successfully');

        // Show a startup notification
        setTimeout(() => {
            const sqlOutput = document.getElementById('sql-output');
            if (sqlOutput) {
                sqlOutput.innerHTML += `
                    <div style="margin-bottom: 10px; border: 2px solid #4CAF50; background: #E8F5E8; padding: 8px; border-radius: 4px;">
                        <strong>🟢 DEBUG MODE ACTIVE</strong><br>
                        <em>Ready to capture SQL statements!</em><br>
                        <small>Add a post to see SQL generation...</small>
                    </div>
                `;
            }
        }, 1000);

        return true;
    }

    async savePosts(posts) {
        try {
            console.log('🐛 savePosts called with:', posts);

            if (!Array.isArray(posts) || posts.length === 0) {
                this.logSQL('-- No posts to save', 'SAVE POSTS');
                return true;
            }

            // Generate SQL for each post
            for (const post of posts) {
                // Clean the content for SQL
                const cleanContent = post.content
                    .replace(/'/g, "''")        // Escape single quotes
                    .replace(/\n/g, ' ')        // Replace newlines with spaces
                    .replace(/\r/g, '')         // Remove carriage returns
                    .replace(/\t/g, ' ');       // Replace tabs with spaces

                const sql = `INSERT INTO ${this.config.database}.${this.config.schema}.POSTS
(ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
VALUES (
    '${post.id}',
    '${post.type}',
    '${post.metricValue.replace(/'/g, "''")}',
    '${post.metricLabel.replace(/'/g, "''")}',
    '${cleanContent}',
    '${post.author || 'Tableau User'}',
    ${post.timestamp},
    ${post.likes || 0}
);`;

                this.logSQL(sql, `SAVE POST: ${post.metricLabel || post.id}`);
            }

            console.log('🐛 SQL logged to debug panel');

            // Show notification in the app
            if (typeof showNotification === 'function') {
                showNotification('SQL generated! Check debug panel in bottom-right corner.');
            } else {
                // Fallback alert if showNotification doesn't exist
                alert('SQL generated! Check debug panel in bottom-right corner.');
            }

            return true;
        } catch (error) {
            console.error('🐛 Error in savePosts:', error);
            this.logSQL(`ERROR: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async savePost(post) {
        // Backward compatibility - call savePosts with single post array
        return await this.savePosts([post]);
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

// Aggressive override - ensure our debug API is always used
window.snowflakeAPI = debugSnowflakeAPI;

// Override again after a delay in case another script tries to override us
setTimeout(() => {
    window.snowflakeAPI = debugSnowflakeAPI;
    console.log('🐛 Debug API re-enforced after delay');
}, 2000);

console.log('🐛 Debug Snowflake API loaded - check bottom-right corner for SQL output!');
console.log('🐛 API object:', window.snowflakeAPI);
console.log('🐛 API savePost function:', window.snowflakeAPI.savePost);

// Add global debugging info
window.DEBUG_INFO = {
    apiLoaded: true,
    loadTime: new Date().toISOString(),
    apiType: 'DebugSnowflakeAPI'
};

// Add a test function to the window for debugging
window.testDebugAPI = function() {
    const testPost = {
        id: 'test-123',
        type: 'Test',
        metricValue: 'Test Value',
        metricLabel: 'Test Label',
        content: 'Test content',
        author: 'Debug Test',
        timestamp: Date.now(),
        likes: 0
    };
    console.log('🧪 Testing debug API with:', testPost);
    window.snowflakeAPI.savePost(testPost);
};
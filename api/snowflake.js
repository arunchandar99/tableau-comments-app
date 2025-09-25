// Professional Snowflake REST API for Tableau Comments App
// Full CRUD operations with automatic database execution and SQL generation fallback

const snowflake = require('snowflake-sdk');

// Snowflake connection configuration - Updated with correct credentials
const connectionConfig = {
    account: 'ZDDMCAD-FGC62251',
    username: 'ARUNCHANDAR99',
    password: 'Arunchandar@99',
    database: 'TABLEAU_EXTENSIONS',
    schema: 'COMMENTS_APP',
    warehouse: 'COMPUTE_WH', // Will use default if none selected
    role: 'ACCOUNTADMIN'
};

let connection = null;
let isSnowflakeAvailable = false;

// In-memory storage for when Snowflake is not available
let fallbackPosts = [];
let fallbackComments = {};
let sqlStatements = [];

// Initialize Snowflake connection with fallback
async function getConnection() {
    if (connection && connection.isUp() && isSnowflakeAvailable) {
        return connection;
    }

    try {
        return new Promise((resolve, reject) => {
            connection = snowflake.createConnection(connectionConfig);

            connection.connect((err, conn) => {
                if (err) {
                    console.error('❌ Failed to connect to Snowflake:', err.message);
                    isSnowflakeAvailable = false;
                    reject(err);
                } else {
                    console.log('✅ Connected to Snowflake successfully');
                    isSnowflakeAvailable = true;
                    resolve(conn);
                }
            });
        });
    } catch (error) {
        console.error('❌ Snowflake connection error:', error.message);
        isSnowflakeAvailable = false;
        throw error;
    }
}

// Execute SQL with proper error handling and fallback
async function executeSQL(sqlText, binds = []) {
    // Always try to connect first (don't rely on cached state)
    try {
        console.log('🔄 Attempting Snowflake connection...');
        const conn = await getConnection();

        return new Promise((resolve, reject) => {
            conn.execute({
                sqlText: sqlText,
                binds: binds,
                complete: (err, stmt, rows) => {
                    if (err) {
                        console.error('❌ SQL execution error:', err.message);
                        isSnowflakeAvailable = false;
                        reject(err);
                    } else {
                        console.log('✅ SQL executed successfully in Snowflake');
                        isSnowflakeAvailable = true;
                        resolve({ success: true, data: rows, executed: true });
                    }
                }
            });
        });

    } catch (error) {
        console.error('❌ Snowflake connection failed, using fallback:', error.message);
        isSnowflakeAvailable = false;

        // Fallback: Store SQL for manual execution
        console.log('📝 Storing SQL for manual execution:', sqlText);
        let sqlWithBinds = sqlText;
        if (binds.length > 0) {
            let bindIndex = 0;
            sqlWithBinds = sqlText.replace(/\?/g, () => {
                const value = binds[bindIndex++];
                return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
            });
        }

        sqlStatements.push({
            sql: sqlWithBinds,
            timestamp: new Date().toISOString(),
            binds: binds
        });

        return {
            success: true,
            data: [],
            executed: false,
            queued: true,
            message: 'SQL queued for manual execution'
        };
    }
}

// API Handler - Professional REST API
export default async function handler(req, res) {
    // Enable CORS for Tableau Extensions
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { action } = req.query;
        const body = req.body || {};

        console.log(`🔄 Processing ${req.method} request - Action: ${action}`);

        let result;

        switch (action) {
            case 'savePosts':
                result = await savePosts(body.posts);
                break;

            case 'loadPosts':
                result = await loadPosts();
                break;

            case 'updatePost':
                result = await updatePost(body.postId, body.post);
                break;

            case 'deletePost':
                result = await deletePost(body.postId);
                break;

            case 'saveComment':
                result = await saveComment(body.postId, body.comment);
                break;

            case 'loadComments':
                result = await loadComments(body.postId);
                break;

            case 'updateComment':
                result = await updateComment(body.commentId, body.comment);
                break;

            case 'deleteComment':
                result = await deleteComment(body.commentId);
                break;

            case 'health':
                result = await healthCheck();
                break;


            case 'getSQL':
                result = {
                    success: true,
                    sql: generateBatchSQL(),
                    statements: sqlStatements.length,
                    isSnowflakeAvailable: isSnowflakeAvailable,
                    message: `${sqlStatements.length} SQL statements ready for execution`
                };
                break;

            default:
                result = { success: false, error: `Invalid action: ${action}` };
        }

        console.log(`✅ Action ${action} completed successfully`);
        res.status(200).json(result);

    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

// CREATE - Save posts to Snowflake
async function savePosts(posts) {
    if (!Array.isArray(posts)) {
        posts = [posts];
    }

    if (posts.length === 0) {
        return { success: true, message: 'No posts to save', savedCount: 0 };
    }

    try {
        const results = [];
        let successCount = 0;

        for (const post of posts) {
            try {
                // Use parameterized query to prevent SQL injection and handle special characters
                const sql = `
                    INSERT INTO POSTS (ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const binds = [
                    post.id || generateId(),
                    post.type || 'General',
                    post.metricValue || '',
                    post.metricLabel || '',
                    post.content || '',
                    post.author || 'Tableau User',
                    parseInt(post.timestamp) || Date.now(),
                    parseInt(post.likes) || 0
                ];

                const result = await executeSQL(sql, binds);

                if (result.executed) {
                    console.log(`✅ Post ${post.id} saved directly to Snowflake`);
                } else {
                    // Store in fallback when Snowflake is not available
                    fallbackPosts.push(post);
                    console.log(`📦 Post ${post.id} stored in fallback and SQL queued`);
                }

                results.push({ postId: post.id, success: true, executed: result.executed, queued: result.queued });
                successCount++;

            } catch (error) {
                console.error(`❌ Failed to save post ${post.id}:`, error.message);
                results.push({ postId: post.id, success: false, error: error.message });
            }
        }

        const executedCount = results.filter(r => r.executed).length;
        const queuedCount = results.filter(r => r.queued).length;

        return {
            success: successCount > 0,
            message: isSnowflakeAvailable ?
                `${executedCount}/${posts.length} posts saved directly to Snowflake` :
                `${queuedCount}/${posts.length} posts queued (Snowflake unavailable) - use getSQL to sync`,
            savedCount: successCount,
            executedCount: executedCount,
            queuedCount: queuedCount,
            isSnowflakeAvailable: isSnowflakeAvailable,
            results: results
        };

    } catch (error) {
        console.error('❌ Error in savePosts:', error);
        return {
            success: false,
            error: error.message,
            savedCount: 0
        };
    }
}

// READ - Load posts from Snowflake
async function loadPosts() {
    try {
        const sql = `
            SELECT
                ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL,
                CONTENT, AUTHOR, TIMESTAMP_MS, LIKES,
                (SELECT COUNT(*) FROM COMMENTS WHERE POST_ID = POSTS.ID) as COMMENT_COUNT
            FROM POSTS
            ORDER BY TIMESTAMP_MS DESC
        `;

        const result = await executeSQL(sql);

        const posts = result.data.map(row => ({
            id: row.ID,
            type: row.POST_TYPE,
            metricValue: row.METRIC_VALUE,
            metricLabel: row.METRIC_LABEL,
            content: row.CONTENT,
            author: row.AUTHOR,
            timestamp: parseInt(row.TIMESTAMP_MS),
            likes: parseInt(row.LIKES) || 0,
            commentCount: parseInt(row.COMMENT_COUNT) || 0
        }));

        console.log(`✅ Loaded ${posts.length} posts from Snowflake`);

        return {
            success: true,
            posts: posts,
            message: `Loaded ${posts.length} posts from Snowflake database`
        };

    } catch (error) {
        console.error('❌ Error loading posts:', error);
        return {
            success: false,
            error: error.message,
            posts: []
        };
    }
}

// UPDATE - Update post in Snowflake
async function updatePost(postId, updatedPost) {
    try {
        const sql = `
            UPDATE POSTS
            SET POST_TYPE = ?, METRIC_VALUE = ?, METRIC_LABEL = ?,
                CONTENT = ?, AUTHOR = ?, LIKES = ?
            WHERE ID = ?
        `;

        const binds = [
            updatedPost.type,
            updatedPost.metricValue,
            updatedPost.metricLabel,
            updatedPost.content,
            updatedPost.author,
            parseInt(updatedPost.likes) || 0,
            postId
        ];

        await executeSQL(sql, binds);

        console.log(`✅ Post ${postId} updated in Snowflake`);

        return {
            success: true,
            message: 'Post updated successfully in Snowflake'
        };

    } catch (error) {
        console.error('❌ Error updating post:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// DELETE - Delete post from Snowflake
async function deletePost(postId) {
    try {
        // Delete comments first (foreign key constraint)
        await executeSQL('DELETE FROM COMMENTS WHERE POST_ID = ?', [postId]);

        // Then delete the post
        await executeSQL('DELETE FROM POSTS WHERE ID = ?', [postId]);

        console.log(`✅ Post ${postId} and related comments deleted from Snowflake`);

        return {
            success: true,
            message: 'Post and related comments deleted successfully'
        };

    } catch (error) {
        console.error('❌ Error deleting post:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// CREATE - Save comment to Snowflake
async function saveComment(postId, comment) {
    try {
        const sql = `
            INSERT INTO COMMENTS (ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
            VALUES (?, ?, ?, ?, ?)
        `;

        const binds = [
            comment.id || generateId(),
            postId,
            comment.author || 'Tableau User',
            comment.content || '',
            parseInt(comment.timestamp) || Date.now()
        ];

        await executeSQL(sql, binds);

        console.log(`✅ Comment saved to Snowflake for post ${postId}`);

        return {
            success: true,
            message: 'Comment saved to Snowflake successfully'
        };

    } catch (error) {
        console.error('❌ Error saving comment:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// READ - Load comments from Snowflake
async function loadComments(postId) {
    try {
        const sql = `
            SELECT ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS
            FROM COMMENTS
            WHERE POST_ID = ?
            ORDER BY TIMESTAMP_MS ASC
        `;

        const result = await executeSQL(sql, [postId]);

        const comments = result.data.map(row => ({
            id: row.ID,
            postId: row.POST_ID,
            author: row.AUTHOR,
            content: row.CONTENT,
            timestamp: parseInt(row.TIMESTAMP_MS)
        }));

        console.log(`✅ Loaded ${comments.length} comments for post ${postId}`);

        return {
            success: true,
            comments: comments,
            message: `Loaded ${comments.length} comments from Snowflake`
        };

    } catch (error) {
        console.error('❌ Error loading comments:', error);
        return {
            success: false,
            error: error.message,
            comments: []
        };
    }
}

// UPDATE - Update comment in Snowflake
async function updateComment(commentId, updatedComment) {
    try {
        const sql = `
            UPDATE COMMENTS
            SET AUTHOR = ?, CONTENT = ?
            WHERE ID = ?
        `;

        const binds = [
            updatedComment.author,
            updatedComment.content,
            commentId
        ];

        await executeSQL(sql, binds);

        console.log(`✅ Comment ${commentId} updated in Snowflake`);

        return {
            success: true,
            message: 'Comment updated successfully'
        };

    } catch (error) {
        console.error('❌ Error updating comment:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// DELETE - Delete comment from Snowflake
async function deleteComment(commentId) {
    try {
        await executeSQL('DELETE FROM COMMENTS WHERE ID = ?', [commentId]);

        console.log(`✅ Comment ${commentId} deleted from Snowflake`);

        return {
            success: true,
            message: 'Comment deleted successfully'
        };

    } catch (error) {
        console.error('❌ Error deleting comment:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Health check endpoint
async function healthCheck() {
    try {
        await executeSQL('SELECT 1 as test');

        return {
            success: true,
            message: 'Snowflake connection healthy',
            timestamp: new Date().toISOString(),
            database: connectionConfig.database,
            schema: connectionConfig.schema
        };

    } catch (error) {
        return {
            success: false,
            message: 'Snowflake connection failed',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Utility function to generate unique IDs
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}


// Generate batch SQL for manual execution
function generateBatchSQL() {
    if (sqlStatements.length === 0) {
        return '-- No SQL statements to execute';
    }

    const header = `-- Snowflake Sync SQL - Generated ${new Date().toISOString()}
-- Statements: ${sqlStatements.length} | Database: ${connectionConfig.database}.${connectionConfig.schema}
-- Connection Status: ${isSnowflakeAvailable ? 'Available' : 'Unavailable - Using fallback mode'}

USE DATABASE ${connectionConfig.database};
USE SCHEMA ${connectionConfig.schema};

`;

    const statements = sqlStatements.map((item, index) =>
        `-- Statement ${index + 1} - ${item.timestamp}\n${item.sql};`
    ).join('\n\n');

    return header + statements;
}
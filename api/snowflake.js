// Snowflake REST API for Tableau Comments App
// Uses Snowflake SQL REST API v2 (works in Vercel serverless)

const SNOWFLAKE_CONFIG = {
    account: 'ZDDMCAD-FGC62251',
    username: 'ARUNCHANDAR99',
    password: 'Arunchandar@99',
    database: 'TABLEAU_EXTENSIONS',
    schema: 'COMMENTS_APP',
    warehouse: 'COMPUTE_WH',
    role: 'ACCOUNTADMIN'
};

// Get Snowflake session token and master token
async function getSnowflakeSession() {
    try {
        const loginUrl = `https://${SNOWFLAKE_CONFIG.account}.snowflakecomputing.com/session/v1/login-request`;

        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    CLIENT_APP_ID: 'Tableau',
                    CLIENT_APP_VERSION: '1.0',
                    LOGIN_NAME: SNOWFLAKE_CONFIG.username,
                    PASSWORD: SNOWFLAKE_CONFIG.password
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status}`);
        }

        const result = await response.json();
        return {
            token: result.data?.token,
            masterToken: result.data?.masterToken
        };
    } catch (error) {
        console.error('❌ Snowflake login failed:', error.message);
        throw error;
    }
}

// Execute SQL using Snowflake SQL REST API v2
async function executeSQL(sqlText, binds = []) {
    try {
        console.log('🔄 Executing SQL via Snowflake REST API...');

        // Replace bind parameters with actual values
        let processedSQL = sqlText;
        if (binds.length > 0) {
            let bindIndex = 0;
            processedSQL = sqlText.replace(/\?/g, () => {
                const value = binds[bindIndex++];
                if (value === null || value === undefined) {
                    return 'NULL';
                }
                return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
            });
        }

        // Get authentication session
        const session = await getSnowflakeSession();

        // Execute query using SQL API v2
        const apiUrl = `https://${SNOWFLAKE_CONFIG.account}.snowflakecomputing.com/api/v2/statements`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Snowflake Token="${session.token}"`,
                'X-Snowflake-Authorization-Token-Type': 'OAUTH'
            },
            body: JSON.stringify({
                statement: processedSQL,
                timeout: 60,
                database: SNOWFLAKE_CONFIG.database,
                schema: SNOWFLAKE_CONFIG.schema,
                warehouse: SNOWFLAKE_CONFIG.warehouse
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Snowflake API error:', response.status, errorText);
            throw new Error(`Snowflake API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ SQL executed successfully');

        // Parse results from SQL API v2 format
        const data = [];
        if (result.data && result.resultSetMetaData) {
            const columns = result.resultSetMetaData.rowType.map(col => col.name);
            for (const row of result.data) {
                const rowObj = {};
                columns.forEach((col, idx) => {
                    rowObj[col] = row[idx];
                });
                data.push(rowObj);
            }
        }

        return {
            success: true,
            data: data,
            executed: true
        };

    } catch (error) {
        console.error('❌ Snowflake execution failed:', error.message);
        return {
            success: false,
            data: [],
            executed: false,
            error: error.message
        };
    }
}

// API Handler
export default async function handler(req, res) {
    // Enable CORS
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

            case 'deletePost':
                result = await deletePost(body.postId);
                break;

            case 'saveComment':
                result = await saveComment(body.postId, body.comment);
                break;

            case 'loadComments':
                result = await loadComments(body.postId);
                break;

            case 'deleteComment':
                result = await deleteComment(body.commentId);
                break;

            case 'health':
                result = await healthCheck();
                break;

            default:
                result = { success: false, error: `Invalid action: ${action}` };
        }

        console.log(`✅ Action ${action} completed`);
        res.status(200).json(result);

    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}

// Save posts to Snowflake
async function savePosts(posts) {
    if (!Array.isArray(posts)) {
        posts = [posts];
    }

    if (posts.length === 0) {
        return { success: true, message: 'No posts to save', savedCount: 0 };
    }

    try {
        let successCount = 0;

        for (const post of posts) {
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
            if (result.success) successCount++;
        }

        return {
            success: successCount > 0,
            message: `${successCount}/${posts.length} posts saved to Snowflake`,
            savedCount: successCount
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

// Load posts from Snowflake
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

        if (!result.success) {
            return {
                success: false,
                error: result.error,
                posts: []
            };
        }

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
            message: `Loaded ${posts.length} posts from Snowflake`
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

// Delete post from Snowflake
async function deletePost(postId) {
    try {
        // Delete comments first
        await executeSQL('DELETE FROM COMMENTS WHERE POST_ID = ?', [postId]);
        // Delete post
        await executeSQL('DELETE FROM POSTS WHERE ID = ?', [postId]);

        return {
            success: true,
            message: 'Post deleted successfully'
        };

    } catch (error) {
        console.error('❌ Error deleting post:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Save comment to Snowflake
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

        return {
            success: true,
            message: 'Comment saved successfully'
        };

    } catch (error) {
        console.error('❌ Error saving comment:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Load comments from Snowflake
async function loadComments(postId) {
    try {
        const sql = `
            SELECT ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS
            FROM COMMENTS
            WHERE POST_ID = ?
            ORDER BY TIMESTAMP_MS ASC
        `;

        const result = await executeSQL(sql, [postId]);

        if (!result.success) {
            return {
                success: false,
                error: result.error,
                comments: []
            };
        }

        const comments = result.data.map(row => ({
            id: row.ID,
            postId: row.POST_ID,
            author: row.AUTHOR,
            content: row.CONTENT,
            timestamp: parseInt(row.TIMESTAMP_MS)
        }));

        return {
            success: true,
            comments: comments,
            message: `Loaded ${comments.length} comments`
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

// Delete comment from Snowflake
async function deleteComment(commentId) {
    try {
        await executeSQL('DELETE FROM COMMENTS WHERE ID = ?', [commentId]);

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

// Health check
async function healthCheck() {
    try {
        const result = await executeSQL('SELECT 1 as TEST');

        return {
            success: result.success,
            message: result.success ? 'Snowflake connection healthy' : 'Snowflake connection failed',
            timestamp: new Date().toISOString(),
            database: SNOWFLAKE_CONFIG.database,
            schema: SNOWFLAKE_CONFIG.schema,
            error: result.error || undefined
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

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

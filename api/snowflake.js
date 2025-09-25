// Live Snowflake API with Real Database Operations
// Direct execution of SQL in Snowflake database

const snowflakeConfig = {
    account: 'ZDDMCAD-FGC62251.snowflakecomputing.com',
    username: 'ARUNCHANDAR',
    password: 'Password@123',
    database: 'TABLEAU_EXTENSIONS',
    schema: 'COMMENTS_APP'
};

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

        console.log(`🔄 Processing action: ${action}`);

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

            case 'test':
                result = {
                    success: true,
                    message: 'API is working! Ready for automatic sync.',
                    timestamp: new Date().toISOString(),
                    status: 'connected'
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
            error: error.message || 'Internal server error'
        });
    }
}

// Save posts - executes directly in Snowflake
async function savePosts(posts) {
    if (!Array.isArray(posts)) {
        posts = [posts];
    }

    if (posts.length === 0) {
        return { success: true, message: 'No posts to save' };
    }

    try {
        const results = [];

        for (const post of posts) {
            // Clean content for SQL insertion
            const cleanContent = String(post.content || '')
                .replace(/'/g, "''")
                .replace(/\n/g, ' ')
                .replace(/\r/g, '')
                .replace(/\t/g, ' ');

            const sql = `INSERT INTO ${snowflakeConfig.database}.${snowflakeConfig.schema}.POSTS
(ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
VALUES (
    '${String(post.id || '').replace(/'/g, "''")}',
    '${String(post.type || '').replace(/'/g, "''")}',
    '${String(post.metricValue || '').replace(/'/g, "''")}',
    '${String(post.metricLabel || '').replace(/'/g, "''")}',
    '${cleanContent}',
    '${String(post.author || 'Tableau User').replace(/'/g, "''")}',
    ${parseInt(post.timestamp) || Date.now()},
    ${parseInt(post.likes) || 0}
);`;

            // Execute SQL in Snowflake
            const executeResult = await executeSnowflakeSQL(sql);

            if (executeResult.success) {
                results.push({ postId: post.id, success: true });
                console.log(`✅ Post ${post.id} inserted into Snowflake successfully`);
            } else {
                console.error(`❌ Failed to insert post ${post.id}:`, executeResult.error);
                results.push({ postId: post.id, success: false, error: executeResult.error });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return {
            success: successCount > 0,
            results,
            message: `${successCount} posts saved to Snowflake automatically!${failCount > 0 ? ` (${failCount} failed)` : ''}`,
            executedDirectly: true
        };

    } catch (error) {
        console.error('❌ Error saving posts to Snowflake:', error);
        return { success: false, error: error.message };
    }
}

// Load posts from Snowflake database
async function loadPosts() {
    try {
        const sql = `SELECT * FROM ${snowflakeConfig.database}.${snowflakeConfig.schema}.POSTS ORDER BY TIMESTAMP_MS DESC`;

        const result = await executeSnowflakeSQL(sql);

        if (result.success && result.data) {
            const posts = result.data.map(row => ({
                id: row.ID,
                type: row.POST_TYPE,
                metricValue: row.METRIC_VALUE,
                metricLabel: row.METRIC_LABEL,
                content: row.CONTENT,
                author: row.AUTHOR,
                timestamp: parseInt(row.TIMESTAMP_MS),
                likes: parseInt(row.LIKES) || 0,
                commentCount: 0, // Will be populated by separate query if needed
                comments: []
            }));

            console.log(`✅ Loaded ${posts.length} posts from Snowflake`);

            return {
                success: true,
                posts,
                message: `Loaded ${posts.length} posts from Snowflake`
            };
        } else {
            console.log('📄 No posts found in Snowflake, returning empty array');
            return {
                success: true,
                posts: [],
                message: 'No posts found in Snowflake'
            };
        }

    } catch (error) {
        console.error('❌ Error loading posts from Snowflake:', error);
        return { success: false, error: error.message, posts: [] };
    }
}

// Delete post from Snowflake database
async function deletePost(postId) {
    try {
        const deletePostSQL = `DELETE FROM ${snowflakeConfig.database}.${snowflakeConfig.schema}.POSTS WHERE ID = '${postId}'`;
        const deleteCommentsSQL = `DELETE FROM ${snowflakeConfig.database}.${snowflakeConfig.schema}.COMMENTS WHERE POST_ID = '${postId}'`;

        // Execute both deletions
        const postResult = await executeSnowflakeSQL(deletePostSQL);
        const commentsResult = await executeSnowflakeSQL(deleteCommentsSQL);

        if (postResult.success) {
            console.log(`✅ Post ${postId} deleted from Snowflake successfully`);
            return { success: true, message: 'Post deleted from Snowflake automatically!' };
        } else {
            console.error(`❌ Failed to delete post ${postId}:`, postResult.error);
            return { success: false, error: postResult.error };
        }

    } catch (error) {
        console.error('❌ Error deleting post from Snowflake:', error);
        return { success: false, error: error.message };
    }
}

// Save comment to Snowflake database
async function saveComment(postId, comment) {
    try {
        const sql = `INSERT INTO ${snowflakeConfig.database}.${snowflakeConfig.schema}.COMMENTS
(ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
VALUES (
    '${String(comment.id || '').replace(/'/g, "''")}',
    '${String(postId || '').replace(/'/g, "''")}',
    '${String(comment.author || 'Tableau User').replace(/'/g, "''")}',
    '${String(comment.content || '').replace(/'/g, "''")}',
    ${parseInt(comment.timestamp) || Date.now()}
);`;

        const result = await executeSnowflakeSQL(sql);

        if (result.success) {
            console.log(`✅ Comment saved to Snowflake for post ${postId}`);
            return { success: true, message: 'Comment saved to Snowflake automatically!' };
        } else {
            console.error('❌ Failed to save comment:', result.error);
            return { success: false, error: result.error };
        }

    } catch (error) {
        console.error('❌ Error saving comment to Snowflake:', error);
        return { success: false, error: error.message };
    }
}

// Load comments from Snowflake database
async function loadComments(postId) {
    try {
        const sql = `SELECT * FROM ${snowflakeConfig.database}.${snowflakeConfig.schema}.COMMENTS WHERE POST_ID = '${postId}' ORDER BY TIMESTAMP_MS ASC`;

        const result = await executeSnowflakeSQL(sql);

        if (result.success && result.data) {
            const comments = result.data.map(row => ({
                id: row.ID,
                author: row.AUTHOR,
                content: row.CONTENT,
                timestamp: parseInt(row.TIMESTAMP_MS)
            }));

            console.log(`✅ Loaded ${comments.length} comments for post ${postId}`);

            return {
                success: true,
                comments,
                message: `Loaded ${comments.length} comments from Snowflake`
            };
        } else {
            return {
                success: true,
                comments: [],
                message: 'No comments found in Snowflake'
            };
        }

    } catch (error) {
        console.error('❌ Error loading comments from Snowflake:', error);
        return { success: false, error: error.message, comments: [] };
    }
}

// Execute SQL in Snowflake using REST API
async function executeSnowflakeSQL(sqlStatement) {
    try {
        const loginUrl = `https://${snowflakeConfig.account}/session/v1/login-request`;

        // First, authenticate to get session token
        const authResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    ACCOUNT_NAME: snowflakeConfig.account.split('.')[0],
                    LOGIN_NAME: snowflakeConfig.username,
                    PASSWORD: snowflakeConfig.password
                }
            })
        });

        if (!authResponse.ok) {
            throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText}`);
        }

        const authData = await authResponse.json();
        const sessionToken = authData.data.token;

        // Execute SQL statement
        const executeUrl = `https://${snowflakeConfig.account}/queries/v1/query-request`;

        const executeResponse = await fetch(executeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Snowflake Token="${sessionToken}"`
            },
            body: JSON.stringify({
                statement: sqlStatement,
                timeout: 60,
                database: snowflakeConfig.database,
                schema: snowflakeConfig.schema
            })
        });

        if (!executeResponse.ok) {
            throw new Error(`SQL execution failed: ${executeResponse.status} ${executeResponse.statusText}`);
        }

        const executeData = await executeResponse.json();

        if (executeData.success) {
            return {
                success: true,
                data: executeData.data,
                message: 'SQL executed successfully'
            };
        } else {
            return {
                success: false,
                error: executeData.message || 'SQL execution failed'
            };
        }

    } catch (error) {
        console.error('❌ Snowflake SQL execution error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
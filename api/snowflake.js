// Vercel Serverless API for Tableau-Snowflake Integration
import fetch from 'node-fetch';

// Snowflake REST API configuration
const SNOWFLAKE_CONFIG = {
    account: 'ZDDMCAD-FGC62251',
    username: 'ARUNCHANDAR99',
    password: 'Arunchandar@99',
    database: 'TABLEAU_EXTENSIONS',
    schema: 'COMMENTS_APP',
    warehouse: 'COMPUTE_WH',
    role: 'ACCOUNTADMIN'
};

let sessionToken = null;
let tokenExpiry = null;

async function getSnowflakeToken() {
    // Check if we have a valid token
    if (sessionToken && tokenExpiry && Date.now() < tokenExpiry) {
        return sessionToken;
    }

    try {
        const authUrl = `https://${SNOWFLAKE_CONFIG.account}.snowflakecomputing.com/session/v1/login-request`;

        const response = await fetch(authUrl, {
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
                    ACCOUNT_NAME: SNOWFLAKE_CONFIG.account,
                    LOGIN_NAME: SNOWFLAKE_CONFIG.username,
                    PASSWORD: SNOWFLAKE_CONFIG.password
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }

        const authData = await response.json();
        sessionToken = authData.data.token;
        tokenExpiry = Date.now() + (4 * 60 * 60 * 1000); // 4 hours

        console.log('✅ Snowflake authentication successful');
        return sessionToken;

    } catch (error) {
        console.error('❌ Snowflake authentication failed:', error);
        throw error;
    }
}

async function executeSQL(sql, bindings = []) {
    const token = await getSnowflakeToken();

    try {
        const queryUrl = `https://${SNOWFLAKE_CONFIG.account}.snowflakecomputing.com/queries/v1/query-request`;

        const response = await fetch(queryUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Snowflake Token="${token}"`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'TableauCommentsApp/1.0'
            },
            body: JSON.stringify({
                sqlText: sql,
                bindings: bindings,
                asyncExec: false
            })
        });

        if (!response.ok) {
            throw new Error(`SQL execution failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(`SQL error: ${data.message || 'Unknown error'}`);
        }

        return data.data;

    } catch (error) {
        console.error('❌ SQL execution error:', error);
        throw error;
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
                result = { success: true, message: 'API is working!', timestamp: new Date().toISOString() };
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

// Save posts to Snowflake
async function savePosts(posts) {
    if (!Array.isArray(posts)) {
        posts = [posts];
    }

    if (posts.length === 0) {
        return { success: true, message: 'No posts to save' };
    }

    try {
        // Set context
        await executeSQL(`USE DATABASE ${SNOWFLAKE_CONFIG.database}`);
        await executeSQL(`USE SCHEMA ${SNOWFLAKE_CONFIG.schema}`);
        await executeSQL(`USE WAREHOUSE ${SNOWFLAKE_CONFIG.warehouse}`);

        const results = [];

        for (const post of posts) {
            // Clean the data
            const cleanContent = String(post.content || '')
                .replace(/'/g, "''")
                .replace(/\n/g, ' ')
                .replace(/\r/g, '')
                .replace(/\t/g, ' ');

            const sql = `
                INSERT INTO POSTS (ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const bindings = [
                String(post.id || ''),
                String(post.type || ''),
                String(post.metricValue || ''),
                String(post.metricLabel || ''),
                cleanContent,
                String(post.author || 'Tableau User'),
                parseInt(post.timestamp) || Date.now(),
                parseInt(post.likes) || 0
            ];

            await executeSQL(sql, bindings);
            results.push({ postId: post.id, success: true });
        }

        return { success: true, results, message: `${posts.length} posts saved successfully` };

    } catch (error) {
        console.error('❌ Error saving posts:', error);
        return { success: false, error: error.message };
    }
}

// Load posts from Snowflake
async function loadPosts() {
    try {
        // Set context
        await executeSQL(`USE DATABASE ${SNOWFLAKE_CONFIG.database}`);
        await executeSQL(`USE SCHEMA ${SNOWFLAKE_CONFIG.schema}`);

        const sql = `
            SELECT p.ID, p.POST_TYPE, p.METRIC_VALUE, p.METRIC_LABEL, p.CONTENT,
                   p.AUTHOR, p.TIMESTAMP_MS, p.LIKES,
                   COALESCE(c.COMMENT_COUNT, 0) as COMMENT_COUNT
            FROM POSTS p
            LEFT JOIN (
                SELECT POST_ID, COUNT(*) as COMMENT_COUNT
                FROM COMMENTS
                GROUP BY POST_ID
            ) c ON p.ID = c.POST_ID
            ORDER BY p.TIMESTAMP_MS DESC
        `;

        const rows = await executeSQL(sql);

        const posts = (rows || []).map(row => ({
            id: row[0],
            type: row[1],
            metricValue: row[2],
            metricLabel: row[3],
            content: row[4],
            author: row[5],
            timestamp: row[6],
            likes: row[7],
            commentCount: row[8] || 0,
            comments: []
        }));

        return { success: true, posts, message: `Loaded ${posts.length} posts` };

    } catch (error) {
        console.error('❌ Error loading posts:', error);
        return { success: false, error: error.message, posts: [] };
    }
}

// Delete post
async function deletePost(postId) {
    try {
        // Set context
        await executeSQL(`USE DATABASE ${SNOWFLAKE_CONFIG.database}`);
        await executeSQL(`USE SCHEMA ${SNOWFLAKE_CONFIG.schema}`);

        // Delete comments first
        await executeSQL('DELETE FROM COMMENTS WHERE POST_ID = ?', [postId]);

        // Delete post
        await executeSQL('DELETE FROM POSTS WHERE ID = ?', [postId]);

        return { success: true, message: 'Post deleted successfully' };

    } catch (error) {
        console.error('❌ Error deleting post:', error);
        return { success: false, error: error.message };
    }
}

// Save comment
async function saveComment(postId, comment) {
    try {
        // Set context
        await executeSQL(`USE DATABASE ${SNOWFLAKE_CONFIG.database}`);
        await executeSQL(`USE SCHEMA ${SNOWFLAKE_CONFIG.schema}`);

        const sql = `
            INSERT INTO COMMENTS (ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
            VALUES (?, ?, ?, ?, ?)
        `;

        const bindings = [
            String(comment.id || ''),
            String(postId || ''),
            String(comment.author || 'Tableau User'),
            String(comment.content || ''),
            parseInt(comment.timestamp) || Date.now()
        ];

        await executeSQL(sql, bindings);
        return { success: true, message: 'Comment saved successfully' };

    } catch (error) {
        console.error('❌ Error saving comment:', error);
        return { success: false, error: error.message };
    }
}

// Load comments for a post
async function loadComments(postId) {
    try {
        // Set context
        await executeSQL(`USE DATABASE ${SNOWFLAKE_CONFIG.database}`);
        await executeSQL(`USE SCHEMA ${SNOWFLAKE_CONFIG.schema}`);

        const sql = `
            SELECT ID, AUTHOR, CONTENT, TIMESTAMP_MS
            FROM COMMENTS
            WHERE POST_ID = ?
            ORDER BY TIMESTAMP_MS ASC
        `;

        const rows = await executeSQL(sql, [postId]);

        const comments = (rows || []).map(row => ({
            id: row[0],
            author: row[1],
            content: row[2],
            timestamp: row[3]
        }));

        return { success: true, comments, message: `Loaded ${comments.length} comments` };

    } catch (error) {
        console.error('❌ Error loading comments:', error);
        return { success: false, error: error.message, comments: [] };
    }
}
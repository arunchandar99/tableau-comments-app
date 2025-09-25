// Server-side API for Tableau-Snowflake Integration
// This needs to be deployed as a serverless function (Vercel, AWS Lambda, etc.)

const snowflake = require('snowflake-sdk');

// Snowflake connection configuration
const CONNECTION_OPTIONS = {
    account: 'ZDDMCAD-FGC62251.snowflakecomputing.com',
    username: 'ARUNCHANDAR99',
    password: 'Arunchandar@99',
    database: 'TABLEAU_EXTENSIONS',
    schema: 'COMMENTS_APP',
    warehouse: 'COMPUTE_WH',
    role: 'ACCOUNTADMIN'
};

class SnowflakeAPI {
    constructor() {
        this.connection = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.connection = snowflake.createConnection(CONNECTION_OPTIONS);

            this.connection.connect((err, conn) => {
                if (err) {
                    console.error('Unable to connect to Snowflake:', err);
                    reject(err);
                } else {
                    console.log('Successfully connected to Snowflake');
                    resolve(conn);
                }
            });
        });
    }

    async executeQuery(query, binds = []) {
        return new Promise((resolve, reject) => {
            if (!this.connection) {
                reject(new Error('No connection to Snowflake'));
                return;
            }

            this.connection.execute({
                sqlText: query,
                binds: binds,
                complete: (err, stmt, rows) => {
                    if (err) {
                        console.error('Failed to execute query:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            });
        });
    }

    async disconnect() {
        if (this.connection) {
            this.connection.destroy();
        }
    }
}

// API Endpoints
const api = new SnowflakeAPI();

// Initialize connection
async function initializeConnection() {
    try {
        await api.connect();
        return { success: true, message: 'Connected to Snowflake' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Save posts to Snowflake
async function savePosts(posts) {
    try {
        if (!Array.isArray(posts)) {
            posts = [posts];
        }

        const results = [];

        for (const post of posts) {
            const query = `
                MERGE INTO POSTS AS target
                USING (SELECT ? as ID, ? as POST_TYPE, ? as METRIC_VALUE, ? as METRIC_LABEL,
                              ? as CONTENT, ? as AUTHOR, ? as TIMESTAMP_MS, ? as LIKES) AS source
                ON target.ID = source.ID
                WHEN MATCHED THEN
                    UPDATE SET
                        POST_TYPE = source.POST_TYPE,
                        METRIC_VALUE = source.METRIC_VALUE,
                        METRIC_LABEL = source.METRIC_LABEL,
                        CONTENT = source.CONTENT,
                        AUTHOR = source.AUTHOR,
                        TIMESTAMP_MS = source.TIMESTAMP_MS,
                        LIKES = source.LIKES
                WHEN NOT MATCHED THEN
                    INSERT (ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
                    VALUES (source.ID, source.POST_TYPE, source.METRIC_VALUE, source.METRIC_LABEL,
                            source.CONTENT, source.AUTHOR, source.TIMESTAMP_MS, source.LIKES)
            `;

            const binds = [
                post.id,
                post.type,
                post.metricValue,
                post.metricLabel,
                post.content,
                post.author || 'Tableau User',
                post.timestamp,
                post.likes || 0
            ];

            const result = await api.executeQuery(query, binds);
            results.push({ postId: post.id, success: true });
        }

        return { success: true, results };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Load posts from Snowflake
async function loadPosts() {
    try {
        const query = `
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

        const rows = await api.executeQuery(query);

        const posts = rows.map(row => ({
            id: row.ID,
            type: row.POST_TYPE,
            metricValue: row.METRIC_VALUE,
            metricLabel: row.METRIC_LABEL,
            content: row.CONTENT,
            author: row.AUTHOR,
            timestamp: row.TIMESTAMP_MS,
            likes: row.LIKES,
            commentCount: row.COMMENT_COUNT,
            comments: [] // Will be loaded separately if needed
        }));

        return { success: true, posts };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Delete post
async function deletePost(postId) {
    try {
        // Delete comments first
        await api.executeQuery('DELETE FROM COMMENTS WHERE POST_ID = ?', [postId]);

        // Delete post
        await api.executeQuery('DELETE FROM POSTS WHERE ID = ?', [postId]);

        return { success: true, message: 'Post deleted successfully' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Save comment
async function saveComment(postId, comment) {
    try {
        const query = `
            INSERT INTO COMMENTS (ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
            VALUES (?, ?, ?, ?, ?)
        `;

        const binds = [
            comment.id,
            postId,
            comment.author || 'Tableau User',
            comment.content,
            comment.timestamp
        ];

        await api.executeQuery(query, binds);
        return { success: true, message: 'Comment saved successfully' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Load comments for a post
async function loadComments(postId) {
    try {
        const query = `
            SELECT ID, AUTHOR, CONTENT, TIMESTAMP_MS
            FROM COMMENTS
            WHERE POST_ID = ?
            ORDER BY TIMESTAMP_MS ASC
        `;

        const rows = await api.executeQuery(query, [postId]);

        const comments = rows.map(row => ({
            id: row.ID,
            author: row.AUTHOR,
            content: row.CONTENT,
            timestamp: row.TIMESTAMP_MS
        }));

        return { success: true, comments };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Export for serverless deployment
module.exports = {
    initializeConnection,
    savePosts,
    loadPosts,
    deletePost,
    saveComment,
    loadComments
};

// For Vercel deployment
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
        // Initialize connection if not exists
        if (!api.connection) {
            await api.connect();
        }

        const { action } = req.query;
        const body = req.body;

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

            default:
                result = { success: false, error: 'Invalid action' };
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
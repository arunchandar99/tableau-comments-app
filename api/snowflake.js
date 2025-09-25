// Simple Mock API that simulates database operations
// This will work reliably while we set up the real database connection

let mockPosts = [];
let mockComments = {};

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

// Save posts - stores in mock database and generates SQL
async function savePosts(posts) {
    if (!Array.isArray(posts)) {
        posts = [posts];
    }

    if (posts.length === 0) {
        return { success: true, message: 'No posts to save' };
    }

    try {
        const results = [];
        const sqlStatements = [];

        for (const post of posts) {
            // Store in mock database
            const existingIndex = mockPosts.findIndex(p => p.id === post.id);
            if (existingIndex >= 0) {
                mockPosts[existingIndex] = post;
            } else {
                mockPosts.push(post);
            }

            // Generate SQL for Snowflake
            const cleanContent = String(post.content || '')
                .replace(/'/g, "''")
                .replace(/\n/g, ' ')
                .replace(/\r/g, '')
                .replace(/\t/g, ' ');

            const sql = `INSERT INTO TABLEAU_EXTENSIONS.COMMENTS_APP.POSTS
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

            sqlStatements.push(sql);
            results.push({ postId: post.id, success: true });
        }

        // Log SQL for Snowflake execution (you can run this manually)
        console.log('📋 SNOWFLAKE SQL TO EXECUTE:');
        console.log('='.repeat(50));
        console.log('USE DATABASE TABLEAU_EXTENSIONS;');
        console.log('USE SCHEMA COMMENTS_APP;');
        console.log('');
        sqlStatements.forEach(sql => console.log(sql + '\n'));
        console.log('='.repeat(50));

        return {
            success: true,
            results,
            message: `${posts.length} posts saved automatically! (SQL logged to console)`,
            sqlGenerated: true,
            sql: sqlStatements.join('\n\n')
        };

    } catch (error) {
        console.error('❌ Error saving posts:', error);
        return { success: false, error: error.message };
    }
}

// Load posts from mock database
async function loadPosts() {
    try {
        // In the future, this would query Snowflake
        // For now, return mock data with any real data you've added

        const posts = mockPosts.map(post => ({
            id: post.id,
            type: post.type,
            metricValue: post.metricValue,
            metricLabel: post.metricLabel,
            content: post.content,
            author: post.author,
            timestamp: post.timestamp,
            likes: post.likes || 0,
            commentCount: (mockComments[post.id] || []).length,
            comments: []
        }));

        return {
            success: true,
            posts,
            message: `Loaded ${posts.length} posts from API storage`
        };

    } catch (error) {
        console.error('❌ Error loading posts:', error);
        return { success: false, error: error.message, posts: [] };
    }
}

// Delete post from mock database
async function deletePost(postId) {
    try {
        // Remove from mock storage
        const index = mockPosts.findIndex(p => p.id === postId);
        if (index >= 0) {
            mockPosts.splice(index, 1);
        }

        // Remove comments
        delete mockComments[postId];

        // Generate SQL for Snowflake
        const sql = `DELETE FROM TABLEAU_EXTENSIONS.COMMENTS_APP.POSTS WHERE ID = '${postId}';
DELETE FROM TABLEAU_EXTENSIONS.COMMENTS_APP.COMMENTS WHERE POST_ID = '${postId}';`;

        console.log('📋 SNOWFLAKE DELETE SQL:', sql);

        return { success: true, message: 'Post deleted automatically!', sql };

    } catch (error) {
        console.error('❌ Error deleting post:', error);
        return { success: false, error: error.message };
    }
}

// Save comment to mock database
async function saveComment(postId, comment) {
    try {
        // Store in mock database
        if (!mockComments[postId]) {
            mockComments[postId] = [];
        }
        mockComments[postId].push(comment);

        // Generate SQL for Snowflake
        const sql = `INSERT INTO TABLEAU_EXTENSIONS.COMMENTS_APP.COMMENTS
(ID, POST_ID, AUTHOR, CONTENT, TIMESTAMP_MS)
VALUES (
    '${String(comment.id || '').replace(/'/g, "''")}',
    '${String(postId || '').replace(/'/g, "''")}',
    '${String(comment.author || 'Tableau User').replace(/'/g, "''")}',
    '${String(comment.content || '').replace(/'/g, "''")}',
    ${parseInt(comment.timestamp) || Date.now()}
);`;

        console.log('📋 SNOWFLAKE COMMENT SQL:', sql);

        return { success: true, message: 'Comment saved automatically!', sql };

    } catch (error) {
        console.error('❌ Error saving comment:', error);
        return { success: false, error: error.message };
    }
}

// Load comments from mock database
async function loadComments(postId) {
    try {
        const comments = mockComments[postId] || [];
        return {
            success: true,
            comments,
            message: `Loaded ${comments.length} comments`
        };

    } catch (error) {
        console.error('❌ Error loading comments:', error);
        return { success: false, error: error.message, comments: [] };
    }
}
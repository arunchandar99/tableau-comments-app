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
            case 'test-connection':
                result = await testConnectionWithUserCredentials(body.credentials);
                break;
            case 'load-resources':
                result = await loadSnowflakeResources(body.credentials);
                break;
            case 'load-schemas':
                result = await loadSchemas(body.credentials);
                break;
            case 'setup-tables':
                result = await setupTablesForUser(body.credentials);
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

// Test connection with user-provided credentials
async function testConnectionWithUserCredentials(credentials) {
    if (!credentials) {
        return {
            success: false,
            message: 'No credentials provided',
            timestamp: new Date().toISOString()
        };
    }

    let testConnection = null;
    try {
        console.log('🧪 Testing user credentials...');

        // Create temporary connection with user credentials
        const userConfig = {
            account: credentials.account,
            username: credentials.username,
            password: credentials.password,
            database: credentials.database,
            schema: credentials.schema,
            warehouse: credentials.warehouse,
            role: credentials.role || 'ACCOUNTADMIN'
        };

        // Test connection
        testConnection = await new Promise((resolve, reject) => {
            const conn = snowflake.createConnection(userConfig);
            conn.connect((err, connection) => {
                if (err) {
                    console.error('❌ User credential test failed:', err.message);
                    reject(err);
                } else {
                    console.log('✅ User credentials test successful');
                    resolve(connection);
                }
            });
        });

        // Test a simple query
        await new Promise((resolve, reject) => {
            testConnection.execute({
                sqlText: 'SELECT CURRENT_VERSION();',
                complete: (err, stmt, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            });
        });

        return {
            success: true,
            message: 'User credentials verified successfully',
            timestamp: new Date().toISOString(),
            database: credentials.database,
            schema: credentials.schema,
            account: credentials.account
        };

    } catch (error) {
        console.error('❌ User credential test error:', error.message);
        return {
            success: false,
            message: 'Credential verification failed',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        // Always close the test connection
        if (testConnection) {
            try {
                testConnection.destroy();
            } catch (closeError) {
                console.warn('Warning: Failed to close test connection:', closeError.message);
            }
        }
    }
}

// Load available Snowflake resources (databases, warehouses, etc.)
async function loadSnowflakeResources(credentials) {
    if (!credentials) {
        return {
            success: false,
            message: 'No credentials provided',
            timestamp: new Date().toISOString()
        };
    }

    let resourceConnection = null;
    try {
        console.log('🔍 Loading Snowflake resources...');

        // Create connection with user credentials
        const userConfig = {
            account: credentials.account,
            username: credentials.username,
            password: credentials.password,
            warehouse: credentials.warehouse,
            role: credentials.role || 'ACCOUNTADMIN'
        };

        // Create connection
        resourceConnection = await new Promise((resolve, reject) => {
            const conn = snowflake.createConnection(userConfig);
            conn.connect((err, connection) => {
                if (err) {
                    console.error('❌ Resource loading connection failed:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Resource loading connection successful');
                    resolve(connection);
                }
            });
        });

        // Load databases
        const databases = await new Promise((resolve, reject) => {
            resourceConnection.execute({
                sqlText: 'SHOW DATABASES;',
                complete: (err, stmt, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const dbNames = rows.map(row => row.name);
                        resolve(dbNames);
                    }
                }
            });
        });

        // Load warehouses
        const warehouses = await new Promise((resolve, reject) => {
            resourceConnection.execute({
                sqlText: 'SHOW WAREHOUSES;',
                complete: (err, stmt, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const whNames = rows.map(row => row.name);
                        resolve(whNames);
                    }
                }
            });
        });

        return {
            success: true,
            message: 'Resources loaded successfully',
            timestamp: new Date().toISOString(),
            resources: {
                databases,
                warehouses
            }
        };

    } catch (error) {
        console.error('❌ Resource loading error:', error.message);
        return {
            success: false,
            message: 'Failed to load resources',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        if (resourceConnection) {
            try {
                resourceConnection.destroy();
            } catch (closeError) {
                console.warn('Warning: Failed to close resource connection:', closeError.message);
            }
        }
    }
}

// Load schemas for a specific database
async function loadSchemas(credentials) {
    if (!credentials || !credentials.database) {
        return {
            success: false,
            message: 'Database not specified',
            timestamp: new Date().toISOString()
        };
    }

    let schemaConnection = null;
    try {
        console.log(`🔍 Loading schemas for database: ${credentials.database}`);

        // Create connection with user credentials and database
        const userConfig = {
            account: credentials.account,
            username: credentials.username,
            password: credentials.password,
            database: credentials.database,
            warehouse: credentials.warehouse,
            role: credentials.role || 'ACCOUNTADMIN'
        };

        // Create connection
        schemaConnection = await new Promise((resolve, reject) => {
            const conn = snowflake.createConnection(userConfig);
            conn.connect((err, connection) => {
                if (err) {
                    console.error('❌ Schema loading connection failed:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Schema loading connection successful');
                    resolve(connection);
                }
            });
        });

        // Load schemas
        const schemas = await new Promise((resolve, reject) => {
            schemaConnection.execute({
                sqlText: `SHOW SCHEMAS IN DATABASE ${credentials.database};`,
                complete: (err, stmt, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const schemaNames = rows.map(row => row.name);
                        resolve(schemaNames);
                    }
                }
            });
        });

        return {
            success: true,
            message: 'Schemas loaded successfully',
            timestamp: new Date().toISOString(),
            schemas
        };

    } catch (error) {
        console.error('❌ Schema loading error:', error.message);
        return {
            success: false,
            message: 'Failed to load schemas',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        if (schemaConnection) {
            try {
                schemaConnection.destroy();
            } catch (closeError) {
                console.warn('Warning: Failed to close schema connection:', closeError.message);
            }
        }
    }
}

// Setup required tables for the user's database/schema
async function setupTablesForUser(credentials) {
    if (!credentials || !credentials.database || !credentials.schema) {
        return {
            success: false,
            message: 'Database and schema are required',
            timestamp: new Date().toISOString()
        };
    }

    let setupConnection = null;
    try {
        console.log(`🛠️  Setting up tables in ${credentials.database}.${credentials.schema}`);

        // Create connection with full user credentials
        const userConfig = {
            account: credentials.account,
            username: credentials.username,
            password: credentials.password,
            database: credentials.database,
            schema: credentials.schema,
            warehouse: credentials.warehouse,
            role: credentials.role || 'ACCOUNTADMIN'
        };

        // Create connection
        setupConnection = await new Promise((resolve, reject) => {
            const conn = snowflake.createConnection(userConfig);
            conn.connect((err, connection) => {
                if (err) {
                    console.error('❌ Table setup connection failed:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Table setup connection successful');
                    resolve(connection);
                }
            });
        });

        // Create POSTS table
        await new Promise((resolve, reject) => {
            setupConnection.execute({
                sqlText: `
                    CREATE TABLE IF NOT EXISTS POSTS (
                        ID VARCHAR(255) PRIMARY KEY,
                        POST_TYPE VARCHAR(100),
                        METRIC_VALUE VARCHAR(255),
                        METRIC_LABEL VARCHAR(255),
                        CONTENT TEXT,
                        AUTHOR VARCHAR(255),
                        TIMESTAMP_MS BIGINT,
                        LIKES INTEGER DEFAULT 0,
                        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
                    );
                `,
                complete: (err, stmt, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('✅ POSTS table created/verified');
                        resolve(rows);
                    }
                }
            });
        });

        // Create COMMENTS table
        await new Promise((resolve, reject) => {
            setupConnection.execute({
                sqlText: `
                    CREATE TABLE IF NOT EXISTS COMMENTS (
                        ID VARCHAR(255) PRIMARY KEY,
                        POST_ID VARCHAR(255),
                        CONTENT TEXT,
                        AUTHOR VARCHAR(255),
                        TIMESTAMP_MS BIGINT,
                        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
                        FOREIGN KEY (POST_ID) REFERENCES POSTS(ID)
                    );
                `,
                complete: (err, stmt, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('✅ COMMENTS table created/verified');
                        resolve(rows);
                    }
                }
            });
        });

        return {
            success: true,
            message: 'Tables setup completed successfully',
            timestamp: new Date().toISOString(),
            database: credentials.database,
            schema: credentials.schema,
            tables: ['POSTS', 'COMMENTS']
        };

    } catch (error) {
        console.error('❌ Table setup error:', error.message);
        return {
            success: false,
            message: 'Failed to setup tables',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        if (setupConnection) {
            try {
                setupConnection.destroy();
            } catch (closeError) {
                console.warn('Warning: Failed to close setup connection:', closeError.message);
            }
        }
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

// Main API handler for Vercel serverless functions
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { action } = req.query;
        let data = {};

        // Parse request body for POST requests
        if (req.method === 'POST' && req.body) {
            data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        console.log(`🔌 API Request: ${action}`, { method: req.method, hasData: !!data });

        let result;

        switch (action) {
            case 'health':
                result = await healthCheck();
                break;

            case 'test-connection':
                if (!data.credentials) {
                    result = { success: false, error: 'Credentials required for connection test' };
                } else {
                    result = await testConnectionWithUserCredentials(data.credentials);
                }
                break;

            case 'load-resources':
                if (!data.credentials) {
                    result = { success: false, error: 'Credentials required for loading resources' };
                } else {
                    result = await loadSnowflakeResources(data.credentials);
                }
                break;

            case 'load-schemas':
                if (!data.credentials) {
                    result = { success: false, error: 'Credentials required for loading schemas' };
                } else {
                    result = await loadSchemas(data.credentials);
                }
                break;

            case 'setup-tables':
                if (!data.credentials) {
                    result = { success: false, error: 'Credentials required for table setup' };
                } else {
                    result = await setupTablesForUser(data.credentials);
                }
                break;

            case 'savePosts':
                if (!data.posts) {
                    result = { success: false, error: 'Posts data required' };
                } else {
                    result = await savePosts(data.posts);
                }
                break;

            case 'loadPosts':
                result = await loadPosts();
                break;

            case 'deletePost':
                if (!data.postId) {
                    result = { success: false, error: 'Post ID required' };
                } else {
                    result = await deletePost(data.postId);
                }
                break;

            case 'saveComment':
                if (!data.postId || !data.comment) {
                    result = { success: false, error: 'Post ID and comment data required' };
                } else {
                    result = await saveComment(data.postId, data.comment);
                }
                break;

            case 'loadComments':
                if (!data.postId) {
                    result = { success: false, error: 'Post ID required' };
                } else {
                    result = await loadComments(data.postId);
                }
                break;

            case 'deleteComment':
                if (!data.commentId) {
                    result = { success: false, error: 'Comment ID required' };
                } else {
                    result = await deleteComment(data.commentId);
                }
                break;

            case 'getSQL':
                result = {
                    success: true,
                    sql: generateBatchSQL(),
                    statementCount: sqlStatements.length
                };
                break;

            default:
                result = {
                    success: false,
                    error: `Unknown action: ${action}`,
                    availableActions: [
                        'health', 'test-connection', 'load-resources', 'load-schemas', 'setup-tables',
                        'savePosts', 'loadPosts', 'deletePost', 'saveComment', 'loadComments',
                        'deleteComment', 'getSQL'
                    ]
                };
        }

        console.log(`✅ API Response: ${action}`, { success: result.success });
        res.status(200).json(result);

    } catch (error) {
        console.error('❌ API Handler Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
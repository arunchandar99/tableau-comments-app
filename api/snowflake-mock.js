// Temporary Mock Snowflake API for testing the authentication flow
// This will allow us to test the UI without Snowflake dependency issues

async function handler(req, res) {
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

        console.log(`🔌 Mock API Request: ${action}`, { method: req.method, hasData: !!data });

        let result;

        switch (action) {
            case 'health':
                result = {
                    success: true,
                    message: 'Mock Snowflake API is healthy',
                    timestamp: new Date().toISOString()
                };
                break;

            case 'test-connection':
                // Simulate authentication check
                if (!data.credentials || !data.credentials.account || !data.credentials.username || !data.credentials.password) {
                    result = { success: false, error: 'Invalid credentials provided' };
                } else {
                    result = {
                        success: true,
                        message: 'Mock connection test successful',
                        timestamp: new Date().toISOString()
                    };
                }
                break;

            case 'load-resources':
                // Mock database and warehouse data
                if (!data.credentials) {
                    result = { success: false, error: 'Credentials required for loading resources' };
                } else {
                    result = {
                        success: true,
                        message: 'Mock resources loaded successfully',
                        timestamp: new Date().toISOString(),
                        resources: {
                            databases: ['TABLEAU_EXTENSIONS', 'ANALYTICS_DB', 'REPORTING_DB', 'DEMO_DB'],
                            warehouses: ['COMPUTE_WH', 'ANALYTICS_WH', 'REPORTING_WH', 'DEMO_WH']
                        }
                    };
                }
                break;

            case 'load-schemas':
                // Mock schema data based on database
                if (!data.credentials || !data.credentials.database) {
                    result = { success: false, error: 'Database required for loading schemas' };
                } else {
                    const mockSchemas = {
                        'TABLEAU_EXTENSIONS': ['COMMENTS_APP', 'DASHBOARD_ANALYTICS', 'USER_METRICS'],
                        'ANALYTICS_DB': ['SALES', 'MARKETING', 'FINANCE'],
                        'REPORTING_DB': ['MONTHLY', 'QUARTERLY', 'ANNUAL'],
                        'DEMO_DB': ['SAMPLE_DATA', 'TEST_SCHEMA']
                    };

                    result = {
                        success: true,
                        message: 'Mock schemas loaded successfully',
                        timestamp: new Date().toISOString(),
                        schemas: mockSchemas[data.credentials.database] || ['PUBLIC', 'INFORMATION_SCHEMA']
                    };
                }
                break;

            case 'setup-tables':
                // Mock table setup
                if (!data.credentials || !data.credentials.database || !data.credentials.schema) {
                    result = { success: false, error: 'Database and schema required for table setup' };
                } else {
                    result = {
                        success: true,
                        message: 'Mock tables setup completed successfully',
                        timestamp: new Date().toISOString(),
                        database: data.credentials.database,
                        schema: data.credentials.schema,
                        tables: ['POSTS', 'COMMENTS']
                    };
                }
                break;

            case 'savePosts':
                result = {
                    success: true,
                    message: 'Mock posts saved successfully',
                    savedCount: data.posts ? data.posts.length : 0
                };
                break;

            case 'loadPosts':
                result = {
                    success: true,
                    message: 'Mock posts loaded successfully',
                    posts: []
                };
                break;

            case 'deletePost':
                result = {
                    success: true,
                    message: 'Mock post deleted successfully'
                };
                break;

            case 'saveComment':
                result = {
                    success: true,
                    message: 'Mock comment saved successfully'
                };
                break;

            case 'loadComments':
                result = {
                    success: true,
                    message: 'Mock comments loaded successfully',
                    comments: []
                };
                break;

            case 'deleteComment':
                result = {
                    success: true,
                    message: 'Mock comment deleted successfully'
                };
                break;

            default:
                result = {
                    success: false,
                    error: `Unknown action: ${action}`,
                    availableActions: [
                        'health', 'test-connection', 'load-resources', 'load-schemas', 'setup-tables',
                        'savePosts', 'loadPosts', 'deletePost', 'saveComment', 'loadComments', 'deleteComment'
                    ]
                };
        }

        console.log(`✅ Mock API Response: ${action}`, { success: result.success });
        res.status(200).json(result);

    } catch (error) {
        console.error('❌ Mock API Handler Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = handler;
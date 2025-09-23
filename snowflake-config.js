// Snowflake Configuration for Comments App
// Update these values with your Snowflake account details

const SNOWFLAKE_CONFIG = {
    // Your Snowflake account URL (e.g., 'abc12345.snowflakecomputing.com')
    account: 'YOUR_ACCOUNT.snowflakecomputing.com',

    // Database and schema
    database: 'TABLEAU_EXTENSIONS',
    schema: 'COMMENTS_APP',
    warehouse: 'COMPUTE_WH', // Your warehouse name

    // Authentication - you'll use OAuth or key-pair auth in production
    // For development, you might use username/password (not recommended for production)
    authMethod: 'oauth', // 'oauth' or 'password' or 'keypair'

    // OAuth settings (recommended for production)
    oauth: {
        clientId: 'YOUR_OAUTH_CLIENT_ID',
        redirectUri: 'https://arunchandar99.github.io/tableau-comments-app/oauth-callback.html'
    },

    // Alternative: Username/Password (less secure, for development only)
    credentials: {
        username: 'YOUR_USERNAME',
        password: 'YOUR_PASSWORD', // Never hardcode in production!
        role: 'YOUR_ROLE'
    }
};

// API endpoints - you'll need to create these as serverless functions
const SNOWFLAKE_API = {
    baseUrl: 'https://your-api-gateway.amazonaws.com/prod', // Or your preferred serverless platform
    endpoints: {
        posts: '/posts',
        comments: '/comments',
        auth: '/auth'
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SNOWFLAKE_CONFIG, SNOWFLAKE_API };
}
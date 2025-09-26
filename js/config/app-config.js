/**
 * Application Configuration
 * Central place for all app settings and constants
 */

export const APP_CONFIG = {
    // App Information
    name: 'Financial Performance Feed',
    version: '1.0.0',

    // API Configuration
    api: {
        snowflakeBaseUrl: 'https://comments-iwud2flzo-arun-chandars-projects.vercel.app/api/snowflake',
        timeout: 30000, // 30 seconds
        retryAttempts: 3
    },

    // Database Configuration
    database: {
        name: 'TABLEAU_EXTENSIONS',
        schema: 'COMMENTS_APP',
        tables: {
            posts: 'POSTS',
            comments: 'COMMENTS'
        }
    },

    // UI Configuration
    ui: {
        postsPerPage: 50,
        autoRefreshInterval: 300000, // 5 minutes
        notificationDuration: 3000, // 3 seconds
        animationSpeed: 300, // milliseconds
        debounceDelay: 500 // milliseconds
    },

    // Default Values
    defaults: {
        author: 'Current User',
        postTypes: ['Monthly Review', 'Operations Update', 'Market Alert', 'Achievement'],
        dateFormat: 'relative' // 'relative' or 'absolute'
    },

    // Storage Configuration
    storage: {
        enableLocalBackup: true,
        localStorageKey: 'commentsApp_posts',
        maxLocalPosts: 100
    },

    // Debug Configuration
    debug: {
        enabled: true,
        logLevel: 'info', // 'error', 'warn', 'info', 'debug'
        showPerformanceMetrics: true
    }
};

export const STATUS_TYPES = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    SUCCESS: 'success',
    CONNECTED: 'connected'
};

export const POST_TYPES = APP_CONFIG.defaults.postTypes;
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
    },

    // Theme Configuration
    themes: {
        default: 'modern-gradient',
        available: {
            'modern-gradient': {
                name: 'Modern Gradient',
                description: 'Purple to blue gradient (current)',
                headerGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundColor: '#f8fafc',
                cardBackground: '#ffffff',
                textColor: '#1e293b',
                accentColor: '#667eea',
                borderColor: '#e2e8f0',
                shadowColor: 'rgba(0, 0, 0, 0.1)'
            },
            'dark-mode': {
                name: 'Dark Mode',
                description: 'Sleek dark theme for night owls',
                headerGradient: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
                backgroundColor: '#1a202c',
                cardBackground: '#2d3748',
                textColor: '#f7fafc',
                accentColor: '#4299e1',
                borderColor: '#4a5568',
                shadowColor: 'rgba(0, 0, 0, 0.3)'
            },
            'corporate-blue': {
                name: 'Corporate Blue',
                description: 'Professional blue theme for business',
                headerGradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                backgroundColor: '#f1f5f9',
                cardBackground: '#ffffff',
                textColor: '#0f172a',
                accentColor: '#1d4ed8',
                borderColor: '#cbd5e1',
                shadowColor: 'rgba(0, 0, 0, 0.08)'
            },
            'green-nature': {
                name: 'Green Nature',
                description: 'Fresh green theme inspired by nature',
                headerGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                backgroundColor: '#f0fdf4',
                cardBackground: '#ffffff',
                textColor: '#064e3b',
                accentColor: '#059669',
                borderColor: '#bbf7d0',
                shadowColor: 'rgba(0, 0, 0, 0.06)'
            },
            'orange-energy': {
                name: 'Orange Energy',
                description: 'Vibrant orange theme full of energy',
                headerGradient: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                backgroundColor: '#fef7f0',
                cardBackground: '#ffffff',
                textColor: '#7c2d12',
                accentColor: '#ea580c',
                borderColor: '#fed7aa',
                shadowColor: 'rgba(0, 0, 0, 0.08)'
            },
            'minimal-light': {
                name: 'Minimal Light',
                description: 'Clean and minimal light theme',
                headerGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                backgroundColor: '#ffffff',
                cardBackground: '#f9fafb',
                textColor: '#111827',
                accentColor: '#6b7280',
                borderColor: '#e5e7eb',
                shadowColor: 'rgba(0, 0, 0, 0.05)'
            }
        }
    },

    // Appearance Configuration
    appearance: {
        fontSize: {
            default: 'medium',
            options: {
                small: { scale: 0.875, name: 'Small' },
                medium: { scale: 1, name: 'Medium' },
                large: { scale: 1.125, name: 'Large' },
                'extra-large': { scale: 1.25, name: 'Extra Large' }
            }
        },
        animations: {
            default: 'normal',
            options: {
                none: { duration: 0, name: 'None' },
                slow: { duration: 600, name: 'Slow' },
                normal: { duration: 300, name: 'Normal' },
                fast: { duration: 150, name: 'Fast' }
            }
        },
        cardStyle: {
            default: 'modern',
            options: {
                modern: { name: 'Modern', borderRadius: '12px', shadow: '0 4px 12px rgba(0,0,0,0.1)' },
                classic: { name: 'Classic', borderRadius: '6px', shadow: '0 2px 4px rgba(0,0,0,0.1)' },
                minimal: { name: 'Minimal', borderRadius: '4px', shadow: '0 1px 3px rgba(0,0,0,0.1)' },
                rounded: { name: 'Rounded', borderRadius: '20px', shadow: '0 6px 20px rgba(0,0,0,0.1)' }
            }
        }
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
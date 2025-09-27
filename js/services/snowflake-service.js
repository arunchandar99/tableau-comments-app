/**
 * Snowflake Service
 * Handles all Snowflake API interactions and data synchronization
 */

import { APP_CONFIG, STATUS_TYPES } from '../config/app-config.js';
import { logger } from '../utils/logger.js';
import { showNotification } from '../utils/helpers.js';

class SnowflakeService {
    constructor() {
        this.baseURL = APP_CONFIG.api.snowflakeBaseUrl;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = APP_CONFIG.api.retryAttempts;
    }

    /**
     * Initialize connection to Snowflake
     */
    async initialize() {
        try {
            logger.info('Initializing Snowflake connection...');
            const startTime = Date.now();

            const result = await this.healthCheck();
            this.isConnected = result.success;

            logger.performance('Snowflake initialization', startTime);

            if (this.isConnected) {
                logger.success('Snowflake connected successfully');
                showNotification('Connected to Snowflake database');
            } else {
                logger.warn('Snowflake health check failed:', result.error);
                showNotification('Database connection failed - using local storage', 'warning');
            }

            return this.isConnected;
        } catch (error) {
            logger.error('Snowflake initialization failed:', error);
            this.isConnected = false;
            showNotification('Database connection error', 'error');
            return false;
        }
    }

    /**
     * Initialize connection with user-provided credentials
     */
    async initializeWithCredentials(credentials) {
        try {
            logger.info('Testing Snowflake connection with user credentials...');
            const startTime = Date.now();

            // Store credentials temporarily for this test
            this.userCredentials = credentials;

            const result = await this.testConnectionWithCredentials(credentials);
            this.isConnected = result.success;

            logger.performance('Snowflake credential test', startTime);

            if (this.isConnected) {
                logger.success('Snowflake connected with user credentials');
                // Update the base URL to use user's account
                this.baseURL = `https://${credentials.account}.snowflakecomputing.com/api/v2/statements`;
            } else {
                logger.warn('Snowflake connection failed with user credentials:', result.error);
                this.userCredentials = null;
            }

            return this.isConnected;
        } catch (error) {
            logger.error('Snowflake credential initialization failed:', error);
            this.isConnected = false;
            this.userCredentials = null;
            return false;
        }
    }

    /**
     * Perform health check on Snowflake API
     */
    async healthCheck() {
        try {
            return await this.apiCall('health');
        } catch (error) {
            logger.error('Health check failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test connection with user credentials
     */
    async testConnectionWithCredentials(credentials) {
        try {
            logger.info('Testing connection with user credentials...');

            // Create test request with credentials
            const testPayload = {
                credentials,
                testQuery: 'SELECT CURRENT_VERSION();'
            };

            return await this.apiCall('test-connection', 'POST', testPayload);
        } catch (error) {
            logger.error('Credential test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save posts to Snowflake
     */
    async savePosts(posts) {
        if (!this.isConnected) {
            logger.warn('Not connected to Snowflake - posts not saved to database');
            return false;
        }

        if (!Array.isArray(posts) || posts.length === 0) {
            logger.debug('No posts to save');
            return true;
        }

        try {
            logger.info(`Saving ${posts.length} posts to Snowflake...`);
            const startTime = Date.now();

            const result = await this.apiCall('savePosts', { posts });

            logger.performance('Save posts operation', startTime);
            logger.success(`${posts.length} posts saved to Snowflake`);

            const count = result.executedCount || result.savedCount || posts.length;
            showNotification(`${count} post(s) saved to database`);

            return true;
        } catch (error) {
            logger.error('Failed to save posts to Snowflake:', error);
            showNotification('Failed to save posts to database', 'error');
            return false;
        }
    }

    /**
     * Load posts from Snowflake
     */
    async loadPosts() {
        if (!this.isConnected) {
            logger.warn('Not connected to Snowflake - cannot load posts from database');
            return [];
        }

        try {
            logger.info('Loading posts from Snowflake...');
            const startTime = Date.now();

            const result = await this.apiCall('loadPosts');
            const posts = result.posts || [];

            logger.performance('Load posts operation', startTime);
            logger.success(`Loaded ${posts.length} posts from Snowflake`);

            return posts;
        } catch (error) {
            logger.error('Failed to load posts from Snowflake:', error);
            return [];
        }
    }

    /**
     * Delete a post from Snowflake
     */
    async deletePost(postId) {
        if (!this.isConnected) {
            logger.warn('Not connected to Snowflake - cannot delete post from database');
            return false;
        }

        try {
            logger.info(`Deleting post ${postId} from Snowflake...`);
            const result = await this.apiCall('deletePost', { postId });

            logger.success('Post deleted from Snowflake');
            showNotification('Post deleted from database');

            return true;
        } catch (error) {
            logger.error('Failed to delete post from Snowflake:', error);
            showNotification('Failed to delete post from database', 'error');
            return false;
        }
    }

    /**
     * Save a comment to Snowflake
     */
    async saveComment(postId, comment) {
        if (!this.isConnected) {
            logger.warn('Not connected to Snowflake - comment not saved to database');
            return false;
        }

        try {
            logger.info(`Saving comment to post ${postId} in Snowflake...`);
            const result = await this.apiCall('saveComment', { postId, comment });

            logger.success('Comment saved to Snowflake');
            showNotification('Comment saved to database');

            return true;
        } catch (error) {
            logger.error('Failed to save comment to Snowflake:', error);
            showNotification('Failed to save comment to database', 'error');
            return false;
        }
    }

    /**
     * Load comments for a post from Snowflake
     */
    async loadComments(postId) {
        if (!this.isConnected) {
            logger.warn('Not connected to Snowflake - cannot load comments from database');
            return [];
        }

        try {
            logger.debug(`Loading comments for post ${postId} from Snowflake...`);
            const result = await this.apiCall('loadComments', { postId });
            return result.comments || [];
        } catch (error) {
            logger.error('Failed to load comments from Snowflake:', error);
            return [];
        }
    }

    /**
     * Generic API call method with retry logic
     */
    async apiCall(action, data = {}) {
        const url = `${this.baseURL}?action=${action}`;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                logger.debug(`API call attempt ${attempt + 1}/${this.maxRetries + 1}: ${action}`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.api.timeout);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'API call failed');
                }

                // Reset retry count on successful call
                this.retryCount = 0;
                return result;

            } catch (error) {
                if (error.name === 'AbortError') {
                    logger.warn(`API call timeout for ${action} (attempt ${attempt + 1})`);
                } else {
                    logger.warn(`API call failed for ${action} (attempt ${attempt + 1}):`, error.message);
                }

                // If this was the last attempt, throw the error
                if (attempt === this.maxRetries) {
                    this.isConnected = false;
                    throw error;
                }

                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000;
                logger.debug(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            baseURL: this.baseURL,
            lastCheck: new Date().toISOString()
        };
    }

    /**
     * Test connection manually
     */
    async testConnection() {
        logger.info('Testing Snowflake connection...');
        return await this.initialize();
    }
}

// Create and export singleton instance
export const snowflakeService = new SnowflakeService();
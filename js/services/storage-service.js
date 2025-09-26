/**
 * Storage Service
 * Handles local storage operations and data persistence
 */

import { APP_CONFIG } from '../config/app-config.js';
import { logger } from '../utils/logger.js';

class StorageService {
    constructor() {
        this.storageKey = APP_CONFIG.storage.localStorageKey;
        this.maxPosts = APP_CONFIG.storage.maxLocalPosts;
        this.backupEnabled = APP_CONFIG.storage.enableLocalBackup;
    }

    /**
     * Save posts to localStorage
     */
    savePosts(posts) {
        if (!this.backupEnabled) {
            logger.debug('Local storage backup is disabled');
            return false;
        }

        try {
            // Limit number of posts stored locally
            const postsToStore = posts.slice(0, this.maxPosts);

            const data = {
                posts: postsToStore,
                timestamp: Date.now(),
                version: APP_CONFIG.version
            };

            localStorage.setItem(this.storageKey, JSON.stringify(data));
            logger.debug(`Saved ${postsToStore.length} posts to localStorage`);
            return true;
        } catch (error) {
            logger.error('Failed to save posts to localStorage:', error);
            return false;
        }
    }

    /**
     * Load posts from localStorage
     */
    loadPosts() {
        if (!this.backupEnabled) {
            logger.debug('Local storage backup is disabled');
            return [];
        }

        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) {
                logger.debug('No posts found in localStorage');
                return [];
            }

            const data = JSON.parse(stored);

            // Check version compatibility - be more lenient
            if (data.version && data.version !== APP_CONFIG.version) {
                logger.warn(`Version mismatch in localStorage data (${data.version} vs ${APP_CONFIG.version}), but preserving data`);
            }

            logger.debug(`Loaded ${data.posts.length} posts from localStorage`);
            return data.posts || [];
        } catch (error) {
            logger.error('Failed to load posts from localStorage:', error);
            // Don't clear data on parse errors - just return empty for this load
            // The data might be recoverable later or partially valid
            return [];
        }
    }

    /**
     * Clear posts from localStorage
     */
    clearPosts() {
        try {
            localStorage.removeItem(this.storageKey);
            logger.debug('Cleared posts from localStorage');
            return true;
        } catch (error) {
            logger.error('Failed to clear posts from localStorage:', error);
            return false;
        }
    }

    /**
     * Save user preferences
     */
    savePreferences(preferences) {
        try {
            const key = 'commentsApp_preferences';
            localStorage.setItem(key, JSON.stringify(preferences));
            logger.debug('Saved user preferences');
            return true;
        } catch (error) {
            logger.error('Failed to save preferences:', error);
            return false;
        }
    }

    /**
     * Load user preferences
     */
    loadPreferences() {
        try {
            const key = 'commentsApp_preferences';
            const stored = localStorage.getItem(key);
            if (!stored) {
                logger.debug('No preferences found, using defaults');
                return this.getDefaultPreferences();
            }

            const preferences = JSON.parse(stored);
            logger.debug('Loaded user preferences');
            return { ...this.getDefaultPreferences(), ...preferences };
        } catch (error) {
            logger.error('Failed to load preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    /**
     * Get default user preferences
     */
    getDefaultPreferences() {
        return {
            theme: 'default',
            author: APP_CONFIG.defaults.author,
            postsPerPage: APP_CONFIG.ui.postsPerPage,
            dateFormat: APP_CONFIG.defaults.dateFormat,
            autoRefresh: true,
            showAvatars: true,
            compactView: false,
            notificationDuration: APP_CONFIG.ui.notificationDuration
        };
    }

    /**
     * Save draft post
     */
    saveDraft(draft) {
        try {
            const key = 'commentsApp_draft';
            const data = {
                ...draft,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(data));
            logger.debug('Saved draft post');
            return true;
        } catch (error) {
            logger.error('Failed to save draft:', error);
            return false;
        }
    }

    /**
     * Load draft post
     */
    loadDraft() {
        try {
            const key = 'commentsApp_draft';
            const stored = localStorage.getItem(key);
            if (!stored) return null;

            const draft = JSON.parse(stored);

            // Check if draft is not too old (24 hours)
            const maxAge = 24 * 60 * 60 * 1000;
            if (Date.now() - draft.timestamp > maxAge) {
                this.clearDraft();
                return null;
            }

            logger.debug('Loaded draft post');
            return draft;
        } catch (error) {
            logger.error('Failed to load draft:', error);
            return null;
        }
    }

    /**
     * Clear draft post
     */
    clearDraft() {
        try {
            const key = 'commentsApp_draft';
            localStorage.removeItem(key);
            logger.debug('Cleared draft post');
            return true;
        } catch (error) {
            logger.error('Failed to clear draft:', error);
            return false;
        }
    }

    /**
     * Get storage info
     */
    getStorageInfo() {
        try {
            const posts = this.loadPosts();
            const preferences = this.loadPreferences();
            const draft = this.loadDraft();

            return {
                postsCount: posts.length,
                hasPreferences: Object.keys(preferences).length > 0,
                hasDraft: draft !== null,
                storageAvailable: this.isStorageAvailable(),
                backupEnabled: this.backupEnabled
            };
        } catch (error) {
            logger.error('Failed to get storage info:', error);
            return {
                postsCount: 0,
                hasPreferences: false,
                hasDraft: false,
                storageAvailable: false,
                backupEnabled: false
            };
        }
    }

    /**
     * Check if localStorage is available
     */
    isStorageAvailable() {
        try {
            const test = 'localStorage_test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Export data
     */
    exportData() {
        try {
            const posts = this.loadPosts();
            const preferences = this.loadPreferences();
            const logs = logger.getLogs();

            const exportData = {
                posts,
                preferences,
                logs,
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: APP_CONFIG.version,
                    appName: APP_CONFIG.name
                }
            };

            return exportData;
        } catch (error) {
            logger.error('Failed to export data:', error);
            return null;
        }
    }

    /**
     * Import data
     */
    importData(data) {
        try {
            if (data.posts && Array.isArray(data.posts)) {
                this.savePosts(data.posts);
            }

            if (data.preferences && typeof data.preferences === 'object') {
                this.savePreferences(data.preferences);
            }

            logger.info('Data imported successfully');
            return true;
        } catch (error) {
            logger.error('Failed to import data:', error);
            return false;
        }
    }
}

// Create and export singleton instance
export const storageService = new StorageService();
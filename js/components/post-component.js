/**
 * Post Component
 * Handles post creation, rendering, and management
 */

import { APP_CONFIG } from '../config/app-config.js';
import { logger } from '../utils/logger.js';
import {
    generateId,
    validatePost,
    getTimeAgo,
    getPostTypeClass,
    showNotification
} from '../utils/helpers.js';

export class PostComponent {
    constructor(snowflakeService, storageService) {
        this.snowflakeService = snowflakeService;
        this.storageService = storageService;
        this.posts = [];
        this.filteredPosts = [];
    }

    /**
     * Create a new post
     */
    async createPost(postData) {
        try {
            // Validate post data
            const validation = validatePost(postData);
            if (!validation.isValid) {
                const errorMsg = validation.errors.join(', ');
                logger.warn('Post validation failed:', errorMsg);
                showNotification(errorMsg, 'error');
                return null;
            }

            const post = {
                id: generateId(),
                type: postData.type,
                metricValue: postData.metricValue,
                metricLabel: postData.metricLabel,
                content: postData.content,
                author: postData.author || APP_CONFIG.defaults.author,
                timestamp: Date.now(),
                likes: 0,
                comments: []
            };

            // Add to posts array
            this.posts.unshift(post);

            // Save to Snowflake
            await this.snowflakeService.savePosts([post]);

            // Save to local storage as backup
            this.storageService.savePosts(this.posts);

            logger.success('Post created successfully:', post.id);
            showNotification('Post created successfully!');

            return post;
        } catch (error) {
            logger.error('Failed to create post:', error);
            showNotification('Failed to create post', 'error');
            return null;
        }
    }

    /**
     * Load posts from storage
     */
    async loadPosts() {
        try {
            logger.info('Loading posts...');

            // Try loading from Snowflake first
            const snowflakePosts = await this.snowflakeService.loadPosts();

            if (snowflakePosts.length > 0) {
                this.posts = snowflakePosts;
                logger.success(`Loaded ${snowflakePosts.length} posts from Snowflake`);
            } else {
                // Fallback to local storage
                const localPosts = this.storageService.loadPosts();
                this.posts = localPosts.length > 0 ? localPosts : this.getSamplePosts();
                logger.info(`Loaded ${this.posts.length} posts from local storage`);
            }

            return this.posts;
        } catch (error) {
            logger.error('Failed to load posts:', error);
            this.posts = this.getSamplePosts();
            return this.posts;
        }
    }

    /**
     * Delete a post
     */
    async deletePost(postId) {
        try {
            if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                return false;
            }

            // Delete from Snowflake
            await this.snowflakeService.deletePost(postId);

            // Remove from local array
            const postIndex = this.posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                this.posts.splice(postIndex, 1);
            }

            // Update local storage
            this.storageService.savePosts(this.posts);

            logger.success('Post deleted successfully:', postId);
            showNotification('Post deleted successfully!');

            return true;
        } catch (error) {
            logger.error('Failed to delete post:', error);
            showNotification('Failed to delete post', 'error');
            return false;
        }
    }

    /**
     * Toggle like on a post
     */
    async toggleLike(postId) {
        try {
            const post = this.posts.find(p => p.id === postId);
            if (!post) return false;

            post.likes = post.likes > 0 ? post.likes - 1 : post.likes + 1;

            // Save to Snowflake (update operation)
            await this.snowflakeService.savePosts([post]);

            // Update local storage
            this.storageService.savePosts(this.posts);

            logger.debug('Post like toggled:', postId, 'likes:', post.likes);
            return true;
        } catch (error) {
            logger.error('Failed to toggle like:', error);
            return false;
        }
    }

    /**
     * Render a single post
     */
    renderPost(post) {
        try {
            const timeAgo = getTimeAgo(post.timestamp);

            // Ensure all required properties exist with defaults
            const safePost = {
                id: post.id || 'unknown',
                type: post.type || 'General',
                author: post.author || 'Unknown User',
                metricValue: post.metricValue || '',
                metricLabel: post.metricLabel || '',
                content: post.content || '',
                likes: post.likes || 0,
                comments: post.comments || []
            };

            return `
                <div class="post-card" data-post-id="${safePost.id}">
                    <div class="post-header">
                        <div class="post-header-left">
                            <div class="post-type-badge ${getPostTypeClass(safePost.type)}">${safePost.type}</div>
                            <div class="post-time">${timeAgo}</div>
                        </div>
                        <button class="delete-post-btn" onclick="window.postComponent.deletePost('${safePost.id}')" title="Delete Post">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>

                    <div class="post-author">
                        <div class="author-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="author-info">
                            <div class="author-name">${safePost.author}</div>
                            <div class="post-metric">
                                <span class="metric-value">${safePost.metricValue}</span>
                                <span class="metric-label">${safePost.metricLabel}</span>
                            </div>
                        </div>
                    </div>

                    <div class="post-content">${safePost.content}</div>

                    <div class="post-actions">
                        <button class="action-btn like-btn" onclick="window.postComponent.toggleLike('${safePost.id}')">
                            <i class="fas fa-heart"></i>
                            <span>${safePost.likes}</span>
                        </button>
                        <button class="action-btn comment-btn" onclick="window.commentComponent.showComments('${safePost.id}')">
                            <i class="fas fa-comment"></i>
                            <span>${safePost.comments.length}</span>
                        </button>
                        <button class="action-btn share-btn" onclick="window.postComponent.sharePost('${safePost.id}')">
                            <i class="fas fa-share"></i>
                            Share
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            logger.error('Error rendering post:', error);
            return `<div class="post-card error-card">Error rendering post: ${error.message}</div>`;
        }
    }

    /**
     * Share a post
     */
    async sharePost(postId) {
        try {
            const url = window.location.href;
            await navigator.clipboard.writeText(url);
            showNotification('Link copied to clipboard!');
        } catch (error) {
            logger.error('Failed to share post:', error);
            showNotification('Share feature coming soon!', 'warning');
        }
    }

    /**
     * Filter posts based on criteria
     */
    filterPosts(monthFilter = '', yearFilter = '', typeFilter = '') {
        try {
            this.filteredPosts = this.posts.filter(post => {
                const postDate = new Date(post.timestamp);
                const postMonth = postDate.getMonth() + 1;
                const postYear = postDate.getFullYear();

                const matchesMonth = !monthFilter || postMonth.toString() === monthFilter;
                const matchesYear = !yearFilter || postYear.toString() === yearFilter;
                const matchesType = !typeFilter || post.type === typeFilter;

                return matchesMonth && matchesYear && matchesType;
            });

            logger.debug(`Filtered posts: ${this.filteredPosts.length}/${this.posts.length}`);
            return this.filteredPosts;
        } catch (error) {
            logger.error('Error filtering posts:', error);
            this.filteredPosts = [...this.posts];
            return this.filteredPosts;
        }
    }

    /**
     * Get sample posts for demonstration
     */
    getSamplePosts() {
        return [
            {
                id: '1',
                type: 'Monthly Review',
                metricValue: '$2.4M (+12%)',
                metricLabel: 'November Revenue',
                content: 'Excellent performance this month! Our revenue exceeded targets by 12%. Key drivers were the Q4 marketing campaign and strong holiday sales.',
                author: 'Sarah Chen',
                timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
                likes: 8,
                comments: []
            },
            {
                id: '2',
                type: 'Market Alert',
                metricValue: '15.2%',
                metricLabel: 'Market Share Growth',
                content: 'Great news team! We\'ve gained significant market share this quarter. Our competitive positioning strategy is paying off.',
                author: 'Mike Rodriguez',
                timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
                likes: 12,
                comments: []
            }
        ];
    }

    /**
     * Get posts count
     */
    getPostsCount() {
        return {
            total: this.posts.length,
            filtered: this.filteredPosts.length
        };
    }
}
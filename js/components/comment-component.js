/**
 * Comment Component
 * Handles comment creation, editing, and display
 */

import { APP_CONFIG } from '../config/app-config.js';
import { logger } from '../utils/logger.js';
import {
    generateId,
    validateComment,
    getTimeAgo,
    showNotification
} from '../utils/helpers.js';

export class CommentComponent {
    constructor(snowflakeService, postComponent) {
        this.snowflakeService = snowflakeService;
        this.postComponent = postComponent;
        this.currentPostId = null;
        this.setupEventListeners();
    }

    /**
     * Show comments modal for a post
     */
    async showComments(postId) {
        try {
            this.currentPostId = postId;
            const modal = document.getElementById('commentsModal');
            const post = this.postComponent.posts.find(p => p.id === postId);

            if (!post) {
                logger.warn('Post not found:', postId);
                return;
            }

            logger.debug('Showing comments for post:', postId);

            // Load comments from Snowflake if available
            const comments = await this.loadComments(postId);
            post.comments = comments;

            // Render comments
            this.renderComments(post.comments);

            // Show modal
            modal.classList.add('show');

            // Clear comment input
            document.getElementById('commentInput').value = '';

        } catch (error) {
            logger.error('Failed to show comments:', error);
            showNotification('Failed to load comments', 'error');
        }
    }

    /**
     * Load comments for a post
     */
    async loadComments(postId) {
        try {
            // Try loading from Snowflake first
            const comments = await this.snowflakeService.loadComments(postId);

            if (comments.length > 0) {
                logger.debug(`Loaded ${comments.length} comments from Snowflake for post ${postId}`);
                return comments;
            }

            // Fallback to post's local comments
            const post = this.postComponent.posts.find(p => p.id === postId);
            return post ? (post.comments || []) : [];

        } catch (error) {
            logger.error('Failed to load comments:', error);
            return [];
        }
    }

    /**
     * Render comments in the modal
     */
    renderComments(comments) {
        try {
            const container = document.getElementById('commentsContainer');

            if (!comments || comments.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 20px; text-align: center;">
                        <i class="fas fa-comment-slash" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                `;
                return;
            }

            const commentsHtml = comments.map(comment => this.renderComment(comment)).join('');
            container.innerHTML = commentsHtml;

            // Set textarea values for edit forms (after DOM is rendered)
            comments.forEach(comment => {
                const textarea = document.getElementById(`edit-textarea-${comment.id}`);
                if (textarea) {
                    textarea.value = comment.content;
                }
            });

        } catch (error) {
            logger.error('Error rendering comments:', error);
            document.getElementById('commentsContainer').innerHTML = `
                <div class="error-state">Error loading comments. Please try again.</div>
            `;
        }
    }

    /**
     * Render a single comment
     */
    renderComment(comment) {
        try {
            const timeAgo = getTimeAgo(comment.timestamp);
            const initials = comment.author.charAt(0).toUpperCase();

            return `
                <div class="comment-item" id="comment-${comment.id}">
                    <div class="comment-avatar">
                        ${initials}
                    </div>
                    <div class="comment-body">
                        <div class="comment-author">${comment.author}</div>
                        <div class="comment-content" id="content-${comment.id}">${comment.content}</div>
                        <div class="comment-edit-form" id="edit-form-${comment.id}" style="display: none;">
                            <textarea class="comment-edit-textarea" id="edit-textarea-${comment.id}" placeholder="Edit your comment..."></textarea>
                            <div class="comment-edit-actions">
                                <button type="button" class="btn-cancel" onclick="window.commentComponent.cancelEditComment('${comment.id}')">Cancel</button>
                                <button type="button" class="btn-primary" onclick="window.commentComponent.saveEditComment('${comment.id}')">Save</button>
                            </div>
                        </div>
                        <div class="comment-meta">
                            <span class="comment-time">${timeAgo}</span>
                            <button class="comment-edit-btn" onclick="window.commentComponent.editComment('${comment.id}')" title="Edit comment">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            logger.error('Error rendering comment:', error);
            return `<div class="comment-item error">Error rendering comment</div>`;
        }
    }

    /**
     * Submit a new comment
     */
    async submitComment() {
        try {
            const commentInput = document.getElementById('commentInput');
            const content = commentInput.value.trim();

            // Validate comment
            const validation = validateComment(content);
            if (!validation.isValid) {
                showNotification(validation.error, 'error');
                return;
            }

            // Find the post
            const post = this.postComponent.posts.find(p => p.id === this.currentPostId);
            if (!post) {
                logger.error('Post not found for comment:', this.currentPostId);
                return;
            }

            // Initialize comments array if needed
            if (!post.comments) {
                post.comments = [];
            }

            // Create new comment
            const newComment = {
                id: generateId(),
                author: APP_CONFIG.defaults.author,
                content: content,
                timestamp: Date.now()
            };

            // Add to post
            post.comments.push(newComment);

            // Save to Snowflake
            await this.snowflakeService.saveComment(this.currentPostId, newComment);

            // Update local storage
            this.postComponent.storageService.savePosts(this.postComponent.posts);

            // Re-render comments
            this.renderComments(post.comments);

            // Clear input
            commentInput.value = '';

            logger.success('Comment added successfully');
            showNotification('Comment posted successfully!');

        } catch (error) {
            logger.error('Failed to submit comment:', error);
            showNotification('Failed to post comment', 'error');
        }
    }

    /**
     * Edit a comment
     */
    editComment(commentId) {
        try {
            // Hide content and show edit form
            const contentElement = document.getElementById(`content-${commentId}`);
            const editFormElement = document.getElementById(`edit-form-${commentId}`);
            const textareaElement = document.getElementById(`edit-textarea-${commentId}`);

            if (contentElement && editFormElement && textareaElement) {
                contentElement.style.display = 'none';
                editFormElement.style.display = 'block';

                // Focus and select text
                textareaElement.focus();
                textareaElement.select();

                logger.debug('Editing comment:', commentId);
            }
        } catch (error) {
            logger.error('Failed to edit comment:', error);
        }
    }

    /**
     * Cancel comment editing
     */
    cancelEditComment(commentId) {
        try {
            // Show content and hide edit form
            const contentElement = document.getElementById(`content-${commentId}`);
            const editFormElement = document.getElementById(`edit-form-${commentId}`);

            if (contentElement && editFormElement) {
                contentElement.style.display = 'block';
                editFormElement.style.display = 'none';

                // Reset textarea to original content
                const post = this.postComponent.posts.find(p => p.id === this.currentPostId);
                if (post) {
                    const comment = post.comments.find(c => c.id === commentId);
                    if (comment) {
                        const textareaElement = document.getElementById(`edit-textarea-${commentId}`);
                        if (textareaElement) {
                            textareaElement.value = comment.content;
                        }
                    }
                }

                logger.debug('Cancelled editing comment:', commentId);
            }
        } catch (error) {
            logger.error('Failed to cancel comment edit:', error);
        }
    }

    /**
     * Save edited comment
     */
    async saveEditComment(commentId) {
        try {
            const textareaElement = document.getElementById(`edit-textarea-${commentId}`);
            if (!textareaElement) return;

            const newContent = textareaElement.value.trim();

            // Validate comment
            const validation = validateComment(newContent);
            if (!validation.isValid) {
                showNotification(validation.error, 'error');
                return;
            }

            // Find post and comment
            const post = this.postComponent.posts.find(p => p.id === this.currentPostId);
            if (!post) return;

            const comment = post.comments.find(c => c.id === commentId);
            if (!comment) {
                showNotification('Comment not found', 'error');
                return;
            }

            // Update comment content
            const originalContent = comment.content;
            comment.content = newContent;

            try {
                // Update in Snowflake
                await this.snowflakeService.saveComment(this.currentPostId, comment);

                // Update local storage
                this.postComponent.storageService.savePosts(this.postComponent.posts);

                // Update display
                const contentElement = document.getElementById(`content-${commentId}`);
                const editFormElement = document.getElementById(`edit-form-${commentId}`);

                if (contentElement && editFormElement) {
                    contentElement.innerHTML = newContent;
                    contentElement.style.display = 'block';
                    editFormElement.style.display = 'none';
                }

                logger.success('Comment updated successfully');
                showNotification('Comment updated successfully!');

            } catch (error) {
                // Revert change on error
                comment.content = originalContent;
                logger.error('Failed to update comment:', error);
                showNotification('Failed to update comment', 'error');
            }

        } catch (error) {
            logger.error('Failed to save comment edit:', error);
            showNotification('Failed to update comment', 'error');
        }
    }

    /**
     * Setup event listeners for comment functionality
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupCommentModalListeners();
        });
    }

    /**
     * Setup comment modal event listeners
     */
    setupCommentModalListeners() {
        const modal = document.getElementById('commentsModal');
        const closeBtn = document.getElementById('closeCommentsBtn');
        const cancelBtn = document.getElementById('cancelCommentBtn');
        const submitBtn = document.getElementById('submitCommentBtn');
        const commentInput = document.getElementById('commentInput');

        // Close modal
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('show');
        }

        // Close modal when clicking overlay
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            };
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                modal.classList.remove('show');
            }
        });

        // Cancel comment
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                if (commentInput) commentInput.value = '';
            };
        }

        // Submit comment
        if (submitBtn) {
            submitBtn.onclick = () => this.submitComment();
        }

        // Allow Enter+Ctrl for submission
        if (commentInput) {
            commentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.submitComment();
                }
            });
        }
    }
}
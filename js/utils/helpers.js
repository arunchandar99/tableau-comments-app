/**
 * Utility Helper Functions
 * Reusable functions used across the application
 */

import { APP_CONFIG } from '../config/app-config.js';

/**
 * Generate unique ID for posts and comments
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format timestamp to human-readable format
 */
export function getTimeAgo(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return postTime.toLocaleDateString();
}

/**
 * Show notification to user
 */
export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const bgColor = type === 'error' ? '#ef4444' :
                   type === 'warning' ? '#f59e0b' : '#10b981';

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, APP_CONFIG.ui.notificationDuration);
}

/**
 * Debounce function to limit rapid function calls
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Validate post data
 */
export function validatePost(postData) {
    const errors = [];

    if (!postData.type) errors.push('Post type is required');
    if (!postData.metricValue) errors.push('Metric value is required');
    if (!postData.metricLabel) errors.push('Metric label is required');
    if (!postData.content || !postData.content.trim()) errors.push('Content is required');

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate comment data
 */
export function validateComment(content) {
    if (!content || !content.trim()) {
        return {
            isValid: false,
            error: 'Comment content is required'
        };
    }

    if (content.length > 1000) {
        return {
            isValid: false,
            error: 'Comment is too long (max 1000 characters)'
        };
    }

    return { isValid: true };
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get CSS class for post type
 */
export function getPostTypeClass(postType) {
    return postType.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}
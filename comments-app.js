// Comments App - Social Media Style Commenting System
// MVP Implementation with local storage

let posts = [];
let filteredPosts = [];

// Initialize the app
async function initializeApp() {
    try {
        await tableau.extensions.initializeAsync();
        console.log('Comments App initialized successfully');

        // Initialize Snowflake API
        await snowflakeAPI.initialize();

        // Load existing posts from Snowflake (with localStorage fallback)
        await loadPostsFromStorage();

        // Setup event listeners
        setupEventListeners();

        // Initial render
        renderFeed();
        updateResultsCounter();

    } catch (error) {
        console.error('Failed to initialize Comments App:', error);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // New Post Button
    document.getElementById('newPostBtn').addEventListener('click', openNewPostModal);

    // Modal Controls
    document.getElementById('closeModalBtn').addEventListener('click', closeNewPostModal);
    document.getElementById('cancelPostBtn').addEventListener('click', closeNewPostModal);
    document.getElementById('modalOverlay').addEventListener('click', handleModalOverlayClick);

    // Form Submission
    document.getElementById('newPostForm').addEventListener('submit', handleNewPostSubmit);

    // Rich Text Toolbar
    setupRichTextEditor();

    // Filters
    document.getElementById('monthFilter').addEventListener('change', applyFilters);
    document.getElementById('yearFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
}

// Post Management
function createPost(postData) {
    const post = {
        id: generateId(),
        type: postData.type,
        metricValue: postData.metricValue,
        metricLabel: postData.metricLabel,
        content: postData.content,
        author: 'Current User', // In MVP, hardcoded
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: []
    };

    posts.unshift(post); // Add to beginning
    savePostsToStorage();
    return post;
}

// Storage Functions - Now uses Snowflake with localStorage fallback
async function loadPostsFromStorage() {
    try {
        posts = await snowflakeAPI.loadPosts();

        if (posts.length === 0) {
            // Add some sample data for MVP
            posts = getSamplePosts();
            await savePostsToStorage();
        }
    } catch (error) {
        console.error('Error loading posts from Snowflake, using localStorage fallback:', error);
        const storedPosts = localStorage.getItem('commentsApp_posts');
        if (storedPosts) {
            posts = JSON.parse(storedPosts);
        } else {
            posts = getSamplePosts();
            localStorage.setItem('commentsApp_posts', JSON.stringify(posts));
        }
    }
}

async function savePostsToStorage() {
    try {
        await snowflakeAPI.savePosts(posts);
    } catch (error) {
        console.error('Error saving posts to Snowflake, using localStorage fallback:', error);
        localStorage.setItem('commentsApp_posts', JSON.stringify(posts));
    }
}

// Sample Data for MVP
function getSamplePosts() {
    return [
        {
            id: '1',
            type: 'Monthly Review',
            metricValue: '$2.4M (+12%)',
            metricLabel: 'November Revenue',
            content: 'Excellent performance this month! Our revenue exceeded targets by 12%. Key drivers were the Q4 marketing campaign and strong holiday sales.',
            author: 'Sarah Chen',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
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
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
            likes: 12,
            comments: []
        }
    ];
}

// Modal Functions
function openNewPostModal() {
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('postContent').focus();

    // Initialize rich text editor
    setupPostRichTextEditor();
}

function closeNewPostModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('newPostForm').reset();
    document.getElementById('postContent').innerHTML = '';
}

function handleModalOverlayClick(e) {
    if (e.target === e.currentTarget) {
        closeNewPostModal();
    }
}

// Form Handling
function handleNewPostSubmit(e) {
    e.preventDefault();

    const formData = {
        type: document.getElementById('postType').value,
        metricValue: document.getElementById('metricValue').value,
        metricLabel: document.getElementById('metricLabel').value,
        content: document.getElementById('postContent').innerHTML
    };

    // Validation
    if (!formData.type || !formData.metricValue || !formData.metricLabel || !formData.content.trim()) {
        alert('Please fill in all required fields');
        return;
    }

    // Create post
    const newPost = createPost(formData);

    // Update UI
    closeNewPostModal();
    applyFilters();

    // Show success message
    showNotification('Post created successfully!');
}

// Rich Text Editor
function setupRichTextEditor() {
    const toolbar = document.querySelectorAll('.toolbar-btn');

    toolbar.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.getAttribute('data-command');
            document.execCommand(command, false, null);
            document.getElementById('postContent').focus();
        });
    });

    // Handle placeholder
    const editor = document.getElementById('postContent');
    editor.addEventListener('focus', () => {
        if (editor.innerHTML === '') {
            editor.innerHTML = '';
        }
    });

    editor.addEventListener('blur', () => {
        if (editor.innerHTML.trim() === '') {
            editor.innerHTML = '';
        }
    });
}

// Feed Rendering
function renderFeed() {
    const feedContainer = document.getElementById('feedContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');

    // Show loading
    loadingSpinner.style.display = 'flex';
    emptyState.style.display = 'none';
    feedContainer.innerHTML = '';

    // Simulate loading delay for better UX
    setTimeout(() => {
        loadingSpinner.style.display = 'none';

        if (filteredPosts.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            feedContainer.innerHTML = filteredPosts.map(post => renderPost(post)).join('');
        }
    }, 300);
}

function renderPost(post) {
    const timeAgo = getTimeAgo(post.timestamp);

    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-header-left">
                    <div class="post-type-badge ${post.type.toLowerCase().replace(/\s+/g, '-')}">${post.type}</div>
                    <div class="post-time">${timeAgo}</div>
                </div>
                <button class="delete-post-btn" onclick="deletePost('${post.id}')" title="Delete Post">
                    <i class="fas fa-trash"></i>
                </button>
            </div>

            <div class="post-author">
                <div class="author-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="author-info">
                    <div class="author-name">${post.author}</div>
                    <div class="post-metric">
                        <span class="metric-value">${post.metricValue}</span>
                        <span class="metric-label">${post.metricLabel}</span>
                    </div>
                </div>
            </div>

            <div class="post-content">${post.content}</div>

            <div class="post-actions">
                <button class="action-btn like-btn" onclick="toggleLike('${post.id}')">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes}</span>
                </button>
                <button class="action-btn comment-btn" onclick="showComments('${post.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments.length}</span>
                </button>
                <button class="action-btn share-btn" onclick="sharePost('${post.id}')">
                    <i class="fas fa-share"></i>
                    Share
                </button>
            </div>
        </div>
    `;
}

// Post Actions
function toggleLike(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.likes = post.likes > 0 ? post.likes - 1 : post.likes + 1;
        savePostsToStorage();
        applyFilters();
    }
}

let currentPostId = null;

function showComments(postId) {
    currentPostId = postId;
    const modal = document.getElementById('commentsModal');
    const post = posts.find(p => p.id === postId);

    if (!post) return;

    // Render existing comments
    renderComments(post.comments || []);

    // Show modal
    modal.classList.add('show');

    // Clear comment input
    document.getElementById('commentInput').value = '';

    // Setup event listeners for comment functionality
    setupCommentEventListeners();
}

function renderComments(comments) {
    const container = document.getElementById('commentsContainer');

    if (comments.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No comments yet. Be the first to comment!</p></div>';
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-avatar">
                ${comment.author.charAt(0).toUpperCase()}
            </div>
            <div class="comment-body">
                <div class="comment-author">${comment.author}</div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-time">${getTimeAgo(comment.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function setupCommentEventListeners() {
    const modal = document.getElementById('commentsModal');

    // Close modal
    document.getElementById('closeCommentsBtn').onclick = () => {
        modal.classList.remove('show');
    };

    // Close modal when clicking overlay
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    };

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
        }
    });

    // Cancel comment
    document.getElementById('cancelCommentBtn').onclick = () => {
        document.getElementById('commentInput').value = '';
    };

    // Submit comment
    document.getElementById('submitCommentBtn').onclick = () => {
        submitComment();
    };

    // Allow Enter+Ctrl for submission, Enter alone for line breaks
    document.getElementById('commentInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            submitComment();
        }
    });
}

// Enhanced Rich Text Editor for Posts
function setupPostRichTextEditor() {
    const editor = document.getElementById('postContent');
    const textColorPicker = document.getElementById('postTextColorPicker');
    const bgColorPicker = document.getElementById('postBgColorPicker');

    if (!editor || !textColorPicker || !bgColorPicker) return;

    let savedRange = null;

    // Save selection whenever user selects text
    function saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
        }
    }

    // Restore selection
    function restoreSelection() {
        if (savedRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
        }
    }

    // Save selection when user makes one
    editor.addEventListener('mouseup', saveSelection);
    editor.addEventListener('keyup', saveSelection);

    // Text color picker
    textColorPicker.addEventListener('input', (e) => {
        if (!savedRange) {
            alert('Please select some text first');
            return;
        }

        // Restore the selection
        restoreSelection();

        // Apply the color
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, e.target.value);

        // Keep the selection visible momentarily, then clear it
        setTimeout(() => {
            window.getSelection().removeAllRanges();
        }, 100);
    });

    // Highlight color picker
    bgColorPicker.addEventListener('input', (e) => {
        if (!savedRange) {
            alert('Please select some text first');
            return;
        }

        // Restore the selection
        restoreSelection();

        // Apply the highlight
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('hiliteColor', false, e.target.value);

        // Keep the selection visible momentarily, then clear it
        setTimeout(() => {
            window.getSelection().removeAllRanges();
        }, 100);
    });

    console.log('Simple rich text editor initialized');
}

function submitComment() {
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();

    if (!content || content === '') {
        showNotification('Please write a comment before posting.');
        return;
    }

    // Find the post and add the comment
    const post = posts.find(p => p.id === currentPostId);
    if (!post) return;

    // Initialize comments array if it doesn't exist
    if (!post.comments) {
        post.comments = [];
    }

    // Create new comment
    const newComment = {
        id: generateId(),
        author: 'Current User', // You can make this dynamic
        content: content,
        timestamp: Date.now()
    };

    // Add comment to post
    post.comments.push(newComment);

    // Save to storage
    savePostsToStorage();

    // Re-render comments
    renderComments(post.comments);

    // Clear input
    commentInput.value = '';

    // Update comment count in the feed
    applyFilters();

    // Show success notification
    showNotification('Comment posted successfully!');
}

async function deletePost(postId) {
    // Show confirmation dialog
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        try {
            // Delete from Snowflake first
            await snowflakeAPI.deletePost(postId);

            // Find and remove from local array
            const postIndex = posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                posts.splice(postIndex, 1);
            }

            // Refresh the feed
            applyFilters();

            // Show success notification
            showNotification('Post deleted successfully!');
        } catch (error) {
            console.error('Error deleting post:', error);
            showNotification('Error deleting post. Please try again.');
        }
    }
}

function sharePost(postId) {
    // For MVP, just copy to clipboard
    navigator.clipboard.writeText(window.location.href)
        .then(() => showNotification('Link copied to clipboard!'))
        .catch(() => showNotification('Share feature coming soon!'));
}

// Filtering
function applyFilters() {
    const monthFilter = document.getElementById('monthFilter').value;
    const yearFilter = document.getElementById('yearFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;

    filteredPosts = posts.filter(post => {
        const postDate = new Date(post.timestamp);
        const postMonth = postDate.getMonth() + 1;
        const postYear = postDate.getFullYear();

        const matchesMonth = !monthFilter || postMonth.toString() === monthFilter;
        const matchesYear = !yearFilter || postYear.toString() === yearFilter;
        const matchesType = !typeFilter || post.type === typeFilter;

        return matchesMonth && matchesYear && matchesType;
    });

    renderFeed();
    updateResultsCounter();
}

function clearFilters() {
    document.getElementById('monthFilter').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('typeFilter').value = '';
    applyFilters();
}

function updateResultsCounter() {
    const counter = document.getElementById('resultsCounter');
    const count = filteredPosts.length;
    counter.textContent = `Showing ${count} post${count !== 1 ? 's' : ''}`;
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTimeAgo(timestamp) {
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

function showNotification(message) {
    // Simple notification for MVP
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    // Initial filter application
    setTimeout(() => {
        applyFilters();
    }, 100);
});

// Add notification animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
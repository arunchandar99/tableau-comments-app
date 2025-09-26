// Comments App - Social Media Style Commenting System
// MVP Implementation with local storage

let posts = [];
let filteredPosts = [];

// Initialize the app
async function initializeApp() {
    try {
        window.appStartTime = Date.now();
        await tableau.extensions.initializeAsync();
        console.log('Comments App initialized successfully');

        // Initialize dashboard filter synchronization
        await initializeDashboardSync();

        // Initialize Snowflake API
        updateConnectionStatus('Connecting to Snowflake...', 'info');
        updateStatus('Initializing Snowflake API...');

        // Initialize database configuration info
        updateDatabaseConfigInfo();

        const isConnected = await snowflakeAPI.initialize();
        if (isConnected) {
            updateConnectionStatus('Connected to Snowflake', 'connected');
            updateStatus('Connected to Snowflake - Loading posts...', 'connected');
        } else {
            updateConnectionStatus('Connection Failed', 'error');
            updateStatus('Snowflake connection failed - Using local storage', 'error');
        }

        // Load existing posts from Snowflake (with localStorage fallback)
        await loadPostsFromStorage();
        updatePostsCount(posts.length);
        updateStatus(`Loaded ${posts.length} posts from database`);

        // Setup event listeners
        setupEventListeners();

        // Apply filters to populate filteredPosts array
        console.log('🔍 Applying initial filters...');
        applyFilters();
        updateStatus(`Filtered to ${filteredPosts.length} posts`);

        // Initial render
        console.log('🎨 Starting initial render with', posts.length, 'posts');
        renderFeed();
        updateResultsCounter();
        console.log('✅ App initialization complete');

        if (isConnected) {
            updateStatus('App ready - Snowflake connected', 'connected');
        } else {
            updateStatus('App ready - Using local storage only', 'warning');
        }

    } catch (error) {
        console.error('Failed to initialize Comments App:', error);
        updateConnectionStatus('Connection Failed', 'error');
        updateStatus('ERROR: Failed to initialize - ' + error.message, 'error');
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
    document.getElementById('monthFilter').addEventListener('change', () => {
        updateStatus('Applying month filter...');
        applyFilters();
    });
    document.getElementById('yearFilter').addEventListener('change', () => {
        updateStatus('Applying year filter...');
        applyFilters();
    });
    document.getElementById('typeFilter').addEventListener('change', () => {
        updateStatus('Applying type filter...');
        applyFilters();
    });
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        updateStatus('Clearing all filters...');
        clearFilters();
    });

    // Debug panel toggle
    document.getElementById('statusIndicator').addEventListener('click', toggleDebugPanel);
    document.getElementById('debugClose').addEventListener('click', hideDebugPanel);
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
        timestamp: Date.now(), // Use consistent timestamp format (milliseconds)
        likes: 0,
        comments: []
    };

    posts.unshift(post); // Add to beginning

    // Save only the new post to Snowflake
    updateStatus('Saving new post to database...');
    saveNewPostToSnowflake(post);
    updatePostsCount(posts.length);
    updateStatus('New post created successfully');
    return post;
}

// Storage Functions - Now uses Snowflake with localStorage fallback
async function loadPostsFromStorage() {
    try {
        console.log('🔄 Loading posts from Snowflake...');
        posts = await snowflakeAPI.loadPosts();
        console.log('✅ Loaded posts from Snowflake:', posts.length, 'posts');
        console.log('Posts data:', posts);

        if (posts.length === 0) {
            console.log('⚠️ No posts found in Snowflake, loading sample data for display');
            showDebugStatus('No posts in Snowflake, loading samples');
            // Add some sample data for MVP (local display only, not saved to database)
            posts = getSamplePosts();
            // Note: Don't save sample data to Snowflake - only save actual user posts
        }
    } catch (error) {
        console.error('❌ Error loading posts from Snowflake, using localStorage fallback:', error);
        showDebugStatus('Snowflake failed, trying localStorage');
        const storedPosts = localStorage.getItem('commentsApp_posts');
        if (storedPosts) {
            posts = JSON.parse(storedPosts);
            console.log('✅ Loaded posts from localStorage:', posts.length, 'posts');
            showDebugStatus(`Loaded ${posts.length} posts from localStorage`);
        } else {
            posts = getSamplePosts();
            console.log('✅ Loading sample posts for MVP:', posts.length, 'posts');
            showDebugStatus(`Loading ${posts.length} sample posts`);
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

async function saveNewPostToSnowflake(post) {
    try {
        await snowflakeAPI.savePosts([post]); // Save only the new post
        console.log('✅ New post saved to Snowflake individually');
    } catch (error) {
        console.error('Error saving new post to Snowflake:', error);
        // Fallback to localStorage only
        localStorage.setItem('commentsApp_posts', JSON.stringify(posts));
    }
}

async function saveCommentToSnowflake(postId, comment) {
    try {
        await snowflakeAPI.saveComment(postId, comment);
        console.log('✅ Comment saved to Snowflake individually');
    } catch (error) {
        console.error('Error saving comment to Snowflake:', error);
        // Fallback to localStorage only if Snowflake fails
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
async function handleNewPostSubmit(e) {
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

    // Update UI immediately
    closeNewPostModal();

    // Clear any existing filters to ensure new post is visible
    clearFilters();

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
    console.log('🎨 renderFeed called - posts:', posts.length, 'filteredPosts:', filteredPosts.length);
    showDebugStatus(`Rendering ${filteredPosts.length} posts to feed`);

    const feedContainer = document.getElementById('feedContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');

    if (!feedContainer) {
        showDebugStatus('ERROR: feedContainer not found!');
        return;
    }

    // Show loading
    loadingSpinner.style.display = 'flex';
    emptyState.style.display = 'none';
    feedContainer.innerHTML = '';

    // Simulate loading delay for better UX
    setTimeout(() => {
        loadingSpinner.style.display = 'none';

        console.log('🎨 Rendering feed - filteredPosts length:', filteredPosts.length);

        if (filteredPosts.length === 0) {
            console.log('📭 No filtered posts, showing empty state');
            showDebugStatus('No posts to show - showing empty state');
            emptyState.style.display = 'flex';
        } else {
            console.log('✅ Rendering', filteredPosts.length, 'posts to feed');
            try {
                const renderedHTML = filteredPosts.map(post => renderPost(post)).join('');
                feedContainer.innerHTML = renderedHTML;
                showDebugStatus(`Successfully rendered ${filteredPosts.length} posts`);
            } catch (error) {
                showDebugStatus(`ERROR rendering posts: ${error.message}`);
            }
        }
    }, 300);
}

function renderPost(post) {
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
                        <div class="post-type-badge ${safePost.type.toLowerCase().replace(/\s+/g, '-')}">${safePost.type}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                    <button class="delete-post-btn" onclick="deletePost('${safePost.id}')" title="Delete Post">
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
                    <button class="action-btn like-btn" onclick="toggleLike('${safePost.id}')">
                        <i class="fas fa-heart"></i>
                        <span>${safePost.likes}</span>
                    </button>
                    <button class="action-btn comment-btn" onclick="showComments('${safePost.id}')">
                        <i class="fas fa-comment"></i>
                        <span>${safePost.comments.length}</span>
                    </button>
                    <button class="action-btn share-btn" onclick="sharePost('${safePost.id}')">
                        <i class="fas fa-share"></i>
                        Share
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        showDebugStatus(`ERROR in renderPost: ${error.message}`);
        return `<div class="post-card">Error rendering post: ${error.message}</div>`;
    }
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
        <div class="comment-item" id="comment-${comment.id}">
            <div class="comment-avatar">
                ${comment.author.charAt(0).toUpperCase()}
            </div>
            <div class="comment-body">
                <div class="comment-author">${comment.author}</div>
                <div class="comment-content" id="content-${comment.id}">${comment.content}</div>
                <div class="comment-edit-form" id="edit-form-${comment.id}" style="display: none;">
                    <textarea class="comment-edit-textarea" id="edit-textarea-${comment.id}"></textarea>
                    <div class="comment-edit-actions">
                        <button type="button" class="btn-cancel" onclick="cancelEditComment('${comment.id}')">Cancel</button>
                        <button type="button" class="btn-primary" onclick="saveEditComment('${comment.id}')">Save</button>
                    </div>
                </div>
                <div class="comment-meta">
                    <span class="comment-time">${getTimeAgo(comment.timestamp)}</span>
                    <button class="comment-edit-btn" onclick="editComment('${comment.id}')" title="Edit comment">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Set textarea values safely after rendering
    comments.forEach(comment => {
        const textarea = document.getElementById(`edit-textarea-${comment.id}`);
        if (textarea) {
            textarea.value = comment.content;
        }
    });
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

    // Save only the new comment to Snowflake (not all posts)
    updateStatus('Saving comment to database...');
    saveCommentToSnowflake(currentPostId, newComment);

    // Re-render comments
    renderComments(post.comments);

    // Clear input
    commentInput.value = '';

    // Update comment count in the feed
    applyFilters();

    // Show success notification
    showNotification('Comment posted successfully!');
}

function editComment(commentId) {
    // Hide the content and show edit form
    document.getElementById(`content-${commentId}`).style.display = 'none';
    document.getElementById(`edit-form-${commentId}`).style.display = 'block';

    // Focus on the textarea
    const textarea = document.getElementById(`edit-textarea-${commentId}`);
    textarea.focus();
    textarea.select();
}

function cancelEditComment(commentId) {
    // Show the content and hide edit form
    document.getElementById(`content-${commentId}`).style.display = 'block';
    document.getElementById(`edit-form-${commentId}`).style.display = 'none';

    // Reset textarea to original content
    const post = posts.find(p => p.id === currentPostId);
    const comment = post.comments.find(c => c.id === commentId);
    document.getElementById(`edit-textarea-${commentId}`).value = comment.content;
}

async function saveEditComment(commentId) {
    const textarea = document.getElementById(`edit-textarea-${commentId}`);
    const newContent = textarea.value.trim();

    if (!newContent) {
        showNotification('Comment cannot be empty.');
        return;
    }

    // Find the post and comment
    const post = posts.find(p => p.id === currentPostId);
    const comment = post.comments.find(c => c.id === commentId);

    if (!comment) {
        showNotification('Comment not found.');
        return;
    }

    // Update the comment content
    const originalContent = comment.content;
    comment.content = newContent;

    try {
        // Update in Snowflake
        await updateCommentInSnowflake(commentId, comment);

        // Update the display
        document.getElementById(`content-${commentId}`).innerHTML = newContent;
        document.getElementById(`content-${commentId}`).style.display = 'block';
        document.getElementById(`edit-form-${commentId}`).style.display = 'none';

        showNotification('Comment updated successfully!');

    } catch (error) {
        // Revert the change if save failed
        comment.content = originalContent;
        showNotification('Failed to update comment. Please try again.');
        console.error('Error updating comment:', error);
    }
}

async function updateCommentInSnowflake(commentId, comment) {
    try {
        const result = await snowflakeAPI.apiCall('updateComment', {
            commentId: commentId,
            comment: comment
        });

        if (!result.success) {
            throw new Error(result.error || 'Failed to update comment');
        }

        console.log('✅ Comment updated in Snowflake');
        return true;

    } catch (error) {
        console.error('❌ Failed to update comment in Snowflake:', error);
        throw error;
    }
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
    updateFilteredPostsCount(filteredPosts.length);
    updateStatus(`Showing ${filteredPosts.length} posts`);
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

// Status and Debug Panel Functions
function updateStatus(message, type = 'info') {
    const statusIcon = document.getElementById('statusIcon');
    const lastAction = document.getElementById('lastAction');
    const lastUpdate = document.getElementById('lastUpdate');

    if (statusIcon) {
        // Only show green light when successfully connected
        if (type === 'connected' && window.snowflakeAPI && window.snowflakeAPI.isConnected) {
            statusIcon.className = `fas fa-circle connected`;
        } else {
            statusIcon.className = `fas fa-circle ${type}`;
        }
    }

    if (lastAction) {
        lastAction.textContent = message;
        lastAction.className = `debug-value ${type}`;
    }

    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleTimeString();
    }
}

function updateConnectionStatus(status, type = 'info') {
    const connectionElement = document.getElementById('connectionStatus');
    const apiEndpoint = document.getElementById('apiEndpoint');

    if (connectionElement) {
        connectionElement.textContent = status;
        connectionElement.className = `debug-value ${type}`;
    }

    if (apiEndpoint && window.snowflakeAPI) {
        apiEndpoint.textContent = window.snowflakeAPI.baseURL || 'Not configured';
    }
}

function updatePostsCount(count) {
    const postsElement = document.getElementById('postsStatus');
    if (postsElement) {
        postsElement.textContent = count.toString();
    }
}

function updateFilteredPostsCount(count) {
    const filteredPostsElement = document.getElementById('filteredPostsStatus');
    if (filteredPostsElement) {
        filteredPostsElement.textContent = count.toString();
    }
}

function showDebugStatus(message) {
    updateStatus(message);
}

function hideDebugStatus() {
    // Keep the status indicator visible
}

function toggleDebugPanel() {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel.style.display === 'none') {
        debugPanel.style.display = 'block';
        // Update all values when panel opens
        updateAllDebugInfo();
    } else {
        debugPanel.style.display = 'none';
    }
}

function hideDebugPanel() {
    const debugPanel = document.getElementById('debugPanel');
    debugPanel.style.display = 'none';
}

function updateAllDebugInfo() {
    // Update load time
    const loadTime = document.getElementById('loadTime');
    if (loadTime && window.appStartTime) {
        const timeElapsed = Date.now() - window.appStartTime;
        loadTime.textContent = `${timeElapsed}ms`;
    }

    // Update API endpoint
    const apiEndpoint = document.getElementById('apiEndpoint');
    if (apiEndpoint && window.snowflakeAPI) {
        apiEndpoint.textContent = window.snowflakeAPI.baseURL || 'Not configured';
    }

    // Update database configuration details
    updateDatabaseConfigInfo();

    // Update posts counts
    updatePostsCount(posts.length);
    updateFilteredPostsCount(filteredPosts.length);
}

function updateDatabaseConfigInfo() {
    // Database configuration from the API
    const dbConfig = {
        account: 'ZDDMCAD-FGC62251',
        database: 'TABLEAU_EXTENSIONS',
        schema: 'COMMENTS_APP',
        username: 'ARUNCHANDAR99',
        warehouse: 'COMPUTE_WH'
    };

    // Update database configuration fields
    const dbAccount = document.getElementById('dbAccount');
    const dbName = document.getElementById('dbName');
    const dbSchema = document.getElementById('dbSchema');
    const dbUsername = document.getElementById('dbUsername');
    const dbWarehouse = document.getElementById('dbWarehouse');

    if (dbAccount) dbAccount.textContent = dbConfig.account;
    if (dbName) dbName.textContent = dbConfig.database;
    if (dbSchema) dbSchema.textContent = dbConfig.schema;
    if (dbUsername) dbUsername.textContent = dbConfig.username;
    if (dbWarehouse) dbWarehouse.textContent = dbConfig.warehouse;
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
});

// Dashboard Synchronization Functions
let dashboardFilters = {
    month: null,
    year: null,
    isConnected: false
};

async function initializeDashboardSync() {
    try {
        console.log('🔗 Initializing dashboard synchronization...');
        updateStatus('Connecting to dashboard worksheets...', 'info');

        const dashboard = tableau.extensions.dashboardContent.dashboard;
        console.log('📊 Dashboard found:', dashboard.name);

        // Get all worksheets in the dashboard
        const worksheets = dashboard.worksheets;
        console.log('📋 Found', worksheets.length, 'worksheets');

        if (worksheets.length > 0) {
            // Listen to filter changes on all worksheets
            worksheets.forEach(worksheet => {
                console.log('🎯 Adding filter listener to worksheet:', worksheet.name);
                worksheet.addEventListener(tableau.TableauEventType.FilterChanged, onDashboardFilterChanged);
            });

            // Get initial filter values
            await syncWithDashboardFilters();
            dashboardFilters.isConnected = true;
            updateStatus('Connected to dashboard filters', 'connected');

            // Hide manual filter controls since dashboard drives filtering
            hideManualFilters();

        } else {
            console.log('⚠️ No worksheets found - manual filters enabled');
            updateStatus('No dashboard worksheets found - manual filtering enabled', 'warning');
        }

    } catch (error) {
        console.error('❌ Dashboard sync initialization failed:', error);
        updateStatus('Dashboard sync failed - manual filtering enabled', 'warning');
        showManualFilters();
    }
}

async function onDashboardFilterChanged(filterChangedEvent) {
    try {
        console.log('🔄 Dashboard filter changed:', filterChangedEvent);
        updateStatus('Dashboard filter changed - syncing comments...', 'info');

        // Sync with the new filter values
        await syncWithDashboardFilters();

        updateStatus('Comments synced with dashboard filters', 'connected');
    } catch (error) {
        console.error('❌ Error syncing dashboard filters:', error);
        updateStatus('Filter sync error - using manual filters', 'warning');
    }
}

async function syncWithDashboardFilters() {
    try {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        const worksheets = dashboard.worksheets;

        let foundDateFilter = false;

        for (const worksheet of worksheets) {
            console.log('🔍 Checking filters in worksheet:', worksheet.name);

            try {
                // Get all filters from this worksheet
                const filters = await worksheet.getFiltersAsync();
                console.log('📅 Found', filters.length, 'filters in', worksheet.name);

                for (const filter of filters) {
                    console.log('🏷️ Filter:', filter.fieldName, 'Type:', filter.filterType);

                    // Look for date-related filters
                    if (isDateFilter(filter)) {
                        foundDateFilter = true;
                        await extractDateValues(filter);
                        break;
                    }
                }

                if (foundDateFilter) break;

            } catch (filterError) {
                console.log('⚠️ Could not access filters for worksheet:', worksheet.name, filterError.message);
            }
        }

        if (foundDateFilter) {
            console.log('✅ Dashboard date filters applied:', dashboardFilters);
            // Update the comment filters to match dashboard
            updateCommentsFilters();
        } else {
            console.log('📅 No date filters found in dashboard - using all dates');
            dashboardFilters.month = null;
            dashboardFilters.year = null;
            updateCommentsFilters();
        }

    } catch (error) {
        console.error('❌ Error syncing dashboard filters:', error);
    }
}

function isDateFilter(filter) {
    const fieldName = filter.fieldName.toLowerCase();
    const dateKeywords = ['date', 'month', 'year', 'time', 'day', 'quarter'];

    return dateKeywords.some(keyword => fieldName.includes(keyword)) ||
           filter.filterType === tableau.FilterType.Range; // Date ranges are common
}

async function extractDateValues(filter) {
    try {
        console.log('📅 Processing date filter:', filter.fieldName, 'Type:', filter.filterType);

        if (filter.filterType === tableau.FilterType.Range) {
            // Range filter - likely a date range
            const rangeFilter = filter;
            if (rangeFilter.minValue && rangeFilter.maxValue) {
                console.log('📅 Date range:', rangeFilter.minValue, 'to', rangeFilter.maxValue);

                const minDate = new Date(rangeFilter.minValue.value || rangeFilter.minValue);
                const maxDate = new Date(rangeFilter.maxValue.value || rangeFilter.maxValue);

                // If it's within the same month/year, use that
                if (minDate.getFullYear() === maxDate.getFullYear()) {
                    dashboardFilters.year = minDate.getFullYear();

                    if (minDate.getMonth() === maxDate.getMonth()) {
                        dashboardFilters.month = minDate.getMonth() + 1; // Convert to 1-based
                    }
                }
            }
        } else if (filter.filterType === tableau.FilterType.Categorical) {
            // Categorical filter - might be month names or years
            const categoricalFilter = filter;
            if (categoricalFilter.appliedValues && categoricalFilter.appliedValues.length > 0) {
                const values = categoricalFilter.appliedValues.map(v => v.value);
                console.log('📅 Categorical date values:', values);

                // Try to extract year and month from categorical values
                extractFromCategoricalValues(values);
            }
        }

    } catch (error) {
        console.error('❌ Error extracting date values:', error);
    }
}

function extractFromCategoricalValues(values) {
    for (const value of values) {
        const str = String(value).toLowerCase();

        // Check for year (4 digits)
        const yearMatch = str.match(/\b(20\d{2})\b/);
        if (yearMatch) {
            dashboardFilters.year = parseInt(yearMatch[1]);
        }

        // Check for month names
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                           'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = monthNames.findIndex(month => str.includes(month));
        if (monthIndex !== -1) {
            dashboardFilters.month = monthIndex + 1;
        }

        // Check for numeric month
        const monthMatch = str.match(/\b(\d{1,2})\b/);
        if (monthMatch) {
            const month = parseInt(monthMatch[1]);
            if (month >= 1 && month <= 12) {
                dashboardFilters.month = month;
            }
        }
    }
}

function updateCommentsFilters() {
    console.log('🎯 Updating comments filters with dashboard values:', dashboardFilters);

    // Update the filter dropdowns to match dashboard
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');

    if (monthFilter) {
        monthFilter.value = dashboardFilters.month || '';
        monthFilter.style.backgroundColor = dashboardFilters.month ? '#e8f5e8' : '';
    }

    if (yearFilter) {
        yearFilter.value = dashboardFilters.year || '';
        yearFilter.style.backgroundColor = dashboardFilters.year ? '#e8f5e8' : '';
    }

    // Apply the filters
    applyFilters();

    // Show sync indicator
    showSyncIndicator();
}

function hideManualFilters() {
    const filtersContainer = document.querySelector('.filters-container');
    if (filtersContainer) {
        // Add a visual indicator that filters are dashboard-controlled
        let syncIndicator = document.querySelector('.dashboard-sync-indicator');
        if (!syncIndicator) {
            syncIndicator = document.createElement('div');
            syncIndicator.className = 'dashboard-sync-indicator';
            syncIndicator.innerHTML = `
                <div style="background: #e8f5e8; padding: 8px 12px; border-radius: 6px; margin-bottom: 10px; font-size: 0.9rem; color: #28a745;">
                    <i class="fas fa-link"></i> Filters synced with dashboard
                </div>
            `;
            filtersContainer.insertBefore(syncIndicator, filtersContainer.firstChild);
        }

        // Keep filters visible but add sync styling
        const filterSelects = filtersContainer.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.style.pointerEvents = 'none';
            select.style.opacity = '0.7';
            select.title = 'Controlled by dashboard filters';
        });
    }
}

function showManualFilters() {
    const filtersContainer = document.querySelector('.filters-container');
    if (filtersContainer) {
        // Remove sync indicator
        const syncIndicator = document.querySelector('.dashboard-sync-indicator');
        if (syncIndicator) {
            syncIndicator.remove();
        }

        // Restore manual control
        const filterSelects = filtersContainer.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.style.pointerEvents = 'auto';
            select.style.opacity = '1';
            select.title = '';
        });
    }
}

function showSyncIndicator() {
    // Brief visual feedback that sync occurred
    const indicator = document.querySelector('.dashboard-sync-indicator');
    if (indicator) {
        indicator.style.background = '#d4edda';
        setTimeout(() => {
            if (indicator) indicator.style.background = '#e8f5e8';
        }, 500);
    }
}

// Add notification animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
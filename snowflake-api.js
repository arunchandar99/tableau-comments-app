// Snowflake API Layer for Comments App
// This replaces localStorage with Snowflake database calls

class SnowflakeAPI {
    constructor() {
        this.config = SNOWFLAKE_CONFIG;
        this.isAuthenticated = false;
        this.cache = {
            posts: [],
            lastFetch: 0,
            cacheDuration: 30000 // 30 seconds
        };
    }

    // Initialize connection
    async initialize() {
        try {
            if (this.config.authMethod === 'oauth') {
                await this.authenticateOAuth();
            }
            this.isAuthenticated = true;
            console.log('Snowflake API initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Snowflake API:', error);
            // Fallback to localStorage if Snowflake fails
            this.isAuthenticated = false;
        }
    }

    // OAuth authentication
    async authenticateOAuth() {
        // Implementation depends on your OAuth setup
        // This is a placeholder for OAuth flow
        return new Promise((resolve, reject) => {
            // In a real implementation, you'd redirect to OAuth provider
            setTimeout(() => resolve(), 1000);
        });
    }

    // API call wrapper
    async apiCall(endpoint, method = 'GET', data = null) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Snowflake');
        }

        const url = `${SNOWFLAKE_API.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        return await response.json();
    }

    // Get authentication token
    getAuthToken() {
        // Return your authentication token
        // This would come from OAuth flow or API key
        return localStorage.getItem('snowflake_auth_token') || 'demo_token';
    }

    // Load posts from Snowflake
    async loadPosts() {
        try {
            // Check cache first
            const now = Date.now();
            if (this.cache.posts.length > 0 && (now - this.cache.lastFetch) < this.cache.cacheDuration) {
                return this.cache.posts;
            }

            if (this.isAuthenticated) {
                // Load from Snowflake
                const response = await this.apiCall(SNOWFLAKE_API.endpoints.posts);

                // Transform Snowflake data to app format
                const posts = response.data.map(row => ({
                    id: row.ID,
                    type: row.POST_TYPE,
                    metricValue: row.METRIC_VALUE,
                    metricLabel: row.METRIC_LABEL,
                    content: row.CONTENT, // Rich HTML content preserved
                    author: row.AUTHOR,
                    timestamp: row.TIMESTAMP_MS,
                    likes: row.LIKES || 0,
                    comments: [] // Will be loaded separately
                }));

                // Load comments for each post
                for (let post of posts) {
                    post.comments = await this.loadComments(post.id);
                }

                // Update cache
                this.cache.posts = posts;
                this.cache.lastFetch = now;

                return posts;
            } else {
                // Fallback to localStorage
                return this.loadPostsFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            // Fallback to localStorage
            return this.loadPostsFromLocalStorage();
        }
    }

    // Save posts to Snowflake
    async savePosts(posts) {
        try {
            if (this.isAuthenticated) {
                // Save to Snowflake
                for (let post of posts) {
                    await this.savePost(post);
                }

                // Update cache
                this.cache.posts = posts;
                this.cache.lastFetch = Date.now();
            } else {
                // Fallback to localStorage
                this.savePostsToLocalStorage(posts);
            }
        } catch (error) {
            console.error('Error saving posts:', error);
            // Fallback to localStorage
            this.savePostsToLocalStorage(posts);
        }
    }

    // Save individual post
    async savePost(post) {
        const postData = {
            id: post.id,
            post_type: post.type,
            metric_value: post.metricValue,
            metric_label: post.metricLabel,
            content: post.content, // Rich HTML preserved
            author: post.author,
            timestamp_ms: post.timestamp,
            likes: post.likes || 0
        };

        await this.apiCall(SNOWFLAKE_API.endpoints.posts, 'POST', postData);

        // Save comments separately
        if (post.comments && post.comments.length > 0) {
            for (let comment of post.comments) {
                await this.saveComment(post.id, comment);
            }
        }
    }

    // Load comments for a specific post
    async loadComments(postId) {
        try {
            if (this.isAuthenticated) {
                const response = await this.apiCall(`${SNOWFLAKE_API.endpoints.comments}?post_id=${postId}`);
                return response.data.map(row => ({
                    id: row.ID,
                    author: row.AUTHOR,
                    content: row.CONTENT,
                    timestamp: row.TIMESTAMP_MS
                }));
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
        return [];
    }

    // Save comment
    async saveComment(postId, comment) {
        const commentData = {
            id: comment.id,
            post_id: postId,
            author: comment.author,
            content: comment.content, // Plain text for comments
            timestamp_ms: comment.timestamp
        };

        await this.apiCall(SNOWFLAKE_API.endpoints.comments, 'POST', commentData);
    }

    // Delete post
    async deletePost(postId) {
        try {
            if (this.isAuthenticated) {
                await this.apiCall(`${SNOWFLAKE_API.endpoints.posts}/${postId}`, 'DELETE');

                // Update cache
                this.cache.posts = this.cache.posts.filter(p => p.id !== postId);
            } else {
                // Fallback to localStorage
                const posts = this.loadPostsFromLocalStorage();
                const updatedPosts = posts.filter(p => p.id !== postId);
                this.savePostsToLocalStorage(updatedPosts);
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }

    // LocalStorage fallback methods
    loadPostsFromLocalStorage() {
        try {
            return JSON.parse(localStorage.getItem('commentsPosts') || '[]');
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    }

    savePostsToLocalStorage(posts) {
        try {
            localStorage.setItem('commentsPosts', JSON.stringify(posts));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
}

// Global instance
const snowflakeAPI = new SnowflakeAPI();
/**
 * Main Application Controller
 * Orchestrates all components and handles application lifecycle
 */

import { APP_CONFIG, STATUS_TYPES } from './config/app-config.js';
import { logger } from './utils/logger.js';
import { showNotification, debounce } from './utils/helpers.js';
import { themeEngine } from './utils/theme-engine.js';

// Services
import { snowflakeService } from './services/snowflake-service.js';
import { storageService } from './services/storage-service.js';

// Components
import { PostComponent } from './components/post-component.js';
import { CommentComponent } from './components/comment-component.js';
import { StatusComponent } from './components/status-component.js';
import { SettingsComponent } from './components/settings-component.js';

class CommentsApp {
    constructor() {
        this.isInitialized = false;
        this.components = {};
        this.eventListeners = new Map();

        // Bind methods to maintain context
        this.handleNewPostSubmit = this.handleNewPostSubmit.bind(this);
        this.applyFilters = debounce(this.applyFilters.bind(this), APP_CONFIG.ui.debounceDelay);
        this.clearFilters = this.clearFilters.bind(this);
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            logger.info(`Initializing ${APP_CONFIG.name} v${APP_CONFIG.version}...`);
            const initStartTime = Date.now();

            // Initialize Tableau Extensions API
            await this.initializeTableau();

            // Initialize services
            await this.initializeServices();

            // Initialize components
            this.initializeComponents();

            // Setup UI and event listeners
            this.setupUI();
            this.setupEventListeners();

            // Load initial data
            await this.loadInitialData();

            // Mark as initialized
            this.isInitialized = true;

            logger.performance('Application initialization', initStartTime);
            logger.success(`${APP_CONFIG.name} initialized successfully`);

            // Update final status
            const isConnected = snowflakeService.isConnected;
            console.log(`DEBUG: snowflakeService.isConnected = ${isConnected}`); // Debug log
            logger.info(`Final status update: isConnected=${isConnected}`);

            this.components.status.updateStatus(
                isConnected ? 'App ready - Snowflake connected' : 'App ready - Using local storage only',
                isConnected ? STATUS_TYPES.CONNECTED : STATUS_TYPES.WARNING
            );

        } catch (error) {
            logger.error('Application initialization failed:', error);
            this.components.status?.updateStatus('Initialization failed: ' + error.message, STATUS_TYPES.ERROR);
            showNotification('App initialization failed', 'error');
            throw error;
        }
    }

    /**
     * Initialize Tableau Extensions API
     */
    async initializeTableau() {
        try {
            if (typeof tableau === 'undefined') {
                throw new Error('Tableau Extensions API not available');
            }

            await tableau.extensions.initializeAsync();
            logger.success('Tableau Extensions API initialized');
        } catch (error) {
            logger.error('Tableau initialization failed:', error);
            throw new Error('Failed to initialize Tableau Extensions API: ' + error.message);
        }
    }

    /**
     * Initialize services
     */
    async initializeServices() {
        try {
            logger.info('Initializing services...');

            // Initialize Snowflake service
            this.components.status?.updateStatus('Connecting to Snowflake...', STATUS_TYPES.INFO);
            const isConnected = await snowflakeService.initialize();

            if (isConnected) {
                this.components.status?.updateConnectionStatus('Connected to Snowflake', STATUS_TYPES.CONNECTED);
                logger.success('Snowflake service initialized');
            } else {
                this.components.status?.updateConnectionStatus('Connection Failed', STATUS_TYPES.ERROR);
                logger.warn('Snowflake service failed to connect - using fallback');
            }

            logger.success('Services initialized');
        } catch (error) {
            logger.error('Services initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        try {
            logger.info('Initializing components...');

            // Initialize components in dependency order
            this.components.status = new StatusComponent(snowflakeService, storageService);
            this.components.post = new PostComponent(snowflakeService, storageService);
            this.components.comment = new CommentComponent(snowflakeService, this.components.post);
            this.components.settings = new SettingsComponent();

            // Make components globally available for HTML onclick handlers
            window.postComponent = this.components.post;
            window.commentComponent = this.components.comment;
            window.statusComponent = this.components.status;
            window.settingsComponent = this.components.settings;

            // Make app instance globally available for UI refresh
            window.commentsApp = this;

            // Initialize status component
            this.components.status.initialize();

            logger.success('Components initialized');
        } catch (error) {
            logger.error('Components initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup UI elements
     */
    setupUI() {
        try {
            logger.info('Setting up UI...');

            // Setup rich text editor
            this.setupRichTextEditor();

            // Update UI elements
            this.updateResultsCounter();

            logger.success('UI setup complete');
        } catch (error) {
            logger.error('UI setup failed:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        try {
            logger.info('Setting up event listeners...');

            // New Post Button
            this.addEventListenerSafe('newPostBtn', 'click', this.openNewPostModal.bind(this));

            // Modal Controls
            this.addEventListenerSafe('closeModalBtn', 'click', this.closeNewPostModal.bind(this));
            this.addEventListenerSafe('cancelPostBtn', 'click', this.closeNewPostModal.bind(this));
            this.addEventListenerSafe('modalOverlay', 'click', this.handleModalOverlayClick.bind(this));

            // Form Submission
            this.addEventListenerSafe('newPostForm', 'submit', this.handleNewPostSubmit);

            // Filters
            this.addEventListenerSafe('monthFilter', 'change', this.applyFilters);
            this.addEventListenerSafe('yearFilter', 'change', this.applyFilters);
            this.addEventListenerSafe('typeFilter', 'change', this.applyFilters);
            this.addEventListenerSafe('clearFiltersBtn', 'click', this.clearFilters);

            logger.success('Event listeners setup complete');
        } catch (error) {
            logger.error('Event listeners setup failed:', error);
        }
    }

    /**
     * Safely add event listener with error handling
     */
    addEventListenerSafe(elementId, event, handler) {
        try {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
                this.eventListeners.set(`${elementId}-${event}`, { element, event, handler });
                logger.debug(`Event listener added: ${elementId}.${event}`);
            } else {
                logger.warn(`Element not found for event listener: ${elementId}`);
            }
        } catch (error) {
            logger.error(`Failed to add event listener for ${elementId}.${event}:`, error);
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            logger.info('Loading initial data...');
            this.components.status.updateStatus('Loading posts from storage...', STATUS_TYPES.INFO);

            // Load posts
            const posts = await this.components.post.loadPosts();
            this.components.status.updatePostsCount(posts.length);

            // Apply initial filters
            this.applyFilters();

            // Render feed
            this.renderFeed();

            logger.success(`Initial data loaded: ${posts.length} posts`);
        } catch (error) {
            logger.error('Failed to load initial data:', error);
            throw error;
        }
    }

    /**
     * Open new post modal
     */
    openNewPostModal() {
        try {
            const modal = document.getElementById('modalOverlay');
            if (modal) {
                modal.style.display = 'flex';
                document.getElementById('postContent')?.focus();
                this.setupPostRichTextEditor();
                logger.debug('New post modal opened');
            }
        } catch (error) {
            logger.error('Failed to open new post modal:', error);
        }
    }

    /**
     * Close new post modal
     */
    closeNewPostModal() {
        try {
            const modal = document.getElementById('modalOverlay');
            if (modal) {
                modal.style.display = 'none';
                document.getElementById('newPostForm')?.reset();
                const postContent = document.getElementById('postContent');
                if (postContent) {
                    postContent.innerHTML = '';
                }
                logger.debug('New post modal closed');
            }
        } catch (error) {
            logger.error('Failed to close new post modal:', error);
        }
    }

    /**
     * Handle modal overlay click
     */
    handleModalOverlayClick(e) {
        if (e.target === e.currentTarget) {
            this.closeNewPostModal();
        }
    }

    /**
     * Handle new post form submission
     */
    async handleNewPostSubmit(e) {
        try {
            e.preventDefault();

            const formData = {
                type: document.getElementById('postType')?.value,
                metricValue: document.getElementById('metricValue')?.value,
                metricLabel: document.getElementById('metricLabel')?.value,
                content: document.getElementById('postContent')?.innerHTML
            };

            logger.debug('Submitting new post:', formData);

            // Create post using post component
            const newPost = await this.components.post.createPost(formData);

            if (newPost) {
                // Close modal and clear filters to show new post
                this.closeNewPostModal();
                this.clearFilters();
                this.components.status.updateStatus('New post created successfully', STATUS_TYPES.SUCCESS);
            }

        } catch (error) {
            logger.error('Failed to submit new post:', error);
            showNotification('Failed to create post', 'error');
        }
    }

    /**
     * Apply filters to posts
     */
    applyFilters() {
        try {
            const monthFilter = document.getElementById('monthFilter')?.value || '';
            const yearFilter = document.getElementById('yearFilter')?.value || '';
            const typeFilter = document.getElementById('typeFilter')?.value || '';

            logger.debug('Applying filters:', { monthFilter, yearFilter, typeFilter });

            // Filter posts using post component
            const filteredPosts = this.components.post.filterPosts(monthFilter, yearFilter, typeFilter);

            // Update UI
            this.renderFeed();
            this.updateResultsCounter();
            this.components.status.updateFilteredPostsCount(filteredPosts.length);
            // Don't override connection status, just update the count display
            logger.debug(`Filter applied: Showing ${filteredPosts.length} posts`);

        } catch (error) {
            logger.error('Failed to apply filters:', error);
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        try {
            ['monthFilter', 'yearFilter', 'typeFilter'].forEach(id => {
                const element = document.getElementById(id);
                if (element) element.value = '';
            });

            this.applyFilters();
            // Don't override connection status when clearing filters
            logger.debug('Filters cleared');
        } catch (error) {
            logger.error('Failed to clear filters:', error);
        }
    }

    /**
     * Render the posts feed
     */
    renderFeed() {
        try {
            const feedContainer = document.getElementById('feedContainer');
            const loadingSpinner = document.getElementById('loadingSpinner');
            const emptyState = document.getElementById('emptyState');

            if (!feedContainer) {
                logger.error('Feed container not found');
                return;
            }

            const filteredPosts = this.components.post.filteredPosts;

            // Show loading
            if (loadingSpinner) loadingSpinner.style.display = 'flex';
            if (emptyState) emptyState.style.display = 'none';
            feedContainer.innerHTML = '';

            // Simulate loading delay for better UX
            setTimeout(() => {
                if (loadingSpinner) loadingSpinner.style.display = 'none';

                if (filteredPosts.length === 0) {
                    if (emptyState) emptyState.style.display = 'flex';
                    logger.debug('No posts to display - showing empty state');
                } else {
                    const renderedHTML = filteredPosts
                        .map(post => this.components.post.renderPost(post))
                        .join('');
                    feedContainer.innerHTML = renderedHTML;
                    logger.debug(`Rendered ${filteredPosts.length} posts`);
                }
            }, APP_CONFIG.ui.animationSpeed);

        } catch (error) {
            logger.error('Failed to render feed:', error);
            const feedContainer = document.getElementById('feedContainer');
            if (feedContainer) {
                feedContainer.innerHTML = '<div class="error-state">Error loading posts. Please refresh.</div>';
            }
        }
    }

    /**
     * Update results counter
     */
    updateResultsCounter() {
        try {
            const counter = document.getElementById('resultsCounter');
            if (counter) {
                const count = this.components.post.filteredPosts.length;
                counter.textContent = `Showing ${count} post${count !== 1 ? 's' : ''}`;
            }
        } catch (error) {
            logger.error('Failed to update results counter:', error);
        }
    }

    /**
     * Setup rich text editor for posts
     */
    setupRichTextEditor() {
        try {
            const toolbar = document.querySelectorAll('.toolbar-btn');

            toolbar.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const command = btn.getAttribute('data-command');
                    document.execCommand(command, false, null);
                    document.getElementById('postContent')?.focus();
                });
            });

            // Font size selector
            const fontSizeSelect = document.getElementById('fontSizeSelect');
            if (fontSizeSelect) {
                fontSizeSelect.addEventListener('change', (e) => {
                    document.execCommand('fontSize', false, e.target.value);
                    document.getElementById('postContent')?.focus();
                });
            }

            logger.debug('Rich text editor setup complete');
        } catch (error) {
            logger.error('Failed to setup rich text editor:', error);
        }
    }

    /**
     * Setup enhanced rich text editor for post creation
     */
    setupPostRichTextEditor() {
        try {
            const editor = document.getElementById('postContent');
            const textColorPicker = document.getElementById('postTextColorPicker');
            const bgColorPicker = document.getElementById('postBgColorPicker');

            if (!editor || !textColorPicker || !bgColorPicker) return;

            let savedRange = null;

            const saveSelection = () => {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    savedRange = selection.getRangeAt(0).cloneRange();
                }
            };

            const restoreSelection = () => {
                if (savedRange) {
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(savedRange);
                }
            };

            editor.addEventListener('mouseup', saveSelection);
            editor.addEventListener('keyup', saveSelection);

            textColorPicker.addEventListener('input', (e) => {
                if (!savedRange) {
                    showNotification('Please select some text first', 'warning');
                    return;
                }
                restoreSelection();
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('foreColor', false, e.target.value);
                setTimeout(() => window.getSelection().removeAllRanges(), 100);
            });

            bgColorPicker.addEventListener('input', (e) => {
                if (!savedRange) {
                    showNotification('Please select some text first', 'warning');
                    return;
                }
                restoreSelection();
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('hiliteColor', false, e.target.value);
                setTimeout(() => window.getSelection().removeAllRanges(), 100);
            });

            logger.debug('Enhanced rich text editor setup complete');
        } catch (error) {
            logger.error('Failed to setup enhanced rich text editor:', error);
        }
    }

    /**
     * Toggle filters visibility
     */
    toggleFilters() {
        try {
            const filtersContainer = document.getElementById('filtersContainer');
            const filterArrow = document.getElementById('filterArrow');
            const feedContainer = document.getElementById('feedContainer');

            if (!filtersContainer || !filterArrow || !feedContainer) {
                logger.warn('Filters elements not found');
                return;
            }

            const isVisible = filtersContainer.style.display !== 'none';

            if (isVisible) {
                filtersContainer.style.display = 'none';
                filterArrow.classList.remove('rotated');
                feedContainer.classList.remove('with-filters');
                logger.debug('Filters hidden');
            } else {
                filtersContainer.style.display = 'block';
                filterArrow.classList.add('rotated');
                feedContainer.classList.add('with-filters');
                logger.debug('Filters shown');
            }
        } catch (error) {
            logger.error('Failed to toggle filters:', error);
        }
    }

    /**
     * Cleanup application resources
     */
    cleanup() {
        try {
            logger.info('Cleaning up application resources...');

            // Remove event listeners
            this.eventListeners.forEach(({ element, event, handler }, key) => {
                try {
                    element.removeEventListener(event, handler);
                    logger.debug(`Removed event listener: ${key}`);
                } catch (error) {
                    logger.error(`Failed to remove event listener ${key}:`, error);
                }
            });

            this.eventListeners.clear();

            // Clear global references
            delete window.postComponent;
            delete window.commentComponent;
            delete window.statusComponent;
            delete window.settingsComponent;
            delete window.commentsApp;

            logger.success('Application cleanup complete');
        } catch (error) {
            logger.error('Application cleanup failed:', error);
        }
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            components: Object.keys(this.components),
            postsCount: this.components.post?.posts.length || 0,
            filteredPostsCount: this.components.post?.filteredPosts.length || 0,
            snowflakeConnected: snowflakeService.isConnected,
            version: APP_CONFIG.version
        };
    }
}

// Create and initialize the application
const app = new CommentsApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.initialize();
    } catch (error) {
        logger.error('Failed to initialize application:', error);
        console.error('Application initialization failed:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    app.cleanup();
});

// Export for debugging
window.commentsApp = app;

export default app;
/**
 * Settings Component
 * Handles Snowflake connection settings and configuration
 */

import { APP_CONFIG } from '../config/app-config.js';
import { logger } from '../utils/logger.js';
import { showNotification } from '../utils/helpers.js';

export class SettingsComponent {
    constructor(snowflakeService) {
        this.snowflakeService = snowflakeService;
        this.isSettingsOpen = false;
        this.connectionTesting = false;
        this.setupEventListeners();
    }

    /**
     * Toggle settings modal
     */
    toggleSettings() {
        try {
            const settingsModal = document.getElementById('settingsModal');
            const settingsArrow = document.getElementById('settingsArrow');

            if (!settingsModal || !settingsArrow) {
                logger.warn('Settings elements not found');
                return;
            }

            const isVisible = settingsModal.style.display !== 'none';

            if (isVisible) {
                settingsModal.style.display = 'none';
                settingsArrow.classList.remove('rotated');
                this.isSettingsOpen = false;
                logger.debug('Settings modal hidden');
            } else {
                settingsModal.style.display = 'flex';
                settingsArrow.classList.add('rotated');
                this.isSettingsOpen = true;
                this.loadSavedCredentials();
                logger.debug('Settings modal shown');
            }
        } catch (error) {
            logger.error('Failed to toggle settings:', error);
        }
    }

    /**
     * Load saved credentials into form
     */
    loadSavedCredentials() {
        try {
            const credentials = this.getStoredCredentials();
            if (credentials) {
                document.getElementById('sfAccount').value = credentials.account || '';
                document.getElementById('sfUsername').value = credentials.username || '';
                document.getElementById('sfPassword').value = ''; // Never populate password
                document.getElementById('sfWarehouse').value = credentials.warehouse || '';
                document.getElementById('sfDatabase').value = credentials.database || '';
                document.getElementById('sfSchema').value = credentials.schema || '';

                // Set storage type radio
                const storageType = credentials.storageType || 'session';
                document.querySelector(`input[name="storageType"][value="${storageType}"]`).checked = true;

                // Update connection status
                this.updateConnectionStatus('info', 'Saved credentials loaded. Click "Test & Connect" to verify.');
                logger.debug('Saved credentials loaded');
            } else {
                this.updateConnectionStatus('info', 'Configure your Snowflake connection to enable data storage');
            }
        } catch (error) {
            logger.error('Failed to load saved credentials:', error);
        }
    }

    /**
     * Get stored credentials from browser storage
     */
    getStoredCredentials() {
        try {
            // Try sessionStorage first, then localStorage
            let credentials = JSON.parse(sessionStorage.getItem('snowflake_credentials'));
            if (!credentials) {
                credentials = JSON.parse(localStorage.getItem('snowflake_credentials'));
            }
            return credentials;
        } catch (error) {
            logger.error('Failed to get stored credentials:', error);
            return null;
        }
    }

    /**
     * Store credentials securely
     */
    storeCredentials(credentials, storageType = 'session') {
        try {
            const dataToStore = {
                ...credentials,
                storageType,
                timestamp: Date.now()
            };

            if (storageType === 'persistent') {
                localStorage.setItem('snowflake_credentials', JSON.stringify(dataToStore));
                sessionStorage.removeItem('snowflake_credentials');
            } else {
                sessionStorage.setItem('snowflake_credentials', JSON.stringify(dataToStore));
                localStorage.removeItem('snowflake_credentials');
            }

            logger.debug('Credentials stored successfully');
        } catch (error) {
            logger.error('Failed to store credentials:', error);
        }
    }

    /**
     * Update connection status display
     */
    updateConnectionStatus(type, message) {
        try {
            const statusDiv = document.getElementById('connectionStatus');
            const messageDiv = document.getElementById('connectionMessage');

            if (statusDiv && messageDiv) {
                // Remove all status classes
                statusDiv.classList.remove('success', 'error', 'info');
                statusDiv.classList.add(type);

                // Update icon and message
                const iconClass = {
                    success: 'fa-check-circle',
                    error: 'fa-exclamation-circle',
                    info: 'fa-info-circle'
                };

                messageDiv.innerHTML = `<i class="fas ${iconClass[type]}"></i> ${message}`;
            }
        } catch (error) {
            logger.error('Failed to update connection status:', error);
        }
    }

    /**
     * Test Snowflake connection
     */
    async testConnection(credentials) {
        try {
            this.connectionTesting = true;
            this.updateConnectionStatus('info', 'Testing connection...');

            // Update button state
            const connectBtn = document.getElementById('connectBtn');
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
                connectBtn.disabled = true;
            }

            // Initialize snowflake service with new credentials
            const isConnected = await this.snowflakeService.initializeWithCredentials(credentials);

            if (isConnected) {
                this.updateConnectionStatus('success', 'Connection successful! Snowflake is ready for data storage.');
                showNotification('Connected to Snowflake successfully!', 'success');
                logger.success('Snowflake connection test successful');

                // Update global status indicator
                if (window.statusComponent) {
                    window.statusComponent.updateConnectionStatus('Connected to Snowflake', 'connected');
                }

                return true;
            } else {
                this.updateConnectionStatus('error', 'Connection failed. Please check your credentials and try again.');
                showNotification('Snowflake connection failed', 'error');
                logger.error('Snowflake connection test failed');
                return false;
            }
        } catch (error) {
            logger.error('Connection test error:', error);
            this.updateConnectionStatus('error', `Connection error: ${error.message}`);
            showNotification('Connection test failed', 'error');
            return false;
        } finally {
            this.connectionTesting = false;

            // Reset button state
            const connectBtn = document.getElementById('connectBtn');
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-plug"></i> Test & Connect';
                connectBtn.disabled = false;
            }
        }
    }

    /**
     * Handle connection form submission
     */
    async handleConnectionSubmit(e) {
        try {
            e.preventDefault();

            // Get form data
            const credentials = {
                account: document.getElementById('sfAccount').value.trim(),
                username: document.getElementById('sfUsername').value.trim(),
                password: document.getElementById('sfPassword').value,
                warehouse: document.getElementById('sfWarehouse').value.trim(),
                database: document.getElementById('sfDatabase').value.trim(),
                schema: document.getElementById('sfSchema').value.trim()
            };

            const storageType = document.querySelector('input[name="storageType"]:checked').value;

            // Validate required fields
            const requiredFields = ['account', 'username', 'password', 'warehouse', 'database', 'schema'];
            const missingFields = requiredFields.filter(field => !credentials[field]);

            if (missingFields.length > 0) {
                this.updateConnectionStatus('error', `Please fill in all required fields: ${missingFields.join(', ')}`);
                return;
            }

            // Test connection
            const isConnected = await this.testConnection(credentials);

            if (isConnected) {
                // Store credentials (without password for security)
                const credentialsToStore = { ...credentials };
                delete credentialsToStore.password; // Don't store password
                this.storeCredentials(credentialsToStore, storageType);

                // Close modal after successful connection
                setTimeout(() => {
                    this.toggleSettings();
                }, 2000);
            }
        } catch (error) {
            logger.error('Failed to handle connection submission:', error);
            this.updateConnectionStatus('error', 'Failed to process connection request');
        }
    }

    /**
     * Clear stored credentials
     */
    clearStoredCredentials() {
        try {
            sessionStorage.removeItem('snowflake_credentials');
            localStorage.removeItem('snowflake_credentials');

            // Reset form
            document.getElementById('snowflakeConnectionForm').reset();

            this.updateConnectionStatus('info', 'Credentials cleared. Configure your Snowflake connection to enable data storage.');
            showNotification('Credentials cleared successfully', 'success');

            logger.debug('Stored credentials cleared');
        } catch (error) {
            logger.error('Failed to clear stored credentials:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        try {
            // Settings modal events
            document.addEventListener('click', (e) => {
                // Close modal
                if (e.target.matches('#closeSettingsBtn, #cancelSettingsBtn')) {
                    this.toggleSettings();
                }

                // Close modal when clicking overlay
                if (e.target.matches('#settingsModal')) {
                    this.toggleSettings();
                }
            });

            // Form submission
            document.addEventListener('submit', (e) => {
                if (e.target.matches('#snowflakeConnectionForm')) {
                    this.handleConnectionSubmit(e);
                }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Close settings with Escape
                if (e.key === 'Escape' && this.isSettingsOpen) {
                    this.toggleSettings();
                }
            });

            logger.debug('Settings component event listeners setup');
        } catch (error) {
            logger.error('Failed to setup event listeners:', error);
        }
    }

    /**
     * Get connection status for other components
     */
    getConnectionStatus() {
        try {
            const credentials = this.getStoredCredentials();
            return {
                hasCredentials: !!credentials,
                isConnected: this.snowflakeService?.isConnected || false,
                lastConnected: credentials?.timestamp || null
            };
        } catch (error) {
            logger.error('Failed to get connection status:', error);
            return {
                hasCredentials: false,
                isConnected: false,
                lastConnected: null
            };
        }
    }
}
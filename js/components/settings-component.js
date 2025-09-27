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
     * Handle Step 1: Authentication
     */
    async handleAuthentication() {
        try {
            // Get basic auth data
            const authData = {
                account: document.getElementById('sfAccount').value.trim(),
                username: document.getElementById('sfUsername').value.trim(),
                password: document.getElementById('sfPassword').value,
                warehouse: document.getElementById('sfWarehouse').value.trim()
            };

            // Validate required fields
            const requiredFields = ['account', 'username', 'password', 'warehouse'];
            const missingFields = requiredFields.filter(field => !authData[field]);

            if (missingFields.length > 0) {
                this.updateConnectionStatus('error', `Please fill in: ${missingFields.join(', ')}`);
                return;
            }

            this.updateConnectionStatus('info', 'Authenticating and loading resources...');

            // Update button state
            const authBtn = document.getElementById('authenticateBtn');
            authBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
            authBtn.disabled = true;

            // Test authentication and load resources
            const result = await this.authenticateAndLoadResources(authData);

            if (result.success) {
                // Store auth data temporarily
                this.tempAuthData = authData;

                // Populate dropdowns
                this.populateResourceDropdowns(result.resources);

                // Move to step 2
                this.showStep(2);

                this.updateConnectionStatus('success', 'Authentication successful! Please select database and schema.');
            } else {
                this.updateConnectionStatus('error', `Authentication failed: ${result.error}`);
            }
        } catch (error) {
            logger.error('Authentication failed:', error);
            this.updateConnectionStatus('error', 'Authentication failed. Please check your credentials.');
        } finally {
            // Reset button
            const authBtn = document.getElementById('authenticateBtn');
            authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Authenticate & Load Resources';
            authBtn.disabled = false;
        }
    }

    /**
     * Authenticate and load available resources
     */
    async authenticateAndLoadResources(authData) {
        try {
            const response = await this.snowflakeService.apiCall('load-resources', 'POST', {
                credentials: authData
            });
            return response;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Populate resource dropdowns
     */
    populateResourceDropdowns(resources) {
        try {
            // Populate databases
            const dbSelect = document.getElementById('sfDatabase');
            dbSelect.innerHTML = '<option value="">Select database...</option>';
            resources.databases.forEach(db => {
                dbSelect.innerHTML += `<option value="${db}">${db}</option>`;
            });

            // Populate warehouses (update the warehouse dropdown too)
            const whSelect = document.getElementById('sfWarehouse');
            if (resources.warehouses && resources.warehouses.length > 0) {
                whSelect.innerHTML = '<option value="">Select warehouse...</option>';
                resources.warehouses.forEach(wh => {
                    whSelect.innerHTML += `<option value="${wh}">${wh}</option>`;
                });
                // Select the current warehouse
                whSelect.value = this.tempAuthData.warehouse;
            }

            // Setup database change handler
            dbSelect.addEventListener('change', (e) => {
                this.loadSchemas(e.target.value);
            });

            logger.debug('Resource dropdowns populated');
        } catch (error) {
            logger.error('Failed to populate dropdowns:', error);
        }
    }

    /**
     * Load schemas for selected database
     */
    async loadSchemas(database) {
        try {
            if (!database) {
                const schemaSelect = document.getElementById('sfSchema');
                schemaSelect.innerHTML = '<option value="">Select schema...</option>';
                return;
            }

            const schemaSelect = document.getElementById('sfSchema');
            schemaSelect.innerHTML = '<option value="">Loading schemas...</option>';

            const result = await this.snowflakeService.apiCall('load-schemas', 'POST', {
                credentials: { ...this.tempAuthData, database }
            });

            if (result.success) {
                schemaSelect.innerHTML = '<option value="">Select schema...</option>';
                result.schemas.forEach(schema => {
                    schemaSelect.innerHTML += `<option value="${schema}">${schema}</option>`;
                });
            } else {
                schemaSelect.innerHTML = '<option value="">Failed to load schemas</option>';
            }
        } catch (error) {
            logger.error('Failed to load schemas:', error);
            const schemaSelect = document.getElementById('sfSchema');
            schemaSelect.innerHTML = '<option value="">Error loading schemas</option>';
        }
    }

    /**
     * Show specific step
     */
    showStep(stepNumber) {
        try {
            // Hide all steps
            document.querySelectorAll('.connection-step').forEach(step => {
                step.style.display = 'none';
                step.classList.remove('active');
            });

            // Show target step
            const targetStep = document.getElementById(`step${stepNumber}`);
            if (targetStep) {
                targetStep.style.display = 'block';
                targetStep.classList.add('active');
            }

            // Show/hide final connect button
            const finalBtn = document.getElementById('finalConnectBtn');
            if (finalBtn) {
                finalBtn.style.display = stepNumber === 2 ? 'block' : 'none';
            }

            logger.debug(`Switched to step ${stepNumber}`);
        } catch (error) {
            logger.error('Failed to show step:', error);
        }
    }

    /**
     * Handle final connection setup
     */
    async handleFinalConnection() {
        try {
            const database = document.getElementById('sfDatabase').value;
            const schema = document.getElementById('sfSchema').value;

            if (!database || !schema) {
                this.updateConnectionStatus('error', 'Please select both database and schema');
                return;
            }

            // Complete credentials
            const fullCredentials = {
                ...this.tempAuthData,
                database,
                schema
            };

            this.updateConnectionStatus('info', 'Setting up tables and finalizing connection...');

            // Update button state
            const finalBtn = document.getElementById('finalConnectBtn');
            finalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting up...';
            finalBtn.disabled = true;

            // Test full connection and setup tables
            const result = await this.snowflakeService.apiCall('setup-tables', 'POST', {
                credentials: fullCredentials
            });

            if (result.success) {
                // Initialize service with new credentials
                await this.snowflakeService.initializeWithCredentials(fullCredentials);

                // Store credentials
                const storageType = document.querySelector('input[name="storageType"]:checked').value;
                const credentialsToStore = { ...fullCredentials };
                delete credentialsToStore.password;
                this.storeCredentials(credentialsToStore, storageType);

                this.updateConnectionStatus('success', 'Connection established! Tables are ready for use.');

                // Update global status
                if (window.statusComponent) {
                    window.statusComponent.updateConnectionStatus('Connected to Snowflake', 'connected');
                }

                // Close modal after success
                setTimeout(() => {
                    this.toggleSettings();
                }, 2000);

            } else {
                this.updateConnectionStatus('error', `Setup failed: ${result.error}`);
            }
        } catch (error) {
            logger.error('Final connection failed:', error);
            this.updateConnectionStatus('error', 'Connection setup failed');
        } finally {
            // Reset button
            const finalBtn = document.getElementById('finalConnectBtn');
            finalBtn.innerHTML = '<i class="fas fa-check"></i> Complete Setup';
            finalBtn.disabled = false;
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

                // Step 1: Authentication
                if (e.target.matches('#authenticateBtn')) {
                    this.handleAuthentication();
                }

                // Step 2: Back to step 1
                if (e.target.matches('#backToStep1')) {
                    this.showStep(1);
                }

                // Step 2: Create tables and connect
                if (e.target.matches('#createTablesBtn')) {
                    this.handleFinalConnection();
                }

                // Final connect button
                if (e.target.matches('#finalConnectBtn')) {
                    this.handleFinalConnection();
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
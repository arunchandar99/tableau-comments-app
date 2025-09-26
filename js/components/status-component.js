/**
 * Status Component
 * Handles status indicator, debug panel, and system monitoring
 */

import { APP_CONFIG, STATUS_TYPES } from '../config/app-config.js';
import { logger } from '../utils/logger.js';

export class StatusComponent {
    constructor(snowflakeService, storageService) {
        this.snowflakeService = snowflakeService;
        this.storageService = storageService;
        this.appStartTime = null;
        this.setupEventListeners();
    }

    /**
     * Initialize status component
     */
    initialize() {
        this.appStartTime = Date.now();
        this.updateDatabaseConfigInfo();
        this.updateAllDebugInfo();
    }

    /**
     * Update status indicator and debug info
     */
    updateStatus(message, type = STATUS_TYPES.INFO) {
        try {
            const statusIcon = document.getElementById('statusIcon');
            const lastAction = document.getElementById('lastAction');
            const lastUpdate = document.getElementById('lastUpdate');

            if (statusIcon) {
                // Only show green light when successfully connected
                if (type === STATUS_TYPES.CONNECTED && this.snowflakeService.isConnected) {
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

            logger.debug('Status updated:', message, type);
        } catch (error) {
            logger.error('Failed to update status:', error);
        }
    }

    /**
     * Update connection status display
     */
    updateConnectionStatus(status, type = STATUS_TYPES.INFO) {
        try {
            const connectionElement = document.getElementById('connectionStatus');
            const apiEndpoint = document.getElementById('apiEndpoint');

            if (connectionElement) {
                connectionElement.textContent = status;
                connectionElement.className = `debug-value ${type}`;
            }

            if (apiEndpoint && this.snowflakeService) {
                apiEndpoint.textContent = this.snowflakeService.baseURL || 'Not configured';
            }

            logger.debug('Connection status updated:', status, type);
        } catch (error) {
            logger.error('Failed to update connection status:', error);
        }
    }

    /**
     * Update posts count display
     */
    updatePostsCount(count) {
        try {
            const postsElement = document.getElementById('postsStatus');
            if (postsElement) {
                postsElement.textContent = count.toString();
            }

            logger.debug('Posts count updated:', count);
        } catch (error) {
            logger.error('Failed to update posts count:', error);
        }
    }

    /**
     * Update filtered posts count display
     */
    updateFilteredPostsCount(count) {
        try {
            const filteredPostsElement = document.getElementById('filteredPostsStatus');
            if (filteredPostsElement) {
                filteredPostsElement.textContent = count.toString();
            }

            logger.debug('Filtered posts count updated:', count);
        } catch (error) {
            logger.error('Failed to update filtered posts count:', error);
        }
    }

    /**
     * Update database configuration information
     */
    updateDatabaseConfigInfo() {
        try {
            // Database configuration from the API
            const dbConfig = {
                account: 'ZDDMCAD-FGC62251',
                database: 'TABLEAU_EXTENSIONS',
                schema: 'COMMENTS_APP',
                username: 'ARUNCHANDAR99',
                warehouse: 'COMPUTE_WH'
            };

            // Update database configuration fields
            const fields = [
                { id: 'dbAccount', value: dbConfig.account },
                { id: 'dbName', value: dbConfig.database },
                { id: 'dbSchema', value: dbConfig.schema },
                { id: 'dbUsername', value: dbConfig.username },
                { id: 'dbWarehouse', value: dbConfig.warehouse }
            ];

            fields.forEach(field => {
                const element = document.getElementById(field.id);
                if (element) {
                    element.textContent = field.value;
                }
            });

            logger.debug('Database config info updated');
        } catch (error) {
            logger.error('Failed to update database config info:', error);
        }
    }

    /**
     * Update all debug information
     */
    updateAllDebugInfo() {
        try {
            // Update load time
            const loadTime = document.getElementById('loadTime');
            if (loadTime && this.appStartTime) {
                const timeElapsed = Date.now() - this.appStartTime;
                loadTime.textContent = `${timeElapsed}ms`;
            }

            // Update API endpoint
            const apiEndpoint = document.getElementById('apiEndpoint');
            if (apiEndpoint && this.snowflakeService) {
                apiEndpoint.textContent = this.snowflakeService.baseURL || 'Not configured';
            }

            // Update database configuration
            this.updateDatabaseConfigInfo();

            // Update storage info
            this.updateStorageInfo();

            logger.debug('All debug info updated');
        } catch (error) {
            logger.error('Failed to update debug info:', error);
        }
    }

    /**
     * Update storage information
     */
    updateStorageInfo() {
        try {
            const storageInfo = this.storageService.getStorageInfo();

            const storageStatusElement = document.getElementById('storageStatus');
            if (storageStatusElement) {
                const status = storageInfo.storageAvailable ?
                    `${storageInfo.postsCount} posts backed up locally` :
                    'Local storage not available';
                storageStatusElement.textContent = status;
            }

            logger.debug('Storage info updated:', storageInfo);
        } catch (error) {
            logger.error('Failed to update storage info:', error);
        }
    }

    /**
     * Toggle debug panel visibility
     */
    toggleDebugPanel() {
        try {
            const debugPanel = document.getElementById('debugPanel');
            if (!debugPanel) return;

            const isVisible = debugPanel.style.display !== 'none';

            if (isVisible) {
                debugPanel.style.display = 'none';
                logger.debug('Debug panel hidden');
            } else {
                debugPanel.style.display = 'block';
                // Update all values when panel opens
                this.updateAllDebugInfo();
                logger.debug('Debug panel shown');
            }
        } catch (error) {
            logger.error('Failed to toggle debug panel:', error);
        }
    }

    /**
     * Hide debug panel
     */
    hideDebugPanel() {
        try {
            const debugPanel = document.getElementById('debugPanel');
            if (debugPanel) {
                debugPanel.style.display = 'none';
                logger.debug('Debug panel hidden');
            }
        } catch (error) {
            logger.error('Failed to hide debug panel:', error);
        }
    }

    /**
     * Get system status summary
     */
    getSystemStatus() {
        try {
            return {
                snowflakeConnected: this.snowflakeService.isConnected,
                appStartTime: this.appStartTime,
                uptime: this.appStartTime ? Date.now() - this.appStartTime : 0,
                storageAvailable: this.storageService.isStorageAvailable(),
                apiEndpoint: this.snowflakeService.baseURL,
                version: APP_CONFIG.version
            };
        } catch (error) {
            logger.error('Failed to get system status:', error);
            return {
                snowflakeConnected: false,
                appStartTime: null,
                uptime: 0,
                storageAvailable: false,
                apiEndpoint: 'Unknown',
                version: 'Unknown'
            };
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Status indicator click
            const statusIndicator = document.getElementById('statusIndicator');
            if (statusIndicator) {
                statusIndicator.addEventListener('click', () => this.toggleDebugPanel());
            }

            // Debug panel close button
            const debugClose = document.getElementById('debugClose');
            if (debugClose) {
                debugClose.addEventListener('click', () => this.hideDebugPanel());
            }

            logger.debug('Status component event listeners setup');
        });
    }

    /**
     * Export debug information
     */
    exportDebugInfo() {
        try {
            const debugInfo = {
                systemStatus: this.getSystemStatus(),
                logs: logger.getLogs(),
                storageInfo: this.storageService.getStorageInfo(),
                config: {
                    api: APP_CONFIG.api,
                    ui: APP_CONFIG.ui,
                    debug: APP_CONFIG.debug
                },
                timestamp: new Date().toISOString()
            };

            return debugInfo;
        } catch (error) {
            logger.error('Failed to export debug info:', error);
            return null;
        }
    }

    /**
     * Run system diagnostics
     */
    async runDiagnostics() {
        try {
            logger.info('Running system diagnostics...');

            const diagnostics = {
                timestamp: new Date().toISOString(),
                snowflakeConnection: await this.snowflakeService.testConnection(),
                localStorage: this.storageService.isStorageAvailable(),
                apiEndpoint: this.snowflakeService.baseURL,
                version: APP_CONFIG.version
            };

            logger.info('Diagnostics completed:', diagnostics);
            return diagnostics;
        } catch (error) {
            logger.error('Diagnostics failed:', error);
            return {
                timestamp: new Date().toISOString(),
                error: error.message,
                snowflakeConnection: false,
                localStorage: false
            };
        }
    }
}
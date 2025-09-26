/**
 * Settings Component
 * Handles settings panel UI and theme customization
 */

import { APP_CONFIG } from '../config/app-config.js';
import { logger } from '../utils/logger.js';
import { themeEngine } from '../utils/theme-engine.js';
import { showNotification } from '../utils/helpers.js';

export class SettingsComponent {
    constructor() {
        this.isSettingsOpen = false;
        this.previewTimeout = null;
        this.setupEventListeners();
    }

    /**
     * Create settings tab in the header
     */
    createSettingsTab() {
        try {
            const headerRight = document.querySelector('.header-right');
            if (!headerRight) {
                logger.error('Header right container not found');
                return;
            }

            // Create settings button
            const settingsBtn = document.createElement('button');
            settingsBtn.id = 'settingsBtn';
            settingsBtn.className = 'settings-btn';
            settingsBtn.innerHTML = '<i class="fas fa-cog"></i><span>Settings</span>';
            settingsBtn.title = 'Customize app appearance';

            // Insert before the new post button
            const newPostBtn = document.getElementById('newPostBtn');
            headerRight.insertBefore(settingsBtn, newPostBtn);

            logger.success('Settings tab created');
        } catch (error) {
            logger.error('Failed to create settings tab:', error);
        }
    }

    /**
     * Create settings modal
     */
    createSettingsModal() {
        try {
            // Create modal HTML
            const modalHtml = `
                <div class="modal-overlay" id="settingsModal">
                    <div class="modal-container settings-modal">
                        <div class="modal-header">
                            <h2><i class="fas fa-cog"></i> Settings & Appearance</h2>
                            <button class="close-modal-btn" id="closeSettingsBtn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="modal-body settings-body">
                            <!-- Theme Selection Section -->
                            <div class="settings-section">
                                <h3><i class="fas fa-palette"></i> Theme</h3>
                                <p class="section-description">Choose a theme that matches your style</p>

                                <div class="theme-grid" id="themeGrid">
                                    <!-- Theme options will be inserted here -->
                                </div>
                            </div>

                            <!-- Appearance Settings Section -->
                            <div class="settings-section">
                                <h3><i class="fas fa-adjust"></i> Appearance</h3>
                                <p class="section-description">Fine-tune the visual appearance</p>

                                <div class="settings-grid">
                                    <!-- Font Size -->
                                    <div class="setting-item">
                                        <label for="fontSizeSetting">
                                            <i class="fas fa-font"></i>
                                            Font Size
                                        </label>
                                        <select id="fontSizeSetting" class="setting-select">
                                            <!-- Options will be populated -->
                                        </select>
                                    </div>

                                    <!-- Animation Speed -->
                                    <div class="setting-item">
                                        <label for="animationSetting">
                                            <i class="fas fa-magic"></i>
                                            Animations
                                        </label>
                                        <select id="animationSetting" class="setting-select">
                                            <!-- Options will be populated -->
                                        </select>
                                    </div>

                                    <!-- Card Style -->
                                    <div class="setting-item">
                                        <label for="cardStyleSetting">
                                            <i class="fas fa-border-style"></i>
                                            Card Style
                                        </label>
                                        <select id="cardStyleSetting" class="setting-select">
                                            <!-- Options will be populated -->
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Preview Section -->
                            <div class="settings-section">
                                <h3><i class="fas fa-eye"></i> Preview</h3>
                                <p class="section-description">See how your changes look</p>

                                <div class="theme-preview-card">
                                    <div class="preview-header">
                                        <div class="preview-title">Sample Post</div>
                                        <div class="preview-time">2 hours ago</div>
                                    </div>
                                    <div class="preview-content">
                                        This is how your posts will look with the selected theme and settings.
                                    </div>
                                    <div class="preview-actions">
                                        <button class="preview-btn"><i class="fas fa-heart"></i> 5</button>
                                        <button class="preview-btn"><i class="fas fa-comment"></i> 2</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="modal-actions settings-actions">
                            <button type="button" class="btn-secondary" id="resetSettingsBtn">
                                <i class="fas fa-undo"></i>
                                Reset to Defaults
                            </button>
                            <div class="action-group">
                                <button type="button" class="btn-cancel" id="cancelSettingsBtn">Cancel</button>
                                <button type="button" class="btn-primary" id="saveSettingsBtn">
                                    <i class="fas fa-save"></i>
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Insert modal into body
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Populate options
            this.populateThemeOptions();
            this.populateAppearanceOptions();

            logger.success('Settings modal created');
        } catch (error) {
            logger.error('Failed to create settings modal:', error);
        }
    }

    /**
     * Populate theme options
     */
    populateThemeOptions() {
        try {
            const themeGrid = document.getElementById('themeGrid');
            if (!themeGrid) return;

            const themes = themeEngine.getAvailableThemes();
            const currentTheme = themeEngine.getCurrentTheme();

            themeGrid.innerHTML = themes.map(theme => `
                <div class="theme-option ${theme.id === currentTheme.id ? 'active' : ''}" data-theme="${theme.id}">
                    <div class="theme-preview" style="background: ${theme.preview.headerGradient}">
                        <div class="theme-preview-content" style="background: ${theme.preview.cardBackground}; color: ${theme.preview.headerGradient}">
                            <div class="theme-preview-dot" style="background: ${theme.preview.accentColor}"></div>
                        </div>
                    </div>
                    <div class="theme-info">
                        <h4>${theme.name}</h4>
                        <p>${theme.description}</p>
                    </div>
                    <div class="theme-select-indicator">
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
            `).join('');

            logger.debug('Theme options populated');
        } catch (error) {
            logger.error('Failed to populate theme options:', error);
        }
    }

    /**
     * Populate appearance options
     */
    populateAppearanceOptions() {
        try {
            const options = themeEngine.getAppearanceOptions();
            const currentSettings = themeEngine.getCurrentSettings();

            // Font Size options
            const fontSizeSelect = document.getElementById('fontSizeSetting');
            if (fontSizeSelect) {
                fontSizeSelect.innerHTML = options.fontSize.map(option =>
                    `<option value="${option.id}" ${option.id === currentSettings.fontSize ? 'selected' : ''}>${option.name}</option>`
                ).join('');
            }

            // Animation options
            const animationSelect = document.getElementById('animationSetting');
            if (animationSelect) {
                animationSelect.innerHTML = options.animations.map(option =>
                    `<option value="${option.id}" ${option.id === currentSettings.animations ? 'selected' : ''}>${option.name}</option>`
                ).join('');
            }

            // Card Style options
            const cardStyleSelect = document.getElementById('cardStyleSetting');
            if (cardStyleSelect) {
                cardStyleSelect.innerHTML = options.cardStyle.map(option =>
                    `<option value="${option.id}" ${option.id === currentSettings.cardStyle ? 'selected' : ''}>${option.name}</option>`
                ).join('');
            }

            logger.debug('Appearance options populated');
        } catch (error) {
            logger.error('Failed to populate appearance options:', error);
        }
    }

    /**
     * Show settings modal
     */
    showSettings() {
        try {
            if (!document.getElementById('settingsModal')) {
                this.createSettingsModal();
            }

            const modal = document.getElementById('settingsModal');
            if (modal) {
                modal.style.display = 'flex';
                this.isSettingsOpen = true;

                // Refresh options in case they've changed
                this.populateThemeOptions();
                this.populateAppearanceOptions();

                logger.debug('Settings modal shown');
            }
        } catch (error) {
            logger.error('Failed to show settings modal:', error);
        }
    }

    /**
     * Hide settings modal
     */
    hideSettings() {
        try {
            const modal = document.getElementById('settingsModal');
            if (modal) {
                modal.style.display = 'none';
                this.isSettingsOpen = false;

                // Clear any preview timeouts
                if (this.previewTimeout) {
                    clearTimeout(this.previewTimeout);
                    this.previewTimeout = null;
                }

                logger.debug('Settings modal hidden');
            }
        } catch (error) {
            logger.error('Failed to hide settings modal:', error);
        }
    }

    /**
     * Handle theme selection
     */
    handleThemeSelect(themeId) {
        try {
            // Update UI
            document.querySelectorAll('.theme-option').forEach(option => {
                option.classList.remove('active');
            });
            document.querySelector(`[data-theme="${themeId}"]`)?.classList.add('active');

            // Preview theme immediately
            themeEngine.previewTheme(themeId);

            logger.debug('Theme selected for preview:', themeId);
        } catch (error) {
            logger.error('Failed to handle theme selection:', error);
        }
    }

    /**
     * Handle appearance setting change
     */
    handleAppearanceChange() {
        try {
            const settings = {
                fontSize: document.getElementById('fontSizeSetting')?.value,
                animations: document.getElementById('animationSetting')?.value,
                cardStyle: document.getElementById('cardStyleSetting')?.value
            };

            // Apply preview immediately
            themeEngine.applySettings(settings);

            logger.debug('Appearance settings changed:', settings);
        } catch (error) {
            logger.error('Failed to handle appearance change:', error);
        }
    }

    /**
     * Save settings
     */
    saveSettings() {
        try {
            const selectedTheme = document.querySelector('.theme-option.active')?.dataset.theme;

            if (selectedTheme) {
                themeEngine.applyTheme(selectedTheme);
            }

            const settings = {
                fontSize: document.getElementById('fontSizeSetting')?.value,
                animations: document.getElementById('animationSetting')?.value,
                cardStyle: document.getElementById('cardStyleSetting')?.value
            };

            themeEngine.applySettings(settings);

            this.hideSettings();
            showNotification('Settings saved successfully!', 'success');

            logger.success('Settings saved');
        } catch (error) {
            logger.error('Failed to save settings:', error);
            showNotification('Failed to save settings', 'error');
        }
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        try {
            if (confirm('Are you sure you want to reset all settings to defaults?')) {
                themeEngine.resetToDefaults();
                this.populateThemeOptions();
                this.populateAppearanceOptions();
                showNotification('Settings reset to defaults', 'success');
                logger.success('Settings reset to defaults');
            }
        } catch (error) {
            logger.error('Failed to reset settings:', error);
            showNotification('Failed to reset settings', 'error');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Create settings tab and modal
            this.createSettingsTab();

            // Settings button click
            const settingsBtn = document.getElementById('settingsBtn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => this.showSettings());
            }

            // Settings modal events
            document.addEventListener('click', (e) => {
                // Close modal
                if (e.target.matches('#closeSettingsBtn, #cancelSettingsBtn')) {
                    this.hideSettings();
                }

                // Save settings
                if (e.target.matches('#saveSettingsBtn')) {
                    this.saveSettings();
                }

                // Reset settings
                if (e.target.matches('#resetSettingsBtn')) {
                    this.resetToDefaults();
                }

                // Theme selection
                if (e.target.closest('.theme-option')) {
                    const themeId = e.target.closest('.theme-option').dataset.theme;
                    this.handleThemeSelect(themeId);
                }

                // Close modal when clicking overlay
                if (e.target.matches('#settingsModal')) {
                    this.hideSettings();
                }
            });

            // Appearance setting changes
            document.addEventListener('change', (e) => {
                if (e.target.matches('#fontSizeSetting, #animationSetting, #cardStyleSetting')) {
                    this.handleAppearanceChange();
                }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Close settings with Escape
                if (e.key === 'Escape' && this.isSettingsOpen) {
                    this.hideSettings();
                }

                // Open settings with Ctrl+, (like many apps)
                if (e.ctrlKey && e.key === ',') {
                    e.preventDefault();
                    this.showSettings();
                }
            });

            logger.debug('Settings component event listeners setup');
        });
    }
}
/**
 * Theme Engine
 * Manages theme switching, appearance settings, and visual customization
 */

import { APP_CONFIG } from '../config/app-config.js';
import { logger } from './logger.js';
import { storageService } from '../services/storage-service.js';

class ThemeEngine {
    constructor() {
        this.currentTheme = APP_CONFIG.themes.default;
        this.currentSettings = this.getDefaultSettings();
        this.styleElement = null;
        this.init();
    }

    /**
     * Initialize theme engine
     */
    init() {
        try {
            // Load saved preferences
            const preferences = storageService.loadPreferences();
            if (preferences.theme) {
                this.currentTheme = preferences.theme;
            }
            if (preferences.appearance) {
                this.currentSettings = { ...this.currentSettings, ...preferences.appearance };
            }

            // Create dynamic style element
            this.createStyleElement();

            // Apply initial theme
            this.applyTheme(this.currentTheme);
            this.applySettings(this.currentSettings);

            logger.success('Theme engine initialized with theme:', this.currentTheme);
        } catch (error) {
            logger.error('Theme engine initialization failed:', error);
        }
    }

    /**
     * Get default appearance settings
     */
    getDefaultSettings() {
        return {
            fontSize: APP_CONFIG.appearance.fontSize.default,
            animations: APP_CONFIG.appearance.animations.default,
            cardStyle: APP_CONFIG.appearance.cardStyle.default
        };
    }

    /**
     * Create dynamic style element for theme overrides
     */
    createStyleElement() {
        // Remove existing theme styles
        const existing = document.getElementById('theme-styles');
        if (existing) {
            existing.remove();
        }

        // Create new style element
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'theme-styles';
        document.head.appendChild(this.styleElement);
    }

    /**
     * Apply a theme
     */
    applyTheme(themeId) {
        try {
            const theme = APP_CONFIG.themes.available[themeId];
            if (!theme) {
                logger.error('Theme not found:', themeId);
                return false;
            }

            logger.info('Applying theme:', theme.name);

            // Apply theme CSS variables
            const root = document.documentElement;
            root.style.setProperty('--header-gradient', theme.headerGradient);
            root.style.setProperty('--background-color', theme.backgroundColor);
            root.style.setProperty('--card-background', theme.cardBackground);
            root.style.setProperty('--text-color', theme.textColor);
            root.style.setProperty('--accent-color', theme.accentColor);
            root.style.setProperty('--border-color', theme.borderColor);
            root.style.setProperty('--shadow-color', theme.shadowColor);

            // Update current theme
            this.currentTheme = themeId;

            // Save preference
            this.savePreferences();

            // Trigger theme change event
            this.dispatchThemeChangeEvent(themeId, theme);

            logger.success('Theme applied successfully:', theme.name);
            return true;
        } catch (error) {
            logger.error('Failed to apply theme:', error);
            return false;
        }
    }

    /**
     * Apply appearance settings
     */
    applySettings(settings) {
        try {
            logger.info('Applying appearance settings:', settings);

            // Generate dynamic CSS
            let css = '';

            // Font size scaling
            const fontScale = APP_CONFIG.appearance.fontSize.options[settings.fontSize]?.scale || 1;
            css += `
                .app-container {
                    font-size: ${fontScale}rem;
                }
            `;

            // Animation duration
            const animDuration = APP_CONFIG.appearance.animations.options[settings.animations]?.duration || 300;
            css += `
                * {
                    transition-duration: ${animDuration}ms !important;
                }
                .post-card, .comment-item, .modal-container, .notification {
                    animation-duration: ${animDuration}ms !important;
                }
            `;

            // Card style
            const cardStyle = APP_CONFIG.appearance.cardStyle.options[settings.cardStyle];
            if (cardStyle) {
                css += `
                    .post-card, .modal-container, .debug-panel {
                        border-radius: ${cardStyle.borderRadius} !important;
                        box-shadow: ${cardStyle.shadow} !important;
                    }
                `;
            }

            // Apply dynamic styles
            this.styleElement.textContent = css;

            // Update current settings
            this.currentSettings = { ...this.currentSettings, ...settings };

            // Save preferences
            this.savePreferences();

            logger.success('Appearance settings applied');
            return true;
        } catch (error) {
            logger.error('Failed to apply appearance settings:', error);
            return false;
        }
    }

    /**
     * Get available themes
     */
    getAvailableThemes() {
        return Object.entries(APP_CONFIG.themes.available).map(([id, theme]) => ({
            id,
            name: theme.name,
            description: theme.description,
            preview: {
                headerGradient: theme.headerGradient,
                backgroundColor: theme.backgroundColor,
                cardBackground: theme.cardBackground,
                accentColor: theme.accentColor
            }
        }));
    }

    /**
     * Get available appearance options
     */
    getAppearanceOptions() {
        return {
            fontSize: Object.entries(APP_CONFIG.appearance.fontSize.options).map(([id, option]) => ({
                id,
                name: option.name,
                scale: option.scale
            })),
            animations: Object.entries(APP_CONFIG.appearance.animations.options).map(([id, option]) => ({
                id,
                name: option.name,
                duration: option.duration
            })),
            cardStyle: Object.entries(APP_CONFIG.appearance.cardStyle.options).map(([id, option]) => ({
                id,
                name: option.name,
                borderRadius: option.borderRadius,
                shadow: option.shadow
            }))
        };
    }

    /**
     * Get current theme info
     */
    getCurrentTheme() {
        const theme = APP_CONFIG.themes.available[this.currentTheme];
        return {
            id: this.currentTheme,
            name: theme?.name || 'Unknown',
            description: theme?.description || 'Unknown theme'
        };
    }

    /**
     * Get current settings
     */
    getCurrentSettings() {
        return { ...this.currentSettings };
    }

    /**
     * Save preferences to storage
     */
    savePreferences() {
        try {
            const preferences = storageService.loadPreferences();
            preferences.theme = this.currentTheme;
            preferences.appearance = this.currentSettings;
            storageService.savePreferences(preferences);
            logger.debug('Theme preferences saved');
        } catch (error) {
            logger.error('Failed to save theme preferences:', error);
        }
    }

    /**
     * Reset to default theme and settings
     */
    resetToDefaults() {
        try {
            logger.info('Resetting to default theme and settings');

            this.applyTheme(APP_CONFIG.themes.default);
            this.applySettings(this.getDefaultSettings());

            logger.success('Reset to defaults completed');
            return true;
        } catch (error) {
            logger.error('Failed to reset to defaults:', error);
            return false;
        }
    }

    /**
     * Dispatch theme change event
     */
    dispatchThemeChangeEvent(themeId, theme) {
        try {
            const event = new CustomEvent('themeChanged', {
                detail: {
                    themeId,
                    theme,
                    settings: this.currentSettings
                }
            });
            document.dispatchEvent(event);
            logger.debug('Theme change event dispatched');
        } catch (error) {
            logger.error('Failed to dispatch theme change event:', error);
        }
    }

    /**
     * Preview theme without saving
     */
    previewTheme(themeId) {
        try {
            const theme = APP_CONFIG.themes.available[themeId];
            if (!theme) return false;

            // Temporarily apply theme styles
            const root = document.documentElement;
            root.style.setProperty('--header-gradient', theme.headerGradient);
            root.style.setProperty('--background-color', theme.backgroundColor);
            root.style.setProperty('--card-background', theme.cardBackground);
            root.style.setProperty('--text-color', theme.textColor);
            root.style.setProperty('--accent-color', theme.accentColor);
            root.style.setProperty('--border-color', theme.borderColor);
            root.style.setProperty('--shadow-color', theme.shadowColor);

            logger.debug('Theme preview applied:', theme.name);
            return true;
        } catch (error) {
            logger.error('Failed to preview theme:', error);
            return false;
        }
    }

    /**
     * Export current theme and settings
     */
    exportSettings() {
        return {
            theme: this.currentTheme,
            settings: this.currentSettings,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Import theme and settings
     */
    importSettings(data) {
        try {
            if (data.theme && APP_CONFIG.themes.available[data.theme]) {
                this.applyTheme(data.theme);
            }

            if (data.settings) {
                this.applySettings(data.settings);
            }

            logger.success('Theme settings imported successfully');
            return true;
        } catch (error) {
            logger.error('Failed to import theme settings:', error);
            return false;
        }
    }
}

// Create and export singleton instance
export const themeEngine = new ThemeEngine();
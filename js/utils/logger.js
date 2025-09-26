/**
 * Application Logger
 * Centralized logging system with different levels
 */

import { APP_CONFIG } from '../config/app-config.js';

class Logger {
    constructor() {
        this.logLevel = APP_CONFIG.debug.logLevel;
        this.enabled = APP_CONFIG.debug.enabled;
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`❌ [ERROR] ${message}`, ...args);
            this.logToStorage('error', message, args);
        }
    }

    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`⚠️ [WARN] ${message}`, ...args);
            this.logToStorage('warn', message, args);
        }
    }

    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.info(`ℹ️ [INFO] ${message}`, ...args);
            this.logToStorage('info', message, args);
        }
    }

    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(`🐛 [DEBUG] ${message}`, ...args);
            this.logToStorage('debug', message, args);
        }
    }

    success(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`✅ [SUCCESS] ${message}`, ...args);
            this.logToStorage('success', message, args);
        }
    }

    performance(label, startTime) {
        if (APP_CONFIG.debug.showPerformanceMetrics && this.shouldLog('debug')) {
            const duration = Date.now() - startTime;
            console.debug(`⏱️ [PERFORMANCE] ${label}: ${duration}ms`);
        }
    }

    shouldLog(level) {
        return this.enabled && this.levels[level] <= this.levels[this.logLevel];
    }

    logToStorage(level, message, args) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                message,
                data: args.length > 0 ? args : undefined
            };

            const logs = JSON.parse(localStorage.getItem('commentsApp_logs') || '[]');
            logs.push(logEntry);

            // Keep only last 100 log entries
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }

            localStorage.setItem('commentsApp_logs', JSON.stringify(logs));
        } catch (error) {
            // Silently fail if localStorage is not available
        }
    }

    getLogs() {
        try {
            return JSON.parse(localStorage.getItem('commentsApp_logs') || '[]');
        } catch (error) {
            return [];
        }
    }

    clearLogs() {
        try {
            localStorage.removeItem('commentsApp_logs');
        } catch (error) {
            // Silently fail if localStorage is not available
        }
    }
}

// Create and export singleton instance
export const logger = new Logger();
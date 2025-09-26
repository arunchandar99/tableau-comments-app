# Comments App - Architecture Documentation

## 📁 **Project Structure**

```
/comments-app/
├── 📄 comments-app.html          # Main HTML interface
├── 🎨 comments-app.css           # Styling and themes
├── 📄 comments-app.trex          # Tableau extension manifest
├── 🔧 snowflake-live-api.js      # Legacy Snowflake client (to be removed)
├── 📁 js/                        # Modern JavaScript modules
│   ├── 📄 app.js                 # Main application controller
│   ├── 📁 config/
│   │   └── 📄 app-config.js      # Application configuration
│   ├── 📁 utils/
│   │   ├── 📄 helpers.js         # Utility functions
│   │   └── 📄 logger.js          # Logging system
│   ├── 📁 services/
│   │   ├── 📄 snowflake-service.js  # Snowflake API client
│   │   └── 📄 storage-service.js    # Local storage management
│   └── 📁 components/
│       ├── 📄 post-component.js     # Post management
│       ├── 📄 comment-component.js  # Comment system
│       └── 📄 status-component.js   # Status & debugging
├── 📁 api/
│   └── 📄 snowflake.js           # Backend REST API (Vercel)
└── 📁 lib/
    └── 📄 tableau.extensions.1.13.0.js  # Tableau Extensions API
```

## 🏗️ **Architecture Overview**

### **Layer 1: Configuration & Utilities**
- **`app-config.js`**: Centralized configuration for all settings
- **`helpers.js`**: Reusable utility functions
- **`logger.js`**: Comprehensive logging system with levels

### **Layer 2: Services**
- **`snowflake-service.js`**: Handles all Snowflake database operations
- **`storage-service.js`**: Manages local storage and data persistence

### **Layer 3: Components**
- **`post-component.js`**: Post creation, rendering, and management
- **`comment-component.js`**: Comment system with editing capabilities
- **`status-component.js`**: Status monitoring and debug panel

### **Layer 4: Application Controller**
- **`app.js`**: Main orchestrator that coordinates all components

## 🔧 **Component Details**

### **Configuration (`app-config.js`)**
```javascript
export const APP_CONFIG = {
    name: 'Financial Performance Feed',
    version: '1.0.0',
    api: { snowflakeBaseUrl, timeout, retryAttempts },
    database: { name, schema, tables },
    ui: { postsPerPage, autoRefreshInterval },
    defaults: { author, postTypes },
    storage: { enableLocalBackup, maxLocalPosts },
    debug: { enabled, logLevel }
};
```

### **Logger (`logger.js`)**
```javascript
logger.error('Error message', data);    // Error level
logger.warn('Warning message');         // Warning level
logger.info('Info message');            // Info level
logger.debug('Debug message');          // Debug level
logger.success('Success message');      // Success level
logger.performance('Task', startTime);  // Performance timing
```

### **Snowflake Service (`snowflake-service.js`)**
```javascript
await snowflakeService.initialize();       // Connect to Snowflake
await snowflakeService.savePosts(posts);   // Save posts
await snowflakeService.loadPosts();        // Load posts
await snowflakeService.deletePost(id);     // Delete post
await snowflakeService.saveComment(id, comment);  // Save comment
```

### **Storage Service (`storage-service.js`)**
```javascript
storageService.savePosts(posts);          // Save to localStorage
storageService.loadPosts();               // Load from localStorage
storageService.savePreferences(prefs);    // Save user preferences
storageService.exportData();              // Export all data
```

### **Post Component (`post-component.js`)**
```javascript
await postComponent.createPost(data);     // Create new post
await postComponent.loadPosts();          // Load all posts
await postComponent.deletePost(id);       // Delete post
postComponent.filterPosts(month, year, type);  // Filter posts
postComponent.renderPost(post);           // Render single post
```

### **Comment Component (`comment-component.js`)**
```javascript
commentComponent.showComments(postId);    // Show comments modal
await commentComponent.submitComment();    // Submit new comment
commentComponent.editComment(id);         // Edit comment
await commentComponent.saveEditComment(id);  // Save edited comment
```

### **Status Component (`status-component.js`)**
```javascript
statusComponent.updateStatus(msg, type);  // Update status display
statusComponent.updateConnectionStatus(status);  // Update connection
statusComponent.toggleDebugPanel();       // Show/hide debug panel
statusComponent.runDiagnostics();         // Run system diagnostics
```

## 📊 **Data Flow**

### **Application Initialization**
1. **Main Controller** (`app.js`) starts initialization
2. **Tableau Extensions API** initializes
3. **Services** connect (Snowflake, Storage)
4. **Components** initialize with service dependencies
5. **UI** sets up event listeners and renders initial data

### **Post Creation Flow**
1. User fills **New Post Form** → **HTML Form**
2. **Main Controller** captures form submission
3. **Post Component** validates and creates post
4. **Snowflake Service** saves to database
5. **Storage Service** saves local backup
6. **UI** re-renders feed with new post

### **Comment Flow**
1. User clicks comment button → **Post Component**
2. **Comment Component** opens modal and loads comments
3. **Snowflake Service** fetches comments from database
4. User adds comment → **Comment Component**
5. **Snowflake Service** saves comment
6. **UI** updates comment display

### **Status & Debug Flow**
1. **Status Component** monitors all operations
2. **Logger** captures all events and errors
3. **Debug Panel** displays real-time system info
4. **Status Indicator** shows connection state

## 🔄 **Adding New Features**

### **1. Add New Configuration**
```javascript
// In app-config.js
export const APP_CONFIG = {
    // ... existing config
    newFeature: {
        enabled: true,
        setting1: 'value1'
    }
};
```

### **2. Create New Service**
```javascript
// In js/services/new-service.js
import { logger } from '../utils/logger.js';

class NewService {
    async doSomething() {
        logger.info('New service action');
        // Implementation
    }
}

export const newService = new NewService();
```

### **3. Add New Component**
```javascript
// In js/components/new-component.js
import { logger } from '../utils/logger.js';

export class NewComponent {
    constructor(services) {
        this.services = services;
    }

    render() {
        // Component logic
    }
}
```

### **4. Integrate in Main App**
```javascript
// In app.js
import { newService } from './services/new-service.js';
import { NewComponent } from './components/new-component.js';

// Add to initialization
this.components.newComponent = new NewComponent(newService);
```

## 🐛 **Debugging & Troubleshooting**

### **View Logs**
```javascript
// In browser console
logger.getLogs();                    // Get all logs
commentsApp.getStatus();            // Get app status
statusComponent.runDiagnostics();   // Run diagnostics
```

### **Debug Panel**
- Click **Status indicator** in top-right corner
- View **Connection Status**, **Database Config**, **Performance metrics**
- Monitor **Real-time system status**

### **Common Issues**
1. **Snowflake Connection Failed**
   - Check API endpoint in debug panel
   - Verify network connectivity
   - Check browser console for detailed errors

2. **Posts Not Loading**
   - Check Snowflake connection status
   - Verify localStorage fallback
   - Check browser console logs

3. **UI Not Responding**
   - Check for JavaScript errors in console
   - Verify all modules loaded correctly
   - Check event listeners setup

## ⚡ **Performance Considerations**

- **Lazy Loading**: Large lists use virtual scrolling
- **Debouncing**: Filter operations are debounced
- **Local Caching**: Data cached in localStorage
- **API Retries**: Automatic retry with exponential backoff
- **Batch Operations**: Multiple posts saved together

## 🔒 **Security Features**

- **XSS Prevention**: All user input sanitized
- **Parameterized Queries**: SQL injection protection
- **CORS Enabled**: Secure cross-origin requests
- **No Credential Exposure**: Passwords not shown in debug
- **Input Validation**: All data validated before processing

## 🚀 **Future Enhancements**

The modular architecture supports easy addition of:
- **Settings Panel** with theme customization
- **User Management** with authentication
- **Real-time Updates** with WebSocket connections
- **File Attachments** with cloud storage
- **Advanced Filtering** with search capabilities
- **Export/Import** functionality
- **Mobile Responsiveness** improvements

This architecture ensures the codebase remains maintainable, testable, and extensible as new features are added.
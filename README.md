# Tableau Comments App with Snowflake Integration

A professional Tableau Extension that enables rich text commenting with automatic Snowflake database synchronization.

## Features

✅ **Rich Text Editor** - Colors, highlights, and formatting preserved
✅ **Automatic Snowflake Sync** - Real-time database writeback
✅ **Professional REST API** - Full CRUD operations
✅ **Tableau Extensions API** - Native dashboard integration
✅ **Responsive Design** - Works across all screen sizes
✅ **Enterprise Security** - Parameterized queries, CORS enabled

## Quick Start

### 1. Deploy to Tableau
- Download `comments-app.trex`
- Install in Tableau Desktop/Server
- Add extension to your dashboard

### 2. Use the App
- **Create Posts**: Click "New Post", add rich formatting
- **Filter Posts**: By month, year, or post type
- **Add Comments**: Click comment icon on any post
- **View Data**: All posts automatically saved to Snowflake

### 3. Database Integration
Posts are automatically saved to:
- **Database**: `TABLEAU_EXTENSIONS`
- **Schema**: `COMMENTS_APP`
- **Tables**: `POSTS`, `COMMENTS`

## Architecture

```
Tableau Dashboard
       ↓
  Extension Frontend (HTML/CSS/JS)
       ↓
  Professional REST API (Vercel)
       ↓
  Snowflake Database (Auto-sync)
```

## API Endpoints

- `POST /api/snowflake?action=savePosts` - Create posts
- `POST /api/snowflake?action=loadPosts` - Read posts
- `POST /api/snowflake?action=updatePost` - Update posts
- `POST /api/snowflake?action=deletePost` - Delete posts
- `POST /api/snowflake?action=saveComment` - Create comments
- `POST /api/snowflake?action=loadComments` - Read comments
- `POST /api/snowflake?action=health` - Connection status

## File Structure

```
/
├── comments-app.html      # Main extension interface
├── comments-app.css       # Styling and themes
├── comments-app.js        # Frontend application logic
├── snowflake-live-api.js  # Snowflake integration client
├── api/
│   └── snowflake.js       # Professional REST API
├── lib/
│   └── tableau.extensions.1.13.0.js  # Tableau Extensions API
├── package.json           # Dependencies
└── vercel.json           # Deployment configuration
```

## Database Schema

### POSTS Table
```sql
CREATE TABLE POSTS (
    ID VARCHAR(255) PRIMARY KEY,
    POST_TYPE VARCHAR(100),
    METRIC_VALUE VARCHAR(255),
    METRIC_LABEL VARCHAR(255),
    CONTENT TEXT,              -- Rich HTML content
    AUTHOR VARCHAR(255),
    TIMESTAMP_MS BIGINT,
    LIKES INTEGER DEFAULT 0
);
```

### COMMENTS Table
```sql
CREATE TABLE COMMENTS (
    ID VARCHAR(255) PRIMARY KEY,
    POST_ID VARCHAR(255),
    AUTHOR VARCHAR(255),
    CONTENT TEXT,
    TIMESTAMP_MS BIGINT,
    FOREIGN KEY (POST_ID) REFERENCES POSTS(ID)
);
```

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Vercel Serverless Functions
- **Database**: Snowflake Cloud Data Platform
- **Integration**: Tableau Extensions API v1.13
- **Styling**: Custom CSS with Inter font family
- **Icons**: Font Awesome 6.0

## Deployment

The application is deployed on:
- **Frontend**: GitHub Pages
- **API**: Vercel Serverless Platform
- **Database**: Snowflake Cloud

Live URLs:
- **App**: https://arunchandar99.github.io/tableau-comments-app/
- **API**: https://comments-iwud2flzo-arun-chandars-projects.vercel.app/

---

**Built with professional enterprise-grade architecture for production Tableau deployments.**
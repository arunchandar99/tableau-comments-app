-- Test SQL to verify Snowflake integration works
-- Run this in your Snowflake worksheet first

USE DATABASE TABLEAU_EXTENSIONS;
USE SCHEMA COMMENTS_APP;

-- Insert a sample post with rich text
INSERT INTO POSTS (ID, POST_TYPE, METRIC_VALUE, METRIC_LABEL, CONTENT, AUTHOR, TIMESTAMP_MS, LIKES)
VALUES (
    'test-post-123',
    'Monthly Review',
    '$1.2M (+15%)',
    'Test Revenue',
    '<p>This is a test post with <span style="color: red;">red text</span> and <span style="background-color: yellow;">highlighted text</span>!</p>',
    'Test User',
    1703123456789,
    5
);

-- Verify the insert worked
SELECT * FROM POSTS WHERE ID = 'test-post-123';

-- Check if the rich text content is preserved
SELECT ID, CONTENT FROM POSTS WHERE ID = 'test-post-123';
# Quick Snowflake Trial Setup

## Step 1: Create Trial Account
1. Go to: https://signup.snowflake.com/
2. Click "Start for Free"
3. Use your email address
4. Choose AWS/US-EAST-1 for simplicity
5. Complete verification

## Step 2: Login and Get Account URL
After creation, you'll see something like:
- Account URL: `https://abc1234.snowflakecomputing.com`
- Username: `your_email@domain.com`
- Copy these details

## Step 3: Run Database Setup
1. In Snowflake web interface, click "Worksheets"
2. Copy and paste the SQL from `snowflake-setup.sql`
3. Click "Run All" or press Ctrl+A then Ctrl+Enter
4. Verify tables were created

## Step 4: Update Configuration
I'll update the config file with your details once you provide:
- Account URL (the abc1234.snowflakecomputing.com part)
- Username
- Password

## Step 5: Test Integration
We'll test creating posts with rich text and verify they're stored in Snowflake properly.

---
**Next**: Share your Snowflake account details and I'll configure everything!
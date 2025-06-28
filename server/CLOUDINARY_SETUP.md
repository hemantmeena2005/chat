# Cloudinary Setup for Image Storage

## Why Cloudinary?
Instead of storing images locally (which doesn't work in production), we're using Cloudinary to store images in the cloud.

## Setup Steps:

1. **Sign up for Cloudinary** (Free tier available):
   - Go to https://cloudinary.com/
   - Sign up for a free account

2. **Get your credentials**:
   - After signing up, go to your Dashboard
   - You'll find your:
     - Cloud Name
     - API Key
     - API Secret

3. **Create a .env file** in the server directory:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Replace the placeholder values** in the .env file with your actual Cloudinary credentials.

## Benefits:
- ✅ Images stored in the cloud (accessible from anywhere)
- ✅ Automatic image optimization and resizing
- ✅ CDN for fast image delivery
- ✅ No local storage needed
- ✅ Works perfectly in production

## Free Tier Limits:
- 25 GB storage
- 25 GB bandwidth per month
- Perfect for most small to medium apps

## For Production Deployment:
When you deploy to platforms like Heroku, Railway, or Vercel, you'll need to set these environment variables in your hosting platform's dashboard. 
const fs = require('fs');
const path = require('path');

console.log('🌤️  Cloudinary Setup Helper');
console.log('==========================\n');

console.log('To set up Cloudinary for your chat app:');
console.log('');
console.log('1. Go to https://cloudinary.com/ and sign up for a free account');
console.log('2. After signing up, go to your Dashboard');
console.log('3. Copy your Cloud Name, API Key, and API Secret');
console.log('4. Create a .env file in this directory with the following content:\n');

const envContent = `CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret`;

console.log(envContent);
console.log('\n5. Replace the placeholder values with your actual credentials');
console.log('6. Restart your server');
console.log('\n✅ That\'s it! Your images will now be stored in the cloud.');

// Try to create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n📝 Created .env file for you! Please edit it with your credentials.');
  } catch (error) {
    console.log('\n❌ Could not create .env file automatically. Please create it manually.');
  }
} else {
  console.log('\n📝 .env file already exists. Please check if it has the correct Cloudinary credentials.');
} 
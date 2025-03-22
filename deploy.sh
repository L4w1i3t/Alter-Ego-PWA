#!/bin/bash

# Build the application
echo "Building application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Aborting deployment."
  exit 1
fi

echo "Build completed successfully!"

# Create a production directory if it doesn't exist
mkdir -p production

# Copy the contents of the dist folder to the production directory
echo "Copying build files to production directory..."
cp -r dist/* production/

echo "Deployment preparation complete!"
echo "You can now upload the contents of the 'production' directory to your web server."
echo "To test locally: npx serve -s production"

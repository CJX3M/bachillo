
# Navigate to project root directory (adjust path if needed)
cd "$(dirname "$0")"

# Install dependencies if needed
echo "Installing dependencies..."
cd street-bump-frontend && npm install
cd ../street-bump-backend && npm install
cd ..

# Run both applications using concurrently
echo "Starting development servers..."
concurrently \
  "cd street-bump-frontend && npm run dev" \
  "cd street-bump-backend && npm run dev" \
  --names "FRONTEND,BACKEND" \
  --prefix-colors "bgBlue.bold,bgGreen.bold" \
  --kill-others
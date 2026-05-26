#!/bin/sh

# Force all output to be logged immediately to help debug silent exits
exec 2>&1

echo "=== SERENITY SPA BACKEND STARTUP ==="
echo "Current time: $(date)"
echo "Current user: $(whoami)"
echo "Working directory: $(pwd)"

# Check if critical files exist
echo ""
echo "--- Checking file structure ---"
ls -la dist/ | head -10
echo "..."
ls -la dist/modules/bookings/ 2>/dev/null || echo "WARNING: bookings module missing!"
echo "prisma directory:"
ls -la prisma/ || echo "WARNING: prisma directory missing!"

# Check environment variables
echo ""
echo "--- Environment check ---"
echo "PORT is set to: ${PORT:-NOT SET}"
echo "NODE_ENV is set to: ${NODE_ENV:-NOT SET}"
echo "DATABASE_URL is set to: ${DATABASE_URL:+[REDACTED]}"
echo "REDIS_URL is set to: ${REDIS_URL:+[REDACTED]}"

# --- Database Setup ---
echo ""
echo "--- Running database setup ---"

# Check if migration directory exists and is not empty
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "Migration directory found. Running prisma migrate deploy..."
  npx prisma migrate deploy 2>&1
  MIGRATE_EXIT_CODE=$?
else
  echo "No migrations found. Using prisma db push to create tables..."
  npx prisma db push --accept-data-loss 2>&1
  MIGRATE_EXIT_CODE=$?
fi

if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
    echo "ERROR: Database setup failed with exit code $MIGRATE_EXIT_CODE."
    exit 1
else
    echo "Database setup completed successfully."
fi

# Start the Node.js server
echo ""
echo "--- Starting Node.js server ---"
echo "Server starting on port ${PORT:-4000}..."

# Run the server and keep the output streaming
exec node dist/server.js 2>&1
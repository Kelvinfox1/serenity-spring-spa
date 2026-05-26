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

# Run Prisma migrations
echo ""
echo "--- Running database migrations ---"
npx prisma migrate deploy 2>&1
MIGRATE_EXIT_CODE=$?

if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
    echo "WARNING: Migration failed with exit code $MIGRATE_EXIT_CODE. Attempting to start server anyway..."
else
    echo "Migrations completed successfully."
fi

# Start the Node.js server
echo ""
echo "--- Starting Node.js server ---"
echo "Server starting on port ${PORT:-4000}..."

# Run the server and keep the output streaming
exec node dist/server.js 2>&1
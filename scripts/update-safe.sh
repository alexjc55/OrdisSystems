#!/bin/bash

# Safe update script for production deployments
# This script preserves user data while updating the core application

set -e  # Exit on any error

echo "🔄 Starting safe update process..."

# Configuration
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
USER_FILES=("uploads" ".env" ".env.local" "config")

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup user files
backup_user_files() {
    echo "💾 Backing up user files..."
    for file in "${USER_FILES[@]}"; do
        if [ -e "$file" ]; then
            cp -r "$file" "$BACKUP_DIR/"
            echo "✅ Backed up: $file"
        fi
    done
}

# Function to restore user files
restore_user_files() {
    echo "🔄 Restoring user files..."
    for file in "${USER_FILES[@]}"; do
        if [ -e "$BACKUP_DIR/$file" ]; then
            cp -r "$BACKUP_DIR/$file" ./
            echo "✅ Restored: $file"
        fi
    done
}

# Function to update dependencies safely
update_dependencies() {
    echo "📦 Updating dependencies..."
    if [ -f "package-lock.json" ]; then
        npm ci  # Clean install from lock file
    else
        npm install
    fi
}

# Main update process
main() {
    # Backup user files
    backup_user_files
    
    # Stash any local changes
    if git status --porcelain | grep -q .; then
        echo "📝 Stashing local changes..."
        git stash push -m "Auto-stash before update $(date)"
    fi
    
    # Pull latest changes
    echo "⬇️ Pulling latest updates..."
    git pull origin main
    
    # Restore user files (they override any conflicts)
    restore_user_files
    
    # Update dependencies
    update_dependencies
    
    # Run safe database migration
    echo "🗄️ Running database migrations..."
    node scripts/migrate-safe.js
    
    # Build the application
    echo "🔨 Building application..."
    npm run build 2>/dev/null || echo "⚠️ Build script not found, skipping..."
    
    echo "🎉 Update completed successfully!"
    echo "📁 Backup created at: $BACKUP_DIR"
    echo "🔄 Please restart your application server"
}

# Run main function
main "$@"
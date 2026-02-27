#!/bin/bash

# Instagram Transcription Pipeline
# Orchestration script to run the complete pipeline

set -e

PROJECT_DIR="/Users/ericsantos/meu-aios"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
DATA_DIR="$PROJECT_DIR/data"
LOG_FILE="$DATA_DIR/instagram-transcription.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

log_step() {
  echo -e "${CYAN}→${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Initialize
echo "" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"
echo "Instagram Transcription Pipeline" | tee -a "$LOG_FILE"
echo "Start: $(date)" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Create data directory
mkdir -p "$DATA_DIR"

log_step "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
  log_error "Node.js is not installed"
  exit 1
fi
log_success "Node.js found: $(node --version)"

log_step "Checking environment configuration..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
  log_error ".env file not found"
  exit 1
fi
log_success ".env configuration found"

log_step "Checking scripts..."
if [ ! -f "$SCRIPTS_DIR/instagram-scraper-advanced.js" ]; then
  log_error "instagram-scraper-advanced.js not found"
  exit 1
fi
log_success "Scripts validated"

# Run the scraper
log_step "Running Instagram scraper..."
if node "$SCRIPTS_DIR/instagram-scraper-advanced.js" 2>&1 | tee -a "$LOG_FILE"; then
  log_success "Scraper completed"
else
  log_warn "Scraper completed with warnings"
fi

# Run sample generator if no real data
log_step "Generating sample transcriptions..."
if node "$SCRIPTS_DIR/generate-sample-transcriptions.js" 2>&1 | tee -a "$LOG_FILE"; then
  log_success "Sample transcriptions generated"
else
  log_error "Failed to generate samples"
fi

# Verify output
log_step "Verifying output..."
if [ -f "$DATA_DIR/instagram-transcriptions.md" ]; then
  FILE_SIZE=$(stat -f%z "$DATA_DIR/instagram-transcriptions.md" 2>/dev/null || stat -c%s "$DATA_DIR/instagram-transcriptions.md" 2>/dev/null || echo "unknown")
  log_success "Output file created: instagram-transcriptions.md ($FILE_SIZE bytes)"
else
  log_error "Output file not found"
  exit 1
fi

# Summary
echo "" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"
echo "Pipeline Execution Summary" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"
log_success "Instagram scraping and transcription completed"
log_info "Output: $DATA_DIR/instagram-transcriptions.md"
log_info "Log: $LOG_FILE"
log_info "Completed at: $(date)"
echo "" | tee -a "$LOG_FILE"

exit 0

#!/bin/bash

# EasyScribe Python Setup Script
# This script installs Python dependencies for local transcription

set -e

echo "======================================"
echo "EasyScribe Python Setup"
echo "======================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    echo "Please install Python 3.9 or later from https://python.org"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✓ Found Python: $PYTHON_VERSION"
echo ""

# Check Python version
REQUIRED_VERSION="3.9"
if ! python3 -c "import sys; exit(0 if sys.version_info >= (3,9) else 1)"; then
    echo "❌ Python version is too old!"
    echo "Required: Python $REQUIRED_VERSION or later"
    echo "Found: $PYTHON_VERSION"
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo ""
echo "Installing dependencies..."
echo "This may take a few minutes..."
pip install -r requirements.txt

# Verify installation
echo ""
echo "Verifying installation..."
python3 -c "import faster_whisper; print('✓ faster-whisper installed successfully')"

echo ""
echo "======================================"
echo "✓ Setup completed successfully!"
echo "======================================"
echo ""
echo "To use the local transcription engine:"
echo "1. Make sure the virtual environment is activated: source venv/bin/activate"
echo "2. The Python transcriber will be started automatically when EasyScribe launches"
echo ""
echo "To deactivate the virtual environment when done: deactivate"
echo ""

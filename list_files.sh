#!/bin/bash

# Directory to scan - default to current directory if not provided
DIRECTORY=${1:-.}

# Extensions to ignore - list as space-separated values, e.g., "jpg png gif"
IGNORED_EXTENSIONS="backup md json env"

# Directories to ignore - list as space-separated values, e.g., "node_modules .git"
IGNORED_DIRECTORIES="node_modules .git"

# Allowed file extensions - list as space-separated values, e.g., "js html css"
ALLOWED_EXTENSIONS="js html"

# Convert space-separated lists to arrays
read -ra IGNORED_EXT_ARRAY <<< "$IGNORED_EXTENSIONS"
read -ra IGNORED_DIR_ARRAY <<< "$IGNORED_DIRECTORIES"
read -ra ALLOWED_EXT_ARRAY <<< "$ALLOWED_EXTENSIONS"

# Function to join array elements into a find-compatible string
function join_by { local IFS="$1"; shift; echo "$*"; }

# Build find ignore patterns for directories
IGNORE_DIR_PATTERNS=()
for DIR in "${IGNORED_DIR_ARRAY[@]}"; do
    IGNORE_DIR_PATTERNS+=(-path "*/$DIR/*" -prune -o)
done

# Build find ignore patterns for file extensions
IGNORE_EXT_PATTERNS=()
for EXT in "${IGNORED_EXT_ARRAY[@]}"; do
    IGNORE_EXT_PATTERNS+=(! -name "*.$EXT")
done

# Build find patterns for allowed file extensions
ALLOWED_EXT_PATTERNS=()
if [ ${#ALLOWED_EXT_ARRAY[@]} -ne 0 ]; then
    ALLOWED_EXT_PATTERNS=(-false)
    for EXT in "${ALLOWED_EXT_ARRAY[@]}"; do
        ALLOWED_EXT_PATTERNS+=(-o -name "*.$EXT")
    done
fi

# Execute find command and print contents of files
find "$DIRECTORY" "${IGNORE_DIR_PATTERNS[@]}" \
    \( "${IGNORE_EXT_PATTERNS[@]}" \) \
    \( "${ALLOWED_EXT_PATTERNS[@]}" \) \
    -print | while read -r file; do
        echo "=== $file ==="
        cat "$file"
        echo
        echo "========================================="
        echo
    done

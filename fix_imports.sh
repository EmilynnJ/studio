#!/bin/bash

echo "Fixing import statements with spaces..."

# Find all TypeScript and TSX files
find src -type f -name "*.ts" -o -name "*.tsx" | while read file; do
  # Check if the file contains imports with spaces
  if grep -q "from ' @" "$file"; then
    echo "Fixing: $file"
    # Replace import statements with spaces after single quotes
    sed -i "s/from ' @/from '@/g" "$file"
  fi
done

echo "Done fixing import statements."

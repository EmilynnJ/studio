#!/bin/bash

# Find all TypeScript and TSX files
find src -type f -name "*.ts" -o -name "*.tsx" | while read file; do
  # Replace import statements with spaces after single quotes
  sed -i "s/from ' @/from '@/g" "$file"
  echo "Fixed: $file"
done

#!/bin/bash

# 定义源路径和目标路径
SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="/var/www/share/wave-vsce"

echo "Starting deployment of PRODUCT_SPEC..."

# 创建目标目录（如果不存在）
if [ ! -d "$TARGET_DIR" ]; then
    echo "Creating target directory: $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
fi

# 复制 spec.html
if [ -f "$SOURCE_DIR/spec.html" ]; then
    echo "Copying spec.html..."
    cp "$SOURCE_DIR/spec.html" "$TARGET_DIR/"
else
    echo "Error: spec.html not found in $SOURCE_DIR"
    exit 1
fi

# 复制 screenshots 目录
if [ -d "$SOURCE_DIR/screenshots" ]; then
    echo "Copying screenshots..."
    cp -r "$SOURCE_DIR/screenshots" "$TARGET_DIR/"
else
    echo "Warning: screenshots directory not found in $SOURCE_DIR"
fi

# 复制 package.json
if [ -f "$SOURCE_DIR/package.json" ]; then
    echo "Copying package.json..."
    cp "$SOURCE_DIR/package.json" "$TARGET_DIR/"
fi

# 复制 vsix 文件
echo "Copying .vsix files..."
cp "$SOURCE_DIR"/*.vsix "$TARGET_DIR/" 2>/dev/null || echo "No .vsix files found to copy"

echo "Deployment completed successfully to $TARGET_DIR"

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

# 复制 index.html 和 spec.html
if [ -f "$SOURCE_DIR/index.html" ]; then
    echo "Copying index.html..."
    cp "$SOURCE_DIR/index.html" "$TARGET_DIR/"
fi
if [ -f "$SOURCE_DIR/spec.html" ]; then
    echo "Copying spec.html..."
    cp "$SOURCE_DIR/spec.html" "$TARGET_DIR/"
else
    echo "Error: spec.html not found in $SOURCE_DIR"
    exit 1
fi

# 复制 LOGO.png
if [ -f "$SOURCE_DIR/LOGO.png" ]; then
    echo "Copying LOGO.png..."
    cp "$SOURCE_DIR/LOGO.png" "$TARGET_DIR/"
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

# 复制 releases 目录到目标
echo "Deploying releases/ directory..."
if [ -d "$SOURCE_DIR/releases" ]; then
    mkdir -p "$TARGET_DIR/releases"
    cp "$SOURCE_DIR/releases"/*.vsix "$TARGET_DIR/releases/" 2>/dev/null || echo "No .vsix files found in releases/"
else
    echo "Warning: releases/ directory not found in $SOURCE_DIR"
fi

# 扫描目标目录 releases/ 中的 .vsix 文件，生成 versions.json
echo "Generating versions.json from $TARGET_DIR/releases/..."
python3 -c "
import os, json, glob, re

target = os.path.join('$TARGET_DIR', 'releases')
versions = []
for f in glob.glob(os.path.join(target, '*.vsix')):
    basename = os.path.basename(f)
    m = re.search(r'wave-vscode-chat-(.+)\.vsix', basename)
    if m:
        stat = os.stat(f)
        versions.append({
            'version': m.group(1),
            'filename': 'releases/' + basename,
            'size': stat.st_size,
            'time': stat.st_mtime
        })

# semver 排序（降序）
def semver_key(v):
    parts = v['version'].split('.')
    result = []
    for p in parts:
        num = int(p) if p.isdigit() else 0
        result.append(num)
    return tuple(result)
versions.sort(key=semver_key, reverse=True)

with open(os.path.join('$TARGET_DIR', 'versions.json'), 'w') as out:
    json.dump(versions, out, indent=2)
print(f'Generated versions.json with {len(versions)} versions')
"

echo "Deployment completed successfully to $TARGET_DIR"

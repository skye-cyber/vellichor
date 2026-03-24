#!/bin/bash
echo "🎨 Generating Vellichor desktop icons..."

# Install dependencies if needed
# npm install -g svgexport

svgexport icon.svg ../icons/desktop/icon-16.png 16x16
svgexport icon.svg ../icons/desktop/icon-32.png 32x32
svgexport icon.svg ../icons/desktop/icon-48.png 48x48
svgexport icon.svg ../icons/desktop/icon-64.png 64x64
svgexport icon.svg ../icons/desktop/icon-128.png 128x128
svgexport icon.svg ../icons/desktop/icon-256.png 256x256
svgexport icon.svg ../icons/desktop/icon-512.png 512x512
svgexport icon.svg ../icons/desktop/icon-512.png 1024x1024

cp ../icons/icon-512.png ../assets/vellichor.png

# Create an .ico file
convert "$(ls ../icons/)" ../assets

# Convert to icns
convert "$(ls ../icons/)" ../assets/*.icns

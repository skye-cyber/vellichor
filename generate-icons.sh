#!/bin/bash
echo "🎨 Generating Vellichor icons..."

mkdir -p icons/{android,ios,web,desktop}

# Install dependencies if needed
# npm install -g svgexport

# Android
mkdir -p icons/android/{mipmap-hdpi,mipmap-mdpi,mipmap-xhdpi,mipmap-xxhdpi,mipmap-xxxhdpi}
svgexport icon.svg icons/android/mipmap-hdpi/ic_launcher.png 48x48
svgexport icon.svg icons/android/mipmap-mdpi/ic_launcher.png 72x72
svgexport icon.svg icons/android/mipmap-xhdpi/ic_launcher.png 96x96
svgexport icon.svg icons/android/mipmap-xxhdpi/ic_launcher.png 144x144
svgexport icon.svg icons/android/mipmap-xxxhdpi/ic_launcher.png 192x192
svgexport icon_round.svg icons/android/mipmap-hdpi/ic_launcher_round.png 48x48
svgexport icon_round.svg icons/android/mipmap-mdpi/ic_launcher_round.png 72x72
svgexport icon_round.svg icons/android/mipmap-xhdpi/ic_launcher_round.png 96x96
svgexport icon_round.svg icons/android/mipmap-xxhdpi/ic_launcher_round.png 144x144
svgexport icon_round.svg icons/android/mipmap-xxxhdpi/ic_launcher_round.png 192x192

# iOS
svgexport icon.svg icons/ios/Icon-20.png 20x20
svgexport icon.svg icons/ios/Icon-29.png 29x29
svgexport icon.svg icons/ios/Icon-40.png 40x40
svgexport icon.svg icons/ios/Icon-58.png 58x58
svgexport icon.svg icons/ios/Icon-60.png 60x60
svgexport icon.svg icons/ios/Icon-76.png 76x76
svgexport icon.svg icons/ios/Icon-80.png 80x80
svgexport icon.svg icons/ios/Icon-87.png 87x87
svgexport icon.svg icons/ios/Icon-120.png 120x120
svgexport icon.svg icons/ios/Icon-152.png 152x152
svgexport icon.svg icons/ios/Icon-167.png 167x167
svgexport icon.svg icons/ios/Icon-180.png 180x180
svgexport icon.svg icons/ios/Icon-1024.png 1024x1024

# Desktop
svgexport icon.svg icons/desktop/icon-16.png 16x16
svgexport icon.svg icons/desktop/icon-32.png 32x32
svgexport icon.svg icons/desktop/icon-48.png 48x48
svgexport icon.svg icons/desktop/icon-64.png 64x64
svgexport icon.svg icons/desktop/icon-128.png 128x128
svgexport icon.svg icons/desktop/icon-256.png 256x256
svgexport icon.svg icons/desktop/icon-512.png 512x512
svgexport icon.svg icons/desktop/icon-512.png 1024x1024
cp -r icons/desktop/* desktop/src/icons

# Web/favicon
svgexport icon.svg icons/web/favicon-16.png 16x16
svgexport icon.svg icons/web/favicon-32.png 32x32
svgexport icon.svg icons/web/apple-touch-icon.png 180x180

echo "✅ Icons generated in ./icons directory"

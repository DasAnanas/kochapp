#!/bin/bash
# Native Universal-App für Apple Silicon und Intel; benötigt Xcode Command Line Tools.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
APP="$BUILD/Kochapp.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web" "$BUILD/cache"
for file in index.html style.css data.js logic.js order.js app.js; do
    cp "$ROOT/$file" "$APP/Contents/Resources/web/"
done
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Kochapp</string>
<key>CFBundleIdentifier</key><string>de.dasananas.kochapp</string>
<key>CFBundleName</key><string>Kochapp</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>11.3</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
for arch in arm64 x86_64; do
    xcrun clang "$ROOT/desktop/MainMac.m" -O2 -fobjc-arc -target "$arch-apple-macosx11.3" -framework Cocoa -framework WebKit -o "$BUILD/Kochapp-$arch"
done
xcrun lipo -create "$BUILD/Kochapp-arm64" "$BUILD/Kochapp-x86_64" -output "$APP/Contents/MacOS/Kochapp"
codesign --force --sign - "$APP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ROOT/Kochapp-macOS.zip"
echo "Fertig: $ROOT/Kochapp-macOS.zip"

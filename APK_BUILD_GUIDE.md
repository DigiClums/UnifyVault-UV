# 🛠️ UnifyVault Android APK Build & Deployment Guide

## Prerequisites

- **Node.js**: v20+ / pnpm v9+
- **Android Studio / Android SDK**: API Level 34+ (Android 14)
- **Java Development Kit (JDK)**: OpenJDK 17 or 21

---

## 1. Web Client Build

Build the production web client:

```bash
# 1. Install dependencies
pnpm install

# 2. Build web application
cd apps/web-v2
pnpm build
```

---

## 2. Capacitor Android Project Setup

Initialize and sync Capacitor with the Android project:

```bash
cd apps/web-v2

# 1. Add Android platform (if not already added)
npx cap add android

# 2. Sync web bundle to Android assets
npx cap sync android
```

---

## 3. Compiling the Standalone APK

### Debug APK (For Testing):
```bash
cd apps/web-v2/android
./gradlew assembleDebug

# Output APK:
# apps/web-v2/android/app/build/outputs/apk/debug/app-debug.apk
```

### Release Signed APK (For Production):
```bash
cd apps/web-v2/android
./gradlew assembleRelease

# Output APK:
# apps/web-v2/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 4. Required Android Permissions (`AndroidManifest.xml`)

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="xyz.unifyvault.app">

    <!-- Network Access for Blockchain RPC & XMTP -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Camera & Storage for QR Scanning and Local Receipt Selection -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

</manifest>
```

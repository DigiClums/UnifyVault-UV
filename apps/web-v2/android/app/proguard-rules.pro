# ProGuard & R8 Optimization Rules for UnifyVault Android

# Preserve Javascript Interfaces for Bridge & Native Updater
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepclassmembers class xyz.unifyvault.app.MainActivity$NativeAppUpdater {
    public *;
}

-keep class xyz.unifyvault.app.** { *; }

# Firebase Messaging
-dontwarn com.google.firebase.**
-keep class com.google.firebase.** { *; }

# Capacitor Plugins & Core Bridge
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }

# Optimization & Code Shrinking
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

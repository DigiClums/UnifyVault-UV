package xyz.unifyvault.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {

    private File pendingInstallApk = null;
    private boolean bridgeInjected = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureEdgeToEdgeStatusBar();
        setupNativeBridge();
        requestNotificationPermission();
        subscribeToNotificationTopics();
        handleNotificationIntent(getIntent());
    }

    private void configureEdgeToEdgeStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        }
        applyStatusBarIcons(false); // default dark theme (white icons)
    }

    public void applyStatusBarIcons(boolean isLightTheme) {
        new Handler(Looper.getMainLooper()).post(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
                androidx.core.view.WindowInsetsControllerCompat controller = 
                    androidx.core.view.WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
                if (controller != null) {
                    // isLightTheme = true means light app background -> dark/black icons
                    // isLightTheme = false means dark app background -> light/white icons
                    controller.setAppearanceLightStatusBars(isLightTheme);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                int flags = getWindow().getDecorView().getSystemUiVisibility();
                if (isLightTheme) {
                    flags |= android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                } else {
                    flags &= ~android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                }
                getWindow().getDecorView().setSystemUiVisibility(flags);
            }
        });
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.POST_NOTIFICATIONS
            ) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                androidx.core.app.ActivityCompat.requestPermissions(
                    this,
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                    101
                );
            }
        }
    }

    private void subscribeToNotificationTopics() {
        try {
            com.google.firebase.messaging.FirebaseMessaging.getInstance()
                .subscribeToTopic("unifyvault-updates");
            com.google.firebase.messaging.FirebaseMessaging.getInstance()
                .subscribeToTopic("unifyvault-announcements");
        } catch (Exception ignored) {}
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        setupNativeBridge();

        // If user was prompted to enable unknown sources and returns with permission granted
        if (pendingInstallApk != null && pendingInstallApk.exists()) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                File apkToInstall = pendingInstallApk;
                pendingInstallApk = null;
                installApk(apkToInstall);
            }
        }
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent == null || intent.getExtras() == null) return;
        String clickAction = intent.getStringExtra("click_action");

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView webView = this.bridge.getWebView();

                if ("OPEN_UPDATE_MODAL".equals(clickAction) || intent.hasExtra("version")) {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('open-update-modal'));",
                        null
                    );
                } else if ("NAVIGATE".equals(clickAction)) {
                    String targetUrl = intent.getStringExtra("target_url");
                    if (targetUrl != null && !targetUrl.isEmpty()) {
                        webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('notification-navigate', { detail: { url: '" + targetUrl + "' } }));",
                            null
                        );
                    }
                } else if ("DIRECT_UPDATE".equals(clickAction)) {
                    String downloadUrl = intent.getStringExtra("download_url");
                    if (downloadUrl != null && !downloadUrl.isEmpty()) {
                        NativeAppUpdater updater = new NativeAppUpdater(this, webView);
                        updater.downloadAndInstallApk(downloadUrl, "UnifyVault-latest.apk");
                    } else {
                        webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('open-update-modal'));",
                            null
                        );
                    }
                }
            }
        }, 1000);
    }

    private void setupNativeBridge() {
        if (!bridgeInjected && this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.addJavascriptInterface(new NativeAppUpdater(this, webView), "AndroidNativeUpdater");
            bridgeInjected = true;
        }
    }

    public class NativeAppUpdater {
        private final MainActivity activity;
        private final WebView webView;
        private BroadcastReceiver activeReceiver;

        public NativeAppUpdater(MainActivity activity, WebView webView) {
            this.activity = activity;
            this.webView = webView;
        }

        @JavascriptInterface
        public void setStatusBarTheme(String theme) {
            boolean isLight = "light".equalsIgnoreCase(theme);
            activity.applyStatusBarIcons(isLight);
        }

        @JavascriptInterface
        public void downloadAndInstallApk(String apkUrl, String fileName) {
            try {
                String targetName = (fileName != null && !fileName.trim().isEmpty()) ? fileName.trim() : "UnifyVault-update.apk";
                File destination = new File(
                    activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
                    targetName
                );

                if (destination.exists()) {
                    destination.delete();
                }

                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
                request.setTitle("UnifyVault Update");
                request.setDescription("Downloading " + targetName);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationUri(Uri.fromFile(destination));
                request.setMimeType("application/vnd.android.package-archive");

                DownloadManager downloadManager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
                if (downloadManager == null) {
                    notifyWeb("downloadFailed", 0);
                    fallbackToBrowser(apkUrl);
                    return;
                }

                if (activeReceiver != null) {
                    try {
                        activity.unregisterReceiver(activeReceiver);
                    } catch (Exception ignored) {}
                }

                final long[] trackedDownloadId = new long[] { -1L };

                activeReceiver = new BroadcastReceiver() {
                    @Override
                    public void onReceive(Context ctxt, Intent intent) {
                        long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                        if (id == trackedDownloadId[0] && id != -1L) {
                            DownloadManager.Query query = new DownloadManager.Query();
                            query.setFilterById(id);
                            Cursor cursor = downloadManager.query(query);
                            boolean isSuccess = false;
                            if (cursor != null) {
                                if (cursor.moveToFirst()) {
                                    int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                                    isSuccess = (status == DownloadManager.STATUS_SUCCESSFUL);
                                }
                                cursor.close();
                            }

                            if (isSuccess && destination.exists()) {
                                notifyWeb("downloadComplete", 100);
                                installApk(destination);
                            } else {
                                notifyWeb("downloadFailed", 0);
                            }

                            try {
                                activity.unregisterReceiver(this);
                            } catch (Exception ignored) {}
                            activeReceiver = null;
                        }
                    }
                };

                // Register receiver BEFORE enqueueing to eliminate any race condition
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    activity.registerReceiver(
                        activeReceiver,
                        new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                        Context.RECEIVER_EXPORTED
                    );
                } else {
                    activity.registerReceiver(
                        activeReceiver,
                        new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
                    );
                }

                final long downloadId = downloadManager.enqueue(request);
                trackedDownloadId[0] = downloadId;
                trackProgress(downloadManager, downloadId);

            } catch (Exception e) {
                e.printStackTrace();
                notifyWeb("downloadFailed", 0);
                fallbackToBrowser(apkUrl);
            }
        }

        private void trackProgress(DownloadManager dm, long downloadId) {
            Handler handler = new Handler(Looper.getMainLooper());
            handler.post(new Runnable() {
                @Override
                public void run() {
                    DownloadManager.Query query = new DownloadManager.Query();
                    query.setFilterById(downloadId);
                    Cursor cursor = dm.query(query);
                    if (cursor != null) {
                        if (cursor.moveToFirst()) {
                            int bytesDownloaded = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                            int bytesTotal = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                            cursor.close();

                            if (bytesTotal > 0) {
                                int progress = (int) ((bytesDownloaded * 100L) / bytesTotal);
                                notifyWeb("downloadProgress", progress);
                            }

                            if (status == DownloadManager.STATUS_FAILED) {
                                notifyWeb("downloadFailed", 0);
                                return;
                            }

                            if (status != DownloadManager.STATUS_SUCCESSFUL) {
                                handler.postDelayed(this, 300);
                            }
                        } else {
                            cursor.close();
                        }
                    }
                }
            });
        }

        private void notifyWeb(String event, int progress) {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (webView != null) {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('native-updater-" + event + "', { detail: { progress: " + progress + " } }));",
                        null
                    );
                }
            });
        }

        private void fallbackToBrowser(String apkUrl) {
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl));
                browserIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(browserIntent);
            } catch (Exception ignored) {}
        }
    }

    private void installApk(File apkFile) {
        if (apkFile == null || !apkFile.exists()) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getPackageManager().canRequestPackageInstalls()) {
                pendingInstallApk = apkFile;
                Intent allowIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                allowIntent.setData(Uri.parse("package:" + getPackageName()));
                allowIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(allowIntent);
                return;
            }
        }

        pendingInstallApk = null;

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        Uri apkUri = FileProvider.getUriForFile(
            this,
            getPackageName() + ".fileprovider",
            apkFile
        );

        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        startActivity(intent);
    }
}

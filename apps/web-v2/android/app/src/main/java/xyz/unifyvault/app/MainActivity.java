package xyz.unifyvault.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Inject Native App Updater Interface into Capacitor WebView
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.addJavascriptInterface(new NativeAppUpdater(this), "AndroidNativeUpdater");
        }
    }

    public class NativeAppUpdater {
        private Context context;

        public NativeAppUpdater(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void downloadAndInstallApk(String apkUrl) {
            try {
                File destination = new File(
                    context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
                    "unifyvault-update.apk"
                );

                if (destination.exists()) {
                    destination.delete();
                }

                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
                request.setTitle("UnifyVault Update");
                request.setDescription("Downloading latest version...");
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationUri(Uri.fromFile(destination));
                request.setMimeType("application/vnd.android.package-archive");

                DownloadManager downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
                final long downloadId = downloadManager.enqueue(request);

                BroadcastReceiver onComplete = new BroadcastReceiver() {
                    @Override
                    public void onReceive(Context ctxt, Intent intent) {
                        long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                        if (id == downloadId) {
                            try {
                                installApk(destination);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                            context.unregisterReceiver(this);
                        }
                    }
                };

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    context.registerReceiver(
                        onComplete,
                        new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                        Context.RECEIVER_EXPORTED
                    );
                } else {
                    context.registerReceiver(
                        onComplete,
                        new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
                    );
                }
            } catch (Exception e) {
                e.printStackTrace();
                // Fallback to browser intent
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl));
                context.startActivity(browserIntent);
            }
        }

        private void installApk(File apkFile) {
            if (!apkFile.exists()) return;

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            context.startActivity(intent);
        }
    }
}

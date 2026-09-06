package xyz.unifyvault.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class UnifyVaultMessagingService extends FirebaseMessagingService {

    public static final String CHANNEL_UPDATES = "unifyvault_updates_channel";
    public static final String CHANNEL_P2P = "unifyvault_p2p_channel";
    public static final String CHANNEL_TRANSACTIONS = "unifyvault_tx_channel";
    public static final String CHANNEL_GENERAL = "unifyvault_general_channel";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String title = "UnifyVault Alert";
        String body = "You have a new update in UnifyVault.";
        String type = "general";
        String link = "/";
        String version = "";
        String downloadUrl = "";

        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null) {
                title = remoteMessage.getNotification().getTitle();
            }
            if (remoteMessage.getNotification().getBody() != null) {
                body = remoteMessage.getNotification().getBody();
            }
        }

        if (data != null && !data.isEmpty()) {
            if (data.containsKey("title")) title = data.get("title");
            if (data.containsKey("body")) body = data.get("body");
            if (data.containsKey("type")) type = data.get("type");
            if (data.containsKey("link")) link = data.get("link");
            if (data.containsKey("version")) version = data.get("version");
            if (data.containsKey("downloadUrl")) downloadUrl = data.get("downloadUrl");
        }

        dispatchNotification(title, body, type, link, version, downloadUrl);
    }

    private void dispatchNotification(
            String title,
            String body,
            String type,
            String link,
            String version,
            String downloadUrl
    ) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        createNotificationChannels(notificationManager);

        String channelId = CHANNEL_GENERAL;
        int notificationId = (int) System.currentTimeMillis();

        if ("p2p".equalsIgnoreCase(type)) {
            channelId = CHANNEL_P2P;
            if (link == null || link.isEmpty() || "/".equals(link)) {
                link = "/p2p";
            }
        } else if ("tx".equalsIgnoreCase(type) || "wallet".equalsIgnoreCase(type) || "staking".equalsIgnoreCase(type)) {
            channelId = CHANNEL_TRANSACTIONS;
            if (link == null || link.isEmpty() || "/".equals(link)) {
                link = "staking".equalsIgnoreCase(type) ? "/staking" : "/portfolio";
            }
        } else if ("update".equalsIgnoreCase(type) || (version != null && !version.isEmpty())) {
            channelId = CHANNEL_UPDATES;
            notificationId = 1001; // deterministic id for updates
        }

        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        if (CHANNEL_UPDATES.equals(channelId)) {
            contentIntent.putExtra("click_action", "OPEN_UPDATE_MODAL");
            if (version != null && !version.isEmpty()) {
                contentIntent.putExtra("version", version);
            }
        } else {
            contentIntent.putExtra("click_action", "NAVIGATE");
            contentIntent.putExtra("target_url", link);
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingContentIntent = PendingIntent.getActivity(
                this,
                notificationId,
                contentIntent,
                flags
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingContentIntent);

        // If it is an update notification and downloadUrl is present, add direct "Update Now" action button
        if (CHANNEL_UPDATES.equals(channelId)) {
            Intent updateNowIntent = new Intent(this, MainActivity.class);
            updateNowIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            updateNowIntent.putExtra("click_action", "DIRECT_UPDATE");
            if (downloadUrl != null && !downloadUrl.isEmpty()) {
                updateNowIntent.putExtra("download_url", downloadUrl);
            }
            if (version != null && !version.isEmpty()) {
                updateNowIntent.putExtra("version", version);
            }

            PendingIntent pendingUpdateNowIntent = PendingIntent.getActivity(
                    this,
                    1002,
                    updateNowIntent,
                    flags
            );

            builder.addAction(
                    android.R.drawable.stat_sys_download,
                    "Update Now",
                    pendingUpdateNowIntent
            );
        } else if (CHANNEL_P2P.equals(channelId)) {
            Intent viewOrderIntent = new Intent(this, MainActivity.class);
            viewOrderIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            viewOrderIntent.putExtra("click_action", "NAVIGATE");
            viewOrderIntent.putExtra("target_url", link);

            PendingIntent pendingViewOrderIntent = PendingIntent.getActivity(
                    this,
                    notificationId + 1,
                    viewOrderIntent,
                    flags
            );

            builder.addAction(
                    android.R.drawable.ic_menu_view,
                    "View Order",
                    pendingViewOrderIntent
            );
        }

        notificationManager.notify(notificationId, builder.build());
    }

    private void createNotificationChannels(NotificationManager notificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel updateChannel = new NotificationChannel(
                    CHANNEL_UPDATES,
                    "App Updates",
                    NotificationManager.IMPORTANCE_HIGH
            );
            updateChannel.setDescription("Notifications and actions for new UnifyVault application updates");
            updateChannel.enableVibration(true);
            updateChannel.enableLights(true);
            updateChannel.setLightColor(Color.GREEN);

            NotificationChannel p2pChannel = new NotificationChannel(
                    CHANNEL_P2P,
                    "P2P Escrow & Trading",
                    NotificationManager.IMPORTANCE_HIGH
            );
            p2pChannel.setDescription("Critical notifications for P2P orders, buyer match, and escrow payments");
            p2pChannel.enableVibration(true);
            p2pChannel.enableLights(true);
            p2pChannel.setLightColor(Color.YELLOW);

            NotificationChannel txChannel = new NotificationChannel(
                    CHANNEL_TRANSACTIONS,
                    "Transactions & Rewards",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            txChannel.setDescription("Alerts for on-chain deposits, transfers, and staking reward distributions");

            NotificationChannel generalChannel = new NotificationChannel(
                    CHANNEL_GENERAL,
                    "General Announcements",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            generalChannel.setDescription("Important news, protocol maintenance, and market alerts");

            notificationManager.createNotificationChannel(updateChannel);
            notificationManager.createNotificationChannel(p2pChannel);
            notificationManager.createNotificationChannel(txChannel);
            notificationManager.createNotificationChannel(generalChannel);
        }
    }
}

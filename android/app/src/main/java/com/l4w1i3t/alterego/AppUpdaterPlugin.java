package com.l4w1i3t.alterego;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Downloads a release APK and hands it to the system package installer.
 *
 * Android has no silent self-update outside the Play Store, and that is a
 * feature: the install is always confirmed by the user on a system dialog. What
 * this plugin removes is the tedium of finding the file in a browser's download
 * list.
 *
 * On user data: because the downloaded APK carries the same applicationId and
 * is signed with the same release key as the running app, the installer treats
 * it as an upgrade and leaves app storage -- the WebView's localStorage and
 * IndexedDB, i.e. every conversation, persona, voice model and key -- exactly
 * where it is. If the signature does NOT match, Android refuses the install
 * rather than replacing anything, so a mismatched build can never silently
 * destroy data; the user simply stays on the version they have.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    /** Release artifacts only ever come from GitHub. */
    private static final Set<String> ALLOWED_HOSTS = new HashSet<>(Arrays.asList(
        "github.com",
        "api.github.com",
        "objects.githubusercontent.com",
        "release-assets.githubusercontent.com"
    ));

    private static final int MAX_REDIRECTS = 5;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    /**
     * True when this build may install packages. On API 26+ the user grants
     * this per-app; below that the manifest permission is enough.
     */
    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        boolean allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
        result.put("value", allowed);
        call.resolve(result);
    }

    /** Opens the system screen where "install unknown apps" is granted. */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    /**
     * Downloads `url` into cache and launches the installer.
     *
     * Progress is reported to JS via the "downloadProgress" event.
     */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String url = call.getString("url");
        final String fileName = call.getString("fileName", "alterego-update.apk");

        if (url == null || !url.startsWith("https://")) {
            call.reject("Refusing to download from a non-HTTPS URL");
            return;
        }

        try {
            String host = new URL(url).getHost();
            if (!ALLOWED_HOSTS.contains(host)) {
                call.reject("Refusing to download from " + host);
                return;
            }
        } catch (Exception e) {
            call.reject("Malformed URL", e);
            return;
        }

        // Strip any directory components a release asset name might contain.
        final String safeName = new File(fileName).getName();

        executor.execute(() -> {
            try {
                File target = download(url, safeName);
                launchInstaller(target);

                JSObject result = new JSObject();
                result.put("path", target.getAbsolutePath());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Update download failed: " + e.getMessage(), e);
            }
        });
    }

    private File download(String url, String fileName) throws Exception {
        // Written to the external cache dir because that is what file_paths.xml
        // exposes through the FileProvider; the installer runs in another
        // process and needs a readable content:// URI.
        File dir = new File(getContext().getExternalCacheDir(), "updates");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IllegalStateException("Could not create update directory");
        }

        File target = new File(dir, fileName);
        if (target.exists() && !target.delete()) {
            throw new IllegalStateException("Could not clear previous download");
        }

        String current = url;
        HttpURLConnection connection = null;

        // GitHub redirects release assets to a storage host; HttpURLConnection
        // will not follow a redirect that changes protocol, so follow manually.
        for (int redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
            connection = (HttpURLConnection) new URL(current).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(30000);
            connection.connect();

            int status = connection.getResponseCode();
            if (status == HttpURLConnection.HTTP_MOVED_PERM
                || status == HttpURLConnection.HTTP_MOVED_TEMP
                || status == HttpURLConnection.HTTP_SEE_OTHER
                || status == 307
                || status == 308) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null) throw new IllegalStateException("Redirect without Location");
                String host = new URL(location).getHost();
                if (!ALLOWED_HOSTS.contains(host)) {
                    throw new SecurityException("Redirected to disallowed host " + host);
                }
                current = location;
                continue;
            }

            if (status != HttpURLConnection.HTTP_OK) {
                connection.disconnect();
                throw new IllegalStateException("HTTP " + status);
            }
            break;
        }

        long total = connection.getContentLengthLong();
        long written = 0;
        int lastReported = -1;

        try (InputStream in = connection.getInputStream();
             OutputStream out = new FileOutputStream(target)) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                written += read;

                if (total > 0) {
                    int percent = (int) (written * 100 / total);
                    // Only emit on change, otherwise this floods the bridge.
                    if (percent != lastReported) {
                        lastReported = percent;
                        JSObject progress = new JSObject();
                        progress.put("percent", percent);
                        progress.put("bytes", written);
                        progress.put("total", total);
                        notifyListeners("downloadProgress", progress);
                    }
                }
            }
        } finally {
            connection.disconnect();
        }

        return target;
    }

    private void launchInstaller(File apk) {
        Uri uri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apk);

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}

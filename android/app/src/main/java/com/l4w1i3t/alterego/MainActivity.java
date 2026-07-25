package com.l4w1i3t.alterego;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsCompat.Type;

import com.getcapacitor.BridgeActivity;

/**
 * Keeps the web layer out from under the system bars.
 *
 * From Android 15 (targetSdk 35) the activity is forced edge-to-edge, so the
 * WebView is laid out behind the status bar at the top and the gesture /
 * navigation bar at the bottom. The CSS `env(safe-area-inset-*)` values the web
 * layer uses are not a fix on their own here: Android's WebView reports only
 * display-cutout insets through them, never the status or navigation bar. On a
 * phone without a notch every inset resolves to 0 and the app draws straight
 * under the clock and the gesture pill.
 *
 * So the padding is applied natively instead. The bar and cutout insets are
 * then zeroed on the way down, so nothing downstream -- including the WebView's
 * own `env(safe-area-inset-*)` on a notched device -- applies them a second
 * time.
 *
 * The IME inset is deliberately left intact rather than returning CONSUMED.
 * The message composer sits at the bottom of the screen, so the WebView needs
 * to know when the keyboard is up; together with
 * windowSoftInputMode="adjustResize" in the manifest the window shrinks and the
 * web layout follows it.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Must be registered before super.onCreate, which is where the Capacitor
        // bridge is built and the plugin list is frozen.
        registerPlugin(AppUpdaterPlugin.class);

        super.onCreate(savedInstanceState);

        final View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                Type.systemBars() | Type.displayCutout()
            );
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);

            return new WindowInsetsCompat.Builder(windowInsets)
                .setInsets(Type.systemBars(), Insets.NONE)
                .setInsets(Type.displayCutout(), Insets.NONE)
                .build();
        });
    }
}

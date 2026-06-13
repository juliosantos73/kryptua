package com.kryptua.vault;

import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    static final String PREFS_NAME = "KryptuaSettings";
    static final String KEY_SCREENSHOT = "screenshotProtection";

    private FrameLayout privacyOverlay;

    // JavaScript interface — called from JS via window.KryptuaNative.setScreenshotProtection(bool)
    // @JavascriptInterface runs on a background thread, so runOnUiThread is required.
    final class NativeBridge {
        @JavascriptInterface
        public void setScreenshotProtection(final boolean protect) {
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_SCREENSHOT, protect)
                .apply();
            runOnUiThread(() -> applyFlag(protect));
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Apply before any content is drawn
        applyFlagFromPrefs();

        super.onCreate(savedInstanceState);

        getBridge().getWebView().getSettings().setMixedContentMode(
            WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        );

        // Expose native bridge to JavaScript — no Capacitor plugin registration needed
        getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "KryptuaNative");

        buildPrivacyOverlay();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyFlagFromPrefs();
    }

    private void applyFlagFromPrefs() {
        boolean protect = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getBoolean(KEY_SCREENSHOT, false);
        applyFlag(protect);
    }

    private void applyFlag(boolean protect) {
        if (protect) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
    }

    private void buildPrivacyOverlay() {
        privacyOverlay = new FrameLayout(this);
        privacyOverlay.setBackgroundColor(Color.parseColor("#0f0f1a"));

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER_HORIZONTAL);

        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher_round);
        int iconSize = dpToPx(72);
        LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(iconSize, iconSize);
        iconLp.bottomMargin = dpToPx(20);
        col.addView(icon, iconLp);

        TextView name = new TextView(this);
        name.setText("Kryptua");
        name.setTextColor(Color.WHITE);
        name.setTextSize(26);
        name.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        name.setLetterSpacing(0.12f);
        col.addView(name, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        TextView sub = new TextView(this);
        sub.setText("A criptografia é tua");
        sub.setTextColor(Color.parseColor("#8888aa"));
        sub.setTextSize(13);
        sub.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        subLp.topMargin = dpToPx(6);
        col.addView(sub, subLp);

        FrameLayout.LayoutParams colLp = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        colLp.gravity = Gravity.CENTER;
        privacyOverlay.addView(col, colLp);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus) {
            showPrivacyOverlay();
        } else {
            hidePrivacyOverlay();
        }
    }

    private void showPrivacyOverlay() {
        if (privacyOverlay != null && privacyOverlay.getParent() == null) {
            addContentView(privacyOverlay, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ));
        }
    }

    private void hidePrivacyOverlay() {
        if (privacyOverlay != null && privacyOverlay.getParent() != null) {
            ((ViewGroup) privacyOverlay.getParent()).removeView(privacyOverlay);
        }
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }
}

package com.kryptua.vault;

import android.content.Context;
import android.content.SharedPreferences;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Security")
public class SecurityPlugin extends Plugin {

    static final String PREFS_NAME = "KryptuaSettings";
    static final String KEY_SCREENSHOT_PROTECTION = "screenshotProtection";

    // PluginMethod runs on the UI thread by default in Capacitor — no runOnUiThread needed.
    @PluginMethod
    public void setScreenshotProtection(PluginCall call) {
        Boolean enable = call.getBoolean("enable", false);
        boolean protect = Boolean.TRUE.equals(enable);

        // Persist so MainActivity can apply on the next cold start
        getContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_SCREENSHOT_PROTECTION, protect)
            .apply();

        // Apply immediately — already on UI thread
        applyToWindow(protect);

        call.resolve();
    }

    static void applyToWindow(android.app.Activity activity, boolean protect) {
        if (protect) {
            activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        } else {
            activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
    }

    private void applyToWindow(boolean protect) {
        applyToWindow(getActivity(), protect);
    }
}

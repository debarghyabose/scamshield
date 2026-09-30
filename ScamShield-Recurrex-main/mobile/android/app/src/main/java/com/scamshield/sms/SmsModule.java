package com.scamshield.sms;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class SmsModule extends ReactContextBaseJavaModule {
    private static SmsModule instance;
    private final ReactApplicationContext reactContext;

    public SmsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        instance = this;
    }

    public static SmsModule getInstance() {
        return instance;
    }

    @Override
    public String getName() {
        return "SmsModule";
    }

    @ReactMethod
    public void checkPermission(Promise promise) {
        try {
            int receivePerm = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECEIVE_SMS);
            int readPerm = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_SMS);
            promise.resolve(receivePerm == PackageManager.PERMISSION_GRANTED && readPerm == PackageManager.PERMISSION_GRANTED);
        } catch (Exception e) {
            promise.reject("ERR_SMS_PERM_CHECK", e.getMessage());
        }
    }

    @ReactMethod
    public void openSettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", reactContext.getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERR_OPEN_SETTINGS", e.getMessage());
        }
    }

    public void onSmsReceived(String sender, String body, long timestamp) {
        if (reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putString("sender", sender);
            params.putString("body", body);
            params.putDouble("timestamp", timestamp);

            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onSmsReceived", params);
        }
    }
}

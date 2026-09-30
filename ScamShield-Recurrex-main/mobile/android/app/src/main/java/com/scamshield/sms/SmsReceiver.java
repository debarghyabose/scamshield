package com.scamshield.sms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "ScamShieldSmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        try {
            Object[] pdus = (Object[]) bundle.get("pdus");
            String format = bundle.getString("format");

            if (pdus == null) return;

            StringBuilder fullBody = new StringBuilder();
            String sender = "";
            long timestamp = System.currentTimeMillis();

            for (Object pdu : pdus) {
                SmsMessage smsMessage;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                }

                if (smsMessage != null) {
                    if (sender.isEmpty()) {
                        sender = smsMessage.getDisplayOriginatingAddress();
                        timestamp = smsMessage.getTimestampMillis();
                    }
                    fullBody.append(smsMessage.getMessageBody());
                }
            }

            String messageText = fullBody.toString();
            Log.d(TAG, "Incoming SMS detected from: " + sender);

            // Forward to active React Native module instance
            SmsModule instance = SmsModule.getInstance();
            if (instance != null) {
                instance.onSmsReceived(sender, messageText, timestamp);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing incoming SMS: " + e.getMessage(), e);
        }
    }
}

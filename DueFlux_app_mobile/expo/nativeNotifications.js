const Notifications = require('expo-notifications');
const { Platform } = require('react-native');
const Crypto = require('expo-crypto');
const ProtectedStorage = require('./protectedStorage');
const projectId = require('./app.json').expo.extra.eas.projectId;

Notifications.setNotificationHandler({ handleNotification: async () => ({
  shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
}) });

async function register(call) {
  if (ProtectedStorage.isLocked()) throw new Error('Vault locked');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('dueflux-reminders', {
    name: 'DueFlux', importance: Notifications.AndroidImportance.DEFAULT,
  });
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Permission not granted');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  let deviceId = await ProtectedStorage.getItem('df_notification_device');
  if (!deviceId) { deviceId = Crypto.randomUUID(); await ProtectedStorage.setItem('df_notification_device', deviceId); }
  await call({ action: 'registerPush', token, deviceId });
}
function listen(uid, call, open) {
  let active = true;
  async function received(notification, selected) {
    const payload = notification?.request?.content?.data;
    if (!active || ProtectedStorage.isLocked() || payload?.ownerUid !== uid || typeof payload.reminderId !== 'string' || typeof payload.nonce !== 'string') return;
    try { await call({ action: 'ackReminder', reminderId: payload.reminderId, nonce: payload.nonce }); }
    catch (_) { /* Provider acceptance remains 'sent' until a device acknowledgement succeeds. */ }
    if (active && selected && !ProtectedStorage.isLocked()) {
      await Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
      if (active && !ProtectedStorage.isLocked()) open(payload.reminderId);
    }
  }
  const foreground = Notifications.addNotificationReceivedListener(notification => { void received(notification, false); });
  const response = Notifications.addNotificationResponseReceivedListener(value => { void received(value.notification, true); });
  void Notifications.getLastNotificationResponseAsync().then(value => { if (value) return received(value.notification, true); }).catch(() => {});
  return () => { active = false; foreground.remove(); response.remove(); };
}
module.exports = { register, listen };

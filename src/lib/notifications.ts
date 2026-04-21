import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Set up the notification handler so it knows how to handle incoming alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Checks permissions and retrieves the Expo Push Token for the current device.
 * Returns the token string or undefined if it failed.
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // Prevent crash in Expo Go where native push libraries are removed
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    console.warn('Push Notifications are disabled in Expo Go. Use a development build or APK.');
    return undefined;
  }

  let token;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#818cf8',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      // Must pass projectId to get back a token configured for EAS build
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.warn('Need an EAS projectId to get an Expo Push Token');
        return;
      }

      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token retrieved:', token);
    } catch (e) {
      console.warn('Could not fetch token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

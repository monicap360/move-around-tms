import React, { useEffect, useState } from 'react';
import { View, Text, Button, Image, Alert } from 'react-native';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [offline, setOffline] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // Offline mode demo
  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      setOffline(!state.isConnected);
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, []);

  // Push notification registration demo
  useEffect(() => {
    async function registerForPush() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const tokenData = await Notifications.getExpoPushTokenAsync();
      setPushToken(tokenData.data);
    }
    registerForPush();
  }, []);

  // Document scanning demo (image picker)
  async function scanDocument() {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setScannedImage(result.assets[0].uri);
      Alert.alert('Document scanned!', 'Image saved locally.');
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>MoveAround TMS Mobile</Text>
      <Text style={{ marginTop: 16, color: offline ? 'red' : 'green' }}>
        {offline ? 'Offline Mode: No Connection' : 'Online'}
      </Text>
      <Text style={{ marginTop: 8, fontSize: 16 }}>
        Push Token: {pushToken ? pushToken.slice(0, 16) + '...' : 'Registering...'}
      </Text>
      <Button title="Scan Document" onPress={scanDocument} />
      {scannedImage && (
        <Image source={{ uri: scannedImage }} style={{ width: 200, height: 200, marginTop: 16, borderRadius: 8 }} />
      )}
    </View>
  );
}

import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export function useLocationTracker(enabled: boolean, isActive: boolean) {
  const [status, setStatus] = useState<string>('idle');
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [distance, setDistance] = useState(0); // in meters
  const [currentPace, setCurrentPace] = useState(0); // seconds per km
  
  const lastLocation = useRef<LocationPoint | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled) return;

    (async () => {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        setStatus('denied');
        return;
      }

      if (Platform.OS !== 'web') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('Background location permission denied');
        }
      }

      setStatus('ready');
    })();
  }, [enabled]);

  useEffect(() => {
    if (enabled && isActive && status === 'ready') {
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [enabled, isActive, status]);

  const startTracking = async () => {
    try {
      subscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const newPoint: LocationPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };

          if (lastLocation.current) {
            const d = calculateDistance(
              lastLocation.current.latitude,
              lastLocation.current.longitude,
              newPoint.latitude,
              newPoint.longitude
            );
            
            if (d > 0.5) { // ignore jitter
              setDistance(prev => prev + d);
              
              // Calculate instantaneous pace if possible
              const timeDiff = (newPoint.timestamp - lastLocation.current.timestamp) / 1000;
              if (timeDiff > 0) {
                const speed = d / timeDiff; // m/s
                if (speed > 0.5) {
                  const pace = 1000 / speed; // s/km
                  setCurrentPace(pace);
                }
              }
            }
          }

          lastLocation.current = newPoint;
          setLocations(prev => [...prev, newPoint]);
        }
      );
      setStatus('tracking');
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setStatus('error');
    }
  };

  const stopTracking = () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    lastLocation.current = null;
    if (status === 'tracking') setStatus('ready');
  };

  // Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return {
    status,
    distance,
    currentPace,
    locations,
    reset: () => {
      setDistance(0);
      setLocations([]);
      setCurrentPace(0);
      lastLocation.current = null;
    }
  };
}

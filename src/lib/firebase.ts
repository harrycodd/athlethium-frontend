import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  connectAuthEmulator,
  // @ts-ignore
  getReactNativePersistence 
} from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { USE_EMULATORS, EMULATOR_HOST, EMULATOR_PROJECT_ID } from "./emulators";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIABMKbw7y0NUVZxYmIDg2KkLoLLIN5pQ",
  authDomain: "athlethium-app.firebaseapp.com",
  projectId: "athlethium-app",
  storageBucket: "athlethium-app.firebasestorage.app",
  messagingSenderId: "420163252166",
  appId: "1:420163252166:web:845372b921b687e19b4cc7",
  ...(USE_EMULATORS ? { projectId: EMULATOR_PROJECT_ID } : {}),
};

// Initialize Firebase App safely (prevent duplicate initializeApp errors)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth safely across Web, iOS, and Android
let auth: ReturnType<typeof getAuth>;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (e) {
  auth = getAuth(app);
}

// Initialize Firestore with memory cache safely
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache({}),
  });
} catch (e) {
  db = getFirestore(app);
}

if (USE_EMULATORS) {
  try {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  } catch {
    // Already connected (fast refresh re-runs this module).
  }
}

export { auth, db, app };
export default app;

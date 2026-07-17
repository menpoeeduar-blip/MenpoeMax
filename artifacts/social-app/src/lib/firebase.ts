import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBpih0QPMv2M-HuVr6vjj0FK2ETNVbSMGU",
  authDomain: "menpoemax.firebaseapp.com",
  projectId: "menpoemax",
  storageBucket: "menpoemax.firebasestorage.app",
  messagingSenderId: "1003478751077",
  appId: "1:1003478751077:web:cd293401437603ca0c338c",
  measurementId: "G-YL66C7MLZ1",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
/** Storage no está activado: upload.ts usa data URLs como respaldo. */
export const storage = getStorage(firebaseApp);

if (typeof window !== "undefined") {
  isSupported()
    .then((ok) => {
      if (ok) getAnalytics(firebaseApp);
    })
    .catch(() => {});
}

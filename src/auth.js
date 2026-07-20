import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

// REPLACE THESE WITH YOUR FIREBASE PROJECT KEYS FROM THE FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCez36I2XdAPglGbg45LyH7Sk_P0KuicYw",
  authDomain: "gen-lang-client-0044267372.firebaseapp.com",
  projectId: "gen-lang-client-0044267372",
  storageBucket: "gen-lang-client-0044267372.firebasestorage.app",
  messagingSenderId: "901953259613",
  appId: "1:901953259613:android:20bd329a83ce1b5ed065b4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function signInWithGoogle() {
  const errorMsg = document.getElementById('loginError');
  if (errorMsg) errorMsg.style.display = 'none';

  try {
    let user = null;
    
    if (Capacitor.isNativePlatform()) {
      // NATIVE ANDROID CAPACITOR FLOW
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (!result.credential || !result.credential.idToken) {
        throw new Error("Missing Google ID Token from Native Sign-In");
      }
      const credential = GoogleAuthProvider.credential(result.credential.idToken);
      const authResult = await signInWithCredential(auth, credential);
      user = authResult.user;
    } else {
      // WEB FALLBACK
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (result.credential && result.credential.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          const authResult = await signInWithCredential(auth, credential);
          user = authResult.user;
      } else {
          user = result.user; 
      }
    }

    if (user) {
      saveUserAndRedirect(user);
    }
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    if (errorMsg) {
      errorMsg.style.display = 'block';
      errorMsg.innerText = getFriendlyErrorMessage(error);
    }
  }
}

async function handleLogout() {
  try {
    await FirebaseAuthentication.signOut();
    await signOut(auth);
    window.location.href = '/';
  } catch (error) {
    console.error("Logout Error:", error);
    alert("Failed to log out: " + error.message);
  }
}

function getFriendlyErrorMessage(error) {
  const code = error.code || error.message;
  if (code.includes('10')) return "Developer Error 10: Please ensure your SHA-1 fingerprint is registered in Firebase and you updated the google-services.json file.";
  if (code.includes('popup-blocked')) return "Popup blocked. Please ensure you are using the Native app build or allow popups.";
  if (code.includes('cancelled') || code.includes('canceled')) return "Sign-in was cancelled.";
  return "Authentication failed: " + error.message;
}

async function saveUserAndRedirect(user) {
  const role = window.targetLoginRole || 'landowner';
  
  try {
      await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              photo: user.photoURL,
              role: role
          })
      });
  } catch(e) {
      console.warn("Backend sync failed, proceeding anyway", e);
  }

  if (role === 'landowner') {
    window.location.href = '/landowner.html';
  } else {
    window.location.href = '/marketplace.html';
  }
}

window.signInWithGoogle = signInWithGoogle;
window.handleLogout = handleLogout;
window.auth = auth;
window.onAuthStateChanged = onAuthStateChanged;

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnGoogleSignIn');
    if (btn) btn.addEventListener('click', signInWithGoogle);
});



// Capacitor Bridge — handles Android native integration
// This file is safe to load on web too; it no-ops if Capacitor isn't available.
(function() {
  // Only run if we're inside a Capacitor native shell
  if (typeof window.Capacitor === 'undefined' || !window.Capacitor.isNativePlatform()) {
    return;
  }

  // Android hardware back button: navigate back in web history,
  // only exit the app if there's nowhere left to go.
  const { App } = window.Capacitor.Plugins;
  if (App) {
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  }

  // Hide splash screen once the page is fully loaded
  const { SplashScreen } = window.Capacitor.Plugins;
  if (SplashScreen) {
    window.addEventListener('load', () => {
      setTimeout(() => SplashScreen.hide(), 300);
    });
  }

  console.log('[Capacitor Bridge] Native platform detected. Back button and splash screen wired.');
})();

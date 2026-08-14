const HapticEngine = {
  lightTick: async () => {
    try {
      if(window.Capacitor?.Plugins?.Haptics) {
        await window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
      } else if(navigator.vibrate) navigator.vibrate(10);
    } catch(e) {}
  },
  successPulse: async () => {
    try {
      if(window.Capacitor?.Plugins?.Haptics) {
        await window.Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
        setTimeout(async () => await window.Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' }), 150);
      } else if(navigator.vibrate) navigator.vibrate([20, 100, 20]);
    } catch(e) {}
  },
  heavyThud: async () => {
    try {
      if(window.Capacitor?.Plugins?.Haptics) {
        await window.Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' });
      } else if(navigator.vibrate) navigator.vibrate(50);
    } catch(e) {}
  }
};
window.HapticEngine = HapticEngine;

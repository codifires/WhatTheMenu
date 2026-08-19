export const loadAlertSettings = () => {
  try {
    const saved = localStorage.getItem('qr_hardware_alerts');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { mute: false, disableVibration: false, volume: 0.8 };
};

export const saveAlertSettings = (settings) => {
  localStorage.setItem('qr_hardware_alerts', JSON.stringify(settings));
};

// Use AudioContext to generate synthesized sounds without external MP3s
const playTone = (frequency, duration, type = 'sine', volume = 0.8) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    // Fade out to prevent popping
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration / 1000);
  } catch (err) {
    console.error('Audio playback failed', err);
  }
};

export const playHardwareAlert = (type = 'new-order') => {
  const settings = loadAlertSettings();
  
  if (!settings.disableVibration && 'vibrate' in navigator) {
    if (type === 'new-order') {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } else if (type === 'waiter' || type === 'bill') {
      navigator.vibrate([500, 200, 500]);
    } else if (type === 'ready') {
      navigator.vibrate([100, 50, 100, 50, 100, 50, 300]);
    }
  }

  if (!settings.mute) {
    const vol = settings.volume ?? 0.8;
    if (type === 'new-order') {
      // High pitched double ping
      playTone(880, 200, 'sine', vol);
      setTimeout(() => playTone(1046.50, 300, 'sine', vol), 150);
    } else if (type === 'waiter' || type === 'bill') {
      // Urgent buzzer
      playTone(400, 300, 'square', vol * 0.5);
      setTimeout(() => playTone(400, 300, 'square', vol * 0.5), 400);
    } else if (type === 'ready') {
      // Happy success chime
      playTone(523.25, 200, 'sine', vol);
      setTimeout(() => playTone(659.25, 200, 'sine', vol), 150);
      setTimeout(() => playTone(783.99, 400, 'sine', vol), 300);
    }
  }
};

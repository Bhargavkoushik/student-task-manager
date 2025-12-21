import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to manage ringtone playback with priority-based repetition
 * Handles audio autoplay restrictions and schedules repetitions based on priority
 * 
 * Priority-based rings:
 * - low: 1 ring (immediate)
 * - medium: 2 rings (immediate + after 1 hour)
 * - high: 3 rings (immediate + after 1 hour + after 1 hour)
 * 
 * Each ring lasts exactly 10 seconds
 */
const useRingtone = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const audioRef = useRef(null);
  const timeoutsRef = useRef([]);
  const onEndRef = useRef(null);
  const ringCountRef = useRef(0);

  // Audio file paths for different priorities
  // Uses local files if available, otherwise falls back to online sources
  const audioFiles = {
    low: '/sounds/low-priority.mp3',
    medium: '/sounds/medium-priority.mp3',
    high: '/sounds/high-priority.mp3'
  };

  // Fallback online audio sources (used if local files are not available)
  const fallbackAudioFiles = {
    low: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    medium: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    high: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'
  };

  const notifyRingEnd = () => {
    setIsPlaying(false);
    if (onEndRef.current && typeof onEndRef.current === 'function') {
      onEndRef.current(currentTask);
    }
  };

  const playWithSource = async (src, priority, label) => {
    const audio = new Audio(src);
    audio.volume = 0.7;
    await audio.play();
    console.log(`🔔 Playing ${label} ringtone for ${priority} priority (ring #${ringCountRef.current + 1})`);
    audio.onended = () => {
      console.log('🔕 Ringtone finished playing');
      notifyRingEnd();
    };

    audioRef.current = audio;
    setIsPlaying(true);
    ringCountRef.current += 1;
  };

  /**
   * Play a single ring (10 seconds of audio)
   * Handles browser autoplay restrictions by using a user-gesture-safe approach
   * Tries local files first, then falls back to online sources
   */
  const playSingleRing = async (priority) => {
    const sources = [
      { src: audioFiles[priority] || audioFiles.medium, label: 'local' },
      { src: fallbackAudioFiles[priority] || fallbackAudioFiles.medium, label: 'fallback' }
    ];

    for (const { src, label } of sources) {
      try {
        await playWithSource(src, priority, label);
        return;
      } catch (error) {
        console.warn(`⚠️  ${label} audio failed:`, error.message);
      }
    }

    console.error('❌ All audio sources failed; user interaction may be required to enable audio');
    setIsPlaying(false);
  };

  /**
   * Schedule ringtones based on task priority
   * - low: 1 ring immediately
   * - medium: 2 rings (now + 1 hour)
   * - high: 3 rings (now + 1 hour + 1 hour)
   */
  const scheduleRingtones = (task, onEnd) => {
    // Clear any existing scheduled ringtones
    stopRingtone();
    
    setCurrentTask(task);
    ringCountRef.current = 0;
    onEndRef.current = onEnd;
    
    const priority = task.priority || 'medium';
    console.log(`📅 Scheduling single 10s ringtone for ${priority} priority task: "${task.title}"`);

    // Play first ring immediately (with slight delay to ensure user gesture context)
    setTimeout(() => {
      playSingleRing(priority);
    }, 100);

    // Additional rings are managed by backend rescheduling logic
  };

  /**
   * Stop the current ringtone and clear all scheduled future rings
   */
  const stopRingtone = () => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Clear all scheduled timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current = [];
    
    setIsPlaying(false);
    setCurrentTask(null);
    ringCountRef.current = 0;
    
    console.log('🛑 All ringtones stopped and cleared');
  };

  /**
   * Stop and signal end (used when user clicks STOP)
   */
  const stopAndEnd = () => {
    const task = currentTask;
    stopRingtone();
    if (onEndRef.current && typeof onEndRef.current === 'function') {
      onEndRef.current(task);
    }
  };

  /**
   * Initialize audio context on user interaction
   * This helps bypass browser autoplay restrictions
   */
  const initAudioContext = () => {
    // Create a silent audio to unlock audio context
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    silentAudio.play().then(() => {
      console.log('✅ Audio context initialized successfully');
    }).catch(() => {
      console.log('⚠️  Audio context initialization failed - may need user gesture');
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
    };
  }, []);

  return {
    isPlaying,
    currentTask,
    scheduleRingtones,
    stopRingtone,
    stopAndEnd,
    initAudioContext
  };
};

export default useRingtone;

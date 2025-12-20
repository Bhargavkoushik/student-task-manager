# Ringtone Audio Files

This directory contains the audio files for priority-based task reminders.

## Required Files

Place the following audio files in this directory:
- `low-priority.mp3` - For low priority tasks (plays 1 time)
- `medium-priority.mp3` - For medium priority tasks (plays 2 times)
- `high-priority.mp3` - For high priority tasks (plays 3 times)

## Audio Specifications

- **Format**: MP3 or OGG
- **Duration**: 6 seconds (recommended)
- **Sample Rate**: 44.1 kHz
- **Bitrate**: 128 kbps or higher

## Fallback Audio

If local files are not available, the system will use online audio sources from:
- Google Actions sound library
- Free sound libraries

## Adding Your Own Sounds

1. Find or create audio files that meet the specifications above
2. Name them according to the priority levels
3. Place them in this directory
4. Test the reminders to ensure they play correctly

## Free Audio Resources

You can download free ringtone sounds from:
- https://freesound.org/
- https://mixkit.co/free-sound-effects/
- https://www.zapsplat.com/
- https://actions.google.com/sounds/

## Testing

To test the ringtones:
1. Create a task with a reminder time in the near future
2. Wait for the reminder to trigger
3. Verify that the audio plays for 6 seconds
4. Check that the correct number of rings occurs based on priority

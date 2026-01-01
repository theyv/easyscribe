# Tray Icons

This directory contains system tray icons for EasyScribe.

## Required Icons

The following PNG icons are required for the system tray:

### tray-idle.png
- **Description**: Violet microphone icon (idle state)
- **Sizes**: 16x16, 32x32
- **Color**: Violet (#8b5cf6)
- **State**: Shown when the app is ready to record

### tray-recording.png
- **Description**: Red pulsing dot or microphone (recording state)
- **Sizes**: 16x16, 32x32
- **Color**: Red (#ef4444)
- **State**: Shown when recording is in progress

### tray-processing.png
- **Description**: Spinner icon (processing state)
- **Sizes**: 16x16, 32x32
- **Color**: Blue or Gray
- **State**: Shown when audio is being transcribed

### tray-error.png
- **Description**: Warning icon (error state)
- **Sizes**: 16x16, 32x32
- **Color**: Yellow or Orange
- **State**: Shown when an error occurs

## Implementation Notes

- Icons should be in PNG format
- Use transparent backgrounds for better appearance on different system themes
- Test icons on both light and dark backgrounds
- Consider using SVG source files for easier scaling

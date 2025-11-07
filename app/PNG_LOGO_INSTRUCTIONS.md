# Ronyx Logo PNG Conversion Instructions

## Current Setup
- SVG Logo: `/public/ronyx_logo.svg` ✅
- Temporary PNG: `/public/ronyx_logo.png` (currently just copied SVG)

## To Create Proper PNG Logo:

### Option 1: Online Conversion
1. Go to https://convertio.co/svg-png/ or https://cloudconvert.com/svg-to-png
2. Upload `/public/ronyx_logo.svg`
3. Convert to PNG with transparent background
4. Download and replace `/public/ronyx_logo.png`

### Option 2: Using Figma/Design Software
1. Open Figma or Adobe Illustrator
2. Import the SVG file
3. Export as PNG (300 DPI recommended)
4. Ensure transparent background
5. Save to `/public/ronyx_logo.png`

### Option 3: Using Browser (Quick Method)
1. Open the SVG in Chrome/Edge
2. Right-click → "Save image as" → Choose PNG format
3. Save to `/public/ronyx_logo.png`

## Logo Specifications:
- **Dimensions**: 200x80 pixels (as per SVG viewBox)
- **Background**: Transparent
- **Primary Color**: #F7931E (Ronyx Orange)
- **Secondary**: #FFFFFF (White text)
- **Format**: PNG with transparency support

## Usage:
The login page expects `ronyx_logo.png` at `/public/ronyx_logo.png`

## Current Status:
- Login page configured for PNG logo ✅
- Styling applied with orange glow effect ✅
- Need proper PNG conversion (currently using SVG copy)
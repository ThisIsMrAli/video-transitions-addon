## Usage

1. Select your desired aspect ratio (Vertical, Horizontal, or Square)
2. Upload your video clips (supported formats: MP4, WebM)
3. Trim your videos using the interactive timeline controls:
   - Drag the left handle to adjust the start point
   - Drag the right handle to adjust the end point
   - Preview trimmed sections in real-time
4. Add transitions between clips by clicking the "Select Transition" button
5. Preview your composition in real-time
6. Click "Render" to process your final video using FFmpeg
7. The rendered video will be automatically added to your Adobe Express document

## Technology Stack

- React
- TypeScript
- Adobe Express Add-on SDK
- FFmpeg for video processing and rendering
- Lottie for transition animations
- Tailwind CSS for styling

## Video Processing Features

### Trimming Capabilities

- Frame-accurate video trimming
- Real-time preview of trim adjustments
- Non-destructive editing
- Visual timeline markers

### FFmpeg Implementation

- High-quality video encoding
- Efficient transition rendering
- Frame-accurate video merging
- Optimized output file sizes
- Hardware acceleration support when available

## Development

This project has been created with `@adobe/create-ccweb-add-on`. It demonstrates advanced video manipulation capabilities while maintaining a user-friendly interface within the Adobe Express ecosystem.

## Performance Considerations

- Client-side video processing using FFmpeg WebAssembly
- Efficient memory management for handling multiple video streams
- Optimized transition rendering pipeline
- Progressive video processing feedback
- Cancelable render operations

## Contributing

We welcome contributions to improve the add-on. Please feel free to submit issues and pull requests.

## License

MIT License

Copyright (c) 2024 [Your Name or Organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Support

For support, please:

- Open an issue in the GitHub repository
- Contact us at uxplugins@gmail.com
- Visit our website at [https://uxplugins.com/contact-us](https://uxplugins.com/contact-us)

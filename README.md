# MediaStream video resizer

A browser-based resize of video tracks in MediaStreams.
Mostly used in WebRTC projects to generate an exact size of the video and to control the fps.

## Getting started
### Installation
To use VideoResizer in your project, run:
```javascript
npm i mediastream-video-resizer
// or "yarn add mediastream-video-resizer"
```

### Usage
```javascript
const { VideoResizer } = require('mediastream-video-resizer');
const videoResizer = new VideoResizer();

// Start the resize - create a new MediaStream with the video track resized to 400x300px with 15fps
// 'userVideo' is just an identifier, used in videoResizer.stop()
const resizedStream: MediaStream = videoResizer.start(mediaStream, 'userVideo', 400, 300, 15);

// To update the resizer settings just run the start method with the updated parameters, no need to stop it
const resizedStream: MediaStream = videoResizer.start(mediaStream, 'userVideo', 800, 600, 10);

// Stop the resize process
videoResizer.stop('userVideo');
```

### Old school
If you don't use any package manager, a separate .js file is available too - feel free to include it in your html
```html
<script src="https://dmakeev.github.io/mediastream-video-resizer/dist.browser/videoresize.js"></script>
```
and after this you can use VideoResizer class as in the example above (no "require" needed, of course).
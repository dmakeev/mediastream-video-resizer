'use strict';
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
// Video resizer class
var VideoResizer = /** @class */ (function () {
    function VideoResizer() {
        this.resizers = {};
        this.resizerTemplate = {
            video: null,
            canvas: null,
            context: null,
            inputStream: null,
            outputStream: null,
            interval: null,
        };
    }
    /** Resize the media stream
     *
     * @param {MediaStream} inputStream - original media stream
     * @param {string}      key         - ID or name of the resize process, used only for stopping the existing resizer
     * @param {number}      width       - output width
     * @param {number}      height      - output height
     * @param {number}      fps         - output fps
     *
     * @returns {MediaSteam}
     */
    VideoResizer.prototype.start = function (inputStream, key, width, height, fps) {
        var self = this;
        // Check if any video track exists
        var videoTrack = inputStream.getVideoTracks().find(function (track) { return track.enabled; });
        if (!videoTrack || !videoTrack.enabled) {
            console.warn('There is no video tracks in the input MediaStream');
            return inputStream;
        }
        // Get the Video Resizer Item
        var resizer = self.resizers[key];
        if (!resizer) {
            self.resizers[key] = resizer = __assign({}, self.resizerTemplate);
        }
        // Create canvas, if missing
        if (!resizer.canvas) {
            resizer.canvas = document.createElement('canvas');
            resizer.canvas.style.position = 'fixed';
            resizer.canvas.style.top = '1px';
            resizer.canvas.style.left = '1px';
            resizer.canvas.style.width = '1px';
            resizer.canvas.style.height = '1px';
            document.body.appendChild(resizer.canvas);
        }
        // Create rendering context
        if (!resizer.context) {
            resizer.context = null;
        }
        resizer.context = resizer.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            antialias: false,
            powerPreference: 'low-power',
            preserveDrawingBuffer: true,
        });
        // Get video dimensions - calculate output size and offsets
        var dimensions = self.privateGetResizeDimensions(inputStream, width, height);
        // No height? Calculate it automatically
        if (!height) {
            resizer.canvas.height = dimensions.displayHeight;
        }
        else {
            resizer.canvas.height = height;
        }
        resizer.canvas.width = width;
        // No video element? Create it
        if (!resizer.video) {
            resizer.video = document.createElement('video');
            resizer.video.autoplay = true;
            resizer.video.playsinline = true;
            resizer.video.muted = true;
            resizer.video.style.position = 'fixed';
            resizer.video.style.top = '1px';
            resizer.video.style.left = '1px';
            resizer.video.style.width = '1px';
            resizer.video.style.height = '1px';
            document.body.appendChild(resizer.video);
        }
        resizer.video.srcObject = inputStream;
        // Draw the first frame
        resizer.context.drawImage(resizer.video, dimensions.left, dimensions.top, dimensions.displayWidth, dimensions.displayHeight);
        // Start the drawing process
        self.privateResizeSetInterval(resizer, dimensions, fps);
        // Stop the output stream, if present
        if (resizer.outputStream) {
            self.privateStopMediaStream(resizer.outputStream);
        }
        resizer.inputStream = inputStream;
        // Generate the output stream
        resizer.outputStream = resizer.canvas.captureStream();
        inputStream.getAudioTracks().forEach(function (track) {
            resizer.outputStream.addTrack(track);
        });
        return resizer.outputStream;
    };
    /**
     * Stop the resizer
     *
     * @param {string}      key  - ID of the resize process
     */
    VideoResizer.prototype.stop = function (key) {
        var self = this;
        var resizer = self.resizers[key];
        if (!resizer) {
            return;
        }
        // Stop drawing process
        if (resizer.interval) {
            clearInterval(resizer.interval);
        }
        // Terminate the output stream
        if (resizer.outputStream) {
            self.privateStopMediaStream(resizer.outputStream);
        }
        // Remove html elements
        if (resizer.video) {
            document.body.removeChild(resizer.video);
        }
        if (resizer.canvas) {
            document.body.removeChild(resizer.canvas);
        }
        delete self.resizers[key];
    };
    /**
     * Resizer interval configuration
     *
     * @param {VideoResizerItem} resizer
     * @param {VideoDimensions}  dimensions
     * @param {number}           fps - output video fps
     */
    VideoResizer.prototype.privateResizeSetInterval = function (resizer, dimensions, fps) {
        var self = this;
        if (resizer.interval) {
            clearInterval(resizer.interval);
        }
        resizer.interval = setInterval(function () {
            if (!resizer.context) {
                if (resizer.interval) {
                    clearInterval(resizer.interval);
                }
                return;
            }
            resizer.context.drawImage(resizer.video, 0, 0, dimensions.originWidth, dimensions.originHeight, dimensions.left, dimensions.top, dimensions.displayWidth, dimensions.displayHeight);
            // Each second re-calculate the dimensions - it's inpotrant as the input video
            // track constrains can be changed (for example, user turned his smartphone) without any notification
            if (Math.round(Math.random() * fps) === 1) {
                dimensions = self.privateGetResizeDimensions(resizer.inputStream, dimensions.requiredWidth, dimensions.requiredHeight);
            }
        }, Math.round(950 / fps));
    };
    /**
     * Get video dimensions
     *
     * @param {MediaStream}     inputStream - input media stream
     * @param {number}          requiredWidth - output video width
     * @param {number}          requiredHeight - output video height
     *
     * @returns {VideoDimensions}
     */
    VideoResizer.prototype.privateGetResizeDimensions = function (inputStream, requiredWidth, requiredHeight) {
        // Get video tracks
        var tracks = inputStream.getVideoTracks();
        // Actually we process only first video track
        var trackSettings = tracks[0].getSettings();
        // Get the track dimensions
        var trackWidth = trackSettings.width;
        var trackHeight = trackSettings.height;
        // Calculate output dimensions and offsets
        var displayWidth, displayHeight, deltaX, deltaY;
        if (requiredHeight && trackHeight < trackWidth) {
            displayWidth = (trackWidth * requiredHeight) / trackHeight;
            displayHeight = requiredHeight;
            deltaX = (requiredWidth - displayWidth) / 2;
            deltaY = (requiredHeight - displayHeight) / 2;
        }
        else {
            displayWidth = requiredWidth;
            displayHeight = (trackHeight * requiredWidth) / trackWidth;
            deltaX = (requiredWidth - displayWidth) / 2;
            deltaY = requiredHeight ? (requiredHeight - displayHeight) / 2 : 0;
        }
        return {
            requiredWidth: requiredWidth,
            requiredHeight: requiredHeight,
            originWidth: Math.round(trackWidth),
            originHeight: Math.round(trackHeight),
            displayWidth: Math.round(displayWidth),
            displayHeight: Math.round(displayHeight),
            top: Math.round(deltaY),
            left: Math.round(deltaX),
        };
    };
    /**
     * Stop the media stream correctly
     *
     * @param {MediaStream} stream
     */
    VideoResizer.prototype.privateStopMediaStream = function (stream) {
        if (!stream) {
            return;
        }
        stream.getTracks().forEach(function (track) {
            track.stop();
            stream.removeTrack(track);
        });
    };
    return VideoResizer;
}());


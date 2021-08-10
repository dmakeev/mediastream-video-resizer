'use strict';

/**
 * Video resizer
 *
 * @author Daniil Makeev / daniil-makeev@yandex.ru
 * @package VideoResizerClass
 *
 * How to use it:
 *
 * * Start the resizing
 * > const videoResizer = VideoResizerClass()
 * > const resizedStream: MediaStream = videoResizer.start(mediaStream, 'userVideo', 400, 300, 15)
 *
 * * Stop the resizing
 * > videoResizer.stop('userVideo')
 */

// captureStream API is still experimental feature
interface CanvasElement extends HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
}

// Shim for https://github.com/microsoft/TypeScript/issues/36204
interface VideoElement extends HTMLVideoElement {
    playsinline: boolean;
}

// Video resizer item
interface VideoResizerItem {
    // Technical video element
    video: VideoElement | null;
    // Canvas element
    canvas: CanvasElement | null;
    // Rendering context
    context: CanvasRenderingContext2D | null;
    // Input media stream
    inputStream: MediaStream | null;
    // Output media stream
    outputStream: MediaStream | null;
    // Draw frame interval
    interval: ReturnType<typeof setTimeout> | null;
}

// Calculated video dimensions
interface VideoDimensions {
    // Required viideo width
    requiredWidth: number;
    // Required video height
    requiredHeight: number | null;
    // Original video width
    originWidth: number;
    // Original video height
    originHeight: number;
    // Resulting width
    displayWidth: number;
    // Resulting height
    displayHeight: number;
    // Top offset
    top: number;
    // Left offset
    left: number;
}

// Video resizer class
export class VideoResizer {
    resizers: { [key: string]: VideoResizerItem } = {};
    resizerTemplate: VideoResizerItem = {
        video: null,
        canvas: null,
        context: null,
        inputStream: null,
        outputStream: null,
        interval: null,
    };

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
    start(inputStream: MediaStream, key: string, width: number, height: number | null, fps: number) {
        const self = this;
        // Check if any video track exists
        if (!inputStream || !inputStream.getVideoTracks) {
            console.warn('Incorrect mediaStream is received', inputStream);
            return inputStream;
        }
        const videoTrack: MediaStreamTrack | undefined = inputStream.getVideoTracks().find((track) => track.enabled);
        if (!videoTrack || !videoTrack.enabled) {
            console.warn('There is no video tracks in the input MediaStream');
            return inputStream;
        }
        // Get the Video Resizer Item
        let resizer: VideoResizerItem = self.resizers[key];
        if (!resizer) {
            self.resizers[key] = resizer = { ...self.resizerTemplate } as VideoResizerItem;
        }
        // Create canvas, if missing
        if (!resizer.canvas) {
            resizer.canvas = document.createElement('canvas') as CanvasElement;
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
        }) as CanvasRenderingContext2D;

        // Get video dimensions - calculate output size and offsets
        const dimensions: VideoDimensions = self.privateGetResizeDimensions(inputStream, width, height);
        // No height? Calculate it automatically
        if (!height) {
            resizer.canvas.height = dimensions.displayHeight;
        } else {
            resizer.canvas.height = height;
        }
        resizer.canvas.width = width;

        // No video element? Create it
        if (!resizer.video) {
            resizer.video = document.createElement('video') as VideoElement;
            resizer.video.autoplay = true;
            resizer.video.playsinline! = true;
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
        inputStream.getAudioTracks().forEach((track) => {
            resizer.outputStream!.addTrack(track);
        });
        return resizer.outputStream;
    }

    /**
     * Stop the resizer
     *
     * @param {string}      key  - ID of the resize process
     */
    stop(key: string): void {
        const self = this;
        const resizer: VideoResizerItem = self.resizers[key];
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
        try {
            if (resizer.video) {
                document.body.removeChild(resizer.video);
            }
            if (resizer.canvas) {
                document.body.removeChild(resizer.canvas);
            }
        } catch (e) {}
        delete self.resizers[key];
    }

    /**
     * Resizer interval configuration
     *
     * @param {VideoResizerItem} resizer
     * @param {VideoDimensions}  dimensions
     * @param {number}           fps - output video fps
     */
    privateResizeSetInterval(resizer: VideoResizerItem, dimensions: VideoDimensions, fps: number): void {
        const self = this;
        if (resizer.interval) {
            clearInterval(resizer.interval);
        }
        resizer.interval = setInterval(() => {
            if (!resizer.context) {
                if (resizer.interval) {
                    clearInterval(resizer.interval);
                }
                return;
            }
            resizer.context.drawImage(
                resizer.video as CanvasImageSource,
                0,
                0,
                dimensions.originWidth,
                dimensions.originHeight,
                dimensions.left,
                dimensions.top,
                dimensions.displayWidth,
                dimensions.displayHeight
            );
            // Each second re-calculate the dimensions - it's inpotrant as the input video
            // track constrains can be changed (for example, user turned his smartphone) without any notification
            if (Math.round(Math.random() * fps) === 1) {
                dimensions = self.privateGetResizeDimensions(resizer.inputStream!, dimensions.requiredWidth, dimensions.requiredHeight);
            }
        }, Math.round(950 / fps));
    }

    /**
     * Get video dimensions
     *
     * @param {MediaStream}     inputStream - input media stream
     * @param {number}          requiredWidth - output video width
     * @param {number}          requiredHeight - output video height
     *
     * @returns {VideoDimensions}
     */
    privateGetResizeDimensions(inputStream: MediaStream, requiredWidth: number, requiredHeight: number | null): VideoDimensions {
        // Get video tracks
        const tracks = inputStream.getVideoTracks();
        // Actually we process only first video track
        const trackSettings = tracks[0].getSettings();
        // Get the track dimensions
        const trackWidth: number = trackSettings.width!;
        const trackHeight: number = trackSettings.height!;
        // Calculate output dimensions and offsets
        let displayWidth, displayHeight, deltaX, deltaY;
        if (requiredHeight && trackHeight < trackWidth) {
            displayWidth = (trackWidth * requiredHeight) / trackHeight;
            displayHeight = requiredHeight;
            deltaX = (requiredWidth - displayWidth) / 2;
            deltaY = (requiredHeight - displayHeight) / 2;
        } else {
            displayWidth = requiredWidth;
            displayHeight = (trackHeight * requiredWidth) / trackWidth;
            deltaX = (requiredWidth - displayWidth) / 2;
            deltaY = requiredHeight ? (requiredHeight - displayHeight) / 2 : 0;
        }
        return {
            requiredWidth,
            requiredHeight,
            originWidth: Math.round(trackWidth),
            originHeight: Math.round(trackHeight),
            displayWidth: Math.round(displayWidth),
            displayHeight: Math.round(displayHeight),
            top: Math.round(deltaY),
            left: Math.round(deltaX),
        };
    }

    /**
     * Stop the media stream correctly
     *
     * @param {MediaStream} stream
     */
    privateStopMediaStream(stream: MediaStream): void {
        if (!stream) {
            return;
        }
        stream.getTracks().forEach((track) => {
            track.stop();
            stream.removeTrack(track);
        });
    }
}

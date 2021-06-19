'use strict';

/**
 * Video resizer
 *
 * @author Daniil Makeev / daniil-makeev@yandex.ru
 * @package VideoResizer
 */

/*
interface ResizerTemplate = {
    // Technical video element
    video: HTMLVideoElement;
    // Canvas element
    canvas: HTMLCanvasElement;
    // Rendering context
    context: RenderingContext;
    // Output media stream
    outputStream: MediaStream;
}

interface VideoDimensions = {
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
*/

class VideoResizerClass {
    constructor() {
        const self = this;
        self.resizers = {};
        self.resizerTemplate = {
            video: null,
            canvas: null,
            context: null,
            outputStream: null,
        }; // as ResizerTemplate
    }

    /** Resize the media stream
     *
     * @param {MediaStream} inputStream - original media stream
     * @param {string}      key  - ID of the resize process
     * @param {number}      width   - output width
     * @param {number}      height  - output height
     * @param {number}      fps     - output fps
     *
     * @returns {MediaSteam}
     */
    start(inputStream, key, width, height, fps) {
        const self = this;
        const videoTrack = inputStream.getVideoTracks().forEach((track) => track.enabled);
        console.log('++++++++++++', videoTrack);
        let resizer = self.resizers[key];
        if (!resizer) {
            self.resizers[key] = resizer = { ...self.resizerTemplate };
        }
        if (!resizer.canvas) {
            resizer.canvas = document.createElement('canvas');
            resizer.canvas.style.position = 'fixed';
            resizer.canvas.style.top = '1px';
            resizer.canvas.style.left = '1px';
            resizer.canvas.style.width = '1px';
            resizer.canvas.style.height = '1px';
            document.body.appendChild(resizer.canvas);
        }
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
        const dimensions = self.privateGetResizeDimensions(inputStream, width, height);
        if (!height) {
            resizer.canvas.height = dimensions.displayHeight;
        } else {
            resizer.canvas.height = height;
        }
        resizer.canvas.width = width;

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

        if (dimensions) {
            resizer.context.drawImage(resizer.video, dimensions.left, dimensions.top, dimensions.displayWidth, dimensions.displayHeight);
            self.privateResizeSetInterval(resizer, dimensions, fps);
        }
        self.privateStopMediaStream(resizer.inputStream);
        self.privateStopMediaStream(resizer.outputStream);
        resizer.inputStream = inputStream;
        resizer.outputStream = resizer.canvas.captureStream();
        inputStream.getAudioTracks().forEach((track) => {
            resizer.outputStream.addTrack(track);
        });
        return resizer.outputStream;
    }

    /**
     * Stop the resizer
     *
     * @param {string}      key  - ID of the resize process
     */
    stop(key) {
        const self = this;
        const resizer = self.resizers[key];
        if (!resizer) {
            return;
        }
        clearInterval(resizer.interval);
        self.privateStopMediaStream(resizer.inputStream);
        self.privateStopMediaStream(resizer.outputStream);
        resizer.inputStream = null;
        resizer.outputStream = null;
        if (resizer.video) {
            document.body.removeChild(resizer.video);
            resizer.video = null;
        }
        if (resizer.canvas) {
            document.body.removeChild(resizer.canvas);
            resizer.canvas = null;
        }
        if (resizer.context) {
            resizer.context = null;
        }
        delete self.resizers[key];
    }

    /**
     * Resizer interval configuration
     *
     * @param {ResizerTemplate} resizer
     * @param {VideoDimensions} dimensions
     * @param {number}          fps - output video fps
     */
    privateResizeSetInterval(resizer, dimensions, fps) {
        const self = this;
        clearInterval(resizer.interval);
        resizer.interval = setInterval(() => {
            if (!resizer.context) {
                clearInterval(resizer.interval);
                return;
            }
            resizer.context.drawImage(
                resizer.video,
                0,
                0,
                dimensions.originWidth,
                dimensions.originHeight,
                dimensions.left,
                dimensions.top,
                dimensions.displayWidth,
                dimensions.displayHeight
            );
        }, Math.round(900 / fps));
    }

    /**
     * Get video dimensions
     *
     * @param {MediaStream}     inputStream - input media stream
     * @param {number}          videoWidth - output video width
     * @param {number}          videoHeight - output video height
     *
     * @returns {VideoDimensions}
     */
    privateGetResizeDimensions(inputStream, videoWidth, videoHeight) {
        const tracks = inputStream.getVideoTracks();
        if (!tracks || !tracks.length) {
            return;
        }
        const trackSettings = tracks[0].getSettings();
        const trackWidth = trackSettings.width;
        const trackHeight = trackSettings.height;

        let displayWidth, displayHeight, deltaX, deltaY;
        if (videoHeight && trackHeight < trackWidth) {
            displayWidth = (trackWidth * videoHeight) / trackHeight;
            displayHeight = videoHeight;
            deltaX = (videoWidth - displayWidth) / 2;
            deltaY = (videoHeight - displayHeight) / 2;
        } else {
            displayWidth = videoWidth;
            displayHeight = (trackHeight * videoWidth) / trackWidth;
            deltaX = (videoWidth - displayWidth) / 2;
            deltaY = videoHeight ? (videoHeight - displayHeight) / 2 : 0;
        }
        const videoDimensions = {};
        videoDimensions.originWidth = Math.round(trackWidth);
        videoDimensions.originHeight = Math.round(trackHeight);
        videoDimensions.displayWidth = Math.round(displayWidth);
        videoDimensions.displayHeight = Math.round(displayHeight);
        videoDimensions.top = Math.round(deltaY);
        videoDimensions.left = Math.round(deltaX);
        return videoDimensions;
    }

    /**
     * Stop media stream
     *
     * @param stream
     */
    privateStopMediaStream(stream) {
        if (!stream) {
            return;
        }
        stream.getTracks().forEach((track) => {
            track.stop();
            stream.removeTrack(track);
        });
    }
}

// const VideoResizer = new VideoResizerClass();

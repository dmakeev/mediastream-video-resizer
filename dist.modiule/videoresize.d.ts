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
interface CanvasElement extends HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream;
}
interface VideoElement extends HTMLVideoElement {
    playsinline: boolean;
}
interface VideoResizerItem {
    video: VideoElement | null;
    canvas: CanvasElement | null;
    context: CanvasRenderingContext2D | null;
    inputStream: MediaStream | null;
    outputStream: MediaStream | null;
    interval: ReturnType<typeof setTimeout> | null;
}
interface VideoDimensions {
    requiredWidth: number;
    requiredHeight: number | null;
    originWidth: number;
    originHeight: number;
    displayWidth: number;
    displayHeight: number;
    top: number;
    left: number;
}
export declare class VideoResizer {
    resizers: {
        [key: string]: VideoResizerItem;
    };
    resizerTemplate: VideoResizerItem;
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
    start(inputStream: MediaStream, key: string, width: number, height: number | null, fps: number): MediaStream;
    /**
     * Stop the resizer
     *
     * @param {string}      key  - ID of the resize process
     */
    stop(key: string): void;
    /**
     * Resizer interval configuration
     *
     * @param {VideoResizerItem} resizer
     * @param {VideoDimensions}  dimensions
     * @param {number}           fps - output video fps
     */
    privateResizeSetInterval(resizer: VideoResizerItem, dimensions: VideoDimensions, fps: number): void;
    /**
     * Get video dimensions
     *
     * @param {MediaStream}     inputStream - input media stream
     * @param {number}          requiredWidth - output video width
     * @param {number}          requiredHeight - output video height
     *
     * @returns {VideoDimensions}
     */
    privateGetResizeDimensions(inputStream: MediaStream, requiredWidth: number, requiredHeight: number | null): VideoDimensions;
    /**
     * Stop the media stream correctly
     *
     * @param {MediaStream} stream
     */
    privateStopMediaStream(stream: MediaStream): void;
}
export {};

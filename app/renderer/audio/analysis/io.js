import {
    native
} from '../../services/native.js';
export async function decodePartialAudio(filePath, seconds = 20) {
    const ctx = new(window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 48000 * seconds, 48000);
    const urlToArrayBuffer = async () => {
        const buf = await native.readFile(filePath);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    };
    const arr = await urlToArrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arr.slice(0));
    const frames = Math.min(audioBuf.length, seconds * audioBuf.sampleRate);
    return {
        sampleRate: audioBuf.sampleRate,
        channels: Array.from({
            length: audioBuf.numberOfChannels
        }, (_, i) => audioBuf.getChannelData(i).slice(0, frames)),
    }
}
import { renderDetections, renderMask } from '~/utils/renderBox'
import axios from 'axios'
import axiosRetry from "axios-retry"
import * as msgpack from "@msgpack/msgpack";

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay })

const URL = 'https://bbbb-42-112-211-165.ngrok-free.app'
const URL_STATUS = `${URL}/api/status/`
const URL_RESULT = `${URL}/api/result/`
const URL_PROCESS = `${URL}/api/process`
const WS_URL = `${URL.replace('https', 'wss')}/ws/process`

export async function detectFAS(
  source: HTMLImageElement | HTMLVideoElement,
  canvasRef: HTMLCanvasElement,
  pingRef: Ref<number>,
  parameters: Record<string, any>,
  callback: () => void = () => { }
): Promise<void> {
  try {
    const canvas = document.createElement("canvas")
    const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth
    const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Cannot get context 2D from canvas")
    ctx.drawImage(source, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Cannot convert canvas to Blob"))), "image/jpeg")
    })

    const config = {
      "model": "fas", "conf": parameters.confidenceFaceThreshold.value,
      "iou": parameters.iouThreshold.value,
      "max_det": parameters.maxDetections.value,
      "acc_thres": parameters.accuracyThreshold.value
    }

    const formData = new FormData()
    formData.append("files", blob, "image.jpg")
    formData.append("configs", JSON.stringify(config))
    
    const start = performance.now()
    const response = await axios.post(URL_PROCESS, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    const end = performance.now()
    pingRef.value = Math.round(end - start)

    const task_id = response.data[0]['task_id']
    const detections = (await fetchTaskResult(task_id)).bbox
    if (detections) renderDetections(detections, canvasRef)

  } catch (error) {
    console.error("⚠️ Detect error:", error)
  } finally {
    callback()
  }
}

export async function detectDF(
  source: HTMLImageElement | HTMLVideoElement,
  canvasRef: HTMLCanvasElement,
  pingRef: Ref<number>,
  parameters: Record<string, any>,
  callback: () => void = () => { }
): Promise<void> {
  try {
    const ctxRaw = canvasRef.getContext('2d')
    if (!ctxRaw) return
    const widthRaw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth
    const heightRaw = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
    canvasRef.width = widthRaw
    canvasRef.height = heightRaw
    ctxRaw.clearRect(0, 0, canvasRef.width, canvasRef.height)

    const canvas = document.createElement("canvas")
    const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth
    const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Cannot get context 2D from canvas")
    ctx.drawImage(source, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Cannot convert canvas to Blob"))), "image/jpeg")
    })

    const config = {
      "model": "df",
      "inp_size": parameters.inpSize.value,
      "mask_alpha": parameters.alphaBlend.value
    }

    const formData = new FormData()
    formData.append("files", blob, "image.jpg")
    formData.append("configs", JSON.stringify(config))
    
    const start = performance.now()
    const response = await axios.post(URL_PROCESS, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    const end = performance.now()
    pingRef.value = Math.round(end - start)

    const task_id = response.data[0]['task_id']
    const result = (await fetchTaskResult(task_id)).res
    if (result) renderMask(result, canvasRef)
  } catch (error) {
    console.error("⚠️ Detect error:", error)
  } finally {
    callback()
  }
}

async function fetchTaskResult(task_id: string, maxRetries: number = 50): Promise<any | null> {
  const controller = new AbortController();
  const { signal } = controller;
  let retries = 0;

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const res = await axios.get(URL_STATUS + task_id, { signal, headers: { "ngrok-skip-browser-warning": "any" } });
        const status = res.data['status'];

        if (status === 'SUCCESS') {
          const result = await axios.get(URL_RESULT + task_id, { signal, headers: { "ngrok-skip-browser-warning": "any" } });
          resolve(result.data.result);
        } else if (status === 'FAILED' || retries >= maxRetries) {
          reject(new Error("Task failed or max retries reached"));
        } else {
          retries++;
          setTimeout(checkStatus, 100);
        }
      } catch (error) {
        reject(error);
      }
    };

    checkStatus();
  });
}

let ws: WebSocket | null = null
const connectionId = crypto.randomUUID()
let isSendingFrames = false
let animationId: number | null = null
let hiddenCanvas: HTMLCanvasElement | null = null
let hiddenCtx: CanvasRenderingContext2D | null = null

export function detectFASonVideo(
  vidSource: HTMLVideoElement,
  canvasRef: HTMLCanvasElement,
  pingRef: Ref<number>,
  parameters: Record<string, any>,
  wsUrl: string = `${WS_URL}/${connectionId}`,
  initialFps: number = 5,
  max_timestamp_timeout = 500
) {
  if (!vidSource || !canvasRef) return;

  if (!hiddenCanvas) {
    hiddenCanvas = document.createElement("canvas");
    hiddenCtx = hiddenCanvas.getContext("2d");
  }

  hiddenCanvas.width = vidSource.videoWidth || inputShape[1];
  hiddenCanvas.height = vidSource.videoHeight || inputShape[2];

  let lastFrameTime = 0;
  let lastResponseTime = 100;
  let dynamicFps = initialFps;
  let isProcessingFrame = false;
  let lastSentTime = Date.now();

  const connectWebSocket = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => console.log("✅ WebSocket Connected");
    ws.onclose = () => {
      console.warn("❌ WebSocket Disconnected");
      ws = null;
    };
    ws.onerror = (err) => console.error("🚨 WebSocket Error:", err);

    let lastTimestamp = 0;
    ws.onmessage = (event) => {
      try {
        const detections = msgpack.decode(new Uint8Array(event.data)) as any;
        const timestamp = Number(detections.timestamp);
        const now = Date.now();
        if (!isNaN(timestamp) && timestamp > lastTimestamp) {
          pingRef.value = now - timestamp;
          if (now - timestamp > max_timestamp_timeout) {
            return;
          }
          lastTimestamp = timestamp;
          renderDetections(detections.result.bbox, canvasRef);
          lastResponseTime = now - lastSentTime;
          adjustFps();
        }
      } catch (error) {
        console.error("🚨 Error parsing WebSocket data:", error);
      }
    };
  };

  const adjustFps = () => {
    // dynamicFps = Math.max(1, Math.min(initialFps, 1000 / lastResponseTime));
    dynamicFps = 5
  };

  const sendFrameBlob = async (blob: Blob) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || isProcessingFrame) return;
    isProcessingFrame = true;
    lastSentTime = Date.now();

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const config = {
        model: "fas",
        conf: parameters.confidenceFaceThreshold.value,
        iou: parameters.iouThreshold.value,
        max_det: parameters.maxDetections.value,
        acc_thres: parameters.accuracyThreshold.value,
      };
      const payload = msgpack.encode({
        bytes: new Uint8Array(arrayBuffer),
        config: config,
        timestamp: Date.now(),
      });
      ws.send(payload);
    } catch (error) {
      console.error("🚨 WebSocket send error:", error);
    } finally {
      isProcessingFrame = false;
    }
  };

  const detectFrame = async (time: number) => {
    if (!isSendingFrames) return;

    const elapsedTime = time - lastFrameTime;
    if (elapsedTime < 1000 / dynamicFps || isProcessingFrame) {
      animationId = requestAnimationFrame(detectFrame);
      return;
    }
    lastFrameTime = time;

    if (!hiddenCtx || !hiddenCanvas) return;

    hiddenCtx.drawImage(vidSource, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    hiddenCanvas.toBlob(blob => {
      if (blob) sendFrameBlob(blob);
    }, "image/jpeg", 0.6);

    animationId = requestAnimationFrame(detectFrame);
  };

  const startDetection = () => {
    if (isSendingFrames) return;
    isSendingFrames = true;
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
    animationId = requestAnimationFrame(detectFrame);
  };

  vidSource.addEventListener("pause", stopDetection);
  vidSource.addEventListener("play", startDetection);
  vidSource.addEventListener("ended", () => {
    stopDetection();
    closeWebSocket();
  });

  startDetection();
}

export function detectDFonVideo(
  vidSource: HTMLVideoElement,
  canvasRef: HTMLCanvasElement,
  pingRef: Ref<number>,
  parameters: Record<string, any>,
  wsUrl: string = `${WS_URL}/${connectionId}`,
  initialFps: number = 5,
  max_timestamp_timeout = 500
) {
  const ctxRaw = canvasRef.getContext('2d')
  if (!ctxRaw) return
  canvasRef.width = vidSource.videoWidth
  canvasRef.height = vidSource.videoHeight
  ctxRaw.clearRect(0, 0, canvasRef.width, canvasRef.height)

  if (!vidSource || !canvasRef) return;

  if (!hiddenCanvas) {
    hiddenCanvas = document.createElement("canvas");
    hiddenCtx = hiddenCanvas.getContext("2d");
  }

  hiddenCanvas.width = vidSource.videoWidth || inputShape[1];
  hiddenCanvas.height = vidSource.videoHeight || inputShape[2];

  let lastFrameTime = 0;
  let lastResponseTime = 100;
  let dynamicFps = initialFps;
  let isProcessingFrame = false;
  let lastSentTime = Date.now();

  const connectWebSocket = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => console.log("✅ WebSocket Connected");
    ws.onclose = () => {
      console.warn("❌ WebSocket Disconnected");
      ws = null;
    };
    ws.onerror = (err) => console.error("🚨 WebSocket Error:", err);

    let lastTimestamp = 0;
    ws.onmessage = (event) => {
      try {
        const detections = msgpack.decode(new Uint8Array(event.data)) as any;
        const timestamp = Number(detections.timestamp);
        const now = Date.now();
        if (!isNaN(timestamp) && timestamp > lastTimestamp) {
          pingRef.value = now - timestamp;
          if (now - timestamp > max_timestamp_timeout) {
            return;
          }
          lastTimestamp = timestamp;
          renderMask(detections.result.res, canvasRef);
          lastResponseTime = now - lastSentTime;
          adjustFps();
        }
      } catch (error) {
        console.error("🚨 Error parsing WebSocket data:", error);
      }
    };
  };

  const adjustFps = () => {
    // dynamicFps = Math.max(1, Math.min(initialFps, 1000 / lastResponseTime));
    dynamicFps = 5
  };

  const sendFrameBlob = async (blob: Blob) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || isProcessingFrame) return;
    isProcessingFrame = true;
    lastSentTime = Date.now();

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const config = {
        "model": "df",
        "inp_size": parameters.inpSize.value,
        "mask_alpha": parameters.alphaBlend.value
      }
      const payload = msgpack.encode({
        bytes: new Uint8Array(arrayBuffer),
        config: config,
        timestamp: Date.now(),
      });
      ws.send(payload);
    } catch (error) {
      console.error("🚨 WebSocket send error:", error);
    } finally {
      isProcessingFrame = false;
    }
  };

  const detectFrame = async (time: number) => {
    if (!isSendingFrames) return;

    const elapsedTime = time - lastFrameTime;
    if (elapsedTime < 1000 / dynamicFps || isProcessingFrame) {
      animationId = requestAnimationFrame(detectFrame);
      return;
    }
    lastFrameTime = time;

    if (!hiddenCtx || !hiddenCanvas) return;

    hiddenCtx.drawImage(vidSource, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    hiddenCanvas.toBlob(blob => {
      if (blob) sendFrameBlob(blob);
    }, "image/jpeg", 0.6);

    animationId = requestAnimationFrame(detectFrame);
  };

  const startDetection = () => {
    if (isSendingFrames) return;
    isSendingFrames = true;
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
    animationId = requestAnimationFrame(detectFrame);
  };

  vidSource.addEventListener("pause", stopDetection);
  vidSource.addEventListener("play", startDetection);
  vidSource.addEventListener("ended", () => {
    stopDetection();
    closeWebSocket();
  });

  startDetection();
}

export const stopDetection = () => {
  // console.log("⏹ Stop capturing")
  isSendingFrames = false
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

export const closeWebSocket = () => {
  if (ws) {
    // console.log("🔌 Closing WebSocket")
    ws.close()
    ws = null
  }
}
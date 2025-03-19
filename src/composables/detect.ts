import labels from '~/utils/labels.json'
import { renderBoxes } from '~/utils/renderBox'
import axios from 'axios'
import axiosRetry from "axios-retry"

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay })

let animationId: number | null = null
// const URL = 'http://localhost:8000'
const URL = 'https://bbbb-42-112-211-165.ngrok-free.app'
const URL_STATUS = `${URL}/api/status/`
const URL_RESULT = `${URL}/api/result/`
const URL_PROCESS = `${URL}/api/process`

export async function detect(
  source: HTMLImageElement | HTMLVideoElement,
  canvasRef: HTMLCanvasElement,
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

    const formData = new FormData()
    formData.append("files", blob, "image.jpg")

    const response = await axios.post(URL_PROCESS, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    const task_id = response.data[0]['task_id']

    const detections = await fetchTaskResult(task_id)
    if (detections) renderDetections(detections, canvasRef)

  } catch (error) {
    console.error("⚠️ Detect error:", error)
  } finally {
    callback()
  }
}

async function fetchTaskResult(task_id: string): Promise<any | null> {
  const controller = new AbortController()
  const { signal } = controller

  return new Promise(async (resolve, reject) => {
    const checkStatus = async () => {
      try {
        const res = await axios.get(URL_STATUS + task_id, { signal, headers: { "ngrok-skip-browser-warning": "any" }})
        const status = res.data['status']

        if (status === 'SUCCESS') {
          const result = await axios.get(URL_RESULT + task_id, { signal, headers: { "ngrok-skip-browser-warning": "any" }})
          resolve(result.data.result.bbox)
        } else if (status === 'FAILED') {
          reject(new Error("Task failed"))
        } else {
          setTimeout(checkStatus, 100)
        }
      } catch (error) {
        reject(error)
      }
    }

    checkStatus()
  })
}

function renderDetections(detections: any[], canvasRef: HTMLCanvasElement) {
  const src_width = canvasRef.width
  const src_height = canvasRef.height
  const boxesArray = new Float32Array(detections.length * 4)
  const scoresArray = new Float32Array(detections.length)
  const classesArray = new Int32Array(detections.length)

  detections.forEach((detection, i) => {
    const x = parseFloat(detection.x)
    const y = parseFloat(detection.y)
    const w = parseFloat(detection.w)
    const h = parseFloat(detection.h)

    const x1 = (x - w / 2) * src_width
    const y1 = (y - h / 2) * src_height
    const x2 = (x + w / 2) * src_width
    const y2 = (y + h / 2) * src_height

    boxesArray.set([y1, x1, y2, x2], i * 4)
    scoresArray[i] = parseFloat(detection.prob)
    const classIndex = labels.indexOf(detection.class)
    classesArray[i] = classIndex !== -1 ? classIndex : -1
  })

  renderBoxes(canvasRef, boxesArray, scoresArray, classesArray)
}

/**
 * Function to detect video from every source.
 * @param {HTMLVideoElement} vidSource video source
 * @param {tf.GraphModel} model loaded YOLOv8 tensorflow.js model
 * @param {HTMLCanvasElement} canvasRef canvas reference
 */
export function detectVideo(vidSource: HTMLVideoElement, canvasRef: HTMLCanvasElement) {
  /**
   * Function to detect every frame from video
   */
  // console.log(vidSource, canvasRef)
  const detectFrame = async () => {
    if (vidSource.videoWidth === 0 && vidSource.srcObject === null) {
      console.warn('vidSource.srcObject === null')
      const ctx = canvasRef.getContext('2d')
      ctx && ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height) // clean canvas
      return // handle if source is closed
    }

    detect(vidSource, canvasRef, () => {
      animationId = requestAnimationFrame(detectFrame) // get another frame
    })
  }

  if (!animationId) {
    detectFrame()
  }
}

export function unDetectVideo() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
    console.warn('Detection stopped')
  }
}

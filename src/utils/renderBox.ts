import pako from 'pako'
import labels from './labels.json'

export function renderBoxes(
  canvasRef: HTMLCanvasElement,
  boxes_data: Float32Array | Int32Array | Uint8Array,
  scores_data: Float32Array | Int32Array | Uint8Array,
  classes_data: Float32Array | Int32Array | Uint8Array,
  fasArray: string[]
) {
  const ctx = canvasRef.getContext('2d')
  if (!ctx) return

  const offscreenCanvas = document.createElement("canvas")
  offscreenCanvas.width = canvasRef.width
  offscreenCanvas.height = canvasRef.height
  const offscreenCtx = offscreenCanvas.getContext("2d")
  if (!offscreenCtx) return

  const colors = new Colors()

  for (let i = 0; i < scores_data.length; ++i) {
    const klass = labels[classes_data[i]]
    const color = colors.get(classes_data[i])
    const score = (scores_data[i] * 100).toFixed(0)
    const fas = fasArray[i]

    let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4)
    const width = x2 - x1
    const height = y2 - y1

    offscreenCtx.fillStyle = Colors.hexToRgba(color, 0.15)!
    offscreenCtx.fillRect(x1, y1, width, height)

    const gradient = offscreenCtx.createLinearGradient(x1, y1, x2, y2)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, Colors.hexToRgba(color, 0.6)!)
    offscreenCtx.strokeStyle = gradient

    offscreenCtx.lineWidth = 2.5
    offscreenCtx.setLineDash([8, 4])
    offscreenCtx.shadowBlur = 10
    offscreenCtx.shadowColor = color
    offscreenCtx.strokeRect(x1, y1, width, height)
    offscreenCtx.shadowBlur = 0

    drawDottedCorners(offscreenCtx, x1, y1, x2, y2, color)

    let fontSize = Math.max(Math.round(offscreenCanvas.width / 50), 14)
    offscreenCtx.font = `bold ${fontSize}px Arial`
    offscreenCtx.textBaseline = 'middle'
    offscreenCtx.fillStyle = "red"

    let text = `${klass} ${score}% ${fas}`
    let textWidth = offscreenCtx.measureText(text).width

    const textX = x1 + width / 2 - textWidth / 2 
    const textY = y1 - fontSize - 5
    offscreenCtx.fillText(text, textX, textY)
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.drawImage(offscreenCanvas, 0, 0)
}

function drawDottedCorners(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash([4, 2])

  ctx.beginPath()
  ctx.moveTo(x1, y1 + 12)
  ctx.lineTo(x1, y1)
  ctx.lineTo(x1 + 12, y1)

  ctx.moveTo(x2 - 12, y1)
  ctx.lineTo(x2, y1)
  ctx.lineTo(x2, y1 + 12)

  ctx.moveTo(x1, y2 - 12)
  ctx.lineTo(x1, y2)
  ctx.lineTo(x1 + 12, y2)

  ctx.moveTo(x2 - 12, y2)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x2, y2 - 12)

  ctx.stroke()
}

class Colors {
  palette: string[]
  n: number
  constructor() {
    this.palette = [
      '#FF3838',
      '#FF9D97',
      '#FF701F',
      '#FFB21D',
      '#CFD231',
      '#48F90A',
      '#92CC17',
      '#3DDB86',
      '#1A9334',
      '#00D4BB',
      '#2C99A8',
      '#00C2FF',
      '#344593',
      '#6473FF',
      '#0018EC',
      '#8438FF',
      '#520085',
      '#CB38FF',
      '#FF95C8',
      '#FF37C7',
    ]
    this.n = this.palette.length
  }

  get = (i: number) => this.palette[Math.floor(i) % this.n]

  static hexToRgba = (hex: string, alpha: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `rgba(${[parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)].join(
          ', ',
        )}, ${alpha})`
      : null
  }
}

export function renderDetections(detections: any[], canvasRef: HTMLCanvasElement) {
  const src_width = canvasRef.width
  const src_height = canvasRef.height
  const boxesArray = new Float32Array(detections.length * 4)
  const scoresArray = new Float32Array(detections.length)
  const classesArray = new Int32Array(detections.length)
  const fasArray: string[] = new Array(detections.length)

  detections.forEach((detection, i) => {
    const x = parseFloat(detection.x)
    const y = parseFloat(detection.y)
    const w = parseFloat(detection.w)
    const h = parseFloat(detection.h)
    const real = parseFloat(detection.real)
    const fake = parseFloat(detection.fake)

    const fas: string = real > fake ? `(real ${Math.round(real * 100)}%)` : `(fake ${Math.round(fake * 100)}%)`

    const x1 = (x - w / 2) * src_width
    const y1 = (y - h / 2) * src_height
    const x2 = (x + w / 2) * src_width
    const y2 = (y + h / 2) * src_height

    boxesArray.set([y1, x1, y2, x2], i * 4)
    scoresArray[i] = parseFloat(detection.prob)
    const classIndex = labels.indexOf(detection.class)
    classesArray[i] = classIndex !== -1 ? classIndex : -1
    fasArray[i] = fas
  })

  renderBoxes(canvasRef, boxesArray, scoresArray, classesArray, fasArray)
}

export async function renderMask(result: any[], canvasRef: HTMLCanvasElement) {
  const ctx = canvasRef.getContext('2d', { willReadFrequently: false });
  if (!ctx || !result?.mask) return;

  const byteString = atob(result.mask);
  const len = byteString.length;
  const byteArray = new Uint8Array(len);

  for (let i = 0; i < len; ++i) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([byteArray], { type: 'image/jpeg' });
  const imageUrl = URL.createObjectURL(blob);
  const img = new Image();

  img.onload = () => {
    if (canvasRef.width !== img.width || canvasRef.height !== img.height) {
      canvasRef.width = img.width;
      canvasRef.height = img.height;
    } else {
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    }

    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(imageUrl);
  };
  img.src = imageUrl;
}

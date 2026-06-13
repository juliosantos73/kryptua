<template>
  <div class="scanner-overlay" @click.self="emit('close')">
    <div class="scanner-box">
      <video ref="videoEl" class="scanner-video" autoplay playsinline muted />
      <div class="viewfinder">
        <span class="corner tl" /><span class="corner tr" />
        <span class="corner bl" /><span class="corner br" />
        <div class="scan-line" />
      </div>
      <p class="scanner-hint">{{ error || 'Aponte para o QR code do vault' }}</p>
      <button class="scanner-cancel" @click="emit('close')">Cancelar</button>
    </div>
    <canvas ref="canvasEl" class="scanner-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import jsQR from 'jsqr'

const emit = defineEmits<{
  (e: 'scan', code: string): void
  (e: 'close'): void
}>()

const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const error = ref('')

let stream: MediaStream | null = null
let animId: number | null = null

onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      audio: false,
    })
    if (!videoEl.value) return
    videoEl.value.srcObject = stream
    animId = requestAnimationFrame(tick)
  } catch {
    error.value = 'Sem acesso à câmara. Verifique as permissões.'
  }
})

function tick() {
  const video = videoEl.value
  const canvas = canvasEl.value
  if (!video || !canvas) return

  if (video.readyState < video.HAVE_ENOUGH_DATA) {
    animId = requestAnimationFrame(tick)
    return
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  })

  if (code?.data) {
    stop()
    emit('scan', code.data)
    return
  }

  animId = requestAnimationFrame(tick)
}

function stop() {
  if (animId) { cancelAnimationFrame(animId); animId = null }
  stream?.getTracks().forEach(t => t.stop())
}

onUnmounted(stop)
</script>

<style scoped>
.scanner-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 1rem;
}

.scanner-box {
  position: relative;
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.scanner-video {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius);
  display: block;
}

/* Viewfinder overlay sobre o vídeo */
.viewfinder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: calc(1rem + 1rem + 2.5rem); /* hint + gap + button */
  pointer-events: none;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #fff;
  border-style: solid;
}
.corner.tl { top: 12px; left: 12px; border-width: 3px 0 0 3px; border-radius: 3px 0 0 0; }
.corner.tr { top: 12px; right: 12px; border-width: 3px 3px 0 0; border-radius: 0 3px 0 0; }
.corner.bl { bottom: 12px; left: 12px; border-width: 0 0 3px 3px; border-radius: 0 0 0 3px; }
.corner.br { bottom: 12px; right: 12px; border-width: 0 3px 3px 0; border-radius: 0 0 3px 0; }

@keyframes scan {
  0%   { top: 15%; }
  50%  { top: 80%; }
  100% { top: 15%; }
}

.scan-line {
  position: absolute;
  left: 12px;
  right: 12px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
  animation: scan 2s ease-in-out infinite;
}

.scanner-hint {
  color: rgba(255,255,255,0.85);
  font-size: 0.85rem;
  text-align: center;
  padding: 0 0.5rem;
}

.scanner-cancel {
  padding: 0.65rem 2rem;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: var(--radius);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.15s;
}
.scanner-cancel:hover { background: rgba(255,255,255,0.2); }

.scanner-canvas { display: none; }
</style>

// script.js — Sonrisa REAL (con doble condición + tiempo extendido)

console.log("script.js cargado ✔");

import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

const video = document.getElementById("webcam");
const feedback = document.getElementById("feedback-gesto");
const chatbotStatus = document.getElementById("chatbot-status");
const chatbotSection = document.getElementById("chatbot");
const chatbotContenedor = document.getElementById("chatbot-contenedor");

let faceLandmarker;
let desbloqueado = false;

// Mucho más estricto
const SONRISA_RATIO_UMBRAL = 3.2;      // boca muy ancha
const LABIOS_SEPARADOS = 0.018;        // labios realmente abiertos
const SONRISA_TIEMPO_MIN = 650;        // 0.65s sostenido
const ESTABILIDAD_CARA_MIN = 400;      // 0.4s antes de analizar

let sonrisaInicio = null;
let caraDetectadaInicio = null;


// =========================================================
// DESBLOQUEAR
// =========================================================
function desbloquear(motivo) {
  if (desbloqueado) return;
  desbloqueado = true;

  chatbotSection.classList.add("desbloqueado");

  chatbotStatus.innerHTML = `
    <h3>¡Guía Desbloqueada!</h3>
    <p>Has activado el chatbot con: <b>${motivo}</b>.</p>
  `;

  feedback.textContent = `🎉 Activado por ${motivo}`;

  chatbotContenedor.style.display = "block";
  chatbotContenedor.innerHTML = `
    <iframe
      src="https://cdn.botpress.cloud/webchat/v3.3/shareable.html?configUrl=https://files.bpcontent.cloud/2025/11/07/21/20251107212257-N8IQVOHQ.json"
      style="width:100%; height:520px; border:none; border-radius:12px;"
      title="Chatbot"
    ></iframe>
  `;
}


// =========================================================
// DETECTAR SONRISA REAL (doble condición)
// =========================================================
function detectarSonrisaReal(face) {
  const left = face[61];
  const right = face[291];
  const topLip = face[13];
  const bottomLip = face[14];

  const width = Math.abs(right.x - left.x);
  const height = Math.abs(bottomLip.y - topLip.y);
  const ratio = width / height;

  const separacionLabios = bottomLip.y - topLip.y;

  // Debe cumplir AMBAS condiciones
  return (
    ratio > SONRISA_RATIO_UMBRAL &&
    separacionLabios > LABIOS_SEPARADOS
  );
}


// =========================================================
// LOOP PRINCIPAL
// =========================================================
function loop() {
  if (!video.videoWidth) {
    requestAnimationFrame(loop);
    return;
  }

  const now = performance.now();

  const faceRes = faceLandmarker.detectForVideo(video, now);

  if (faceRes &&
      faceRes.faceLandmarks &&
      faceRes.faceLandmarks.length > 0) {

    const face = faceRes.faceLandmarks[0];

    // ===== 1. ESTABILIDAD DE DETECCIÓN =====
    if (!caraDetectadaInicio) {
      caraDetectadaInicio = now;
      feedback.textContent = "Detectando rostro...";
      requestAnimationFrame(loop);
      return;
    }

    if (now - caraDetectadaInicio < ESTABILIDAD_CARA_MIN) {
      feedback.textContent = "Detectando rostro...";
      requestAnimationFrame(loop);
      return;
    }

    // ===== 2. DETECCIÓN DE SONRISA REAL =====
    const sonrisa = detectarSonrisaReal(face);

    if (!desbloqueado) {
      if (sonrisa) {
        if (!sonrisaInicio) sonrisaInicio = now;

        const duracion = now - sonrisaInicio;

        feedback.textContent =
          `😊 Mantén la sonrisa... (${Math.round(duracion)} ms)`;

        if (duracion >= SONRISA_TIEMPO_MIN) {
          desbloquear("Sonrisa 😄");
        }

      } else {
        sonrisaInicio = null;
        feedback.textContent = "Sonríe 😄 para desbloquear.";
      }
    }

  } else {
    caraDetectadaInicio = null;
    sonrisaInicio = null;

    if (!desbloqueado) {
      feedback.textContent = "Acércate a la cámara...";
    }
  }

  requestAnimationFrame(loop);
}


// =========================================================
// INICIO
// =========================================================
async function iniciar() {
  feedback.textContent = "Cargando modelos IA...";

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    },
    runningMode: "VIDEO",
    numFaces: 1
  });

  feedback.textContent = "Iniciando cámara...";

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.onloadedmetadata = () => {
    video.play();
    feedback.textContent = "Acércate a la cámara...";
    requestAnimationFrame(loop);
  };
}

iniciar();

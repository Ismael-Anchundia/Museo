// script.js — Sonrisa REAL + chatbot flotante + burbuja + maximizar entorno

console.log("script.js cargado ✔");

import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

// =============================
// ELEMENTOS DEL DOM
// =============================
const video = document.getElementById("webcam");
const mensajeInicial = document.getElementById("mensaje-inicial");
const chatbotFlotante = document.getElementById("chatbot-flotante");
const chatbotBurbuja = document.getElementById("chatbot-burbuja");
const mensajeSonrisa = document.getElementById("mensaje-sonrisa");

const entornoWrapper = document.getElementById("entorno-wrapper");
const btnMax = document.getElementById("btn-max");
const btnMin = document.getElementById("btn-min");

// =============================
// MAXIMIZAR / RESTAURAR
// =============================
btnMax.addEventListener("click", () => {
  entornoWrapper.classList.add("maximizado");
  btnMax.style.display = "none";
  btnMin.style.display = "inline-block";
});

btnMin.addEventListener("click", () => {
  entornoWrapper.classList.remove("maximizado");
  btnMax.style.display = "inline-block";
  btnMin.style.display = "none";
});

// =============================
// LÓGICA DE SONRISA
// =============================
let faceLandmarker;
let desbloqueado = false;

const SONRISA_RATIO_UMBRAL = 3.2;
const LABIOS_SEPARADOS = 0.018;
const SONRISA_TIEMPO_MIN = 650;
const ESTABILIDAD_CARA_MIN = 400;

let sonrisaInicio = null;
let caraDetectadaInicio = null;

function mostrarMensajeSonrisa() {
  mensajeSonrisa.classList.add("activo");
  setTimeout(() => mensajeSonrisa.classList.remove("activo"), 1800);
}

function desbloquear() {
  if (desbloqueado) return;
  desbloqueado = true;

  mostrarMensajeSonrisa();

  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
  }

  mensajeInicial.style.display = "none";

  chatbotFlotante.style.display = "block";
  chatbotFlotante.innerHTML = `
    <button id="boton-minimizar">–</button>
    <iframe
      allow="microphone; autoplay; clipboard-read; clipboard-write"
      src="https://cdn.botpress.cloud/webchat/v3.3/shareable.html?configUrl=https://files.bpcontent.cloud/2025/11/08/00/20251108000118-XJB726CY.json"
      title="Chatbot">
    </iframe>
  `;

  const botonMin = document.getElementById("boton-minimizar");
  botonMin.onclick = () => {
    chatbotFlotante.style.display = "none";
    chatbotBurbuja.style.display = "flex";
  };
}

chatbotBurbuja.onclick = () => {
  chatbotBurbuja.style.display = "none";
  chatbotFlotante.style.display = "block";
};

function detectarSonrisaReal(face) {
  const left = face[61];
  const right = face[291];
  const topLip = face[13];
  const bottomLip = face[14];

  const width = Math.abs(right.x - left.x);
  const height = Math.abs(bottomLip.y - topLip.y);
  const ratio = width / height;

  return ratio > SONRISA_RATIO_UMBRAL && 
    (bottomLip.y - topLip.y) > LABIOS_SEPARADOS;
}

function loop() {
  if (!video || !video.videoWidth) {
    requestAnimationFrame(loop);
    return;
  }

  const now = performance.now();
  const faceRes = faceLandmarker.detectForVideo(video, now);

  if (faceRes?.faceLandmarks?.[0]) {
    const face = faceRes.faceLandmarks[0];

    if (!caraDetectadaInicio) {
      caraDetectadaInicio = now;
      return requestAnimationFrame(loop);
    }

    if (now - caraDetectadaInicio < ESTABILIDAD_CARA_MIN) {
      return requestAnimationFrame(loop);
    }

    const sonrisa = detectarSonrisaReal(face);

    if (!desbloqueado) {
      if (sonrisa) {
        if (!sonrisaInicio) sonrisaInicio = now;

        const duracion = now - sonrisaInicio;
        if (duracion >= SONRISA_TIEMPO_MIN) {
          desbloquear();
        }
      } else {
        sonrisaInicio = null;
      }
    }
  } else {
    caraDetectadaInicio = null;
    sonrisaInicio = null;
  }

  requestAnimationFrame(loop);
}

async function iniciar() {
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

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  if (!video) return;

  video.srcObject = stream;

  video.onloadedmetadata = () => {
    video.play();
    requestAnimationFrame(loop);
  };
}

iniciar();

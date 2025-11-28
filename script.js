console.log("script.js cargado ✔");

import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

/* ============================================================
   ELEMENTOS
============================================================ */
const video = document.getElementById("webcam");
const mensajeInicial = document.getElementById("mensaje-inicial");
const mensajeSonrisa = document.getElementById("mensaje-sonrisa");
const chatbotFlotante = document.getElementById("chatbot-flotante");
const chatbotBurbuja = document.getElementById("chatbot-burbuja");

const entornoWrapper = document.getElementById("entorno-wrapper");
const btnMax = document.getElementById("btn-max");
const btnMin = document.getElementById("btn-min");

/* ============================================================
   MAXIMIZAR ENTORNO
============================================================ */
btnMax.onclick = () => {
  entornoWrapper.classList.add("maximizado");
  btnMax.style.display = "none";
  btnMin.style.display = "inline-block";
};

btnMin.onclick = () => {
  entornoWrapper.classList.remove("maximizado");
  btnMax.style.display = "inline-block";
  btnMin.style.display = "none";
};

/* ============================================================
   SONRISA
============================================================ */
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

  // apagar cámara
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
  }

  // ocultar mensaje
  mensajeInicial.style.display = "none";

  // CHATBOT flotante SIN FULLSCREEN EN MÓVIL
  chatbotFlotante.innerHTML = `
    <button id="boton-minimizar">–</button>
    <iframe
      allow="microphone; autoplay"
      style="width:100%; height:100%; border:none; border-radius:14px;"
      src="https://cdn.botpress.cloud/webchat/v3/index.html?configUrl=https://files.bpcontent.cloud/2025/11/08/00/20251108000118-XJB726CY.json">
    </iframe>
  `;

  chatbotFlotante.style.display = "block";

  // minimizar → burbuja
  document.getElementById("boton-minimizar").onclick = () => {
    chatbotFlotante.style.display = "none";
    chatbotBurbuja.style.display = "flex";
  };
}

// restaurar chatbot desde burbuja
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

  return (width / height) > SONRISA_RATIO_UMBRAL &&
         (bottomLip.y - topLip.y) > LABIOS_SEPARADOS;
}

/* ============================================================
   LOOP
============================================================ */
function loop() {
  if (!video || !video.videoWidth) return requestAnimationFrame(loop);

  const now = performance.now();
  const res = faceLandmarker.detectForVideo(video, now);

  if (res?.faceLandmarks?.[0]) {

    const face = res.faceLandmarks[0];

    if (!caraDetectadaInicio) {
      caraDetectadaInicio = now;
      return requestAnimationFrame(loop);
    }

    if (now - caraDetectadaInicio < ESTABILIDAD_CARA_MIN)
      return requestAnimationFrame(loop);

    const sonrisa = detectarSonrisaReal(face);

    if (!desbloqueado) {
      if (sonrisa) {
        if (!sonrisaInicio) sonrisaInicio = now;
        const duracion = now - sonrisaInicio;

        if (duracion >= SONRISA_TIEMPO_MIN) desbloquear();

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

/* ============================================================
   INICIAR DETECCIÓN DE ROSTRO
============================================================ */
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
  video.srcObject = stream;

  video.onloadedmetadata = () => {
    video.play();
    requestAnimationFrame(loop);
  };
}

iniciar();

/* ============================================================
   MUSEO: CARGAR VERSIÓN PC O MÓVIL
============================================================ */
const entornoIframe = document.getElementById("entorno-iframe");

if (entornoIframe) {
    const isMobile = /Android|iPhone|iPad|iPod|Phone|Mobile/i.test(navigator.userAgent);

    entornoIframe.src = isMobile
        ? "https://gualter302.github.io/HombreMaquina_ProyectoWeb/mobile/"
        : "https://gualter302.github.io/HombreMaquina_ProyectoWeb/";
}

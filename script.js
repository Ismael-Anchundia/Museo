// =============================
// script.js — Versión FINAL CORREGIDA
// =============================

console.log("script.js cargado ✔");

import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

/* ============================================================
   ELEMENTOS DEL DOM
============================================================ */
const video = document.getElementById("webcam");
const mensajeInicial = document.getElementById("mensaje-inicial");
const mensajeSonrisa = document.getElementById("mensaje-sonrisa");
const chatbotFlotante = document.getElementById("chatbot-flotante");
const chatbotBurbuja = document.getElementById("chatbot-burbuja");

const entornoWrapper = document.getElementById("entorno-wrapper");
const btnMax = document.getElementById("btn-max");
const btnMin = document.getElementById("btn-min");
const entornoIframe = document.getElementById("entorno-iframe");

/* ============================================================
   DETECCIÓN DE DISPOSITIVO → Cargar versión PC o MOBILE
============================================================ */
if (entornoIframe) {
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
    navigator.userAgent
  );

  if (isMobile) {
    entornoIframe.src =
      "https://gualter302.github.io/HombreMaquina_ProyectoWeb/mobile/";
  } else {
    entornoIframe.src =
      "https://gualter302.github.io/HombreMaquina_ProyectoWeb/";
  }
}

/* ============================================================
   MAXIMIZAR ENTORNO (Responsive + intento de Landscape en móvil)
============================================================ */
btnMax.addEventListener("click", async () => {
  entornoWrapper.classList.add("maximizado");
  btnMax.style.display = "none";
  btnMin.style.display = "inline-block";

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    try {
      // Intentar fullscreen en el contenedor
      if (entornoWrapper.requestFullscreen) {
        await entornoWrapper.requestFullscreen();
      } else if (entornoWrapper.webkitRequestFullscreen) {
        // iOS Safari viejo
        entornoWrapper.webkitRequestFullscreen();
      }

      // Intentar bloquear orientación (suele funcionar en Android Chrome, NO en iOS)
      if (screen.orientation && screen.orientation.lock) {
        try {
          await screen.orientation.lock("landscape");
        } catch (err) {
          console.log("No se pudo bloquear orientación:", err);
        }
      }
    } catch (e) {
      console.log("Error al intentar fullscreen/orientación:", e);
    }
  }
});

btnMin.addEventListener("click", async () => {
  entornoWrapper.classList.remove("maximizado");
  btnMax.style.display = "inline-block";
  btnMin.style.display = "none";

  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (e) {
      console.log("Error al salir de fullscreen:", e);
    }
  }
});

/* ============================================================
   LÓGICA DE SONRISA
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

  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach((t) => t.stop());
  }

  mensajeInicial.style.display = "none";

  // Chatbot flotante
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

// restaurar desde burbuja
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

  return width / height > SONRISA_RATIO_UMBRAL &&
    bottomLip.y - topLip.y > LABIOS_SEPARADOS;
}

/* ============================================================
   LOOP PRINCIPAL
============================================================ */
function loop() {
  if (!video || !video.videoWidth) {
    requestAnimationFrame(loop);
    return;
  }

  const now = performance.now();
  const res = faceLandmarker.detectForVideo(video, now);

  if (res?.faceLandmarks?.[0]) {
    const face = res.faceLandmarks[0];

    if (!caraDetectadaInicio) {
      caraDetectadaInicio = now;
      requestAnimationFrame(loop);
      return;
    }

    if (now - caraDetectadaInicio < ESTABILIDAD_CARA_MIN) {
      requestAnimationFrame(loop);
      return;
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

/* ============================================================
   INICIO
============================================================ */
async function iniciar() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "VIDEO",
    numFaces: 1,
  });

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.onloadedmetadata = () => {
    video.play();
    requestAnimationFrame(loop);
  };
}

iniciar();

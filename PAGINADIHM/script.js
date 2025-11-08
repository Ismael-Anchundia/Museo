// ====================================================================
// PARTE 1: Inicialización de Variables y Constantes
// ====================================================================

// Obtener elementos del DOM
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas-output');
const canvasCtx = canvasElement.getContext('2d');
const feedbackGesto = document.getElementById('feedback-gesto');
const chatbotStatus = document.getElementById('chatbot-status'); 
const botonManual = document.getElementById('desbloquear-manual');

let contenidoDesbloqueado = false; 

// Umbral de Guiño: Distancia vertical del ojo debe ser MENOR que este valor para detectar el guiño.
const BLINK_THRESHOLD = 0.008; 

let faceMesh;
let camera;

// ====================================================================
// PARTE 2: Lógica de Detección y Desbloqueo
// ====================================================================

// Función de Desbloqueo Unificada (llamada por el gesto o el botón)
function desbloquearContenido(tipoGesto) {
    if (contenidoDesbloqueado) return;
    
    contenidoDesbloqueado = true;
    feedbackGesto.textContent = `🥳 ¡${tipoGesto} detectado! Contenido Especial Desbloqueado.`;

    // Acción: Desbloquea el chatbot (simula el cambio de la guía)
    const chatbotSection = document.getElementById('chatbot');
    chatbotSection.style.backgroundColor = '#d4edda';
    chatbotStatus.innerHTML = "<h2>¡Guía Desbloqueada!</h2><p>El chatbot ahora te dirá el secreto del museo. ¡Vuelve arriba!</p>";
}

// Lógica de Detección de Guiño
function detectSmileGesto(landmarks) {
    if (contenidoDesbloqueado) return; 

    // Puntos del Ojo Derecho: 159 (arriba) y 145 (abajo)
    const eyeTopY = landmarks[159].y;
    const eyeBottomY = landmarks[145].y;
    
    // Distancia vertical del ojo (apertura)
    const eyeDistance = Math.abs(eyeBottomY - eyeTopY);
    
    // Muestra la distancia (Debug/Calibración)
    feedbackGesto.textContent = `Apertura del Ojo: ${eyeDistance.toFixed(4)}. Umbral de Guiño: ${BLINK_THRESHOLD}.`;

    // Condición de Guiño: El ojo está muy cerrado.
    if (eyeDistance < BLINK_THRESHOLD) { 
        desbloquearContenido("Gesto (Guiño)");
    }
}

// Función llamada por MediaPipe en cada fotograma
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height); 

    if (results.multiFaceLandmarks) {
        
        // Obtenemos las funciones de dibujo globales
        const { drawConnectors, FACEMESH_TESSELATION, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYE, FACEMESH_FACE_OVAL, FACEMESH_LIPS } = window;
        
        for (const landmarks of results.multiFaceLandmarks) {
            
            // Dibujo de la malla
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
            drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});

            detectSmileGesto(landmarks); 
        }
    }
    canvasCtx.restore();
}

// ====================================================================
// PARTE 3: Inicialización Asíncrona (Flujo de Carga Seguro)
// ====================================================================

function loadFaceMeshModel() {
    feedbackGesto.textContent = "Cargando modelo Face Mesh...";
    
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true, 
        minDetectionConfidence: 0.2, 
        minTrackingConfidence: 0.2
    });

    faceMesh.onResults(onResults);
    
    startWebcam();
}

function startWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        feedbackGesto.textContent = "Modelo cargado. Listo para iniciar cámara...";
        
        camera = new Camera(videoElement, {
            onFrame: async () => {
                await faceMesh.send({image: videoElement});
            },
            width: 640,
            height: 480
        });
        
        camera.start()
            .then(() => {
                videoElement.style.display = 'block'; 
                feedbackGesto.textContent = "Cámara activa. ¡Ahora haz un guiño!";

                videoElement.onloadedmetadata = () => {
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;
                };
            })
            .catch((err) => {
                feedbackGesto.textContent = `⚠️ Error al iniciar la cámara: ${err.message}.`;
                console.error("Error al iniciar la cámara:", err);
            });

    } else {
        feedbackGesto.textContent = "Tu navegador no soporta la API de cámara.";
    }
}

// 🛑 PUNTO DE ARRANQUE Y BOTÓN MANUAL
window.addEventListener('load', () => {
    // 1. Iniciar MediaPipe
    loadFaceMeshModel();
    
    // 2. Conectar el botón de desbloqueo manual
    if (botonManual) {
        botonManual.addEventListener('click', () => {
            desbloquearContenido("Activación Manual");
        });
    }
});
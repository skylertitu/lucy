import express from 'express';
import cors from 'cors';
import { processUserRequest } from './neuralNetwork.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Configurar middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Permitir acceso desde el frontend de Vite
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Logger de peticiones básico
app.use((req, res, next) => {
  const now = new Date().toLocaleTimeString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// Endpoint de prueba
app.get('/api/health', (req, res) => {
  res.json({
    status: "healthy",
    message: "Lucy Brain Backend está activo y procesando.",
    neuralNetwork: {
      status: "trained_and_ready"
    }
  });
});

// Endpoint principal: Procesamiento de entradas estructuradas
app.post('/api/process', (req, res) => {
  try {
    const { prompt, userSettings } = req.body;

    if (!prompt) {
      return res.status(400).json({
        status: "error",
        error: "Falta el campo 'prompt' en el cuerpo de la petición."
      });
    }

    console.log(`📥 [Request] Procesando: "${prompt}"`);
    
    // Procesar la petición con nuestro módulo neuronal local
    const result = processUserRequest(prompt, userSettings || {});
    
    console.log(`📤 [Response] Intención detectada: "${result.output.intent}" (Confianza: ${(result.output.confidence * 100).toFixed(2)}%)`);
    console.log(`🎭 [Emotion] Sentimiento: ${result.output.sentiment.label} | Emoción: ${result.output.sentiment.emotion}`);
    console.log(`🎨 [Theme] Estilo UI Recomendado: ${result.output.optimization.recommendedTheme}`);
    console.log(`------------------------------------------------------------`);

    res.json(result);
  } catch (err) {
    console.error("❌ Error en procesamiento backend:", err);
    res.status(500).json({
      status: "error",
      error: "Ocurrió un error interno al procesar tu solicitud con el modelo neuronal.",
      details: err.message
    });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 [Server] Lucy Brain Server escuchando en http://localhost:${PORT}`);
  console.log(`📡 [Endpoints] POST http://localhost:${PORT}/api/process`);
  console.log(`📡 [Endpoints] GET  http://localhost:${PORT}/api/health`);
  console.log(`💡 [Tip] Deja esta consola abierta para ver las capas de activación de la red neuronal en tiempo real.`);
});

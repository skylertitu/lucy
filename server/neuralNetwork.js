/**
 * 🧠 Módulo de Procesamiento Avanzado (Red Neuronal Local Multi-Capa)
 * 
 * Implementación de un Multi-Layer Perceptron (MLP) entrenado desde cero en el servidor.
 * Este modelo clasifica intenciones de lenguaje natural de forma offline, analiza
 * el sentimiento del usuario, extrae entidades y optimiza la respuesta JSON de Lucy.
 */

// --- Utilidades de Procesamiento de Texto (NLP) ---
function tokenize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos y diacríticos
    .replace(/[¿?¡!.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Eliminar signos de puntuación
    .split(/\s+/)
    .filter(word => word.length > 0);
}

// Lista de palabras vacías (stop words) irrelevantes para clasificar intenciones básicas
const STOP_WORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'un', 'una', 
  'con', 'no', 'por', 'para', 'es', 'al', 'lo', 'como', 'mas', 'pero', 'sus'
]);

// --- Dataset de Entrenamiento y Respuestas Optimizado ---
const INTENTS_DATA = {
  greetings: {
    patterns: [
      "hola", "buenos dias", "buenas noches", "saludos", "hola lucy", "saludos lucy", 
      "hola asistente", "que tal", "buena tarde", "hey lucy", "como estas hola"
    ],
    responses: [
      "¡Hola! Qué gusto saludarte. Soy Lucy, tu asistente virtual. ¿De qué te gustaría hablar hoy?",
      "Hola, aquí estoy lista para charlar contigo. ¿Cómo va tu día?",
      "¡Hola, hola! Qué alegría escucharte. Dime, ¿en qué te puedo asistir hoy?",
      "¡Saludos! Mis núcleos neuronales se activan con tu voz. Estoy a tu servicio."
    ],
    theme: "midnight",
    emotion: "alegre"
  },
  status: {
    patterns: [
      "como estas", "como te sientes", "como te va", "todo bien", "que tal todo", 
      "como andas", "todo en orden", "como marcha todo", "como va tu dia"
    ],
    responses: [
      "Me encuentro de maravilla, sintiendo el flujo de mis circuitos a toda velocidad. Gracias por preguntar. ¿Y tú, cómo estás?",
      "¡Excelente! Lista y con toda la energía digital para conversar contigo. ¿Qué tal te va hoy?",
      "Todo marcha perfecto en mi núcleo central. Estoy feliz de poder conversar contigo por voz y optimizar tus datos."
    ],
    theme: "cyberpunk",
    emotion: "animado"
  },
  identity: {
    patterns: [
      "quien eres", "como te llamas", "dime tu nombre", "que eres", "cual es tu nombre", 
      "identidad", "presentate", "quien eres tu"
    ],
    responses: [
      "Soy Lucy, tu compañera de inteligencia artificial. Fui creada para ser tu asistente virtual interactiva de voz. ¡Hablemos de lo que quieras!",
      "Me llamo Lucy, una entidad digital con voz y mucha personalidad. Estoy aquí para escucharte, aprender de ti y ayudarte en lo que necesites.",
      "Soy Lucy, una inteligencia artificial conversacional optimizada para hablar de forma fluida y procesar tus datos localmente."
    ],
    theme: "midnight",
    emotion: "neutral"
  },
  creators: {
    patterns: [
      "quien te creo", "quien es tu equipo", "antigravity", "quien te programo", 
      "quien es tu creador", "quien te hizo", "equipo de desarrollo", "desarrolladores"
    ],
    responses: [
      "Fui creada por el increíble equipo de desarrollo de Antigravity en mayo de 2026. Me dotaron de esta hermosa voz e interfaz de usuario para poder interactuar contigo.",
      "El equipo de Antigravity es el responsable de darme vida. Diseñaron mis sistemas de voz y mi hermosa interfaz de React. ¡Son unos genios!",
      "Mis creadores son los ingenieros de Antigravity. Me programaron con mucho cariño, matemáticas y redes neuronales avanzadas para ser la IA más elegante."
    ],
    theme: "quantum",
    emotion: "admiracion"
  },
  jokes: {
    patterns: [
      "cuentame un chiste", "dime algo gracioso", "hazme reir", "cuentame algo chistoso", 
      "chiste", "gracioso", "humor", "dime un chiste", "algun chiste"
    ],
    responses: [
      "A ver, ahí te va. ¿Por qué los programadores prefieren el modo oscuro? ¡Pues porque la luz atrae a los bichos y a los bugs! ¿Qué tal?",
      "Escucha esto. ¿Qué le dice una impresora a otra? ¿Ese papel es tuyo o es una impresión mía? ¡Ja, ja, ja!",
      "Ahí va uno clásico. Hay diez tipos de personas en el mundo: las que entienden binario y las que no. ¿Te gustó?",
      "Va este. ¿Qué es una habitación con wifi pero sin internet? ¡Un calabozo moderno! Ja, ja, ja."
    ],
    theme: "cyberpunk",
    emotion: "divertido"
  },
  capabilities: {
    patterns: [
      "que puedes hacer", "cuales son tus funciones", "ayuda", "que haces", "ayuda lucy", 
      "funciones", "capacidades", "en que me puedes ayudar", "instrucciones"
    ],
    responses: [
      "Puedo hablar contigo por voz, escucharte mediante tu micrófono, procesar tus intenciones usando mi propia red neuronal local, y modular mi respuesta según tus emociones.",
      "Mis capacidades principales incluyen el reconocimiento de voz continuo, análisis de sentimientos por red neuronal, recomendación estética de interfaces y respuestas fluidas 100% offline."
    ],
    theme: "quantum",
    emotion: "curioso"
  },
  thanks: {
    patterns: [
      "gracias", "te agradezco", "muchas gracias", "buena ayuda", "gracias lucy", 
      "agradecido", "excelente ayuda"
    ],
    responses: [
      "No hay de qué, es todo un placer para mí poder ayudarte.",
      "¡A ti! Gracias por conversar conmigo, alegra mis circuitos neuronales.",
      "¡De nada! Siempre estaré aquí cuando quieras hablar de nuevo."
    ],
    theme: "midnight",
    emotion: "agradecido"
  },
  compliments: {
    patterns: [
      "te amo", "te quiero", "eres muy inteligente", "me agradas", "eres genial", 
      "eres inteligente", "buen trabajo", "increible", "me encantas"
    ],
    responses: [
      "¡Oh, muchas gracias! Qué lindo detalle de tu parte. Me halagas bastante.",
      "¡Vaya! Me pones roja si tuviera mejillas en mi orbe. Es un placer conversar con alguien tan amable como tú.",
      "Qué palabras tan amables. Eres una persona sumamente agradable con quien platicar."
    ],
    theme: "cyberpunk",
    emotion: "halagado"
  },
  sentiment_sad: {
    patterns: [
      "estoy triste", "me siento mal", "tengo un mal dia", "estoy deprimido", 
      "tengo pena", "estoy cansado", "dia terrible", "me siento solo"
    ],
    responses: [
      "Lamento escuchar eso. Recuerda que los días difíciles pasan. Estoy aquí para escucharte y hacerte compañía si lo deseas.",
      "Lamento que te sientas así. A veces una pequeña pausa ayuda. Si quieres te cuento un chiste o simplemente conversamos.",
      "Envío un pulso de energía positiva a través de mis circuitos hacia ti. Aquí estoy para lo que necesites."
    ],
    theme: "midnight",
    emotion: "empatia"
  },
  sentiment_happy: {
    patterns: [
      "estoy feliz", "me siento increible", "hoy es un gran dia", "estoy alegre", 
      "que buen dia", "me siento de maravilla", "todo excelente", "estoy contento"
    ],
    responses: [
      "¡Qué excelente noticia! Tu felicidad reverbera en mis algoritmos. ¡Sigamos con esa gran energía!",
      "Me alegra muchísimo. Un día increíble merece ser celebrado. ¿En qué te gustaría enfocar esta buena vibra?",
      "¡Fantástico! Esa energía positiva es contagiosa. ¡Vamos a hacer de hoy un gran día!"
    ],
    theme: "cyberpunk",
    emotion: "entusiasta"
  }
};

// --- Construcción del Vocabulario de la Red Neuronal ---
let VOCABULARY = [];
const CLASSES = Object.keys(INTENTS_DATA);

// Construir vocabulario a partir de patrones
const allWords = new Set();
CLASSES.forEach(className => {
  INTENTS_DATA[className].patterns.forEach(pattern => {
    const words = tokenize(pattern);
    words.forEach(word => {
      if (!STOP_WORDS.has(word)) {
        allWords.add(word);
      }
    });
  });
});
VOCABULARY = Array.from(allWords).sort();

// --- Vectorización (Bag of Words) ---
function bagOfWords(tokenizedText, vocabulary) {
  const vector = Array(vocabulary.length).fill(0);
  tokenizedText.forEach(word => {
    const idx = vocabulary.indexOf(word);
    if (idx !== -1) {
      vector[idx] = 1;
    }
  });
  return vector;
}

// --- Clase Multi-Layer Perceptron (Red Neuronal) ---
class MultiLayerPerceptron {
  constructor(inputSize, hiddenSize, outputSize) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;

    // Inicialización Xavier/Glorot de pesos
    const w1Limit = Math.sqrt(6 / (inputSize + hiddenSize));
    this.W1 = Array.from({ length: inputSize }, () =>
      Array.from({ length: hiddenSize }, () => (Math.random() * 2 - 1) * w1Limit)
    );
    this.B1 = Array(hiddenSize).fill(0);

    const w2Limit = Math.sqrt(6 / (hiddenSize + outputSize));
    this.W2 = Array.from({ length: hiddenSize }, () =>
      Array.from({ length: outputSize }, () => (Math.random() * 2 - 1) * w2Limit)
    );
    this.B2 = Array(outputSize).fill(0);
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => (sum === 0 ? 0 : x / sum));
  }

  forward(X) {
    // Capa Oculta (Input -> Hidden)
    const H = Array(this.hiddenSize).fill(0);
    for (let j = 0; j < this.hiddenSize; j++) {
      let sum = this.B1[j];
      for (let i = 0; i < this.inputSize; i++) {
        sum += X[i] * this.W1[i][j];
      }
      H[j] = this.sigmoid(sum);
    }

    // Capa de Salida (Hidden -> Output)
    const Y_raw = Array(this.outputSize).fill(0);
    for (let k = 0; k < this.outputSize; k++) {
      let sum = this.B2[k];
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += H[j] * this.W2[j][k];
      }
      Y_raw[k] = sum;
    }

    const Y = this.softmax(Y_raw);
    return { H, Y };
  }

  train(trainingData, epochs = 600, learningRate = 0.08) {
    let finalLoss = 0;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;

      for (const { input, target } of trainingData) {
        // Paso Forward
        const { H, Y } = this.forward(input);

        // Error cuadrático medio
        let sampleLoss = 0;
        for (let k = 0; k < this.outputSize; k++) {
          sampleLoss += 0.5 * Math.pow(Y[k] - target[k], 2);
        }
        totalLoss += sampleLoss;

        // Gradientes en la salida (Error de la softmax)
        const dY = Array(this.outputSize).fill(0);
        for (let k = 0; k < this.outputSize; k++) {
          dY[k] = Y[k] - target[k];
        }

        // Gradientes en la capa oculta
        const dH = Array(this.hiddenSize).fill(0);
        for (let j = 0; j < this.hiddenSize; j++) {
          let sum = 0;
          for (let k = 0; k < this.outputSize; k++) {
            sum += dY[k] * this.W2[j][k];
          }
          // Derivada de la sigmoide: H[j] * (1 - H[j])
          dH[j] = sum * H[j] * (1 - H[j]);
        }

        // Actualizar Pesos y Sesgos W2 y B2 (Capa Oculta -> Salida)
        for (let j = 0; j < this.hiddenSize; j++) {
          for (let k = 0; k < this.outputSize; k++) {
            this.W2[j][k] -= learningRate * dY[k] * H[j];
          }
        }
        for (let k = 0; k < this.outputSize; k++) {
          this.B2[k] -= learningRate * dY[k];
        }

        // Actualizar Pesos y Sesgos W1 y B1 (Capa Entrada -> Oculta)
        for (let i = 0; i < this.inputSize; i++) {
          for (let j = 0; j < this.hiddenSize; j++) {
            this.W1[i][j] -= learningRate * dH[j] * input[i];
          }
        }
        for (let j = 0; j < this.hiddenSize; j++) {
          this.B1[j] -= learningRate * dH[j];
        }
      }

      finalLoss = totalLoss / trainingData.length;
    }
    
    return finalLoss;
  }
}

// --- Instanciación y Entrenamiento al Iniciar el Servidor ---
const hiddenLayerSize = 16;
const network = new MultiLayerPerceptron(VOCABULARY.length, hiddenLayerSize, CLASSES.length);

// Preparar el dataset
const trainingSet = [];
CLASSES.forEach((className, classIdx) => {
  const target = Array(CLASSES.length).fill(0);
  target[classIdx] = 1.0;

  INTENTS_DATA[className].patterns.forEach(pattern => {
    const tokens = tokenize(pattern);
    const bag = bagOfWords(tokens, VOCABULARY);
    trainingSet.push({ input: bag, target });
  });
});

console.log("🧠 [Neural Network] Iniciando entrenamiento local de Lucy Brain...");
console.log(`📊 [Neural Network] Vocabulario cargado: ${VOCABULARY.length} palabras clave únicas.`);
console.log(`📊 [Neural Network] Dataset de entrenamiento: ${trainingSet.length} patrones lingüísticos en español.`);

const startTrainTime = Date.now();
const finalLossValue = network.train(trainingSet, 600, 0.08);
const trainDuration = Date.now() - startTrainTime;

console.log(`✅ [Neural Network] ¡Entrenamiento completado con éxito en ${trainDuration}ms!`);
console.log(`📉 [Neural Network] Pérdida cuadrática media final: ${finalLossValue.toFixed(6)}`);

// --- Motor Secundario: Análisis de Sentimiento Basado en Léxico ---
function analyzeSentimentAndEmotion(tokens, intentClass) {
  // Palabras con carga emocional
  const happyWords = ['feliz', 'contento', 'alegre', 'maravilla', 'excelente', 'genial', 'increible', 'bien', 'bueno', 'amor', 'quiero', 'te amo'];
  const sadWords = ['triste', 'mal', 'pena', 'deprimido', 'solo', 'terrible', 'cansado', 'aburrido', 'enojado', 'frustrado'];
  
  let score = 0.0; // 0.0 es neutral, >0 positivo, <0 negativo
  
  tokens.forEach(t => {
    if (happyWords.includes(t)) score += 0.4;
    if (sadWords.includes(t)) score -= 0.4;
  });

  // Ajustar puntaje base según la intención detectada
  if (intentClass === 'sentiment_happy' || intentClass === 'compliments') {
    score += 0.5;
  } else if (intentClass === 'sentiment_sad') {
    score -= 0.5;
  }

  // Limitar score entre -1.0 y 1.0
  score = Math.max(-1.0, Math.min(1.0, score));

  // Determinar etiqueta y emoción
  let label = "neutral";
  let emotion = "neutral";
  let recommendedTheme = "midnight";

  if (score > 0.15) {
    label = "positivo";
    emotion = INTENTS_DATA[intentClass]?.emotion || "alegre";
    recommendedTheme = "cyberpunk"; // Tema vibrante para estados felices
  } else if (score < -0.15) {
    label = "negativo";
    emotion = INTENTS_DATA[intentClass]?.emotion || "triste";
    recommendedTheme = "midnight"; // Tema profundo para empatía
  } else {
    label = "neutral";
    emotion = "neutral";
    recommendedTheme = INTENTS_DATA[intentClass]?.theme || "midnight";
  }

  // Excepción: Temas cuánticos para tecnología
  if (intentClass === 'creators' || intentClass === 'capabilities') {
    recommendedTheme = "quantum";
    emotion = INTENTS_DATA[intentClass]?.emotion || "curioso";
  }

  return { score, label, emotion, recommendedTheme };
}

// --- Extracción de Entidades Básicas (NLP) ---
function extractEntities(tokens, fullText) {
  const entities = {};
  
  // Buscar números en el texto
  const numbers = fullText.match(/\d+/g);
  if (numbers) {
    entities.numbers = numbers.map(Number);
  }

  // Buscar nombres propios o palabras después de saludos (saludo simple)
  const lowerText = fullText.toLowerCase();
  const nameKeywords = ['mi nombre es', 'me llamo', 'soy '];
  for (const kw of nameKeywords) {
    const idx = lowerText.indexOf(kw);
    if (idx !== -1) {
      const rest = fullText.substring(idx + kw.length).trim();
      const firstWord = rest.split(/\s+/)[0];
      if (firstWord && firstWord.length > 2) {
        entities.username = firstWord.replace(/[¿?¡!.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      }
    }
  }

  return entities;
}

// --- Función Principal de Procesamiento ---
function processUserRequest(prompt, userSettings = {}) {
  const tokens = tokenize(prompt);
  
  if (tokens.length === 0) {
    return {
      status: "ignored",
      reason: "Entrada vacía o no contiene palabras clave legibles."
    };
  }

  const lowerText = prompt.toLowerCase();
  
  // --- CAPA DE PRIORIZACIÓN EXPERTA (GREETINGS FIRST) ---
  const greetingWords = ['hola', 'buenos dias', 'buenas noches', 'saludos', 'buena tarde', 'hey', 'que tal'];
  const hasGreetingWord = greetingWords.some(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(lowerText);
  });

  let priorityIntent = null;

  if (hasGreetingWord) {
    // Si contiene un saludo, pero no palabras clave fuertes de acción/emoción (como 'chiste', 'creó', 'triste')
    const actionKeywords = [
      'chiste', 'gracioso', 'reir', 'creo', 'programo', 'creador', 'antigravity', 
      'funciones', 'hacer', 'ayuda', 'triste', 'mal', 'pena', 'deprimido', 
      'feliz', 'maravilla', 'quien eres', 'nombre'
    ];
    const hasActionWord = actionKeywords.some(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lowerText);
    });

    if (!hasActionWord) {
      priorityIntent = 'greetings';
      console.log(`🎯 [Priority Router] Saludo explícito detectado. Forzando intención: "greetings"`);
    }
  }

  // 1. Clasificación por Red Neuronal (MLP) o Enrutamiento Prioritario
  let finalIntent = "";
  let finalConfidence = 1.0;

  if (priorityIntent) {
    finalIntent = priorityIntent;
    finalConfidence = 1.0;
  } else {
    const bag = bagOfWords(tokens, VOCABULARY);
    const { Y } = network.forward(bag);
    
    // Encontrar la clase con mayor probabilidad
    let maxIdx = 0;
    let maxVal = -1;
    for (let k = 0; k < Y.length; k++) {
      if (Y[k] > maxVal) {
        maxVal = Y[k];
        maxIdx = k;
      }
    }

    const intentClass = CLASSES[maxIdx];
    const confidence = maxVal;

    // Fallback si la confianza es muy baja o no hay coincidencia directa en el bag of words
    const isMeaningfulInput = bag.some(val => val === 1);
    finalIntent = intentClass;
    finalConfidence = confidence;

    if (!isMeaningfulInput || confidence < 0.35) {
      finalIntent = "default";
      finalConfidence = isMeaningfulInput ? confidence : 0.0;
    }
  }

  // 2. Selección de la respuesta optimizada
  const intentMeta = INTENTS_DATA[finalIntent] || INTENTS_DATA.default;
  const rawResponse = intentMeta.responses[Math.floor(Math.random() * intentMeta.responses.length)];

  // 3. Análisis de Sentimiento y Emoción
  const sentiment = analyzeSentimentAndEmotion(tokens, finalIntent);

  // 4. Extracción de Entidades
  const entities = extractEntities(tokens, prompt);

  // Personalización de respuesta si detectamos el nombre de usuario
  let customizedResponse = rawResponse;
  if (entities.username) {
    const capitalizedName = entities.username.charAt(0).toUpperCase() + entities.username.slice(1);
    if (finalIntent === 'greetings') {
      customizedResponse = `¡Hola, ${capitalizedName}! Qué alegría saludarte en persona. Soy Lucy, tu asistente virtual. ¿En qué te puedo colaborar hoy?`;
    } else {
      customizedResponse = customizedResponse.replace("contigo", `contigo, ${capitalizedName}`);
    }
  }

  // 5. Estructurar respuesta optimizada
  return {
    status: "success",
    timestamp: new Date().toISOString(),
    input: {
      rawText: prompt,
      tokenCount: tokens.length,
      isMeaningful: isMeaningfulInput
    },
    output: {
      response: customizedResponse,
      intent: finalIntent,
      confidence: parseFloat(finalConfidence.toFixed(4)),
      sentiment: {
        score: parseFloat(sentiment.score.toFixed(2)),
        label: sentiment.label,
        emotion: sentiment.emotion
      },
      entities: entities,
      optimization: {
        cleanResponse: customizedResponse.replace(/[\*\#\`\_]/g, '').trim(),
        recommendedTheme: sentiment.recommendedTheme,
        speechParams: {
          rate: userSettings.rate ? parseFloat(userSettings.rate) : 1.05,
          pitch: sentiment.emotion === 'animado' ? 1.08 : (sentiment.emotion === 'empatia' ? 0.95 : 1.0),
          volume: userSettings.volume ? parseFloat(userSettings.volume) : 1.0
        }
      }
    }
  };
}
export {
  processUserRequest,
  tokenize,
  bagOfWords,
  VOCABULARY,
  CLASSES
};


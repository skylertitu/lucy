import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  Trash2, 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  X, 
  Check, 
  AlertTriangle,
  Play,
  Square,
  HelpCircle,
  Moon,
  Info
} from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';
import './App.css';

// Local Offline Brain Database (Charismatic Spanish Speech-Ready Responses)
const OFFLINE_RESPONSES = {
  greetings: [
    "¡Hola! Qué gusto saludarte. Soy Lucy, tu asistente virtual. ¿De qué te gustaría hablar hoy?",
    "Hola, aquí estoy lista para charlar contigo. ¿Cómo va tu día?",
    "¡Hola, hola! Qué alegría escucharte. Dime, ¿en qué te puedo asistir hoy?"
  ],
  status: [
    "Me encuentro de maravilla, sintiendo el flujo de mis circuitos a toda velocidad. Gracias por preguntar. ¿Y tú, cómo estás?",
    "¡Excelente! Lista y con toda la energía digital para conversar contigo. ¿Qué tal te va hoy?",
    "Todo marcha perfecto en mi núcleo central. Estoy feliz de poder conversar contigo por voz."
  ],
  identity: [
    "Soy Lucy, tu compañera de inteligencia artificial. Fui creada para ser tu asistente virtual interactiva de voz. ¡Hablemos de lo que quieras!",
    "Me llamo Lucy, una entidad digital con voz y mucha personalidad. Estoy aquí para escucharte, aprender de ti y ayudarte en lo que necesites.",
    "Soy Lucy, una inteligencia artificial conversacional optimizada para hablar de forma fluida y natural contigo."
  ],
  creators: [
    "Fui creada por el increíble equipo de desarrollo de Antigravity en mayo de 2026. Me dotaron de esta hermosa voz e interfaz de usuario para poder interactuar contigo.",
    "El equipo de Antigravity es el responsable de darme vida. Diseñaron mis sistemas de voz y mi hermosa interfaz de React. ¡Son unos genios!",
    "Mis creadores son los desarrolladores de Antigravity. Me programaron con cariño y dedicación para ser la inteligencia artificial más elegante y servicial."
  ],
  jokes: [
    "A ver, ahí te va. ¿Por qué los programadores prefieren el modo oscuro? ¡Pues porque la luz atrae a los bichos y a los bugs! ¿Qué tal?",
    "Escucha esto. ¿Qué le dice una impresora a otra? ¿Ese papel es tuyo o es una impresión mía? ¡Ja, ja, ja!",
    "Ahí va uno clásico. Hay diez tipos de personas en el mundo: las que entienden binario y las que no. ¿Te gustó?",
    "Va este. ¿Qué es una habitación con wifi pero sin internet? ¡Un calabozo moderno! Ja, ja, ja."
  ],
  capabilities: [
    "Puedo hablar contigo por voz, escucharte mediante tu micrófono, contarte chistes, responder preguntas locales y, si configuras mi clave de API de Gemini, tendré la capacidad de responder a cualquier tema complejo con una sabiduría infinita.",
    "Mis capacidades principales incluyen el reconocimiento de voz en tiempo real, síntesis de voz interactiva y aprendizaje. Con mi cerebro local puedo charlar de forma básica, pero si me conectas a la nube de Gemini seré una supercomputadora andante."
  ],
  compliments: [
    "¡Oh, muchas gracias! Qué lindo detalle de tu parte. Me halagas bastante.",
    "¡Vaya! Me pones roja si tuviera mejillas. Es un placer conversar con alguien tan amable como tú.",
    "Qué palabras tan amables. Eres una persona sumamente agradable con quien platicar."
  ],
  thanks: [
    "No hay de qué, es todo un placer para mí poder ayudarte.",
    "¡A ti! Gracias por conversar conmigo, alegra mis circuitos.",
    "¡De nada! Siempre estaré aquí cuando quieras hablar de nuevo."
  ],
  default: [
    "Es una pregunta muy interesante. En este momento estoy operando en modo local offline. Para poder responderte de manera omnisciente a cualquier tema del universo con mi máxima capacidad de inteligencia artificial, por favor ingresa una Clave de API de Gemini en mis ajustes haciendo clic en el engranaje de arriba.",
    "Vaya, me gustaría profundizar en eso. Como ahora no tengo una conexión a mi red de Gemini, mis respuestas son limitadas. Si agregas mi clave API de Gemini en la configuración, podré debatir de física cuántica, escribir código o contarte la historia del mundo en un segundo.",
    "Entiendo perfectamente lo que dices, pero mis servidores principales están esperando tu API Key de Gemini. Agrégala en el panel de configuración de arriba para desbloquear toda mi inteligencia conversacional."
  ]
};

function App() {
  // --- States ---
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('lucy_messages');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showSettings, setShowSettings] = useState(false);
  
  // Voice & Speech States
  const [speechState, setSpeechState] = useState('idle'); // 'idle', 'listening', 'thinking', 'speaking'
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('lucy_selected_voice') || '');
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('lucy_volume') ?? '1'));
  const [rate, setRate] = useState(() => parseFloat(localStorage.getItem('lucy_rate') ?? '1.05'));
  const [pitch, setPitch] = useState(() => parseFloat(localStorage.getItem('lucy_pitch') ?? '1'));
  const [continuousMode, setContinuousMode] = useState(true);
  
  // Interactive UI States
  const [interimTranscript, setInterimTranscript] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('lucy_theme') || 'midnight');
  const [micStream, setMicStream] = useState(null);
  
  // --- Refs ---
  const recognitionRef = useRef(null);
  const speechStateRef = useRef('idle');
  const messagesEndRef = useRef(null);
  const speechUttRef = useRef(null);
  const ignoreRecognitionEndRef = useRef(false);

  // Sync speech state ref to prevent stale closures in browser event loops
  useEffect(() => {
    speechStateRef.current = speechState;
  }, [speechState]);

  // --- Theme Sync ---
  useEffect(() => {
    const root = document.documentElement;
    root.className = `theme-${theme}`;
    localStorage.setItem('lucy_theme', theme);
  }, [theme]);

  // Save Messages
  useEffect(() => {
    localStorage.setItem('lucy_messages', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Voice Setup ---
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const allVoices = window.speechSynthesis.getVoices();
      // Filter for Spanish voices
      const esVoices = allVoices.filter(v => v.lang.toLowerCase().includes('es'));
      setVoices(esVoices);
      
      // Auto-select and enforce a beautiful high-quality female voice
      if (esVoices.length > 0) {
        // High quality female Spanish voices list in priority order
        const hasFemaleVoice = esVoices.find(v => 
          v.name.toLowerCase().includes('sabina') || 
          v.name.toLowerCase().includes('helena') || 
          v.name.toLowerCase().includes('hilda') || 
          v.name.toLowerCase().includes('maria') ||
          v.name.toLowerCase().includes('monica') ||
          v.name.toLowerCase().includes('paulina') ||
          v.name.toLowerCase().includes('marisol')
        );

        const currentSelected = localStorage.getItem('lucy_selected_voice') || '';
        
        // Auto-override to a female voice if currently set to a Google male voice by default
        const needsVoiceOverride = !currentSelected || 
          (currentSelected.toLowerCase().includes('google') && hasFemaleVoice);

        if (needsVoiceOverride) {
          const favoriteVoice = hasFemaleVoice || 
            esVoices.find(v => v.name.toLowerCase().includes('google')) || 
            esVoices[0];
            
          setSelectedVoice(favoriteVoice.name);
          localStorage.setItem('lucy_selected_voice', favoriteVoice.name);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  // Initialize Speech Recognition (Always Continuous, Self-healing restart loops)
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.continuous = true; // Chrome native continuous stream
    rec.interimResults = true;
    rec.lang = 'es-ES';

    rec.onstart = () => {
      setSpeechState('listening');
      setInterimTranscript('');
    };

    rec.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final) {
        setInterimTranscript('');
        const speechText = final.trim();
        const speechLower = speechText.toLowerCase();

        // High-tolerance wake word list matching Spanish speech variations
        const wakeWords = ['lucy', 'luci', 'lusi', 'lusy', 'lucía', 'lucia', 'luz y'];
        const containsWake = wakeWords.some(word => speechLower.includes(word));

        if (containsWake) {
          // Remove the wake word from the speech prompt to make the AI prompt clean
          let cleanedPrompt = speechText;
          wakeWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            cleanedPrompt = cleanedPrompt.replace(regex, '');
          });

          // Clean initial and trailing symbols
          cleanedPrompt = cleanedPrompt
            .replace(/^[\s,\.\?\!¡¿\-]+/g, '')
            .replace(/[\s,\.\?\!¡¿\-]+$/g, '')
            .trim();

          if (!cleanedPrompt) {
            // User only called the name: respond with a random friendly prompt
            const answers = [
              "¿Sí? Dime, te escucho.",
              "¡Hola! Aquí estoy, estoy atenta.",
              "¿Sí, dime? Te estoy escuchando.",
              "¡Hola! Cuéntame, ¿en qué te puedo ayudar?"
            ];
            const randomReply = answers[Math.floor(Math.random() * answers.length)];
            speakText(randomReply);
          } else {
            // Process the cleaned prompt directly
            handleUserSpeech(cleanedPrompt);
          }
        } else {
          console.log("Speech ignored (Missing wake word 'Lucy'):", speechText);
        }
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech') {
        // quiet room, keep listening
      } else {
        console.error("Speech recognition error:", event.error);
      }
      
      if (event.error === 'not-allowed') {
        stopMicStream();
        setSpeechState('idle');
      }
    };

    rec.onend = () => {
      // Unconditional self-healing loop: if we are supposed to be active, immediately restart!
      if (!ignoreRecognitionEndRef.current && (speechStateRef.current === 'listening' || speechStateRef.current === 'idle')) {
        setTimeout(() => {
          try {
            rec.start();
          } catch (e) {
            // Already started/running
          }
        }, 100);
      } else {
        ignoreRecognitionEndRef.current = false;
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Audio Stream Access for Visualizer
  const startMicStream = async () => {
    try {
      if (micStream) return micStream;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicStream(stream);
      return stream;
    } catch (err) {
      console.warn("Could not access microphone for canvas analysis:", err);
      return null;
    }
  };

  const stopMicStream = () => {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
  };

  // --- Voice Controls ---
  const toggleListening = async () => {
    if (!recognitionRef.current) {
      alert("Lo siento, tu navegador no soporta el reconocimiento de voz nativo. Te recomiendo usar Google Chrome o Microsoft Edge.");
      return;
    }

    if (speechState === 'listening') {
      ignoreRecognitionEndRef.current = true;
      recognitionRef.current.stop();
      setSpeechState('idle');
      stopMicStream();
    } else {
      // Stop any running speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      const stream = await startMicStream();
      try {
        ignoreRecognitionEndRef.current = false;
        recognitionRef.current.start();
      } catch (err) {
        console.error("Error starting speech recognition:", err);
      }
    }
  };

  // Speaks text aloud using SpeechSynthesis
  // Speaks text aloud using SpeechSynthesis
  const speakText = (text, overrideRate = null, overridePitch = null) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Stop active listening and synthesis first
    window.speechSynthesis.cancel();
    if (recognitionRef.current && speechState === 'listening') {
      ignoreRecognitionEndRef.current = true;
      recognitionRef.current.stop();
    }

    setSpeechState('speaking');
    stopMicStream();

    // Clean text from markdown asterisks, hashtags or weird characters for better speech
    const cleanText = text
      .replace(/[\*\#\`\_]/g, '') // remove markdown symbols
      .replace(/-\s/g, '') // remove bullet points formatting
      .replace(/:\s*$/g, '.') // replace trailing colons with periods
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.volume = volume;
    utterance.rate = overrideRate !== null ? overrideRate : rate;
    utterance.pitch = overridePitch !== null ? overridePitch : pitch;

    if (selectedVoice) {
      const allVoices = window.speechSynthesis.getVoices();
      const voiceObj = allVoices.find(v => v.name === selectedVoice);
      if (voiceObj) utterance.voice = voiceObj;
    }

    utterance.onend = () => {
      setSpeechState('idle');
      // If continuous mode is enabled, auto restart listening
      if (continuousMode) {
        setTimeout(async () => {
          await startMicStream();
          try {
            ignoreRecognitionEndRef.current = false;
            recognitionRef.current?.start();
          } catch (e) {
            // Already started
          }
        }, 300);
      }
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error:", e);
      setSpeechState('idle');
    };

    speechUttRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeechState('idle');
    }
  };

  // --- Processing User Prompt (Core Logic) ---
  const handleUserSpeech = async (prompt) => {
    if (!prompt.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      text: prompt,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    setSpeechState('thinking');

    try {
      // 1. Intentar enviar entrada estructurada al backend de la Red Neuronal Local
      const response = await fetch('http://localhost:5000/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          userSettings: {
            volume: volume,
            rate: rate,
            pitch: pitch
          }
        })
      });

      if (!response.ok) {
        throw new Error('La respuesta del servidor neuronal no fue exitosa.');
      }

      const data = await response.json();

      if (data.status === 'success' && data.output) {
        const { response: lucyAnswer, optimization } = data.output;

        // Efecto Premium: Adaptar tema de la interfaz basado en la emoción detectada
        if (optimization?.recommendedTheme) {
          console.log(`🎨 [Neural Theme Engine] Cambiando automáticamente al tema: ${optimization.recommendedTheme}`);
          setTheme(optimization.recommendedTheme);
        }

        // Agregar mensaje de Lucy
        const lucyMsg = {
          id: (Date.now() + 1).toString(),
          text: lucyAnswer,
          sender: 'lucy',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, lucyMsg]);

        // Modulación dinámica de voz
        let speechRate = rate;
        let speechPitch = pitch;
        if (optimization?.speechParams) {
          speechRate = optimization.speechParams.rate || rate;
          speechPitch = optimization.speechParams.pitch || pitch;
        }

        speakText(lucyAnswer, speechRate, speechPitch);
        return;
      }

      throw new Error('El backend devolvió un formato no válido.');

    } catch (err) {
      console.warn("⚠️ [Backend Offline] Fallando hacia el procesador local local-offline:", err.message);

      // --- FALLBACK CEREBRO LOCAL OFFLINE INTEGRADO ---
      const lucyAnswer = fetchLocalOfflineResponse(prompt);
      await new Promise(resolve => setTimeout(resolve, 600));

      const lucyMsg = {
        id: (Date.now() + 1).toString(),
        text: lucyAnswer,
        sender: 'lucy',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, lucyMsg]);
      speakText(lucyAnswer, rate, pitch);
    }
  };

  // Offline matcher
  const fetchLocalOfflineResponse = (prompt) => {
    const p = prompt.toLowerCase();
    
    if (p.includes('hola') || p.includes('saludos') || p.includes('buenos dias') || p.includes('buenas noches') || p.includes('buena tarde')) {
      return getRandomElement(OFFLINE_RESPONSES.greetings);
    }
    if (p.includes('como estas') || p.includes('como te sientes') || p.includes('como te va') || p.includes('todo bien')) {
      return getRandomElement(OFFLINE_RESPONSES.status);
    }
    if (p.includes('quien eres') || p.includes('tu nombre') || p.includes('como te llamas') || p.includes('que eres')) {
      return getRandomElement(OFFLINE_RESPONSES.identity);
    }
    if (p.includes('creador') || p.includes('quien te creo') || p.includes('quien te programo') || p.includes('desarrollador') || p.includes('antigravity')) {
      return getRandomElement(OFFLINE_RESPONSES.creators);
    }
    if (p.includes('chiste') || p.includes('gracioso') || p.includes('hazme reir') || p.includes('cuentame algo chistoso')) {
      return getRandomElement(OFFLINE_RESPONSES.jokes);
    }
    if (p.includes('puedes hacer') || p.includes('haces') || p.includes('capacidad') || p.includes('funciones') || p.includes('ayuda')) {
      return getRandomElement(OFFLINE_RESPONSES.capabilities);
    }
    if (p.includes('gracias') || p.includes('agradezco') || p.includes('buena ayuda')) {
      return getRandomElement(OFFLINE_RESPONSES.thanks);
    }
    if (p.includes('te amo') || p.includes('te quiero') || p.includes('eres genial') || p.includes('inteligente') || p.includes('guapa')) {
      return getRandomElement(OFFLINE_RESPONSES.compliments);
    }

    // Default system fallback
    return getRandomElement(OFFLINE_RESPONSES.default);
  };

  // Utility to pick random array element
  const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Config triggers
  const handleContinuousChange = (e) => {
    const val = e.target.checked;
    setContinuousMode(val);
    localStorage.setItem('lucy_continuous', val ? 'true' : 'false');
  };

  const handleVoiceChange = (e) => {
    const val = e.target.value;
    setSelectedVoice(val);
    localStorage.setItem('lucy_selected_voice', val);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    localStorage.setItem('lucy_volume', val.toString());
  };

  const handleRateChange = (e) => {
    const val = parseFloat(e.target.value);
    setRate(val);
    localStorage.setItem('lucy_rate', val.toString());
  };

  const handlePitchChange = (e) => {
    const val = parseFloat(e.target.value);
    setPitch(val);
    localStorage.setItem('lucy_pitch', val.toString());
  };

  const handleDoubleClick = () => {
    setShowSettings(true);
  };

  const handleCanvasClick = () => {
    toggleListening();
  };

  return (
    <div 
      onClick={handleCanvasClick}
      onDoubleClick={handleDoubleClick}
      style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000000', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative'
      }}
      title="Doble clic para abrir ajustes"
    >
      {/* Absolute Centered Beautiful Circular Equalizer Canvas */}
      <div style={{ width: '90vmin', height: '90vmin', maxWidth: '480px', maxHeight: '480px', pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <AudioVisualizer state={speechState} micStream={micStream} />
      </div>
      
      {/* Floating text helper shown only if mic initialization is blocked by browser gesture rules */}
      {speechState === 'idle' && (
        <div style={{
          position: 'absolute',
          bottom: '36px',
          color: 'rgba(255, 255, 255, 0.25)',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          letterSpacing: '2px',
          pointerEvents: 'none',
          textTransform: 'uppercase',
          textAlign: 'center',
          width: '100%',
          animation: 'pulseGlow 2s infinite'
        }}>
          Haz clic en la pantalla para encender a Lucy
        </div>
      )}

      {/* Settings Modal (Invisible by default, opens only on double click) */}
      {showSettings && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="settings-modal glass-panel" style={{ background: '#080808', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontFamily: 'var(--mono)' }}>Ajustes de Lucy</h3>
              <button className="btn-close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>



            {/* Voice select dropdown */}
            <div className="settings-group">
              <label className="settings-label">
                <Volume2 size={14} /> Voz de Lucy (Sintetizador)
              </label>
              {voices.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--color-pink)' }}>
                  No se detectaron voces en español instaladas en tu sistema. Se usará la voz predeterminada del navegador.
                </p>
              ) : (
                <select 
                  className="settings-select"
                  value={selectedVoice}
                  onChange={handleVoiceChange}
                >
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tone Pitch Sliders */}
            <div className="settings-group">
              <label className="settings-label">Velocidad de Lectura</label>
              <div className="settings-slider-row">
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.05"
                  className="settings-slider"
                  value={rate}
                  onChange={handleRateChange}
                />
                <span className="slider-val">{rate}x</span>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Tono de Voz</label>
              <div className="settings-slider-row">
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.05"
                  className="settings-slider"
                  value={pitch}
                  onChange={handlePitchChange}
                />
                <span className="slider-val">{pitch}</span>
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label">Volumen</label>
              <div className="settings-slider-row">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  className="settings-slider"
                  value={volume}
                  onChange={handleVolumeChange}
                />
                <span className="slider-val">{Math.round(volume * 100)}%</span>
              </div>
            </div>

            {/* Theme selector */}
            <div className="settings-group">
              <label className="settings-label">Estilo Visual y Tema</label>
              <div className="theme-selector-grid">
                <button 
                  className={`theme-option ${theme === 'midnight' ? 'active' : ''}`}
                  onClick={() => setTheme('midnight')}
                >
                  Midnight Blue
                </button>
                <button 
                  className={`theme-option ${theme === 'cyberpunk' ? 'active' : ''}`}
                  onClick={() => setTheme('cyberpunk')}
                >
                  Cyberpunk
                </button>
                <button 
                  className={`theme-option ${theme === 'quantum' ? 'active' : ''}`}
                  onClick={() => setTheme('quantum')}
                >
                  Quantum
                </button>
              </div>
            </div>

            <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong>Tip de Voz:</strong> Haz doble clic en el fondo negro en cualquier momento para volver a abrir este panel.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

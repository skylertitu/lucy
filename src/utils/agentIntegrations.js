/**
 * ⚡ Integración de Clientes en la Nube (LiveKit & Pipecat AI)
 * 
 * Este archivo contiene plantillas de código listas para producción para
 * conectar la interfaz visual de Lucy (React + Canvas) a servidores de agentes en tiempo real.
 */

import { Room, RoomEvent, Track } from 'livekit-client';
import { PipecatClient } from '@pipecat-ai/client-js';

// ============================================================================
// 1. INTEGRACIÓN CON LIVEKIT AGENTS
// ============================================================================

/**
 * Conecta el cliente de Lucy a un LiveKit Agent Server (WebRTC).
 * 
 * @param {string} url - URL del servidor de LiveKit (ej: 'wss://tu-servidor.livekit.cloud')
 * @param {string} token - Token de acceso JWT generado por tu servidor
 * @param {Object} callbacks - Funciones callback para gestionar el audio y estados
 * @param {Function} callbacks.onAudioTrackSubscribed - Se dispara cuando la IA empieza a transmitir audio
 * @param {Function} callbacks.onDisconnected - Se dispara al perder la conexión
 * @param {Function} callbacks.onParticipantSpeaking - Se dispara cuando la IA habla (para animar tu visualizador Canvas)
 */
export async function connectToLiveKitLucy(url, token, callbacks = {}) {
  const { onAudioTrackSubscribed, onDisconnected, onParticipantSpeaking } = callbacks;

  // Crear la sala de WebRTC
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  // Manejar pistas de audio suscritas (cuando Lucy habla)
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === Track.Kind.Audio) {
      console.log('🗣️ [LiveKit] Lucy ha comenzado a emitir audio.');
      
      // Adjuntar el audio al DOM para que se escuche
      const audioElement = track.attach();
      document.body.appendChild(audioElement);

      if (onAudioTrackSubscribed) {
        onAudioTrackSubscribed(track, audioElement);
      }
    }
  });

  // Animar el orbe ecualizador basado en la actividad de voz de la IA
  room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    const isLucySpeaking = speakers.some(s => s.identity !== room.localParticipant?.identity);
    if (onParticipantSpeaking) {
      onParticipantSpeaking(isLucySpeaking);
    }
  });

  // Manejar desconexiones
  room.on(RoomEvent.Disconnected, () => {
    console.warn('🔌 [LiveKit] Desconectado del servidor de voz.');
    if (onDisconnected) onDisconnected();
  });

  try {
    // Conectar a la sala
    await room.connect(url, token);
    console.log('✅ [LiveKit] Conexión establecida con éxito.');

    // Activar micrófono local del usuario para hablar con Lucy
    await room.localParticipant.setMicrophoneEnabled(true);
    console.log('🎙️ [LiveKit] Micrófono local activado. Transmitiendo...');

    return room; // Retorna la instancia de la sala para poder desconectarse después
  } catch (error) {
    console.error('❌ Error al conectar con LiveKit Agent:', error);
    throw error;
  }
}


// ============================================================================
// 2. INTEGRACIÓN CON PIPECAT AI
// ============================================================================

/**
 * Conecta el cliente de Lucy a un servidor de Pipecat (Voz Multimodal).
 * 
 * @param {Object} transport - El transporte elegido (WebSocketTransport o DailyTransport)
 * @param {Object} options - Parámetros de conexión de Pipecat
 */
export function initializePipecatLucy(transport, options = {}) {
  // Inicializar cliente central de Pipecat
  const pipecat = new PipecatClient({
    transport: transport,
    enableMic: true,
    enableCam: false, // Lucy es 100% de voz, no requiere cámara
    ...options
  });

  // Escuchar cuando el agente de Pipecat empieza a hablar
  pipecat.on('botSpeaking', () => {
    console.log('🗣️ [Pipecat] Lucy (Bot) está hablando...');
    // Aquí puedes disparar estados en React para animar tu orbe
  });

  pipecat.on('botStoppedSpeaking', () => {
    console.log('🤫 [Pipecat] Lucy ha terminado de hablar.');
  });

  // Escuchar cuando el usuario interrumpe a Lucy
  pipecat.on('userStartedSpeaking', () => {
    console.log('🎙️ [Pipecat] Usuario interrumpió la voz de Lucy. Deteniendo audio...');
  });

  return pipecat;
}

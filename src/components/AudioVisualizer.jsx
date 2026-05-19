import React, { useEffect, useRef } from 'react';

const AudioVisualizer = ({ state = 'idle', micStream = null }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rotationRef = useRef(0);
  const pulseRef = useRef(0);
  const phaseRef = useRef(0);

  // Initialize Web Audio API Analyser for Microphone
  useEffect(() => {
    if (!micStream) {
      analyserRef.current = null;
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioCtx.createMediaStreamSource(micStream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
    } catch (err) {
      console.error('Error in Web Audio setup:', err);
    }

    return () => {
      // Clean up handled on unmount
    };
  }, [micStream]);

  // Clean up completely on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Main Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dynamic color helper based on CSS theme variables
    const getThemeColors = () => {
      const styles = getComputedStyle(document.documentElement);
      const accent = styles.getPropertyValue('--color-accent').trim() || '#66fcf1';
      const secondary = styles.getPropertyValue('--color-secondary').trim() || '#45f3ff';
      const purple = styles.getPropertyValue('--color-purple').trim() || '#8b5cf6';
      const pink = styles.getPropertyValue('--color-pink').trim() || '#ec4899';
      return { accent, secondary, purple, pink };
    };

    // Render loop
    const render = () => {
      if (!canvasRef.current) return;
      const canvasEl = canvasRef.current;
      const ctx2d = canvasEl.getContext('2d');
      if (!ctx2d) return;

      const rect = canvasEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Self-healing dimensional detection to completely avoid 0px container collapses
      const displayWidth = rect.width > 0 ? rect.width : 400;
      const displayHeight = rect.height > 0 ? rect.height : 400;
      
      if (canvasEl.width !== Math.floor(displayWidth * dpr) || canvasEl.height !== Math.floor(displayHeight * dpr)) {
        canvasEl.width = Math.floor(displayWidth * dpr);
        canvasEl.height = Math.floor(displayHeight * dpr);
      }

      // Reset transform matrix and apply high DPI scaling
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.scale(dpr, dpr);

      const width = displayWidth;
      const height = displayHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const colors = getThemeColors();

      // Clear screen
      ctx2d.fillStyle = '#000000';
      ctx2d.fillRect(0, 0, width, height);

      // Increment timers for rotation and waving
      rotationRef.current += state === 'thinking' ? 0.025 : state === 'listening' ? 0.003 : 0.005;
      pulseRef.current += 0.035;
      phaseRef.current += 0.07;

      // Visualizer dimensions
      const innerRadius = Math.min(width, height) * 0.23;
      const numBars = 120; // High resolution radial bars
      const barThickness = 1.8; // Thin, elegant lines
      const maxBarHeight = 55; // Height of frequency response peak

      // Read audio data if listening
      let audioData = [];
      if (state === 'listening' && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        audioData = Array.from(dataArrayRef.current);
      }

      // Draw the central circle's bio-glow behind the bars (Wider & Richer Aura)
      ctx2d.beginPath();
      let centerGlowRad = innerRadius * 1.35;
      if (state === 'listening') {
        const avg = audioData.reduce((a, b) => a + b, 0) / (audioData.length || 1);
        centerGlowRad += (avg / 255) * 25;
      } else if (state === 'speaking') {
        centerGlowRad += Math.sin(pulseRef.current * 2) * 8;
      } else {
        centerGlowRad += Math.sin(pulseRef.current) * 4;
      }
      const radialGlow = ctx2d.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerGlowRad);
      
      let glowColor = colors.accent;
      if (state === 'thinking') glowColor = colors.purple;
      else if (state === 'speaking') glowColor = colors.pink;
      
      radialGlow.addColorStop(0, hexToRgba(glowColor, 0.18));
      radialGlow.addColorStop(0.5, hexToRgba(glowColor, 0.05));
      radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx2d.fillStyle = radialGlow;
      ctx2d.arc(centerX, centerY, centerGlowRad, 0, Math.PI * 2);
      ctx2d.fill();

      // Render 120 Solid Radial Equalizer Bars (and their outer tip neon dots!)
      for (let i = 0; i < numBars; i++) {
        // Distribute bars evenly in a circle, adding global rotation
        const angle = (i / numBars) * Math.PI * 2 + rotationRef.current;

        // Calculate amplitude factor (value between 0.05 and 1.0)
        let val = 0.05;

        if (state === 'listening') {
          if (audioData.length > 0) {
            // Map the frequency bins to the radial circle segments symmetrically
            const binIdx = Math.floor((i % (numBars / 2)) / (numBars / 2) * (audioData.length * 0.8));
            val = (audioData[binIdx] || 0) / 255;
            // Boost sensitivity
            val = Math.min(1.0, val * 1.55 + 0.05);
          } else {
            // Microphone fallback simulation
            val = 0.1 + 0.25 * Math.sin(i * 0.2 + phaseRef.current) * Math.cos(i * 0.1 + pulseRef.current);
          }
        } else if (state === 'thinking') {
          // Rapid revolving swirl loading effect
          const distFromPeak = Math.sin(i * 0.15 - pulseRef.current * 3);
          val = 0.08 + Math.pow(Math.max(0, distFromPeak), 3.5) * 0.65;
        } else if (state === 'speaking') {
          // Dynamic vocal pulse waves
          const wave = Math.sin(i * 0.25 + phaseRef.current) * Math.cos(i * 0.1 + pulseRef.current * 2);
          val = 0.08 + Math.max(0, wave) * 0.75;
        } else {
          // Idle: Gentle breathing ripple
          const ripple = Math.sin(i * 0.15 + pulseRef.current * 0.5);
          val = 0.12 + Math.max(0, ripple) * 0.15;
        }

        const barHeight = val * maxBarHeight;

        // Save canvas state, translate to center and rotate to target angle
        ctx2d.save();
        ctx2d.translate(centerX, centerY);
        ctx2d.rotate(angle);

        // Determine gradient/color for this line
        let strokeColor = colors.accent;
        if (state === 'listening') {
          strokeColor = colors.accent; // Standard cian
        } else if (state === 'thinking') {
          strokeColor = colors.purple;
        } else if (state === 'speaking') {
          strokeColor = colors.pink;
        }

        ctx2d.strokeStyle = strokeColor;
        ctx2d.lineWidth = barThickness;
        ctx2d.lineCap = 'round';
        ctx2d.beginPath();
        // Move to inner radius
        ctx2d.moveTo(innerRadius, 0);
        // Line to outer radius
        ctx2d.lineTo(innerRadius + barHeight, 0);
        ctx2d.stroke();

        // PREMIUM FEATURE: Draw a tiny glowing dot at the end of each active bar!
        if (barHeight > 6) {
          ctx2d.beginPath();
          ctx2d.arc(innerRadius + barHeight + 2, 0, 1.2, 0, Math.PI * 2);
          ctx2d.fillStyle = strokeColor;
          ctx2d.fill();
        }

        ctx2d.restore();
      }

      // --- Central Solid Glassy Sphere ---
      ctx2d.beginPath();
      const sphereRadius = innerRadius * 0.94;
      
      // Radial gradient for a beautiful 3D spherical shading
      const sphereGlow = ctx2d.createRadialGradient(
        centerX - sphereRadius * 0.2, 
        centerY - sphereRadius * 0.2, 
        0, 
        centerX, 
        centerY, 
        sphereRadius
      );
      
      sphereGlow.addColorStop(0, '#101014');
      sphereGlow.addColorStop(0.7, '#060608');
      sphereGlow.addColorStop(1, '#000000');
      
      ctx2d.fillStyle = sphereGlow;
      ctx2d.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx2d.fill();

      // Outer border of the central sphere
      ctx2d.beginPath();
      ctx2d.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx2d.strokeStyle = hexToRgba(glowColor, 0.4);
      ctx2d.lineWidth = 1.6;
      ctx2d.stroke();

      // --- Concentric Energy Ripples inside the Sphere ---
      let rippleScale = 1.0;
      if (state === 'listening') {
        const avg = audioData.reduce((a, b) => a + b, 0) / (audioData.length || 1);
        rippleScale = 1.0 + (avg / 255) * 0.25;
      } else if (state === 'speaking') {
        rippleScale = 1.0 + Math.sin(pulseRef.current * 2) * 0.08;
      } else {
        rippleScale = 1.0 + Math.sin(pulseRef.current * 0.5) * 0.03;
      }

      ctx2d.beginPath();
      ctx2d.arc(centerX, centerY, sphereRadius * 0.7 * rippleScale, 0, Math.PI * 2);
      ctx2d.strokeStyle = hexToRgba(glowColor, 0.16);
      ctx2d.lineWidth = 1;
      ctx2d.stroke();

      ctx2d.beginPath();
      ctx2d.arc(centerX, centerY, sphereRadius * 0.4 * rippleScale, 0, Math.PI * 2);
      ctx2d.strokeStyle = hexToRgba(glowColor, 0.09);
      ctx2d.lineWidth = 1;
      ctx2d.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, micStream]);

  // Utility to convert Hex color to RGBA
  const hexToRgba = (hex, alpha) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) || 102;
    const g = parseInt(hex.substring(2, 4), 16) || 252;
    const b = parseInt(hex.substring(4, 6), 16) || 241;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'block', 
        backgroundColor: '#000000'
      }} 
    />
  );
};

export default AudioVisualizer;

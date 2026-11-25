// FernAudio — TTS en tailandés + sonidos WebAudio sin archivos (Fern v6.0).
// Script clásico, cero dependencias. Nada lanza excepciones hacia fuera:
// cada método tiene try/catch interno y degrada en silencio.
// Cargado con <script defer> desde index.html y fern-academia/index.html.
(function () {
  "use strict";

  var MUTED_KEY = "fern2-sound-muted"; // prefijo fern2- = se sincroniza a Firestore
  var DEFAULT_RATE = 0.95;

  // --- Estado interno -------------------------------------------------------
  var muted = false;       // por defecto el sonido está ENCENDIDO
  var audioCtx = null;     // AudioContext perezoso (se crea tras gesto de usuario)
  var thaiVoiceKnown = false; // true cuando alguna vez vimos una voz th*

  try {
    muted = window.localStorage.getItem(MUTED_KEY) === "1";
  } catch (e) { /* sin storage: funciona en memoria */ }

  // --- Voces tailandesas ----------------------------------------------------
  function scanVoices() {
    try {
      var voices = window.speechSynthesis.getVoices();
      for (var i = 0; i < (voices || []).length; i++) {
        var lang = (voices[i].lang || "").toLowerCase();
        if (lang.indexOf("th") === 0) { thaiVoiceKnown = true; return; }
      }
    } catch (e) { /* sin TTS */ }
  }

  function pickThaiVoice() {
    try {
      var voices = window.speechSynthesis.getVoices() || [];
      var fallback = null;
      for (var i = 0; i < voices.length; i++) {
        var lang = (voices[i].lang || "").toLowerCase();
        if (lang === "th-th") return voices[i];
        if (!fallback && lang.indexOf("th") === 0) fallback = voices[i];
      }
      return fallback;
    } catch (e) { return null; }
  }

  // Las voces cargan de forma asíncrona en muchos navegadores: cacheamos el
  // resultado cuando el navegador avisa. Si aún no hay voces, hasThaiVoice()
  // devuelve false (mejor ocultar los botones que prometer y fallar).
  try {
    if (window.speechSynthesis) {
      scanVoices();
      window.speechSynthesis.addEventListener("voiceschanged", scanVoices);
      // Fallback para navegadores antiguos sin addEventListener en speechSynthesis.
      if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
        window.speechSynthesis.onvoiceschanged = scanVoices;
      }
    }
  } catch (e) { /* sin TTS */ }

  // --- TTS ------------------------------------------------------------------
  function isSupported() {
    try { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); }
    catch (e) { return false; }
  }

  function hasThaiVoice() {
    try { scanVoices(); return thaiVoiceKnown; }
    catch (e) { return false; }
  }

  function speak(text, opts) {
    try {
      if (!isSupported() || !text) return false;
      var synth = window.speechSynthesis;
      // Nunca dos voces a la vez: cancela lo anterior antes de empezar.
      if (synth.speaking || synth.pending) synth.cancel();
      var utterance = new SpeechSynthesisUtterance(String(text));
      utterance.lang = "th-TH";
      utterance.rate = (opts && typeof opts.rate === "number") ? opts.rate : DEFAULT_RATE;
      var voice = pickThaiVoice();
      if (voice) utterance.voice = voice; // si no hay voz th, la por defecto aproxima con lang th-TH
      if (opts && typeof opts.onEnd === "function") utterance.onend = opts.onEnd;
      synth.speak(utterance);
      return true;
    } catch (e) { return false; }
  }

  function stop() {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) { /* nada que cancelar */ }
  }

  function isSpeaking() {
    try { return !!(window.speechSynthesis && window.speechSynthesis.speaking); }
    catch (e) { return false; }
  }

  // --- Sonidos WebAudio (patrón probado en fern-academia/app.mjs) ------------
  // Oscilador + gain con rampa exponencial .0001 → .035 → .0001, notas a 52ms.
  var NOTES = {
    correct: [480, 660],
    wrong: [330, 260],
    achievement: [392, 523, 659],
    tap: [310]
  };

  function ensureAudioContext() {
    try {
      var Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return null;
      if (!audioCtx) audioCtx = new Audio();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(function () {});
      return audioCtx;
    } catch (e) { return null; }
  }

  function play(kind) {
    try {
      if (isMuted()) return;
      var ctx = ensureAudioContext();
      if (!ctx || ctx.state !== "running") return;
      var notes = NOTES[kind] || [400];
      notes.forEach(function (frequency, index) {
        var start = ctx.currentTime + index * 0.052;
        var oscillator = ctx.createOscillator();
        var envelope = ctx.createGain();
        oscillator.frequency.setValueAtTime(frequency, start);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(0.035, start + 0.014);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
        oscillator.connect(envelope).connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.14);
      });
    } catch (e) { /* WebAudio no disponible: silencio */ }
  }

  // --- Silencio ---------------------------------------------------------------
  function setMuted(value) {
    try {
      muted = !!value;
      try { window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0"); }
      catch (e) { /* sin storage: queda en memoria */ }
      // La clave tiene prefijo fern2- (entra en el snapshot), pero hay que
      // avisar al sync para que suba: si no, solo se subiría cuando otro
      // cambio main disparase un upload después (misma brecha que Rally).
      try { if (window.FernSync && window.FernSync.noteLocalChange) window.FernSync.noteLocalChange('main'); }
      catch (e) { /* el sync jamás rompe el audio */ }
      if (muted) {
        stop(); // cortar la voz en curso al silenciar
        try { if (audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(function () {}); }
        catch (e) { /* nada */ }
      }
    } catch (e) { /* nunca lanzar */ }
  }

  function isMuted() {
    try { return !!muted; }
    catch (e) { return false; }
  }

  // --- Contrato público -------------------------------------------------------
  window.FernAudio = {
    isSupported: isSupported,
    hasThaiVoice: hasThaiVoice,
    speak: speak,
    stop: stop,
    isSpeaking: isSpeaking,
    play: play,
    setMuted: setMuted,
    isMuted: isMuted
  };
})();

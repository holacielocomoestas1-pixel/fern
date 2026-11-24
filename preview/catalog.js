window.mascotCatalog = {
  "version": 1,
  "hero": "assets/hero/mascot-hero-1200.webp",
  "assets": [
    {
      "id": "home",
      "name": "Mascota principal",
      "group": "identity",
      "motion": "float",
      "placement": "Portada web e inicio",
      "use": "Presenta al personaje en la portada y en el primer acceso.",
      "sizes": [
        240,
        480
      ],
      "next": "welcome",
      "es": {
        "title": "Aprende a tu ritmo",
        "body": "Practica un poco cada día y retoma donde te quedaste.",
        "action": "Empezar"
      },
      "en": {
        "title": "Learn at your own pace",
        "body": "Practice a little each day and pick up where you left off.",
        "action": "Get started"
      },
      "png": "assets/png/home.png",
      "webp": "assets/webp/home.webp",
      "webp2x": "assets/webp/home@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "welcome",
      "name": "Bienvenida",
      "group": "lesson",
      "motion": "greet",
      "placement": "Onboarding",
      "use": "Saluda al iniciar el recorrido del estudiante.",
      "sizes": [
        176,
        256
      ],
      "next": "guide",
      "es": {
        "title": "¡Hola! ¿Empezamos?",
        "body": "Tu primera lección te espera.",
        "action": "Primera lección"
      },
      "en": {
        "title": "Hi! Ready to begin?",
        "body": "Your first lesson is waiting for you.",
        "action": "First lesson"
      },
      "png": "assets/png/welcome.png",
      "webp": "assets/webp/welcome.webp",
      "webp2x": "assets/webp/welcome@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "guide",
      "name": "Guía",
      "group": "lesson",
      "motion": "enter",
      "placement": "Tutorial y ruta",
      "use": "Señala un botón o el siguiente paso de la ruta.",
      "sizes": [
        104,
        176
      ],
      "next": "listen",
      "es": {
        "title": "Por aquí",
        "body": "Abre la siguiente actividad para continuar.",
        "action": "Abrir actividad"
      },
      "en": {
        "title": "This way",
        "body": "Open the next activity to continue.",
        "action": "Open activity"
      },
      "png": "assets/png/guide.png",
      "webp": "assets/webp/guide.webp",
      "webp2x": "assets/webp/guide@2x.webp",
      "width": 768,
      "height": 768,
      "direction": "left",
      "opposite": {
        "png": "assets/png/guide-mirrored.png",
        "webp": "assets/webp/guide-mirrored.webp",
        "webp2x": "assets/webp/guide-mirrored@2x.webp",
        "width": 768,
        "height": 768
      }
    },
    {
      "id": "listen",
      "name": "Escuchar",
      "group": "lesson",
      "motion": "enter",
      "placement": "Ejercicio de audio",
      "use": "Acompaña las instrucciones de comprensión auditiva.",
      "sizes": [
        104,
        160
      ],
      "next": "speak",
      "es": {
        "title": "Escucha con calma",
        "body": "Puedes reproducir el audio las veces que quieras.",
        "action": "Escuchar audio"
      },
      "en": {
        "title": "Take your time",
        "body": "You can play the audio as many times as you need.",
        "action": "Play audio"
      },
      "png": "assets/png/listen.png",
      "webp": "assets/webp/listen.webp",
      "webp2x": "assets/webp/listen@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "speak",
      "name": "Hablar",
      "group": "lesson",
      "motion": "enter",
      "placement": "Pronunciación",
      "use": "Introduce una actividad de práctica oral.",
      "sizes": [
        104,
        160
      ],
      "next": "correct",
      "es": {
        "title": "Ahora te toca hablar",
        "body": "Pulsa el micrófono y repite la frase.",
        "action": "Empezar a grabar"
      },
      "en": {
        "title": "Now it’s your turn",
        "body": "Tap the microphone and repeat the phrase.",
        "action": "Start recording"
      },
      "png": "assets/png/speak.png",
      "webp": "assets/webp/speak.webp",
      "webp2x": "assets/webp/speak@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "hint",
      "name": "Pista",
      "group": "lesson",
      "motion": "enter",
      "placement": "Ayuda durante un ejercicio",
      "use": "Aparece cuando el estudiante pide una pista.",
      "sizes": [
        96,
        144
      ],
      "next": "practice",
      "es": {
        "title": "¿Una pista?",
        "body": "Lee la ayuda y vuelve a mirar la pregunta.",
        "action": "Ver pista"
      },
      "en": {
        "title": "Need a hint?",
        "body": "Read the hint and take another look at the question.",
        "action": "Show hint"
      },
      "png": "assets/png/hint.png",
      "webp": "assets/webp/hint.webp",
      "webp2x": "assets/webp/hint@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "practice",
      "name": "Repaso",
      "group": "lesson",
      "motion": "enter",
      "placement": "Práctica y biblioteca",
      "use": "Abre una sesión de repaso o una actividad de lectura.",
      "sizes": [
        104,
        160
      ],
      "next": "correct",
      "es": {
        "title": "Hora de repasar",
        "body": "Vuelve a practicar lo que ya aprendiste.",
        "action": "Empezar repaso"
      },
      "en": {
        "title": "Time for a review",
        "body": "Practice what you’ve already learned.",
        "action": "Start review"
      },
      "png": "assets/png/practice.png",
      "webp": "assets/webp/practice.webp",
      "webp2x": "assets/webp/practice@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "correct",
      "name": "Respuesta correcta",
      "group": "lesson",
      "motion": "pop",
      "placement": "Confirmación de respuesta",
      "use": "Refuerza un acierto con un gesto breve.",
      "sizes": [
        96,
        144
      ],
      "next": "complete",
      "es": {
        "title": "¡Bien hecho!",
        "body": "La respuesta es correcta.",
        "action": "Continuar"
      },
      "en": {
        "title": "Nicely done!",
        "body": "That’s the correct answer.",
        "action": "Continue"
      },
      "png": "assets/png/correct.png",
      "webp": "assets/webp/correct.webp",
      "webp2x": "assets/webp/correct@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "retry",
      "name": "Segundo intento",
      "group": "lesson",
      "motion": "nod",
      "placement": "Corrección de ejercicio",
      "use": "Acompaña la corrección con una invitación a intentar de nuevo.",
      "sizes": [
        96,
        144
      ],
      "next": "hint",
      "es": {
        "title": "Probemos otra vez",
        "body": "Revisa la pista y vuelve a intentarlo.",
        "action": "Volver a intentar"
      },
      "en": {
        "title": "Let’s try again",
        "body": "Take a look at the hint and give it another go.",
        "action": "Try again"
      },
      "png": "assets/png/retry.png",
      "webp": "assets/webp/retry.webp",
      "webp2x": "assets/webp/retry@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "complete",
      "name": "Lección completada",
      "group": "progress",
      "motion": "cheer",
      "placement": "Fin de lección",
      "use": "Celebra el cierre de una lección con un salto.",
      "sizes": [
        176,
        256
      ],
      "next": "home",
      "es": {
        "title": "¡Lección completada!",
        "body": "Un paso más en tu aprendizaje.",
        "action": "Volver a la ruta"
      },
      "en": {
        "title": "Lesson complete!",
        "body": "You’ve taken another step forward.",
        "action": "Back to your path"
      },
      "png": "assets/png/complete.png",
      "webp": "assets/webp/complete.webp",
      "webp2x": "assets/webp/complete@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "streak",
      "name": "Racha",
      "group": "progress",
      "motion": "pop",
      "placement": "Racha diaria",
      "use": "Acompaña el número real de días de práctica consecutivos.",
      "sizes": [
        144,
        224
      ],
      "next": "practice",
      "es": {
        "title": "¡Tu racha sigue!",
        "body": "Ya completaste tu práctica de hoy.",
        "action": "Ver mi racha"
      },
      "en": {
        "title": "Your streak is going strong!",
        "body": "You’ve finished today’s practice.",
        "action": "View my streak"
      },
      "png": "assets/png/streak.png",
      "webp": "assets/webp/streak.webp",
      "webp2x": "assets/webp/streak@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "goal",
      "name": "Meta alcanzada",
      "group": "progress",
      "motion": "cheer",
      "placement": "Metas y logros",
      "use": "Acompaña una meta personal alcanzada o un logro desbloqueado.",
      "sizes": [
        144,
        224
      ],
      "next": "home",
      "es": {
        "title": "¡Meta alcanzada!",
        "body": "Cumpliste el objetivo que te propusiste.",
        "action": "Ver mis logros"
      },
      "en": {
        "title": "Goal reached!",
        "body": "You met the goal you set for yourself.",
        "action": "See my achievements"
      },
      "png": "assets/png/goal.png",
      "webp": "assets/webp/goal.webp",
      "webp2x": "assets/webp/goal@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "ranking",
      "name": "Clasificación",
      "group": "progress",
      "motion": "pop",
      "placement": "Tabla de posiciones",
      "use": "Acompaña un cambio de posición o el resumen semanal.",
      "sizes": [
        112,
        176
      ],
      "next": "practice",
      "es": {
        "title": "Tu posición de la semana",
        "body": "Mira cómo avanzaste con tu práctica.",
        "action": "Ver clasificación"
      },
      "en": {
        "title": "Your rank this week",
        "body": "See how your practice moved you up.",
        "action": "View leaderboard"
      },
      "png": "assets/png/ranking.png",
      "webp": "assets/webp/ranking.webp",
      "webp2x": "assets/webp/ranking@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "return",
      "name": "Regreso",
      "group": "progress",
      "motion": "greet",
      "placement": "Recordatorio y regreso",
      "use": "Recibe al estudiante cuando retoma sus lecciones.",
      "sizes": [
        128,
        192
      ],
      "next": "practice",
      "es": {
        "title": "Qué bueno verte de nuevo",
        "body": "Tu próxima actividad está lista cuando quieras.",
        "action": "Retomar mi práctica"
      },
      "en": {
        "title": "Good to see you again",
        "body": "Your next activity is ready whenever you are.",
        "action": "Resume practice"
      },
      "png": "assets/png/return.png",
      "webp": "assets/webp/return.webp",
      "webp2x": "assets/webp/return@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "empty",
      "name": "Estado vacío",
      "group": "support",
      "motion": "enter",
      "placement": "Historial sin actividad",
      "use": "Explica una sección vacía y ofrece un primer paso.",
      "sizes": [
        120,
        184
      ],
      "next": "practice",
      "es": {
        "title": "Tu historial empieza aquí",
        "body": "Completa una actividad para ver tu progreso en esta sección.",
        "action": "Ir a practicar"
      },
      "en": {
        "title": "Your history starts here",
        "body": "Finish an activity to see your progress in this section.",
        "action": "Go to practice"
      },
      "png": "assets/png/empty.png",
      "webp": "assets/webp/empty.webp",
      "webp2x": "assets/webp/empty@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "offline",
      "name": "Sin conexión",
      "group": "support",
      "motion": "enter",
      "placement": "Error de red",
      "use": "Ilustra un problema de conexión junto con la acción para reintentar.",
      "sizes": [
        112,
        176
      ],
      "next": "home",
      "es": {
        "title": "Estás sin conexión",
        "body": "Comprueba tu conexión y vuelve a intentarlo.",
        "action": "Reintentar"
      },
      "en": {
        "title": "You’re offline",
        "body": "Check your connection and try again.",
        "action": "Try again"
      },
      "png": "assets/png/offline.png",
      "webp": "assets/webp/offline.webp",
      "webp2x": "assets/webp/offline@2x.webp",
      "width": 768,
      "height": 768
    },
    {
      "id": "avatar",
      "name": "Avatar",
      "group": "identity",
      "motion": "none",
      "placement": "Perfil, menú e iconos",
      "use": "Identifica al personaje en formatos cuadrados y circulares.",
      "sizes": [
        40,
        64
      ],
      "next": "home",
      "es": {
        "title": "Tu compañero de aprendizaje",
        "body": "Usa el avatar en espacios pequeños del perfil.",
        "action": "Ver portada"
      },
      "en": {
        "title": "Your learning companion",
        "body": "Use the avatar in small profile spaces.",
        "action": "View welcome screen"
      },
      "png": "assets/png/avatar.png",
      "webp": "assets/webp/avatar.webp",
      "webp2x": "assets/webp/avatar@2x.webp",
      "width": 768,
      "height": 768
    }
  ]
};

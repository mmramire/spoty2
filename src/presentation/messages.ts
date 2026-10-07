import { getLogFilePath } from '../data/logging/pino-setup.js';

export const MESSAGES = {
  welcome: '=== spoty - Conexión a Spotify ===',
  menu: {
    title: '\nSelecciona una opción:',
    connect: '1. Conectar con Spotify',
    status: '2. Ver estado de conexión',
    download: '3. Descargar biblioteca',
    logout: '9. Cerrar sesión',
    exit: '0. Salir',
    hint: '(navega con 0-3,9, Ctrl+C para cancelar)',
  },
  config: {
    missingClientId: 'Falta SPOTIFY_CLIENT_ID. Obténlo en https://developer.spotify.com/dashboard',
    missingRedirectUri:
      'Falta SPOTIFY_REDIRECT_URI. Configúralo en https://developer.spotify.com/dashboard',
    invalidRedirectUri: (error: string) =>
      `SPOTIFY_REDIRECT_URI inválida: ${error}. Debe ser http://127.0.0.1:puerto/callback`,
    enterClientId: 'Introduce tu SPOTIFY_CLIENT_ID: ',
    enterRedirectUri: 'Introduce tu SPOTIFY_REDIRECT_URI (ej. http://127.0.0.1:8888/callback): ',
    configSaved: 'Configuración guardada correctamente.',
  },
  auth: {
    starting: 'Iniciando flujo de autorización...',
    openingBrowser: 'Abriendo navegador para autorizar la aplicación...',
    browserFallback:
      'No se pudo abrir el navegador automáticamente. Copia y pega esta URL en tu navegador:',
    waitingCallback: 'Esperando autorización en el navegador... (tienes 5 minutos)',
    callbackReceived: 'Autorización recibida. Intercambiando código por tokens...',
    success: (displayName: string, email: string) =>
      `Conectado correctamente a Spotify como ${displayName} (${email})`,
    cancelled: 'Autorización cancelada por el usuario',
    sessionValid: (displayName: string, email: string) =>
      `Sesión activa: ${displayName} (${email})`,
    sessionExpired: 'La sesión ha expirado. Iniciando nueva autenticación...',
    sessionInvalid: 'Sesión guardada inválida. Iniciando nueva autenticación...',
    logoutSuccess: 'Sesión cerrada correctamente.',
    logoutConfirm: '¿Estás seguro de que quieres cerrar la sesión? (s/N): ',
  },
  errors: {
    generic: (description: string) =>
      `Error al conectar con Spotify: ${description}. Ver ${getLogFilePath()} para más información`,
    portInUse: (port: number) =>
      `Puerto ${port} en uso. Cierra la app que lo usa o cambia SPOTIFY_REDIRECT_URI.`,
    timeout: 'Tiempo de espera agotado para la autorización.',
    retrying: (description: string, attempt: number) =>
      `Error temporal: ${description}. Reintentando (${attempt}/2)...`,
    retriesExhausted: (description: string) =>
      `Error al conectar con Spotify: ${description}. Ver ${getLogFilePath()} para más información`,
    configRequired: 'Configuración requerida. Ejecuta "spoty connect" para configurar.',
    invalidOption: 'Opción inválida. Intenta de nuevo.',
    interrupt: '\nInterrumpido por el usuario.',
  },
} as const;

import { MESSAGES } from '@/presentation/messages.js';
import { describe, expect, it } from 'vitest';

// TC-017 (TASK-011): los literales nuevos de la feature deben coincidir carácter a
// carácter con los aprobados en TASKS.md TASK-011 / RF-002 / RNF-002, y los literales
// preexistentes de MESSAGES no deben cambiar.
describe('TC-017 — Literales exactos aprobados de creación de playlist vacía (TASK-011)', () => {
  describe('mensajes de resultado (RF-002)', () => {
    it('éxito como plantilla carácter a carácter con visibilidad privada', () => {
      const mensaje = MESSAGES.playlist.created(
        'Viaje 2026',
        'privada',
        'Carretera',
        'abc123XYZ',
        'https://open.spotify.com/playlist/abc123XYZ'
      );
      expect(mensaje).toBe(
        'Playlist creada: "Viaje 2026" (privada, descripción: "Carretera", id: abc123XYZ, ' +
          'enlace: https://open.spotify.com/playlist/abc123XYZ)'
      );
    });

    it('éxito como plantilla carácter a carácter con visibilidad pública', () => {
      const mensaje = MESSAGES.playlist.created(
        'Viaje 2026',
        'publica',
        'Playlist sin descripción',
        'id-publica-1',
        'https://open.spotify.com/playlist/id-publica-1'
      );
      expect(mensaje).toBe(
        'Playlist creada: "Viaje 2026" (pública, descripción: "Playlist sin descripción", ' +
          'id: id-publica-1, enlace: https://open.spotify.com/playlist/id-publica-1)'
      );
    });

    it('longitud de nombre inválida', () => {
      expect(MESSAGES.playlist.nameLengthError).toBe(
        'Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.'
      );
    });

    it('visibilidad sin flag único', () => {
      expect(MESSAGES.playlist.visibilityFlagError).toBe(
        'Se debe declarar flag único en comando --public o --private'
      );
    });

    it('sin sesión activa', () => {
      expect(MESSAGES.playlist.noSessionError).toBe(
        'No hay sesión activa. Conecta con Spotify con la opción 1'
      );
    });

    it('sesión caducada (401)', () => {
      expect(MESSAGES.playlist.sessionExpiredError).toBe(
        'Sesión caducada. Vuelve a conectar con Spotify.'
      );
    });

    it('permisos insuficientes (403)', () => {
      expect(MESSAGES.playlist.permissionsError).toBe(
        'Permisos insuficientes para crear la playlist.'
      );
    });

    it('límite agotado (429) sin punto final', () => {
      expect(MESSAGES.playlist.rateLimitError).toBe('Vuelva a intentarlo más tarde');
      expect(MESSAGES.playlist.rateLimitError.endsWith('.')).toBe(false);
    });

    it('fallo inesperado', () => {
      expect(MESSAGES.playlist.unexpectedError).toBe(
        'No se pudo crear la playlist por un error inesperado.'
      );
    });

    it('duplicado como plantilla carácter a carácter', () => {
      expect(MESSAGES.playlist.duplicate('Viaje 2026')).toBe(
        'Ya existe una playlist llamada "Viaje 2026".'
      );
    });

    it('cancelación', () => {
      expect(MESSAGES.playlist.cancelled).toBe('Creación cancelada. No se creó ninguna playlist.');
    });
  });

  describe('peticiones, menús y ayuda (RNF-002)', () => {
    it('petición de nombre', () => {
      expect(MESSAGES.playlist.namePrompt).toBe('Nombre de la playlist (3-100 caracteres):');
    });

    it('petición de descripción con el valor por defecto literal', () => {
      expect(MESSAGES.playlist.descriptionPrompt).toBe(
        'Descripción (opcional, Enter para usar "Playlist sin descripción"):'
      );
    });

    it('menú de duplicados con las tres opciones y la elección', () => {
      expect(MESSAGES.playlist.duplicateMenu).toBe(
        '¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre ' +
          '0. Cancelar sin crear / Elige (0-2):'
      );
    });

    it('pregunta de modificación con el formato (s/N) y espacio final', () => {
      expect(MESSAGES.playlist.modifyPrompt).toBe(
        '¿Deseas modificar descripción y visibilidad? (s/N): '
      );
      expect(MESSAGES.playlist.modifyPrompt.endsWith(': ')).toBe(true);
    });

    it('ítem de menú y ayuda nueva del flujo de creación', () => {
      expect(MESSAGES.menu.createPlaylist).toBe('4. Crear playlist vacía');
      expect(MESSAGES.menu.hintCreatePlaylist).toBe('(navega con 0-4,9, Ctrl+C para cancelar)');
    });
  });

  describe('literales preexistentes de MESSAGES sin cambios', () => {
    it('welcome y menú principal conservan sus valores exactos', () => {
      expect(MESSAGES.welcome).toBe('=== spoty - Conexión a Spotify ===');
      expect(MESSAGES.menu.title).toBe('\nSelecciona una opción:');
      expect(MESSAGES.menu.connect).toBe('1. Conectar con Spotify');
      expect(MESSAGES.menu.status).toBe('2. Ver estado de conexión');
      expect(MESSAGES.menu.download).toBe('3. Descargar biblioteca');
      expect(MESSAGES.menu.logout).toBe('9. Cerrar sesión');
      expect(MESSAGES.menu.exit).toBe('0. Salir');
      expect(MESSAGES.menu.hint).toBe('(navega con 0-3,9, Ctrl+C para cancelar)');
    });

    it('configuración conserva sus literales exactos', () => {
      expect(MESSAGES.config.missingClientId).toBe(
        'Falta SPOTIFY_CLIENT_ID. Obténlo en https://developer.spotify.com/dashboard'
      );
      expect(MESSAGES.config.missingRedirectUri).toBe(
        'Falta SPOTIFY_REDIRECT_URI. Configúralo en https://developer.spotify.com/dashboard'
      );
      expect(MESSAGES.config.enterClientId).toBe('Introduce tu SPOTIFY_CLIENT_ID: ');
      expect(MESSAGES.config.enterRedirectUri).toBe(
        'Introduce tu SPOTIFY_REDIRECT_URI (ej. http://127.0.0.1:8888/callback): '
      );
      expect(MESSAGES.config.configSaved).toBe('Configuración guardada correctamente.');
      expect(typeof MESSAGES.config.invalidRedirectUri).toBe('function');
    });

    it('autenticación conserva sus literales exactos', () => {
      expect(MESSAGES.auth.starting).toBe('Iniciando flujo de autorización...');
      expect(MESSAGES.auth.openingBrowser).toBe(
        'Abriendo navegador para autorizar la aplicación...'
      );
      expect(MESSAGES.auth.browserFallback).toBe(
        'No se pudo abrir el navegador automáticamente. Copia y pega esta URL en tu navegador:'
      );
      expect(MESSAGES.auth.waitingCallback).toBe(
        'Esperando autorización en el navegador... (tienes 5 minutos)'
      );
      expect(MESSAGES.auth.callbackReceived).toBe(
        'Autorización recibida. Intercambiando código por tokens...'
      );
      expect(MESSAGES.auth.cancelled).toBe('Autorización cancelada por el usuario');
      expect(MESSAGES.auth.sessionExpired).toBe(
        'La sesión ha expirado. Iniciando nueva autenticación...'
      );
      expect(MESSAGES.auth.sessionInvalid).toBe(
        'Sesión guardada inválida. Iniciando nueva autenticación...'
      );
      expect(MESSAGES.auth.logoutSuccess).toBe('Sesión cerrada correctamente.');
      expect(MESSAGES.auth.logoutConfirm).toBe(
        '¿Estás seguro de que quieres cerrar la sesión? (s/N): '
      );
      expect(typeof MESSAGES.auth.success).toBe('function');
      expect(typeof MESSAGES.auth.sessionValid).toBe('function');
    });

    it('errores conservan sus literales exactos', () => {
      expect(MESSAGES.errors.timeout).toBe('Tiempo de espera agotado para la autorización.');
      expect(MESSAGES.errors.configRequired).toBe(
        'Configuración requerida. Ejecuta "spoty connect" para configurar.'
      );
      expect(MESSAGES.errors.invalidOption).toBe('Opción inválida. Intenta de nuevo.');
      expect(MESSAGES.errors.interrupt).toBe('\nInterrumpido por el usuario.');
      expect(typeof MESSAGES.errors.generic).toBe('function');
      expect(typeof MESSAGES.errors.portInUse).toBe('function');
      expect(typeof MESSAGES.errors.retrying).toBe('function');
      expect(typeof MESSAGES.errors.retriesExhausted).toBe('function');
    });
  });
});

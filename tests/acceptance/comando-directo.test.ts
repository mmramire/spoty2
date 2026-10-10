/**
 * TC-024 y TC-025 — Aceptación de AC-001, AC-002 y AC-004 sobre el comando
 * directo (TASK-018).
 *
 * Trazabilidad: `OBJ-001 → RF-001, RF-002, RNF-001, RNF-002, RNF-006 →
 * UC-001 (principal, E1, E2, E3) → AC-001, AC-002, AC-004 → TASK-018 →
 * TC-024, TC-025`.
 *
 * Escenarios ejecutables en español con las palabras clave `Dado`, `Cuando`,
 * `Entonces`, `Y` y `Pero`, con las etiquetas `@AC-001`, `@AC-002` y
 * `@AC-004` conservadas de `ACCEPTANCE_CRITERIA.feature` 0.2.0, que este
 * fichero no modifica. Cada paso del `.feature` aparece como comentario y
 * tiene aserciones correspondientes. Los literales se fijan directamente
 * desde los aprobados (RF-002, P-001, P-003, P-006) sin copiarlos de
 * `MESSAGES`, de modo que la aceptación no se apoya en el propio código.
 *
 * La aceptación se ejecuta sobre el arnés de TASK-017 (TC-023): Spotify
 * simulado por el doble de `fetch` que rechaza toda URL no simulada, ficheros
 * de tokens y de registro en directorio temporal (`SPOTY_TOKENS_FILE`,
 * `SPOTY_LOG_FILE`), salida de consola capturada y entrada `readline`
 * simulada con `Ctrl+C`. Ningún escenario necesita Internet, credenciales
 * reales ni escribe en `data/` del repositorio (RNF-001, RNF-004).
 */
import { rmSync } from 'node:fs';
import { handleCommand } from '@/cli-main.js';
import { closeReadline } from '@/presentation/prompts.js';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type LlamadaSimulada,
  type ReglaSimulacion,
  type SalidaCapturada,
  type SpotifySimulado,
  aislarFicherosEnTemporal,
  capturarSalidaConsola,
  contenidoDe,
  escribirTokensFicticios,
  esperarEventosNuevos,
  estadoReadline,
  leerTramoNuevo,
  marcarRegistro,
  reglasCreacionExitosa,
  respuestaJson,
  simularSpotify,
} from '../helpers/arnes-e2e.js';

// El arnés simula la entrada interactiva (incluido `Ctrl+C`) interceptando
// `readline` con el doble compartido de las utilidades, sin teclado real.
vi.mock('node:readline/promises', async () => {
  const { moduloReadlineSimulado } = await import('../helpers/arnes-e2e.js');
  return moduloReadlineSimulado();
});

const RUTAS = aislarFicherosEnTemporal('spoty2-tc-024-tc-025');

const TESTIGO = 'testigo-tc-018-ficticio';
const NOMBRE = 'Viaje 2026';
const DESCRIPCION = 'Carretera';
const DESCRIPCION_POR_DEFECTO = 'Playlist sin descripción';
const IDENTIFICADOR = 'pl-tc018';
const ENLACE = 'https://open.spotify.com/playlist/pl-tc018';
const USUARIO = 'usuario-tc-018';
const URL_CREACION = `https://api.spotify.com/v1/users/${USUARIO}/playlists`;

// Literales aprobados (RF-002, P-001, P-003 y P-006) escritos a mano desde la
// especificación: la aceptación no los lee del código que pretende evaluar.
const LITERAL_EXITO =
  `Playlist creada: "${NOMBRE}" (privada, descripción: "${DESCRIPCION}", ` +
  `id: ${IDENTIFICADOR}, enlace: ${ENLACE})`;
const LITERAL_LONGITUD =
  'Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.';
const LITERAL_VISIBILIDAD = 'Se debe declarar flag único en comando --public o --private';
const LITERAL_SIN_SESION = 'No hay sesión activa. Conecta con Spotify con la opción 1';
const LITERAL_SESION_CADUCADA = 'Sesión caducada. Vuelve a conectar con Spotify.';
const LITERAL_PERMISOS = 'Permisos insuficientes para crear la playlist.';
const LITERAL_LIMITE = 'Vuelva a intentarlo más tarde';
const LITERAL_FALLO = 'No se pudo crear la playlist por un error inesperado.';
const PETICION_NOMBRE = 'Nombre de la playlist (3-100 caracteres):';

// Mensajes técnicos exigidos por RNF-006 en `data/app.log`.
const MENSAJE_INICIO = 'Inicio de creación de playlist vacía';
const MENSAJE_EXITO = 'Playlist creada con éxito';
const MENSAJE_ERROR_FINAL = 'Creación de playlist no completada';

// Cuerpo simulado del fallo genérico: jamás debe llega al registro (RNF-001).
const CUERPO_SENSIBLE_500 = 'detalle-interno-secreto-500';
/** Segundos de `Retry-After` del 429 simulado: 3 reintentos de 1000 ms. */
const REINTENTO_RETRY_AFTER_S = 1;
const ESPERA_RETRY_AFTER_MS = REINTENTO_RETRY_AFTER_S * 1000;

let salida: SalidaCapturada;
let red: SpotifySimulado;
let marcaRegistro = 0;

function instalarRed(reglas: readonly ReglaSimulacion[]): void {
  red = simularSpotify(reglas);
}

/** Reglas de creación feliz con perfil, listado propio y creación simulados. */
function reglasExitosas(): ReglaSimulacion[] {
  return reglasCreacionExitosa({
    identificador: IDENTIFICADOR,
    enlace: ENLACE,
    usuario: USUARIO,
    propias: [],
  });
}

/** Reglas con la creación sustituida por la respuesta de fallo indicada. */
function reglasConCreacionFallida(respuesta: () => Response): ReglaSimulacion[] {
  return reglasExitosas().map((regla) =>
    regla.cuandoContenga === '/v1/users/' ? { ...regla, respuesta } : regla
  );
}

/** Respuesta 429 persistente con `Retry-After` (P-003, UC-001-E2). */
function respuestaLimite(): Response {
  return new Response(JSON.stringify({ error: { status: 429, message: 'rate limited' } }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(REINTENTO_RETRY_AFTER_S) },
  });
}

/** Invoca el punto de entrada real con el comando directo y sus indicadores. */
function invocarComando(indicadores: readonly string[]): Promise<number> {
  return handleCommand('create-new-playlist', ['create-new-playlist', ...indicadores]);
}

/** Observaciones `POST` de creación registradas por el doble de red. */
function creaciones(): readonly LlamadaSimulada[] {
  return red.llamadas.filter((llamada) => llamada.metodo === 'POST');
}

/** URLs de los `POST` de creación observados por el doble de red. */
function urlsDeCreacion(): string[] {
  return creaciones().map((llamada) => llamada.url);
}

function numeroDeCreaciones(): number {
  return creaciones().length;
}

/** Cuerpo JSON del último `POST` de creación observado por el doble de red. */
function ultimoCuerpoDeCreacion(): Record<string, unknown> {
  const creacion = creaciones().at(-1);
  return JSON.parse(creacion?.cuerpo ?? '{}') as Record<string, unknown>;
}

/** Sustituye la creación por el fallo indicado y ejecuta el comando directo. */
async function ejecutarConCreacionFallida(respuesta: () => Response): Promise<number> {
  instalarRed(reglasConCreacionFallida(respuesta));
  return invocarComando(['--name', NOMBRE, '--private']);
}

/** RNF-001: sin testigos, cabeceras de autorización ni tokens en el texto. */
function comprobarSinDatosSensibles(texto: string): void {
  expect(texto).not.toContain(TESTIGO);
  expect(texto).not.toMatch(/bearer|access_token|refresh_token/i);
}

describe('@003-creacion-de-playlist-vacia Característica: Creación de playlist vacía', () => {
  beforeEach(async () => {
    escribirTokensFicticios(RUTAS.rutaTokens, TESTIGO);
    estadoReadline.reiniciar();
    salida = capturarSalidaConsola();
    instalarRed(reglasExitosas());
    marcaRegistro = await marcarRegistro(RUTAS.rutaLog);
  });

  afterEach(() => {
    closeReadline();
    salida.restaurar();
    red.restaurar();
  });

  afterAll(() => {
    try {
      rmSync(RUTAS.directorio, { recursive: true, force: true });
    } catch {
      // El transporte de Pino mantiene el fichero abierto hasta cerrar el proceso.
    }
  });

  describe('TC-024 — Aceptación de AC-001 y AC-002 sobre el comando directo (TASK-018)', () => {
    it('@AC-001 @RF-001 @RF-002 @UC-001 Escenario: Crear playlist vacía con ' +
      'confirmación e identificador', async () => {
      // Dado que el usuario dispone de una sesión válida obtenida vía opción 1
      expect(contenidoDe(RUTAS.rutaTokens)).toContain(TESTIGO);

      // Cuando el usuario confirma la creación con nombre válido, descripción efectiva y visibilidad pública o privada
      const codigo = await invocarComando([
        '--name',
        NOMBRE,
        '--description',
        DESCRIPCION,
        '--private',
      ]);
      expect(codigo).toBe(0);

      // Entonces el sistema crea una única playlist vacía asociada al usuario en Spotify
      expect(urlsDeCreacion()).toEqual([URL_CREACION]);

      // Y el sistema muestra Playlist creada: "Viaje 2026" (privada, descripción: "Carretera", id: ..., enlace: ...) con identificador y enlace
      expect(salida.texto()).toContain(LITERAL_EXITO);
      expect(salida.texto()).toContain(IDENTIFICADOR);
      expect(salida.texto()).toContain(ENLACE);

      // Y el sistema registra inicio y éxito en data/app.log sin datos sensibles
      const lineas = await esperarEventosNuevos(RUTAS.rutaLog, marcaRegistro, [
        MENSAJE_INICIO,
        MENSAJE_EXITO,
      ]);
      expect(lineas).toContainEqual(
        expect.objectContaining({
          level: 30,
          msg: MENSAJE_INICIO,
          nombre: NOMBRE,
          visibilidad: 'privada',
          descripcionEfectiva: DESCRIPCION,
        })
      );
      expect(lineas).toContainEqual(
        expect.objectContaining({
          level: 30,
          msg: MENSAJE_EXITO,
          identificador: IDENTIFICADOR,
        })
      );
      comprobarSinDatosSensibles(salida.texto());
      comprobarSinDatosSensibles(contenidoDe(RUTAS.rutaLog));
    });

    it('@AC-002 @RF-001 @RF-002 @UC-001 Escenario: Punto de inicio por comando ' +
      'directo con parámetros validados', async () => {
      // Dado que el CLI spoty2 está disponible
      expect(typeof handleCommand).toBe('function');
      expect(process.env.SPOTY_TOKENS_FILE).toBe(RUTAS.rutaTokens);

      // Cuando el usuario ejecuta spoty create-new-playlist --name "Viaje 2026" --private
      const codigoPrivada = await invocarComando(['--name', NOMBRE, '--private']);
      expect(codigoPrivada).toBe(0);

      // Entonces el sistema inicia el flujo UC-001 con ese nombre y visibilidad privada y descripción "Playlist sin descripción"
      expect(ultimoCuerpoDeCreacion()).toEqual({
        name: NOMBRE,
        description: DESCRIPCION_POR_DEFECTO,
        public: false,
      });

      // Y cuando el usuario ejecuta spoty create-new-playlist --name "Viaje 2026" --private --description "Carretera"
      const codigoConDescripcion = await invocarComando([
        '--name',
        NOMBRE,
        '--private',
        '--description',
        DESCRIPCION,
      ]);
      expect(codigoConDescripcion).toBe(0);

      // Entonces el sistema inicia el flujo UC-001 con esa descripción
      expect(ultimoCuerpoDeCreacion()).toEqual({
        name: NOMBRE,
        description: DESCRIPCION,
        public: false,
      });

      // Y cuando el usuario ejecuta spoty create-new-playlist --name "Viaje 2026" --public --description "Carretera"
      const codigoPublica = await invocarComando([
        '--name',
        NOMBRE,
        '--public',
        '--description',
        DESCRIPCION,
      ]);
      expect(codigoPublica).toBe(0);

      // Entonces el sistema inicia el flujo UC-001 con visibilidad pública
      expect(ultimoCuerpoDeCreacion()).toEqual({
        name: NOMBRE,
        description: DESCRIPCION,
        public: true,
      });

      // Y cuando el usuario ejecuta spoty create-new-playlist --name "Viaje 2026" --public
      // Cuarto ejemplo aprobado de P-001 exigido por TC-024, sin modificar
      // `ACCEPTANCE_CRITERIA.feature`.
      const codigoPublicaPorDefecto = await invocarComando(['--name', NOMBRE, '--public']);
      expect(codigoPublicaPorDefecto).toBe(0);

      // Entonces el sistema inicia el flujo UC-001 con la descripción por defecto y visibilidad pública
      expect(ultimoCuerpoDeCreacion()).toEqual({
        name: NOMBRE,
        description: DESCRIPCION_POR_DEFECTO,
        public: true,
      });
      // Los 4 ejemplos válidos no piden nada en terminal (N-001: solo el
      // flujo interactivo pide confirmación).
      expect(estadoReadline.textos).toEqual([]);

      // Pero cuando el nombre tiene menos de 3 o más de 100 caracteres visibles o la visibilidad falta o es doble
      const creacionesPrevias = numeroDeCreaciones();
      estadoReadline.programar('ctrl+c');
      const codigoNombreCorto = await invocarComando(['--name', 'ab', '--private']);
      estadoReadline.programar('ctrl+c');
      const codigoNombreLargo = await invocarComando(['--name', 'x'.repeat(101), '--private']);
      const codigoSinVisibilidad = await invocarComando(['--name', NOMBRE]);
      const codigoDobleVisibilidad = await invocarComando([
        '--name',
        NOMBRE,
        '--public',
        '--private',
      ]);
      // Ninguna entrada inválida crea lista (UC-001-E3): la de longitud
      // continúa en interactivo y se cancela con `Ctrl+C` sin crear, y la de
      // visibilidad termina en error sin continuar hasta corregirla.
      expect([codigoNombreCorto, codigoNombreLargo]).toEqual([0, 0]);
      expect([codigoSinVisibilidad, codigoDobleVisibilidad]).toEqual([1, 1]);
      expect(numeroDeCreaciones()).toBe(creacionesPrevias);

      // Entonces el sistema muestra Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales. o Se debe declarar flag único en comando --public o --private según corresponda
      expect(salida.texto()).toContain(LITERAL_LONGITUD);
      expect(salida.texto()).toContain(LITERAL_VISIBILIDAD);
      // La longitud inválida continúa con la petición literal de nombre.
      expect(estadoReadline.textos).toEqual([PETICION_NOMBRE, PETICION_NOMBRE]);
    });
  });

  describe('TC-025 — Aceptación de AC-004 sobre el comando directo (TASK-018)', () => {
    it('@AC-004 @RF-002 @RNF-001 @RNF-006 @UC-001 Escenario: Informar errores ' +
      'de sesión, autorización y servicio sin exponer datos sensibles', async () => {
      // Dado que el usuario ha iniciado el flujo UC-001
      expect(contenidoDe(RUTAS.rutaTokens)).toContain(TESTIGO);

      // Cuando no existe sesión válida
      rmSync(RUTAS.rutaTokens, { force: true });
      const codigoSinSesion = await invocarComando(['--name', NOMBRE, '--private']);
      expect(codigoSinSesion).toBe(1);

      // Entonces el sistema muestra No hay sesión activa. Conecta con Spotify con la opción 1 y no crea nada
      expect(salida.texto()).toContain(LITERAL_SIN_SESION);
      expect(numeroDeCreaciones()).toBe(0);
      expect(red.llamadas).toHaveLength(0);

      // Y cuando Spotify responde 401
      escribirTokensFicticios(RUTAS.rutaTokens, TESTIGO);
      const marcaFallos = await marcarRegistro(RUTAS.rutaLog);
      const codigo401 = await ejecutarConCreacionFallida(() =>
        respuestaJson(401, { error: 'invalid_token' })
      );
      expect(codigo401).toBe(1);

      // Entonces el sistema muestra Sesión caducada. Vuelve a conectar con Spotify.
      expect(salida.texto()).toContain(LITERAL_SESION_CADUCADA);

      // Y cuando Spotify responde 403
      const codigo403 = await ejecutarConCreacionFallida(() =>
        respuestaJson(403, { error: 'forbidden' })
      );
      expect(codigo403).toBe(1);

      // Entonces el sistema muestra Permisos insuficientes para crear la playlist.
      expect(salida.texto()).toContain(LITERAL_PERMISOS);

      // Y cuando Spotify responde 429 hasta 3 reintentos respetando Retry-After o 10 segundos y persiste el límite
      const marca429 = await marcarRegistro(RUTAS.rutaLog);
      const inicio429 = Date.now();
      const codigo429 = await ejecutarConCreacionFallida(respuestaLimite);
      const transcurrido429 = Date.now() - inicio429;
      expect(codigo429).toBe(1);
      // 1 intento inicial + 3 reintentos con la espera de `Retry-After: 1`
      // aplicada en cada uno (la rama de 10 segundos sin cabecera se cubre
      // sin temporizadores reales en TC-006 y TC-014).
      expect(numeroDeCreaciones()).toBe(4);
      expect(transcurrido429).toBeGreaterThanOrEqual(ESPERA_RETRY_AFTER_MS * 3);

      // Entonces el sistema muestra Vuelva a intentarlo más tarde
      expect(salida.texto()).toContain(LITERAL_LIMITE);
      const lineas429 = await esperarEventosNuevos(RUTAS.rutaLog, marca429, [MENSAJE_ERROR_FINAL]);
      const reintentos = lineas429.filter((linea) => linea.level === 40 && linea.estado === 429);
      expect(reintentos).toHaveLength(3);
      expect(reintentos.map((linea) => linea.intento)).toEqual([1, 2, 3]);
      expect(
        reintentos.every((linea) => typeof linea.msg === 'string' && linea.msg.includes('1000 ms'))
      ).toBe(true);

      // Y cuando ocurre un fallo genérico
      const marca500 = await marcarRegistro(RUTAS.rutaLog);
      const codigo500 = await ejecutarConCreacionFallida(() =>
        respuestaJson(500, { error: { message: CUERPO_SENSIBLE_500 } })
      );
      expect(codigo500).toBe(1);

      // Entonces el sistema muestra No se pudo crear la playlist por un error inesperado.
      expect(salida.texto()).toContain(LITERAL_FALLO);

      // Y el sistema registra el fallo con causa sin cuerpo sensible y sin tokens en registros, consola ni ficheros
      const fallo500 = await esperarEventosNuevos(RUTAS.rutaLog, marca500, [MENSAJE_ERROR_FINAL]);
      expect(fallo500).toContainEqual(
        expect.objectContaining({
          level: 50,
          msg: MENSAJE_ERROR_FINAL,
          causa: 'HTTP 500',
        })
      );
      // El vaciado del último fallo garantiza los cuatro `error` del tramo:
      // 401, 403, 429 y fallo genérico, cada uno con su causa depurada.
      const tramoFallos = await leerTramoNuevo(RUTAS.rutaLog, marcaFallos);
      expect(tramoFallos).toContain('"causa":"HTTP 401"');
      expect(tramoFallos).toContain('"causa":"HTTP 403"');
      expect(tramoFallos).toContain('"causa":"HTTP 429"');
      expect(tramoFallos).toContain('"causa":"HTTP 500"');
      const registro = contenidoDe(RUTAS.rutaLog);
      expect(registro).not.toContain(CUERPO_SENSIBLE_500);
      expect(salida.texto()).not.toContain(CUERPO_SENSIBLE_500);
      comprobarSinDatosSensibles(registro);
      comprobarSinDatosSensibles(salida.texto());
    }, 20000);
  });
});

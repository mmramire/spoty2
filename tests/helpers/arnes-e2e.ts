/**
 * Arnés de extremo a extremo con Spotify simulado (TASK-017, TC-023).
 *
 * Trazabilidad: `OBJ-001 → RF-001, RF-002, RNF-001, RNF-004 → UC-001 →
 * AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-017 → TC-023`.
 *
 * Utilidades compartidas para ejecutar el comando directo y el menú
 * interactivo de extremo a extremo sin red real, sin credenciales reales y
 * sin escribir en `data/` del repositorio (RNF-001, RNF-004, UC-001):
 *
 * - `aislarFicherosEnTemporal`: ficheros de tokens y de registro en un
 *   directorio temporal mediante `SPOTY_TOKENS_FILE` y `SPOTY_LOG_FILE`;
 * - `escribirTokensFicticios`: sesión de prueba con testigo claramente
 *   ficticio y los ámbitos reales de conexión;
 * - `simularSpotify`: doble de `fetch` que responde por reglas y rechaza
 *   toda URL no simulada, de modo que ninguna petición alcanza Internet;
 * - `capturarSalidaConsola`: salida de consola capturada sin terminal real;
 * - `marcarRegistro`, `esperarEventosNuevos` y `leerTramoNuevo`: espera del
 *   vaciado del transporte de Pino y lectura del tramo nuevo del registro;
 * - `estadoReadline` y `moduloReadlineSimulado`: entrada interactiva
 *   simulada, incluida la interrupción `Ctrl+C`.
 *
 * El módulo es exclusivamente de pruebas: no forma parte del empaquetado
 * del binario (RNF-004, compatibilidad SEA) y no añade dependencias.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REQUIRED_SCOPES, type TokenSet } from '@/business/auth/types.js';
import { getLogger } from '@/data/logging/pino-setup.js';
import { vi } from 'vitest';

/** Caducidad holgada de los tokens ficticios del arnés. */
const CADUCIDAD_MS = 3_600_000;
const TIEMPO_LIMITE_ESPERA_MS = 5_000;
const INTERVALO_ESPERA_MS = 25;
/** Ventana de reposo antes de comprobar que un evento no apareció. */
const VENTANA_AUSENCIA_MS = 250;

/** Rutas del aislamiento temporal: directorio, fichero de tokens y de registro. */
export interface RutasArnes {
  readonly directorio: string;
  readonly rutaTokens: string;
  readonly rutaLog: string;
}

/**
 * Crea un directorio temporal y apunta `SPOTY_LOG_DIR`, `SPOTY_LOG_FILE` y
 * `SPOTY_TOKENS_FILE` a él, de modo que ni la ejecución ni el registro toquen
 * `data/` del repositorio. Debe invocarse antes de la primera escritura del
 * logger, que resuelve su destino en el primer `getLogger()`.
 */
export function aislarFicherosEnTemporal(nombre: string): RutasArnes {
  const directorio = join(tmpdir(), nombre);
  mkdirSync(directorio, { recursive: true });
  const rutaTokens = join(directorio, 'tokens.json');
  const rutaLog = join(directorio, 'app.log');
  process.env.SPOTY_LOG_DIR = directorio;
  process.env.SPOTY_LOG_FILE = rutaLog;
  process.env.SPOTY_TOKENS_FILE = rutaTokens;
  return { directorio, rutaTokens, rutaLog };
}

/**
 * Escribe una sesión ficticia en el fichero indicado: testigo inventado,
 * caducidad futura y los ámbitos reales de conexión (P-003). Nunca contiene
 * credenciales reales (RNF-001).
 */
export function escribirTokensFicticios(ruta: string, testigo: string): void {
  const tokens: TokenSet = {
    access_token: testigo,
    refresh_token: `refresh-${testigo}`,
    expires_at: Date.now() + CADUCIDAD_MS,
    scope: REQUIRED_SCOPES.join(' '),
    token_type: 'Bearer',
  };
  writeFileSync(ruta, JSON.stringify(tokens, null, 2), 'utf8');
}

/** Contenido de un fichero, o cadena vacía cuando todavía no existe. */
export function contenidoDe(ruta: string): string {
  return existsSync(ruta) ? readFileSync(ruta, 'utf8') : '';
}

/** Respuesta JSON simulada para el doble de red. */
export function respuestaJson(estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Regla del doble de red: coincide por fragmento de URL y, si se indica, por método. */
export interface ReglaSimulacion {
  readonly cuandoContenga: string;
  /** Método exigido para que la regla coincida; ausente = cualquier método. */
  readonly metodo?: string;
  readonly respuesta: () => Response;
}

/** Llamada observada por el doble de red. */
export interface LlamadaSimulada {
  readonly url: string;
  readonly metodo: string;
  readonly cabeceras: Record<string, string>;
  readonly cuerpo: string | null;
}

/** Red simulada instalada: llamadas observadas y restauración del global. */
export interface SpotifySimulado {
  readonly llamadas: readonly LlamadaSimulada[];
  restaurar(): void;
}

function urlDe(entrada: unknown): string {
  if (typeof entrada === 'string') {
    return entrada;
  }
  if (entrada instanceof URL) {
    return entrada.href;
  }
  if (typeof entrada === 'object' && entrada !== null && 'url' in entrada) {
    return String((entrada as { url: unknown }).url);
  }
  return String(entrada);
}

function cabecerasDe(init?: RequestInit): Record<string, string> {
  const cabeceras = init?.headers;
  if (!cabeceras) {
    return {};
  }
  if (typeof cabeceras === 'object' && !Array.isArray(cabeceras) && !('get' in cabeceras)) {
    return { ...(cabeceras as Record<string, string>) };
  }
  return Object.fromEntries(new Headers(cabeceras).entries());
}

/**
 * Instala el doble de `fetch` global: registra cada llamada y la responde con
 * la primera regla cuyo fragmento coincida. Toda URL no simulada se rechaza
 * con un error explícito, de modo que ninguna petición puede salir a
 * Internet (RNF-004, sin red real en las pruebas).
 */
export function simularSpotify(reglas: readonly ReglaSimulacion[]): SpotifySimulado {
  const llamadas: LlamadaSimulada[] = [];
  const doble = async (entrada: unknown, init?: RequestInit): Promise<Response> => {
    const url = urlDe(entrada);
    const metodo = init?.method ?? 'GET';
    llamadas.push({
      url,
      metodo,
      cabeceras: cabecerasDe(init),
      cuerpo: init?.body === undefined ? null : String(init.body),
    });
    const regla = reglas.find(
      (candidata) =>
        url.includes(candidata.cuandoContenga) &&
        (candidata.metodo === undefined || candidata.metodo === metodo)
    );
    if (!regla) {
      throw new Error(`URL no simulada en la prueba: ${url}`);
    }
    return regla.respuesta();
  };
  vi.stubGlobal('fetch', doble);
  return { llamadas, restaurar: () => vi.unstubAllGlobals() };
}

/** Escenario de Spotify simulado para el flujo de creación feliz. */
export interface EscenarioSpotify {
  readonly identificador: string;
  readonly enlace: string;
  readonly usuario: string;
  readonly propias?: readonly string[];
}

/**
 * Reglas del flujo de creación: creación, listado de propias y perfil. El orden
 * y el método importan: la creación y el listado comparten la URL
 * `POST|GET /v1/me/playlists` y se distinguen por el método, y el perfil se
 * resuelve al final porque `/v1/me` es prefijo del listado (DISC-005).
 */
export function reglasCreacionExitosa(escenario: EscenarioSpotify): ReglaSimulacion[] {
  const items = (escenario.propias ?? []).map((nombre) => ({
    name: nombre,
    owner: { id: escenario.usuario },
  }));
  return [
    {
      cuandoContenga: '/v1/me/playlists',
      metodo: 'POST',
      respuesta: () =>
        respuestaJson(201, {
          id: escenario.identificador,
          external_urls: { spotify: escenario.enlace },
        }),
    },
    {
      cuandoContenga: '/v1/me/playlists',
      respuesta: () => respuestaJson(200, { items, next: null }),
    },
    {
      cuandoContenga: '/v1/me',
      respuesta: () =>
        respuestaJson(200, {
          id: escenario.usuario,
          display_name: escenario.usuario,
          email: `${escenario.usuario}@example.test`,
        }),
    },
  ];
}

/** Salida de consola capturada sin terminal real. */
export interface SalidaCapturada {
  /** Texto acumulado desde la instalación de la captura. */
  texto(): string;
  restaurar(): void;
}

/** Captura la salida de consola espiando `process.stdout.write`. */
export function capturarSalidaConsola(): SalidaCapturada {
  let contenido = '';
  const espia = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((fragmento: string | Uint8Array) => {
      if (typeof fragmento === 'string') {
        contenido += fragmento;
      }
      return true;
    });
  return {
    texto: () => contenido,
    restaurar: () => {
      espia.mockRestore();
    },
  };
}

/** Línea JSON del registro técnico. */
export interface LineaRegistro {
  readonly level?: number;
  readonly msg?: unknown;
  readonly [clave: string]: unknown;
}

async function vaciarRegistro(): Promise<void> {
  await new Promise<void>((resolve) => getLogger().flush(() => resolve()));
}

function lineasDeTramo(tramo: string): LineaRegistro[] {
  const contenido = tramo.trim();
  if (contenido === '') {
    return [];
  }
  const lineas: LineaRegistro[] = [];
  for (const linea of contenido.split('\n')) {
    try {
      const valor: unknown = JSON.parse(linea);
      if (typeof valor === 'object' && valor !== null) {
        lineas.push(valor as LineaRegistro);
      }
    } catch {
      // El transporte de Pino puede dejar líneas incompletas durante el vaciado.
    }
  }
  return lineas;
}

/**
 * Vacia el transporte de Pino y devuelve la longitud actual del registro: el
 * número sirve de marca para leer después solo el tramo nuevo, de modo que
 * cada prueba observa únicamente sus propios eventos.
 */
export async function marcarRegistro(ruta: string): Promise<number> {
  await vaciarRegistro();
  return contenidoDe(ruta).length;
}

/**
 * Vacia el transporte y espera, con sondeo acotado, a que los mensajes
 * indicados aparezcan en el tramo del registro posterior a la marca.
 */
export async function esperarEventosNuevos(
  ruta: string,
  desde: number,
  mensajes: readonly string[]
): Promise<LineaRegistro[]> {
  await vaciarRegistro();
  const limite = Date.now() + TIEMPO_LIMITE_ESPERA_MS;
  let lineas = lineasDeTramo(contenidoDe(ruta).slice(desde));
  while (!mensajes.every((mensaje) => lineas.some((linea) => linea.msg === mensaje))) {
    if (Date.now() > limite) {
      throw new Error(
        `Tiempo agotado esperando ${mensajes.join(' / ')}; ` +
          `el tramo nuevo tiene ${lineas.length} líneas`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_ESPERA_MS));
    await vaciarRegistro();
    lineas = lineasDeTramo(contenidoDe(ruta).slice(desde));
  }
  return lineas;
}

/**
 * Vacia el transporte, espera una ventana de reposo y devuelve el tramo del
 * registro posterior a la marca: sirve para comprobar que un evento no se
 * emitió (por ejemplo, en una cancelación).
 */
export async function leerTramoNuevo(
  ruta: string,
  desde: number,
  ventanaMs = VENTANA_AUSENCIA_MS
): Promise<string> {
  await vaciarRegistro();
  await new Promise((resolve) => setTimeout(resolve, ventanaMs));
  await vaciarRegistro();
  return contenidoDe(ruta).slice(desde);
}

/** Estado compartido del doble de `readline`: peticiones y respuestas. */
export const estadoReadline = {
  textos: [] as string[],
  respuestas: [] as string[],
  interrupciones: new Set<() => void>(),
  /** Veces que se simuló `Ctrl+C` disparando el escuchador registrado. */
  abortos: 0,
  /** Encola respuestas programadas; `'ctrl+c'` simula la interrupción. */
  programar(...respuestas: string[]): void {
    estadoReadline.respuestas.push(...respuestas);
  },
  /** Reinicia peticiones, respuestas, escuchadores y abortos entre pruebas. */
  reiniciar(): void {
    estadoReadline.textos.length = 0;
    estadoReadline.respuestas.length = 0;
    estadoReadline.interrupciones.clear();
    estadoReadline.abortos = 0;
  },
};

/** Interfaz de `readline` simulada con la forma usada por `prompts.ts`. */
export interface InterfazReadlineSimulada {
  question(texto: string): Promise<string>;
  once(_evento: string, escuchador: () => void): void;
  removeListener(_evento: string, escuchador: () => void): void;
  close(): void;
}

/** `Ctrl+C`: dispara los escuchadores registrados y no resuelve la pregunta. */
function interrumpir(texto: string): Promise<string> {
  const escuchadores = [...estadoReadline.interrupciones];
  if (escuchadores.length === 0) {
    throw new Error(`Ctrl+C sin escuchador en «${texto}»: la petición no lo maneja.`);
  }
  for (const escuchador of escuchadores) {
    escuchador();
  }
  estadoReadline.abortos += 1;
  return new Promise<string>(() => {});
}

/** Consume la siguiente respuesta programada; si falta, falla de forma explícita. */
async function question(texto: string): Promise<string> {
  estadoReadline.textos.push(texto);
  const respuesta = estadoReadline.respuestas.shift();
  if (respuesta === undefined) {
    throw new Error(`Doble de readline sin respuesta programada para «${texto}».`);
  }
  if (respuesta === 'ctrl+c') {
    return interrumpir(texto);
  }
  return respuesta;
}

function crearInterfazSimulada(): InterfazReadlineSimulada {
  return {
    question,
    once(_evento: string, escuchador: () => void): void {
      estadoReadline.interrupciones.add(escuchador);
    },
    removeListener(_evento: string, escuchador: () => void): void {
      estadoReadline.interrupciones.delete(escuchador);
    },
    close(): void {
      estadoReadline.interrupciones.clear();
    },
  };
}

/**
 * Sustituto del módulo `node:readline/promises` para `vi.mock`: la prueba
 * intercepta la entrada interactiva real con este doble compartido.
 */
export function moduloReadlineSimulado(): { createInterface: () => InterfazReadlineSimulada } {
  return { createInterface: crearInterfazSimulada };
}

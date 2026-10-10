/**
 * TC-026 y TC-027 — Aceptación de AC-003 y AC-005 sobre el menú interactivo,
 * la validación de nombre y los duplicados (TASK-019).
 *
 * Trazabilidad: `OBJ-001 → RF-001, RF-002, RNF-002, RNF-006 → UC-001,
 * UC-001-A1 → AC-003, AC-005 → TASK-019 → TC-026, TC-027`.
 *
 * Escenarios ejecutables en español con las palabras clave `Dado`, `Cuando`,
 * `Entonces`, `Y` y `Pero`, con las etiquetas `@AC-003` y `@AC-005`
 * conservadas de `ACCEPTANCE_CRITERIA.feature` 0.2.0, que este fichero no
 * modifica. Cada paso del `.feature` aparece como comentario y tiene
 * aserciones correspondientes (correspondencia 1:1). Los literales se fijan
 * a mano desde la especificación aprobada (RF-002, RNF-002, P-006), sin
 * copiarlos de `MESSAGES`, de modo que la aceptación no se apoya en el
 * propio código.
 *
 * La aceptación se ejecuta sobre el arnés de TASK-017 (TC-023): Spotify
 * simulado por el doble de `fetch` que rechaza toda URL no simulada, ficheros
 * de tokens y de registro en directorio temporal (`SPOTY_TOKENS_FILE`,
 * `SPOTY_LOG_FILE`), salida de consola capturada e interactividad
 * `readline` simulada con `Ctrl+C`. Ningún escenario necesita Internet,
 * credenciales reales ni escribe en `data/` del repositorio (RNF-001,
 * RNF-004).
 */
import { rmSync } from 'node:fs';
import { handleCommand, runInteractiveMode } from '@/cli-main.js';
import { closeReadline } from '@/presentation/prompts.js';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type LlamadaSimulada,
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
  simularSpotify,
} from '../helpers/arnes-e2e.js';

// El arnés simula la entrada interactiva (incluido `Ctrl+C`) interceptando
// `readline` con el doble compartido de las utilidades, sin teclado real.
vi.mock('node:readline/promises', async () => {
  const { moduloReadlineSimulado } = await import('../helpers/arnes-e2e.js');
  return moduloReadlineSimulado();
});

const RUTAS = aislarFicherosEnTemporal('spoty2-tc-026-tc-027');

const TESTIGO = 'testigo-tc-019-ficticio';
const NOMBRE_MENU = 'Ruta Norte 2026';
const NOMBRE_EXISTENTE = 'Viaje 2026';
const NOMBRE_NUEVO = 'Ruta Norte';
const IDENTIFICADOR = 'pl-tc019';
const ENLACE = 'https://open.spotify.com/playlist/pl-tc019';
const USUARIO = 'usuario-tc-019';
const URL_CREACION = `https://api.spotify.com/v1/users/${USUARIO}/playlists`;

// Literales aprobados (RF-002, RNF-002, P-006) escritos a mano desde la
// especificación: la aceptación no los lee del código que pretende evaluar.
const AYUDA = '(navega con 0-4,9, Ctrl+C para cancelar)';
const AYUDA_ANTERIOR = '(navega con 0-3,9, Ctrl+C para cancelar)';
const PETICION_NOMBRE = 'Nombre de la playlist (3-100 caracteres):';
const PETICION_DESCRIPCION = 'Descripción (opcional, Enter para usar "Playlist sin descripción"):';
const LISTA_VISIBILIDAD = 'Pública (preseleccionada)';
const FORMATO_CONFIRMACION = '(s/N): ';
const LITERAL_LONGITUD =
  'Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.';
const LITERAL_DUPLICADO = `Ya existe una playlist llamada "${NOMBRE_EXISTENTE}".`;
const MENU_DUPLICADOS =
  '¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre ' +
  '0. Cancelar sin crear / Elige (0-2):';
const PREGUNTA_MODIFICACION = '¿Deseas modificar descripción y visibilidad? (s/N): ';
const LITERAL_CANCELADA = 'Creación cancelada. No se creó ninguna playlist.';
const SELECTOR = '\nSelecciona una opción (0-4,9): ';
const VUELTA_AL_MENU = 'Volviendo al menú principal...';

// Mensajes técnicos exigidos por RNF-006 en `data/app.log`.
const MENSAJE_INICIO = 'Inicio de creación de playlist vacía';
const MENSAJE_EXITO = 'Playlist creada con éxito';
const MENSAJE_DUPLICADO = 'Duplicado detectado contra listas propias';

let salida: SalidaCapturada;
let red: SpotifySimulado;
let marcaRegistro = 0;

/** Reglas de creación con perfil, listado propio (con duplicado) y creación. */
function reglasDePrueba() {
  return reglasCreacionExitosa({
    identificador: IDENTIFICADOR,
    enlace: ENLACE,
    usuario: USUARIO,
    propias: [NOMBRE_EXISTENTE],
  });
}

/** Observaciones `POST` de creación registradas por el doble de red. */
function creaciones(): readonly LlamadaSimulada[] {
  return red.llamadas.filter((llamada) => llamada.metodo === 'POST');
}

/** Veces que aparece un fragmento dentro de un texto. */
function apariciones(texto: string, fragmento: string): number {
  return texto.split(fragmento).length - 1;
}

/** Ejecución del menú con el tramo de salida, peticiones y efectos observados. */
interface EjecucionMenu {
  readonly codigo: number;
  readonly texto: string;
  readonly peticiones: string[];
  readonly nuevasCreaciones: number;
  readonly nuevosAbortos: number;
}

/** Marcas de inicio de una sesión: índices desde los que medir sus efectos. */
interface MarcasSesion {
  readonly texto: number;
  readonly peticiones: number;
  readonly creaciones: number;
  readonly abortos: number;
}

/** Toma las marcas actuales de salida, peticiones, creaciones y abortos. */
function tomarMarcas(): MarcasSesion {
  return {
    texto: salida.texto().length,
    peticiones: estadoReadline.textos.length,
    creaciones: creaciones().length,
    abortos: estadoReadline.abortos,
  };
}

/** Observaciones de una sesión limitadas a lo ocurrido desde sus marcas. */
function observacionesDesde(marcas: MarcasSesion, codigo: number): EjecucionMenu {
  return {
    codigo,
    texto: salida.texto().slice(marcas.texto),
    peticiones: estadoReadline.textos.slice(marcas.peticiones),
    nuevasCreaciones: creaciones().length - marcas.creaciones,
    nuevosAbortos: estadoReadline.abortos - marcas.abortos,
  };
}

/**
 * Ejecuta una sesión completa del menú con las respuestas programadas y
 * devuelve solo lo observado durante esa sesión, de modo que cada bloque de
 * pasos del `.feature` se aísla de los anteriores.
 */
async function ejecutarMenu(...respuestas: string[]): Promise<EjecucionMenu> {
  const marcas = tomarMarcas();
  estadoReadline.programar(...respuestas);
  const codigo = await runInteractiveMode();
  return observacionesDesde(marcas, codigo);
}

/**
 * Ejecuta el comando directo con el nombre indicado y cancela el reingreso con
 * `Ctrl+C` simulado (UC-001-E3): el literal se muestra y la petición de nombre
 * se repite antes de abortar.
 */
async function ejecutarComandoDirecto(nombre: string): Promise<EjecucionMenu> {
  const marcas = tomarMarcas();
  estadoReadline.programar('ctrl+c');
  const codigo = await handleCommand('create-new-playlist', [
    'create-new-playlist',
    '--name',
    nombre,
    '--private',
  ]);
  return observacionesDesde(marcas, codigo);
}

describe('@003-creacion-de-playlist-vacia Característica: Creación de playlist vacía', () => {
  beforeEach(async () => {
    escribirTokensFicticios(RUTAS.rutaTokens, TESTIGO);
    estadoReadline.reiniciar();
    salida = capturarSalidaConsola();
    red = simularSpotify(reglasDePrueba());
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

  describe('TC-026 — Aceptación de AC-003 sobre el menú interactivo (TASK-019)', () => {
    it('@AC-003 @RF-001 @RF-002 @UC-001 Escenario: Punto de inicio por menú ' +
      'interactivo con confirmación', async () => {
      // Dado que el usuario ejecuta spoty en modo interactivo
      expect(typeof runInteractiveMode).toBe('function');
      expect(process.env.SPOTY_TOKENS_FILE).toBe(RUTAS.rutaTokens);

      // Cuando el usuario selecciona la opción 4. Crear playlist vacía
      const creacion = await ejecutarMenu('4', NOMBRE_MENU, '', '', 's', '0', 's');
      expect(creacion.codigo).toBe(0);
      expect(creacion.texto).toContain('4. Crear playlist vacía');

      // Entonces el sistema muestra la ayuda (navega con 0-4,9, Ctrl+C para cancelar)
      expect(creacion.texto).toContain(AYUDA);
      expect(creacion.texto).not.toContain(AYUDA_ANTERIOR);

      // Y el sistema pide Nombre de la playlist (3-100 caracteres):
      expect(creacion.peticiones[1]).toBe(PETICION_NOMBRE);

      // Y el sistema pide Descripción (opcional, Enter para usar "Playlist sin descripción"):
      expect(creacion.peticiones[2]).toBe(PETICION_DESCRIPCION);

      // Y el sistema ofrece la lista de visibilidad con pública preseleccionada
      expect(creacion.peticiones[3]).toContain(LISTA_VISIBILIDAD);

      // Y el sistema pide confirmación final con formato (s/N):
      expect(creacion.peticiones[4]).toBe(FORMATO_CONFIRMACION);

      // Pero solo la respuesta s confirma y cualquier otra respuesta vuelve al menú sin crear
      expect(creacion.texto).toContain('Playlist creada:');
      expect(creacion.nuevasCreaciones).toBe(1);
      // El transporte asíncrono de Pino debe vaciar los eventos de la creación
      // antes de marcar el registro: la comprobación negativa posterior de
      // `Ctrl+C` solo es válida sobre un tramo que ya excluye ese éxito.
      await esperarEventosNuevos(RUTAS.rutaLog, marcaRegistro, [MENSAJE_INICIO, MENSAJE_EXITO]);
      const rechazoN = await ejecutarMenu('4', NOMBRE_MENU, '', '', 'N', '0', 's');
      expect(rechazoN.texto).not.toContain('Playlist creada:');
      expect(rechazoN.nuevasCreaciones).toBe(0);
      expect(rechazoN.texto).toContain(VUELTA_AL_MENU);
      const rechazoS = await ejecutarMenu('4', NOMBRE_MENU, '', '', 'S', '0', 's');
      expect(rechazoS.texto).not.toContain('Playlist creada:');
      expect(rechazoS.nuevasCreaciones).toBe(0);
      expect(rechazoS.texto).toContain(VUELTA_AL_MENU);

      // Y la combinación Ctrl+C aborta sin crear en cualquier petición
      const marcaAbortos = await marcarRegistro(RUTAS.rutaLog);
      const abortoNombre = await ejecutarMenu('4', 'ctrl+c', '0', 's');
      expect(abortoNombre.nuevosAbortos).toBe(1);
      expect(abortoNombre.nuevasCreaciones).toBe(0);
      expect(abortoNombre.texto).not.toContain('Playlist creada:');
      const abortoConfirmacion = await ejecutarMenu('4', NOMBRE_MENU, '', '', 'ctrl+c', '0', 's');
      expect(abortoConfirmacion.nuevosAbortos).toBe(1);
      expect(abortoConfirmacion.nuevasCreaciones).toBe(0);
      expect(abortoConfirmacion.texto).not.toContain('Playlist creada:');
      const tramoAbortos = await leerTramoNuevo(RUTAS.rutaLog, marcaAbortos);
      expect(tramoAbortos).not.toContain(MENSAJE_INICIO);
      expect(tramoAbortos).not.toContain(MENSAJE_EXITO);
    });
  });

  describe('TC-027 — Aceptación de AC-005 sobre validación y duplicados (TASK-019)', () => {
    it('@AC-005 @RF-001 @RF-002 @RNF-006 @UC-001 Escenario: Validar nombre y ' +
      'gestionar duplicados contra listas propias', async () => {
      // Dado que el usuario ha iniciado el flujo UC-001
      expect(contenidoDe(RUTAS.rutaTokens)).toContain(TESTIGO);

      // Cuando el nombre está vacío o solo tiene espacios o queda fuera de 3-100 caracteres visibles
      const invalidos = await ejecutarMenu(
        '4',
        '',
        '',
        '',
        '   ',
        'x'.repeat(101),
        NOMBRE_NUEVO,
        'N',
        '0',
        's'
      );

      // Entonces el sistema lo rechaza y en comando directo muestra Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales. y continúa con Nombre de la playlist (3-100 caracteres):
      expect(apariciones(invalidos.texto, LITERAL_LONGITUD)).toBe(3);
      expect(invalidos.peticiones.filter((peticion) => peticion === PETICION_NOMBRE)).toHaveLength(
        4
      );
      expect(invalidos.nuevasCreaciones).toBe(0);
      expect(invalidos.texto).not.toContain('Playlist creada:');
      const directo = await ejecutarComandoDirecto('ab');
      expect(directo.codigo).toBe(0);
      expect(apariciones(directo.texto, LITERAL_LONGITUD)).toBe(1);
      expect(directo.peticiones).toContain(PETICION_NOMBRE);
      expect(directo.nuevasCreaciones).toBe(0);

      // Y cuando el nombre coincide con una lista propia tras recortar espacios con comparación exacta sensible a mayúsculas
      const marcaDuplicado = await marcarRegistro(RUTAS.rutaLog);
      const duplicado = await ejecutarMenu(
        '4',
        ` ${NOMBRE_EXISTENTE} `,
        '',
        '',
        '1',
        NOMBRE_NUEVO,
        'n',
        'N',
        '0',
        's'
      );

      // Entonces el sistema muestra Ya existe una playlist llamada "Viaje 2026". y el menú ¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre 0. Cancelar sin crear / Elige (0-2):
      expect(duplicado.texto).toContain(LITERAL_DUPLICADO);
      expect(duplicado.peticiones).toContain(MENU_DUPLICADOS);
      const advertencias = await esperarEventosNuevos(RUTAS.rutaLog, marcaDuplicado, [
        MENSAJE_DUPLICADO,
      ]);
      expect(advertencias).toContainEqual(
        expect.objectContaining({
          level: 40,
          msg: MENSAJE_DUPLICADO,
          nombre: NOMBRE_EXISTENTE,
        })
      );
      expect(duplicado.nuevasCreaciones).toBe(0);

      // Y cuando el usuario elige 1
      const indiceMenu1 = duplicado.peticiones.indexOf(MENU_DUPLICADOS);
      expect(indiceMenu1).toBeGreaterThanOrEqual(0);

      // Entonces el sistema repite el nombre y pregunta ¿Deseas modificar descripción y visibilidad? (s/N):
      expect(duplicado.peticiones[indiceMenu1 + 1]).toBe(PETICION_NOMBRE);
      expect(duplicado.peticiones[indiceMenu1 + 2]).toBe(PREGUNTA_MODIFICACION);

      // La comparación es sensible a mayúsculas: el mismo nombre en minúsculas no es duplicado.
      const distintoCaso = await ejecutarMenu(
        '4',
        ` ${NOMBRE_EXISTENTE.toLowerCase()} `,
        '',
        '',
        'N',
        '0',
        's'
      );
      expect(distintoCaso.texto).not.toContain('Ya existe una playlist llamada');
      expect(distintoCaso.peticiones).not.toContain(MENU_DUPLICADOS);
      expect(distintoCaso.nuevasCreaciones).toBe(0);

      // Y cuando el usuario elige 2
      const marcaOpcion2 = await marcarRegistro(RUTAS.rutaLog);
      const opcion2 = await ejecutarMenu('4', NOMBRE_EXISTENTE, '', '', '2', 's', '0', 's');
      const indiceMenu2 = opcion2.peticiones.indexOf(MENU_DUPLICADOS);
      expect(indiceMenu2).toBeGreaterThanOrEqual(0);

      // Entonces el sistema continúa hacia la confirmación final
      expect(opcion2.peticiones[indiceMenu2 + 1]).toBe(FORMATO_CONFIRMACION);
      expect(opcion2.texto).toContain('Playlist creada:');
      expect(opcion2.nuevasCreaciones).toBe(1);
      expect(creaciones()[0]?.url).toBe(URL_CREACION);
      await esperarEventosNuevos(RUTAS.rutaLog, marcaOpcion2, [MENSAJE_INICIO, MENSAJE_EXITO]);

      // Pero cuando el usuario elige 0
      const marcaOpcion0 = await marcarRegistro(RUTAS.rutaLog);
      const opcion0 = await ejecutarMenu('4', NOMBRE_EXISTENTE, '', '', '0', '0', 's');
      const indiceMenu0 = opcion0.peticiones.indexOf(MENU_DUPLICADOS);
      expect(indiceMenu0).toBeGreaterThanOrEqual(0);
      expect(opcion0.peticiones[indiceMenu0 + 1]).toBe(SELECTOR);

      // Entonces el sistema muestra Creación cancelada. No se creó ninguna playlist. y no crea nada
      expect(opcion0.texto).toContain(LITERAL_CANCELADA);
      expect(opcion0.nuevasCreaciones).toBe(0);
      expect(opcion0.texto).not.toContain('Playlist creada:');
      const tramoCancelacion = await leerTramoNuevo(RUTAS.rutaLog, marcaOpcion0);
      expect(tramoCancelacion).toContain(MENSAJE_DUPLICADO);
      expect(tramoCancelacion).not.toContain(MENSAJE_INICIO);
      expect(tramoCancelacion).not.toContain(MENSAJE_EXITO);
    });
  });
});

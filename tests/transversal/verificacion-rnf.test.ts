/**
 * TC-028 — Verificación transversal de los requisitos no funcionales (TASK-020).
 *
 * Trazabilidad: `OBJ-001 → RNF-001, RNF-002, RNF-003, RNF-004, RNF-005,
 * RNF-006 → UC-001 → AC-001, AC-002, AC-003, AC-004, AC-005 → TASK-020 →
 * TC-028`.
 *
 * Esta suite automatiza las comprobaciones transversales de `TEST_PLAN.md`
 * §4 (TC-028) sobre el estado real del repositorio:
 *
 * - **RNF-001**: patrones de testigo ausentes en la consola, en
 *   `data/app.log` y en los ficheros generados; ninguna causa de error
 *   contiene cuerpos de respuesta.
 * - **RNF-002**: cada literal aprobado figura, carácter a carácter, en
 *   `ACCEPTANCE_CRITERIA.feature` y en Presentation. La revisión lingüística
 *   completa es manual y queda documentada en `TDD_LOG.md`.
 * - **RNF-003**: revisión de imports de las capas —Business sin Presentation,
 *   CLI ni Pino; módulos de creación sin `argv`, `readline` ni efectos
 *   directos; Data sin decisiones de dominio; Presentation sin reglas
 *   propias— más la invocación real del caso de uso sin terminal ni consola.
 * - **RNF-004**: dependencias congeladas, sin binarios nativos y con el
 *   arranque único compatible con el empaquetado SEA.
 * - **RNF-005**: `tsc --noEmit` estricto, Biome sin errores, configuración de
 *   cobertura del 80 % en `src/business/**`, complejidad cognitiva menor de
 *   15 y ausencia de `any`.
 * - **RNF-006**: eventos `info`, `advertencia` y `error` exigidos en el
 *   registro real, cancelaciones sin ninguna entrada y `REQUIRED_SCOPES`
 *   con ambos ámbitos de playlist sin cambio en la conexión (P-003).
 *
 * La suite completa y la ejecución de la cobertura son validaciones externas
 * documentadas en `TDD_LOG.md`: una prueba no puede ejecutar su propia suite.
 * Spotify se simula con el arnés de TASK-017; no hay red real, ni
 * credenciales reales, ni escritura en `data/` del repositorio.
 */
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_SCOPES, SCOPES_STRING, getAuthConfig } from '@/business/auth/types.js';
import { crearPlaylistVacia } from '@/business/playlists/crear-playlist.js';
import { clasificarErrorData } from '@/business/playlists/errores.js';
import type { DependenciasCreacion } from '@/business/playlists/puertos.js';
import type { SolicitudCreacion } from '@/business/playlists/types.js';
import { handleCommand } from '@/cli-main.js';
import { crearPlaylistGateway } from '@/data/http/playlists-client.js';
import { crearRegistroTecnico } from '@/data/logging/registro-tecnico.js';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type LineaRegistro,
  type ReglaSimulacion,
  type SalidaCapturada,
  type SpotifySimulado,
  aislarFicherosEnTemporal,
  capturarSalidaConsola,
  contenidoDe,
  escribirTokensFicticios,
  esperarEventosNuevos,
  leerTramoNuevo,
  marcarRegistro,
  reglasCreacionExitosa,
  respuestaJson,
  simularSpotify,
} from '../helpers/arnes-e2e.js';
import {
  buscarTestigos,
  ejecutarBiome,
  ejecutarTypeScript,
  fuentesDe,
  leerFichero,
  listarFicheros,
  revisarBusiness,
  revisarDatos,
  revisarModulosCreacion,
  revisarPresentacion,
} from '../helpers/verificacion-rnf.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const RUTAS = aislarFicherosEnTemporal('spoty2-tc-028');

const TESTIGO = 'testigo-tc-028-ficticio';
const NOMBRE = 'Viaje 2026';
const IDENTIFICADOR = 'pl-tc028';
const ENLACE = 'https://open.spotify.com/playlist/pl-tc028';
const USUARIO = 'usuario-tc-028';
const DESCRIPCION_POR_DEFECTO = 'Playlist sin descripción';
const CUERPO_SENSIBLE = 'detalle-interno-secreto-500';

// Mensajes técnicos exigidos por RNF-006 en el registro real.
const MENSAJE_INICIO = 'Inicio de creación de playlist vacía';
const MENSAJE_EXITO = 'Playlist creada con éxito';
const MENSAJE_DUPLICADO = 'Duplicado detectado contra listas propias';
const MENSAJE_ERROR_FINAL = 'Creación de playlist no completada';

const RUTA_CRITERIOS = join(
  RAIZ,
  'specs',
  '003-creacion-de-playlist-vacia',
  'ACCEPTANCE_CRITERIA.feature'
);
const DIRECTORIO_DESCARGAS = join(RAIZ, 'downloads');
const RUTA_APP_LOG_REAL = join(RAIZ, 'data', 'app.log');

/** Literales aprobados (RF-002, P-001 a P-006) escritos desde la especificación. */
const LITERALES_APROBADOS: readonly string[] = [
  'Playlist creada: ',
  'Error en longitud del nombre de la playlist, mínimo 3, máximo 100 caracteres totales.',
  'Se debe declarar flag único en comando --public o --private',
  'No hay sesión activa. Conecta con Spotify con la opción 1',
  'Sesión caducada. Vuelve a conectar con Spotify.',
  'Permisos insuficientes para crear la playlist.',
  'Vuelva a intentarlo más tarde',
  'No se pudo crear la playlist por un error inesperado.',
  'Nombre de la playlist (3-100 caracteres):',
  'Descripción (opcional, Enter para usar',
  '(navega con 0-4,9, Ctrl+C para cancelar)',
  '4. Crear playlist vacía',
  'Ya existe una playlist llamada',
  '¿Qué deseas hacer?',
  '¿Deseas modificar descripción y visibilidad?',
  'Creación cancelada. No se creó ninguna playlist.',
  'Playlist sin descripción',
  '(s/N):',
];

/** Ámbitos de conexión vigentes en la rama antes de esta feature (P-003). */
const AMBITOS_DE_CONEXION: readonly string[] = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
  'playlist-read-collaborative',
];

/** Forma mínima de `package.json` para la comprobación de dependencias (RNF-004). */
interface Paquete {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly bin?: Record<string, string>;
  readonly engines?: { readonly node?: string };
}

function claves(dependencias: Record<string, string> | undefined): string[] {
  return Object.keys(dependencias ?? {}).sort();
}

function reglasExitosas(): ReglaSimulacion[] {
  return reglasCreacionExitosa({
    identificador: IDENTIFICADOR,
    enlace: ENLACE,
    usuario: USUARIO,
    propias: [],
  });
}

function reglasConPropias(nombres: readonly string[]): ReglaSimulacion[] {
  return reglasCreacionExitosa({
    identificador: IDENTIFICADOR,
    enlace: ENLACE,
    usuario: USUARIO,
    propias: nombres,
  });
}

function reglasConCreacion(respuesta: () => Response): ReglaSimulacion[] {
  return reglasExitosas().map((regla) =>
    regla.metodo === 'POST' ? { ...regla, respuesta } : regla
  );
}

/** 429 persistente con `Retry-After` (UC-001-E2, P-003). */
function respuestaLimite(): Response {
  return new Response(JSON.stringify({ error: { status: 429, message: 'rate limited' } }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
  });
}

function solicitud(extra: Partial<SolicitudCreacion> = {}): SolicitudCreacion {
  return {
    nombre: NOMBRE,
    visibilidad: 'privada',
    canalConfirmacion: async () => 'confirmada',
    ...extra,
  };
}

/**
 * Composición de pruebas del caso de uso: sesión y espera dobladas, gateway y
 * registro reales. La espera instantánea conserva la política de reintentos
 * sin temporizadores reales (ADR-001).
 */
function dependenciasReales(): DependenciasCreacion {
  return {
    sesionProveedor: { obtenerSesionVigente: async () => ({ testigoSesion: TESTIGO }) },
    playlistGateway: crearPlaylistGateway(),
    registroTecnico: crearRegistroTecnico(),
    espera: { esperar: async () => undefined },
  };
}

function causaDe(desenlace: { readonly resultado: string; readonly causa?: string }): string {
  return desenlace.causa ?? '';
}

describe('TC-028 Verificación transversal de RNF-001 a RNF-006 (TASK-020)', () => {
  let redActiva: SpotifySimulado | undefined;
  let salidaActiva: SalidaCapturada | undefined;

  function instalarRed(reglas: readonly ReglaSimulacion[]): SpotifySimulado {
    redActiva = simularSpotify(reglas);
    return redActiva;
  }

  function instalarSalida(): SalidaCapturada {
    salidaActiva = capturarSalidaConsola();
    return salidaActiva;
  }

  beforeEach(() => {
    escribirTokensFicticios(RUTAS.rutaTokens, TESTIGO);
  });

  // La restauración vive en el gancho para que también se ejecute si la
  // prueba falla: cada caso no necesita su propio `try/finally`.
  afterEach(() => {
    salidaActiva?.restaurar();
    salidaActiva = undefined;
    redActiva?.restaurar();
    redActiva = undefined;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    try {
      rmSync(RUTAS.directorio, { recursive: true, force: true });
    } catch {
      // El transporte de Pino mantiene el fichero abierto hasta cerrar el proceso.
    }
  });

  describe('RNF-001 seguridad: sin testigos en salidas ni en ficheros generados', () => {
    it('la consola, data/app.log y los ficheros generados no contienen patrones de testigo', async () => {
      const salida = instalarSalida();
      instalarRed(reglasExitosas());

      const codigo = await handleCommand('create-new-playlist', [
        'create-new-playlist',
        '--name',
        NOMBRE,
        '--private',
      ]);
      expect(codigo).toBe(0);

      const textoConsola = salida.texto();
      expect(textoConsola).toContain('Playlist creada: ');
      expect(buscarTestigos(textoConsola)).toEqual([]);
      expect(textoConsola).not.toContain(TESTIGO);

      // El registro aislado es el fichero equivalente a data/app.log y no
      // queda vacío: el escaneo no puede quedar sin efecto.
      await esperarEventosNuevos(RUTAS.rutaLog, 0, [MENSAJE_EXITO]);
      expect(contenidoDe(RUTAS.rutaLog)).not.toBe('');
      expect(buscarTestigos(contenidoDe(RUTAS.rutaLog))).toEqual([]);

      expect(buscarTestigos(contenidoDe(RUTA_APP_LOG_REAL))).toEqual([]);
      for (const fichero of listarFicheros(DIRECTORIO_DESCARGAS, ['.json'])) {
        expect(buscarTestigos(leerFichero(fichero)), fichero).toEqual([]);
      }
      for (const fuente of fuentesDe(join(RAIZ, 'src'))) {
        expect(buscarTestigos(fuente.contenido), fuente.nombre).toEqual([]);
      }
    }, 30000);

    it('ninguna causa de error contiene cuerpos de respuesta, cabeceras ni testigos', () => {
      const cuerpo = JSON.stringify({ error: { message: CUERPO_SENSIBLE } });
      const desenlaceCuerpo = clasificarErrorData({ estado: 500, causa: cuerpo });
      expect(desenlaceCuerpo.resultado).toBe('falloInesperado');
      expect(causaDe(desenlaceCuerpo)).not.toContain(CUERPO_SENSIBLE);
      expect(causaDe(desenlaceCuerpo)).not.toContain('{');

      const desenlaceTestigo = clasificarErrorData({
        estado: 500,
        causa: `HTTP 500; Authorization: Bearer ${TESTIGO}abc123456789`,
      });
      const causa = causaDe(desenlaceTestigo);
      expect(causa).not.toContain(TESTIGO);
      expect(buscarTestigos(causa)).toEqual([]);
    });
  });

  describe('RNF-002 idioma: literales aprobados carácter a carácter', () => {
    it('cada literal aprobado figura en el criterio de aceptación y en Presentation', () => {
      const criterios = leerFichero(RUTA_CRITERIOS);
      const presentacion = fuentesDe(join(RAIZ, 'src', 'presentation'))
        .map((fuente) => fuente.contenido)
        .join('\n');
      expect(presentacion).not.toBe('');
      for (const literal of LITERALES_APROBADOS) {
        expect(criterios, `ausente del criterio: ${literal}`).toContain(literal);
        expect(presentacion, `ausente de Presentation: ${literal}`).toContain(literal);
      }
    });
  });

  describe('RNF-003 arquitectura: capas sin dependencias invertidas', () => {
    it('Business no importa Presentation, CLI ni Pino', () => {
      expect(revisarBusiness(RAIZ)).toEqual([]);
    });

    it('los módulos de creación no usan argv, readline, ficheros ni red directos', () => {
      expect(revisarModulosCreacion(RAIZ)).toEqual([]);
    });

    it('Data no contiene decisiones de dominio ni depende de las otras capas', () => {
      expect(revisarDatos(RAIZ)).toEqual([]);
    });

    it('Presentation no contiene reglas propias de validación, duplicados ni reintentos', () => {
      expect(revisarPresentacion(RAIZ)).toEqual([]);
    });

    it('el caso de uso se invoca sin argv, readline ni salida a consola', async () => {
      const salida = instalarSalida();
      instalarRed(reglasExitosas());

      const resultado = await crearPlaylistVacia(solicitud(), dependenciasReales());
      expect(resultado).toMatchObject({ resultado: 'exito', identificador: IDENTIFICADOR });
      expect(salida.texto()).toBe('');
    }, 20000);
  });

  describe('RNF-004 compatibilidad SEA: dependencias y arranque', () => {
    it('las dependencias quedan congeladas, sin binarios nativos y con arranque SEA', () => {
      const paquete = JSON.parse(leerFichero(join(RAIZ, 'package.json'))) as Paquete;
      expect(claves(paquete.dependencies)).toEqual(['@spotify/web-api-ts-sdk', 'open', 'pino']);
      expect(claves(paquete.devDependencies)).toEqual([
        '@biomejs/biome',
        '@types/node',
        '@vitest/coverage-v8',
        'msw',
        'pino-pretty',
        'tsc-alias',
        'typescript',
        'vitest',
      ]);
      expect(paquete.bin).toEqual({ spoty: 'dist/cli.js' });
      expect(paquete.engines?.node).toBe('>=22.0.0');
      expect(existsSync(join(RAIZ, 'binding.gyp'))).toBe(false);
      expect(existsSync(join(RAIZ, 'src', 'cli.ts'))).toBe(true);
      for (const fuente of fuentesDe(join(RAIZ, 'src'))) {
        expect(fuente.contenido, `${fuente.nombre} no debe usar carga nativa`).not.toMatch(
          /child_process|process\.dlopen|node-gyp|\.node['"]/
        );
      }
    });
  });

  describe('RNF-005 calidad: herramientas y configuración', () => {
    it('tsc --noEmit en modo estricto termina en 0', () => {
      const resultado = ejecutarTypeScript(RAIZ, ['tsconfig.json']);
      expect(resultado.codigo, resultado.salida).toBe(0);
    }, 300000);

    it('tsc sobre las pruebas de nivel tipo termina en 0', () => {
      const resultado = ejecutarTypeScript(RAIZ, ['tsconfig.type-tests.json']);
      expect(resultado.codigo, resultado.salida).toBe(0);
    }, 300000);

    it('biome check sobre código, pruebas y configuración termina en 0', () => {
      const resultado = ejecutarBiome(RAIZ, [
        'src',
        'tests',
        'biome.json',
        'tsconfig.json',
        'tsconfig.type-tests.json',
        'vitest.config.ts',
      ]);
      expect(resultado.codigo, resultado.salida).toBe(0);
    }, 180000);

    it('vitest.config.ts exige cobertura mínima del 80 % en el alcance 003', () => {
      const configuracion = leerFichero(join(RAIZ, 'vitest.config.ts'));
      expect(configuracion).toContain("provider: 'v8'");
      // CR-001: la medición se re-acota al alcance 003 (dos patrones), sin relajar el umbral.
      expect(configuracion).toContain(
        "include: ['src/business/playlists/**/*.ts', 'src/business/retry/**/*.ts']"
      );
      expect(configuracion).not.toContain("include: ['src/business/**/*.ts']");
      for (const umbral of ['lines: 80', 'functions: 80', 'branches: 80', 'statements: 80']) {
        expect(configuracion, `umbral ausente: ${umbral}`).toContain(umbral);
      }
    });

    it('biome.json y tsconfig.json fijan complejidad menor de 15, sin any y modo estricto', () => {
      const biome = JSON.parse(leerFichero(join(RAIZ, 'biome.json'))) as {
        linter?: {
          rules?: { complexity?: Record<string, unknown>; suspicious?: Record<string, unknown> };
        };
      };
      const complejidad = biome.linter?.rules?.complexity?.noExcessiveCognitiveComplexity;
      expect(complejidad).toEqual({
        level: 'error',
        options: { maxAllowedComplexity: 14 },
      });
      expect(biome.linter?.rules?.suspicious?.noExplicitAny).toBe('error');
      const tsconfig = JSON.parse(leerFichero(join(RAIZ, 'tsconfig.json'))) as {
        compilerOptions?: { strict?: boolean };
      };
      expect(tsconfig.compilerOptions?.strict).toBe(true);
    });
  });

  describe('RNF-006 observabilidad: registro real y ámbitos de conexión', () => {
    it('el registro real contiene el info de inicio y el de éxito con sus campos', async () => {
      const marca = await marcarRegistro(RUTAS.rutaLog);
      instalarRed(reglasExitosas());

      const resultado = await crearPlaylistVacia(solicitud(), dependenciasReales());
      expect(resultado).toMatchObject({
        resultado: 'exito',
        visibilidad: 'privada',
        descripcionEfectiva: DESCRIPCION_POR_DEFECTO,
        identificador: IDENTIFICADOR,
      });
      const lineas: LineaRegistro[] = await esperarEventosNuevos(RUTAS.rutaLog, marca, [
        MENSAJE_INICIO,
        MENSAJE_EXITO,
      ]);
      expect(lineas).toContainEqual(
        expect.objectContaining({
          level: 30,
          msg: MENSAJE_INICIO,
          nombre: NOMBRE,
          visibilidad: 'privada',
          descripcionEfectiva: DESCRIPCION_POR_DEFECTO,
        })
      );
      expect(lineas).toContainEqual(
        expect.objectContaining({ level: 30, msg: MENSAJE_EXITO, identificador: IDENTIFICADOR })
      );
    }, 20000);

    it('el registro real contiene la advertencia de duplicado y ninguna de inicio', async () => {
      const marca = await marcarRegistro(RUTAS.rutaLog);
      instalarRed(reglasConPropias([NOMBRE]));

      const resultado = await crearPlaylistVacia(solicitud(), dependenciasReales());
      expect(resultado).toEqual({ resultado: 'duplicado', nombreEfectivo: NOMBRE });
      const lineas: LineaRegistro[] = await esperarEventosNuevos(RUTAS.rutaLog, marca, [
        MENSAJE_DUPLICADO,
      ]);
      expect(lineas).toContainEqual(
        expect.objectContaining({ level: 40, msg: MENSAJE_DUPLICADO, nombre: NOMBRE })
      );
      expect(lineas.some((linea) => linea.msg === MENSAJE_INICIO)).toBe(false);
    }, 20000);

    it('cada reintento genera advertencia y el fallo final error con causa depurada', async () => {
      const marca = await marcarRegistro(RUTAS.rutaLog);
      instalarRed(reglasConCreacion(respuestaLimite));

      const resultado = await crearPlaylistVacia(solicitud(), dependenciasReales());
      expect(resultado.resultado).toBe('limiteAgotado');
      const lineas: LineaRegistro[] = await esperarEventosNuevos(RUTAS.rutaLog, marca, [
        MENSAJE_ERROR_FINAL,
      ]);
      const reintentos = lineas.filter((linea) => linea.level === 40 && linea.estado === 429);
      expect(reintentos.map((linea) => linea.intento)).toEqual([1, 2, 3]);
      expect(lineas).toContainEqual(
        expect.objectContaining({ level: 50, msg: MENSAJE_ERROR_FINAL, causa: 'HTTP 429' })
      );
    }, 20000);

    it('el fallo genérico deja error con causa sin cuerpo sensible ni testigos', async () => {
      const marca = await marcarRegistro(RUTAS.rutaLog);
      instalarRed(
        reglasConCreacion(() => respuestaJson(500, { error: { message: CUERPO_SENSIBLE } }))
      );

      const resultado = await crearPlaylistVacia(solicitud(), dependenciasReales());
      expect(resultado.resultado).toBe('falloInesperado');
      const lineas: LineaRegistro[] = await esperarEventosNuevos(RUTAS.rutaLog, marca, [
        MENSAJE_ERROR_FINAL,
      ]);
      expect(lineas).toContainEqual(
        expect.objectContaining({ level: 50, msg: MENSAJE_ERROR_FINAL, causa: 'HTTP 500' })
      );
      const tramo = await leerTramoNuevo(RUTAS.rutaLog, marca);
      expect(tramo).not.toContain(CUERPO_SENSIBLE);
      expect(buscarTestigos(tramo)).toEqual([]);
    }, 20000);

    it('las cancelaciones no generan ninguna entrada de registro ni creación', async () => {
      const marca = await marcarRegistro(RUTAS.rutaLog);
      const red = instalarRed(reglasExitosas());

      const resultado = await crearPlaylistVacia(
        solicitud({ canalConfirmacion: async () => 'cancelada' }),
        dependenciasReales()
      );
      expect(resultado).toEqual({ resultado: 'cancelado' });
      expect(red.llamadas.filter((llamada) => llamada.metodo === 'POST')).toHaveLength(0);
      const tramo = await leerTramoNuevo(RUTAS.rutaLog, marca);
      expect(tramo.trim()).toBe('');
    }, 20000);

    it('REQUIRED_SCOPES conserva ambos ámbitos de playlist sin cambio en la conexión', () => {
      expect([...REQUIRED_SCOPES]).toEqual(AMBITOS_DE_CONEXION);
      expect(REQUIRED_SCOPES).toContain('playlist-modify-public');
      expect(REQUIRED_SCOPES).toContain('playlist-modify-private');
      expect(SCOPES_STRING).toBe(AMBITOS_DE_CONEXION.join(' '));

      const clienteAnterior = process.env.SPOTIFY_CLIENT_ID;
      const redirigidaAnterior = process.env.SPOTIFY_REDIRECT_URI;
      process.env.SPOTIFY_CLIENT_ID = 'cliente-ficticio';
      process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:8000/callback';
      try {
        expect(getAuthConfig().scopes).toEqual(AMBITOS_DE_CONEXION);
      } finally {
        process.env.SPOTIFY_CLIENT_ID = clienteAnterior;
        process.env.SPOTIFY_REDIRECT_URI = redirigidaAnterior;
      }

      const composicion = leerFichero(
        join(RAIZ, 'src', 'presentation', 'composicion-crear-playlist.ts')
      );
      expect(composicion).not.toContain('playlist-modify');
    });
  });
});

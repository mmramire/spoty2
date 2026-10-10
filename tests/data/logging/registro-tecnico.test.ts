/**
 * TC-004 — Puerto `RegistroTecnico` sobre Pino hacia `SPOTY_LOG_FILE` (TASK-003).
 *
 * Trazabilidad: OBJ-001 → RNF-001, RNF-006 → UC-001 → AC-001, AC-004, AC-005 →
 * TASK-003 → TC-004.
 *
 * La prueba escribe en un fichero temporal indicado por `SPOTY_LOG_FILE` (sin
 * tocar `data/` del repositorio) y verifica los tres niveles, los campos
 * estructurados exigidos y la ausencia de patrones de testigo, cabecera de
 * autorización o cuerpo de respuesta en el registro (RNF-001, RNF-006).
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RegistroTecnico } from '@/business/playlists/puertos.js';
import { getLogger } from '@/data/logging/pino-setup.js';
import { crearRegistroTecnico } from '@/data/logging/registro-tecnico.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DIRECTORIO_TEMPORAL = join(tmpdir(), 'spoty2-tc-004');
const RUTA_LOG = join(DIRECTORIO_TEMPORAL, 'app.log');
const TIEMPO_LIMITE_ESPERA_MS = 5000;
const INTERVALO_ESPERA_MS = 25;
const CAMPOS_PROHIBIDOS = ['testigoSesion', 'cabeceras', 'cuerpo'];

// Aislamiento del registro: la ruta se fija antes de crear el logger (TEST_PLAN TC-004).
process.env.SPOTY_LOG_DIR = DIRECTORIO_TEMPORAL;
process.env.SPOTY_LOG_FILE = RUTA_LOG;

/** Campos que Business puede aportar, más campos prohibidos que deben descartarse. */
interface CamposPrueba {
  readonly nombre?: string;
  readonly visibilidad?: 'publica' | 'privada';
  readonly descripcionEfectiva?: string;
  readonly identificador?: string;
  readonly intento?: number;
  readonly estado?: number;
  readonly causa?: string;
  readonly testigoSesion?: string;
  readonly cabeceras?: Record<string, string>;
  readonly cuerpo?: string;
}

type LineaRegistro = Record<string, unknown>;

function leerRegistro(): string {
  return existsSync(RUTA_LOG) ? readFileSync(RUTA_LOG, 'utf8') : '';
}

function intentarParsear(linea: string): LineaRegistro | null {
  try {
    const valor: unknown = JSON.parse(linea);
    return typeof valor === 'object' && valor !== null ? (valor as LineaRegistro) : null;
  } catch {
    return null;
  }
}

function lineasDeRegistro(): LineaRegistro[] {
  const contenido = leerRegistro().trim();
  if (contenido === '') {
    return [];
  }
  const lineas: LineaRegistro[] = [];
  for (const linea of contenido.split('\n')) {
    const registro = intentarParsear(linea);
    if (registro) {
      lineas.push(registro);
    }
  }
  return lineas;
}

async function esperarLineasEsperadas(cantidad: number): Promise<LineaRegistro[]> {
  await new Promise<void>((resolve) => getLogger().flush(() => resolve()));
  const limite = Date.now() + TIEMPO_LIMITE_ESPERA_MS;
  let lineas = lineasDeRegistro();
  while (lineas.length < cantidad) {
    if (Date.now() > limite) {
      throw new Error(
        `Tiempo agotado esperando ${cantidad} líneas de registro; el fichero contiene ${lineas.length}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_ESPERA_MS));
    lineas = lineasDeRegistro();
  }
  return lineas;
}

describe('TC-004 RegistroTecnico sobre Pino hacia SPOTY_LOG_FILE (TASK-003)', () => {
  beforeAll(() => {
    mkdirSync(DIRECTORIO_TEMPORAL, { recursive: true });
    if (existsSync(RUTA_LOG)) {
      rmSync(RUTA_LOG, { force: true });
    }
  });

  afterAll(() => {
    try {
      if (existsSync(RUTA_LOG)) {
        rmSync(RUTA_LOG, { force: true });
      }
      rmSync(DIRECTORIO_TEMPORAL, { recursive: true, force: true });
    } catch {
      // El transporte de Pino mantiene el fichero abierto hasta cerrar el proceso.
    }
  });

  it('escribe info, advertencia y error con campos estructurados y sin datos sensibles', async () => {
    const registro = crearRegistroTecnico();

    // El registro no emite eventos por sí mismo: solo escribe lo que Business indique.
    expect(leerRegistro()).toBe('');

    const campos: CamposPrueba = {
      nombre: 'Viaje 2026',
      visibilidad: 'privada',
      descripcionEfectiva: 'Carretera',
      identificador: 'pl-1',
      testigoSesion: 'Bearer testigo-super-secreto-12345',
      cabeceras: { Authorization: 'Bearer cabecera-super-secreta-999' },
      cuerpo: '{"access_token":"cuerpo-secreto-4242"}',
    };
    registro.info('Playlist creada', campos);
    registro.advertencia('Reintento ante límite 429', {
      nombre: 'Viaje 2026',
      intento: 1,
      estado: 429,
    });
    registro.error('Fallo al crear la playlist', {
      causa:
        'HTTP 500; Authorization: Bearer causa-secreta-777; cuerpo {"refresh_token":"refresh-secreto-888"}',
    });

    const lineas = await esperarLineasEsperadas(3);

    expect(lineas).toHaveLength(3);
    const [inicio, reintento, fallo] = lineas;
    expect(inicio).toMatchObject({
      level: 30,
      msg: 'Playlist creada',
      nombre: 'Viaje 2026',
      visibilidad: 'privada',
      descripcionEfectiva: 'Carretera',
      identificador: 'pl-1',
    });
    expect(reintento).toMatchObject({
      level: 40,
      msg: 'Reintento ante límite 429',
      nombre: 'Viaje 2026',
      intento: 1,
      estado: 429,
    });
    expect(fallo).toMatchObject({ level: 50, msg: 'Fallo al crear la playlist' });
    expect(fallo.causa).toEqual(expect.stringContaining('HTTP 500'));

    for (const linea of lineas) {
      const clavesProhibidas = Object.keys(linea).filter((clave) =>
        CAMPOS_PROHIBIDOS.includes(clave)
      );
      expect(clavesProhibidas).toEqual([]);
    }

    const contenido = lineas.map((linea) => JSON.stringify(linea)).join('\n');
    expect(contenido).not.toMatch(/bearer/i);
    expect(contenido).not.toMatch(/authorization/i);
    expect(contenido).not.toMatch(/access_token/i);
    expect(contenido).not.toMatch(/refresh_token/i);
    expect(contenido).not.toContain('testigo-super-secreto-12345');
    expect(contenido).not.toContain('cabecera-super-secreta-999');
    expect(contenido).not.toContain('cuerpo-secreto-4242');
    expect(contenido).not.toContain('causa-secreta-777');
    expect(contenido).not.toContain('refresh-secreto-888');
  });

  it('satisface el puerto RegistroTecnico de Business por tipado estructural', () => {
    const registro: RegistroTecnico = crearRegistroTecnico();
    expect(registro.info).toBeTypeOf('function');
    expect(registro.advertencia).toBeTypeOf('function');
    expect(registro.error).toBeTypeOf('function');
  });

  it('el módulo no importa de Business ni de Presentation ni usa any ni console', () => {
    const fuente = readFileSync(
      new URL('../../../src/data/logging/registro-tecnico.ts', import.meta.url),
      'utf8'
    );
    expect(fuente).not.toMatch(/from\s+['"][^'"]*business/i);
    expect(fuente).not.toMatch(/from\s+['"][^'"]*presentation/i);
    expect(fuente).not.toMatch(/\bany\b/);
    expect(fuente).not.toMatch(/console\./);
  });
});

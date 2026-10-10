import { readFileSync } from 'node:fs';
import * as puertosMod from '@/business/playlists/puertos.js';
import * as tiposMod from '@/business/playlists/types.js';
import { describe, expect, it } from 'vitest';

const RUTAS_FUENTE = [
  'src/business/playlists/types.ts',
  'src/business/playlists/puertos.ts',
] as const;

interface PatronProhibido {
  readonly descripcion: string;
  readonly patron: RegExp;
}

const PATRONES_PROHIBIDOS: readonly PatronProhibido[] = [
  { descripcion: 'el tipo "any"', patron: /\bany\b/ },
  { descripcion: 'importaciones de Presentation', patron: /from\s+['"][^'"]*presentation/i },
  { descripcion: 'importaciones del punto de entrada CLI', patron: /from\s+['"][^'"]*cli/i },
  { descripcion: 'importaciones de Data', patron: /from\s+['"][^'"]*data\//i },
  { descripcion: 'importaciones de Pino', patron: /from\s+['"][^'"]*pino/i },
  {
    descripcion: 'el sistema de ficheros',
    patron: /from\s+['"]node:fs|\b(readFileSync|writeFileSync|appendFileSync)\b/,
  },
  { descripcion: 'uso de fetch', patron: /\bfetch\s*\(/ },
  { descripcion: 'uso de process', patron: /\bprocess\./ },
  { descripcion: 'uso de console', patron: /\bconsole\./ },
];

function leerFuente(ruta: string): string {
  return readFileSync(new URL(`../../../${ruta}`, import.meta.url), 'utf8');
}

describe('TC-001 contratos de dominio y puertos (TASK-001)', () => {
  it('importa los módulos de contratos de la feature', () => {
    expect(tiposMod).toBeDefined();
    expect(puertosMod).toBeDefined();
  });

  it('los módulos no contienen any ni importaciones prohibidas por RNF-003', () => {
    for (const ruta of RUTAS_FUENTE) {
      const fuente = leerFuente(ruta);
      for (const { descripcion, patron } of PATRONES_PROHIBIDOS) {
        expect(fuente, `${ruta} no debe contener ${descripcion}`).not.toMatch(patron);
      }
    }
  });

  it('permite construir los 9 desenlaces del resultado de creación', () => {
    const resultados: tiposMod.ResultadoCreacion[] = [
      {
        resultado: 'exito',
        nombreEfectivo: 'Viaje 2026',
        visibilidad: 'privada',
        descripcionEfectiva: 'Carretera',
        identificador: 'id-1',
        enlace: 'https://open.spotify.com/playlist/id-1',
      },
      { resultado: 'errorValidacion', campo: 'nombre' },
      { resultado: 'duplicado', nombreEfectivo: 'Viaje 2026' },
      { resultado: 'sinSesion' },
      { resultado: 'sesionCaducada', causa: 'HTTP 401' },
      { resultado: 'permisosInsuficientes', causa: 'HTTP 403' },
      { resultado: 'limiteAgotado', causa: 'HTTP 429' },
      { resultado: 'falloInesperado', causa: 'HTTP 500' },
      { resultado: 'cancelado' },
    ];

    expect(resultados.map((resultado) => resultado.resultado)).toEqual([
      'exito',
      'errorValidacion',
      'duplicado',
      'sinSesion',
      'sesionCaducada',
      'permisosInsuficientes',
      'limiteAgotado',
      'falloInesperado',
      'cancelado',
    ]);
  });

  it('permite consumir los cuatro puertos con dobles', async () => {
    const eventos: string[] = [];
    const registro: puertosMod.RegistroTecnico = {
      info: (mensaje, campos) => {
        eventos.push(`info:${mensaje}:${campos?.nombre ?? 'sin-nombre'}`);
      },
      advertencia: (mensaje, campos) => {
        eventos.push(`advertencia:${mensaje}:${campos?.intento ?? 'sin-intento'}`);
      },
      error: (mensaje, campos) => {
        eventos.push(`error:${mensaje}:${campos?.causa ?? 'sin-causa'}`);
      },
    };
    const dependencias: puertosMod.DependenciasCreacion = {
      sesionProveedor: {
        obtenerSesionVigente: async () => ({ testigoSesion: 'testigo-ficticio' }),
      },
      playlistGateway: {
        crearPlaylist: async () => ({
          identificador: 'id-ficticio',
          enlace: 'https://open.spotify.com/playlist/id-ficticio',
        }),
        listarPlaylistsPropias: async () => ['Viaje 2026'],
      },
      registroTecnico: registro,
      espera: { esperar: async () => {} },
    };

    const sesion = await dependencias.sesionProveedor.obtenerSesionVigente();
    expect(sesion).toEqual({ testigoSesion: 'testigo-ficticio' });

    const creada = await dependencias.playlistGateway.crearPlaylist({
      nombreEfectivo: 'Viaje 2026',
      descripcionEfectiva: 'Playlist sin descripción',
      visibilidad: 'privada',
      testigoSesion: 'testigo-ficticio',
    });
    expect(creada.identificador).toBe('id-ficticio');
    expect(creada.enlace).toContain('https://open.spotify.com/playlist/');
    expect(await dependencias.playlistGateway.listarPlaylistsPropias()).toEqual(['Viaje 2026']);

    dependencias.registroTecnico.info('inicio de creación', {
      nombre: 'Viaje 2026',
      visibilidad: 'privada',
      descripcionEfectiva: 'Playlist sin descripción',
      identificador: 'id-ficticio',
    });
    dependencias.registroTecnico.advertencia('reintento 429', { intento: 1, estado: 429 });
    dependencias.registroTecnico.error('fallo final', { causa: 'HTTP 500' });
    expect(eventos).toEqual([
      'info:inicio de creación:Viaje 2026',
      'advertencia:reintento 429:1',
      'error:fallo final:HTTP 500',
    ]);

    await dependencias.espera.esperar(1);
  });
});

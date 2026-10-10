import { readFileSync } from 'node:fs';
import type { PlaylistGateway } from '@/business/playlists/puertos.js';
import {
  ErrorApiSpotify,
  type FetchInyectable,
  crearPlaylistGateway,
} from '@/data/http/playlists-client.js';
import { describe, expect, it } from 'vitest';

const RUTA_MODULO = 'src/data/http/playlists-client.ts';

const ENTRADA_PRIVADA = {
  nombreEfectivo: 'Viaje 2026',
  descripcionEfectiva: 'Carretera',
  visibilidad: 'privada',
  testigoSesion: 'testigo-ficticio',
} as const;

const ENTRADA_PUBLICA = { ...ENTRADA_PRIVADA, visibilidad: 'publica' } as const;

interface ReglaRespuesta {
  readonly cuandoContenga: string;
  readonly respuesta: () => Response;
}

interface LlamadaSimulada {
  readonly url: string;
  readonly metodo: string;
  readonly cabeceras: Record<string, string>;
  readonly cuerpo: string | null;
}

function respuestaJson(
  status: number,
  cuerpo: unknown,
  cabeceras?: Record<string, string>
): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json', ...cabeceras },
  });
}

function crearFetchSimulado(reglas: readonly ReglaRespuesta[]): {
  fetchSimulado: FetchInyectable;
  llamadas: LlamadaSimulada[];
} {
  const llamadas: LlamadaSimulada[] = [];
  const fetchSimulado: FetchInyectable = async (url, init) => {
    const texto = String(url);
    llamadas.push({
      url: texto,
      metodo: init?.method ?? 'GET',
      cabeceras: (init?.headers ?? {}) as Record<string, string>,
      cuerpo: init?.body === undefined ? null : String(init.body),
    });
    const regla = reglas.find((candidate) => texto.includes(candidate.cuandoContenga));
    if (!regla) {
      throw new Error(`URL no simulada en la prueba: ${texto}`);
    }
    return regla.respuesta();
  };
  return { fetchSimulado, llamadas };
}

function reglasCrear(bienFormada: boolean): ReglaRespuesta[] {
  const cuerpoCreada = bienFormada
    ? { id: 'pl-1', external_urls: { spotify: 'https://open.spotify.com/playlist/pl-1' } }
    : { id: 5 };
  return [
    {
      cuandoContenga: '/v1/users/usuario-1/playlists',
      respuesta: () => respuestaJson(201, cuerpoCreada),
    },
    { cuandoContenga: '/v1/me', respuesta: () => respuestaJson(200, { id: 'usuario-1' }) },
  ];
}

async function obtenerErrorApi(promesa: Promise<unknown>): Promise<ErrorApiSpotify> {
  let capturado: unknown;
  try {
    await promesa;
  } catch (error) {
    capturado = error;
  }
  expect(capturado).toBeInstanceOf(ErrorApiSpotify);
  return capturado as ErrorApiSpotify;
}

describe('TC-002 crearPlaylist con red simulada (TASK-002)', () => {
  it('ante 201 devuelve identificador y enlace y envía datos efectivos sin collaborative', async () => {
    const { fetchSimulado, llamadas } = crearFetchSimulado(reglasCrear(true));
    const gateway = crearPlaylistGateway({ fetchInyectado: fetchSimulado });

    const creada = await gateway.crearPlaylist(ENTRADA_PRIVADA);

    expect(creada).toEqual({
      identificador: 'pl-1',
      enlace: 'https://open.spotify.com/playlist/pl-1',
    });

    const creacion = llamadas.find((llamada) => llamada.metodo === 'POST');
    expect(creacion).toBeDefined();
    expect(creacion?.url).toBe('https://api.spotify.com/v1/users/usuario-1/playlists');
    expect(creacion?.cabeceras.Authorization).toBe('Bearer testigo-ficticio');
    expect(creacion?.cabeceras['Content-Type']).toBe('application/json');

    const cuerpo = JSON.parse(creacion?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo).toEqual({
      name: 'Viaje 2026',
      description: 'Carretera',
      public: false,
    });
    expect(JSON.stringify(cuerpo)).not.toContain('collaborative');
  });

  it('con visibilidad pública envía public true', async () => {
    const { fetchSimulado, llamadas } = crearFetchSimulado(reglasCrear(true));
    const gateway = crearPlaylistGateway({ fetchInyectado: fetchSimulado });

    await gateway.crearPlaylist(ENTRADA_PUBLICA);

    const creacion = llamadas.find((llamada) => llamada.metodo === 'POST');
    const cuerpo = JSON.parse(creacion?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo.public).toBe(true);
  });

  it('ante 401 produce error tipado con estado 401 y sin mensajes de usuario', async () => {
    const { fetchSimulado } = crearFetchSimulado([
      { cuandoContenga: '/v1/me', respuesta: () => respuestaJson(401, {}) },
    ]);
    const gateway = crearPlaylistGateway({ fetchInyectado: fetchSimulado });

    const error = await obtenerErrorApi(gateway.crearPlaylist(ENTRADA_PRIVADA));

    expect(error.estado).toBe(401);
    expect(error.message).toBe('HTTP 401');
  });

  it('ante 403 produce error tipado con estado 403', async () => {
    const { fetchSimulado } = crearFetchSimulado([
      { cuandoContenga: '/v1/me', respuesta: () => respuestaJson(403, {}) },
    ]);
    const gateway = crearPlaylistGateway({ fetchInyectado: fetchSimulado });

    const error = await obtenerErrorApi(gateway.crearPlaylist(ENTRADA_PRIVADA));

    expect(error.estado).toBe(403);
    expect(error.message).toBe('HTTP 403');
  });

  it('ante 500 produce error genérico con causa depurada y sin cuerpo de respuesta', async () => {
    const { fetchSimulado } = crearFetchSimulado([
      {
        cuandoContenga: '/v1/me',
        respuesta: () => respuestaJson(500, { detalle: 'secreto-cuerpo-500' }),
      },
    ]);
    const gateway = crearPlaylistGateway({ fetchInyectado: fetchSimulado });

    const error = await obtenerErrorApi(gateway.crearPlaylist(ENTRADA_PRIVADA));

    expect(error.estado).toBe(500);
    expect(error.causa).toBe('HTTP 500');
    expect(error.message).not.toContain('secreto-cuerpo-500');
    expect(error.causa).not.toContain('secreto-cuerpo-500');
  });

  it('ante 429 con Retry-After 7 produce reintentoTras 7', async () => {
    const { fetchSimulado } = crearFetchSimulado([
      {
        cuandoContenga: '/v1/users/usuario-1/playlists',
        respuesta: () => respuestaJson(429, {}, { 'Retry-After': '7' }),
      },
      { cuandoContenga: '/v1/me', respuesta: () => respuestaJson(200, { id: 'usuario-1' }) },
    ]);
    const gateway = crearPlaylistGateway({ fetchInyectado: fetchSimulado });

    const error = await obtenerErrorApi(gateway.crearPlaylist(ENTRADA_PRIVADA));

    expect(error.estado).toBe(429);
    expect(error.reintentoTras).toBe(7);
    expect(error.causa).toBe('HTTP 429');
  });

  it('ante 429 sin cabecera Retry-After deja reintentoTras ausente', async () => {
    const { fetchSimulado } = crearFetchSimulado([
      {
        cuandoContenga: '/v1/users/usuario-1/playlists',
        respuesta: () => respuestaJson(429, {}),
      },
      { cuandoContenga: '/v1/me', respuesta: () => respuestaJson(200, { id: 'usuario-1' }) },
    ]);
    const gateway = crearPlaylistGateway({ fetchInyectado: fetchSimulado });

    const error = await obtenerErrorApi(gateway.crearPlaylist(ENTRADA_PRIVADA));

    expect(error.estado).toBe(429);
    expect(error.reintentoTras).toBeUndefined();
  });

  it('ante 201 con cuerpo inesperado produce error tipado sin identificador', async () => {
    const { fetchSimulado } = crearFetchSimulado(reglasCrear(false));
    const gateway = crearPlaylistGateway({ fetchInyectado: fetchSimulado });

    const error = await obtenerErrorApi(gateway.crearPlaylist(ENTRADA_PRIVADA));

    expect(error.estado).toBe(201);
    expect(error.causa).toBe('HTTP 201');
  });
});

describe('TC-003 listarPlaylistsPropias con red simulada (TASK-002)', () => {
  it('pagina hasta agotar, descarta ajenas y devuelve solo nombres propios', async () => {
    const { fetchSimulado, llamadas } = crearFetchSimulado([
      {
        cuandoContenga: 'offset=50',
        respuesta: () =>
          respuestaJson(200, {
            items: [{ name: 'Música', owner: { id: 'usuario-1' } }],
            next: null,
          }),
      },
      {
        cuandoContenga: '/v1/me/playlists',
        respuesta: () =>
          respuestaJson(200, {
            items: [
              { name: 'Viaje 2026', owner: { id: 'usuario-1' } },
              { name: 'Ajena', owner: { id: 'usuario-2' } },
            ],
            next: 'https://api.spotify.com/v1/me/playlists?limit=50&offset=50',
          }),
      },
      { cuandoContenga: '/v1/me', respuesta: () => respuestaJson(200, { id: 'usuario-1' }) },
    ]);
    const gateway = crearPlaylistGateway({
      fetchInyectado: fetchSimulado,
      obtenerTestigoSesion: () => 'testigo-ficticio',
    });

    const nombres = await gateway.listarPlaylistsPropias();

    expect(nombres).toEqual(['Viaje 2026', 'Música']);
    expect(llamadas).toHaveLength(3);
    for (const llamada of llamadas) {
      expect(llamada.cabeceras.Authorization).toBe('Bearer testigo-ficticio');
    }
  });

  it('sin testigo de sesión produce error tipado 401 sin llamadas de red', async () => {
    const { fetchSimulado, llamadas } = crearFetchSimulado([]);
    const gateway = crearPlaylistGateway({
      fetchInyectado: fetchSimulado,
      obtenerTestigoSesion: () => null,
    });

    const error = await obtenerErrorApi(gateway.listarPlaylistsPropias());

    expect(error.estado).toBe(401);
    expect(llamadas).toHaveLength(0);
  });

  it('ante 401 de Spotify en el listado produce error tipado con estado 401', async () => {
    const { fetchSimulado } = crearFetchSimulado([
      { cuandoContenga: '/v1/me', respuesta: () => respuestaJson(401, {}) },
    ]);
    const gateway = crearPlaylistGateway({
      fetchInyectado: fetchSimulado,
      obtenerTestigoSesion: () => 'testigo-ficticio',
    });

    const error = await obtenerErrorApi(gateway.listarPlaylistsPropias());

    expect(error.estado).toBe(401);
    expect(error.causa).toBe('HTTP 401');
  });
});

describe('Criterios transversales del módulo de Data (RNF-003, TASK-002)', () => {
  it('el módulo no importa de Business ni de Presentation ni usa any ni console', () => {
    const fuente = readFileSync(new URL(`../../../${RUTA_MODULO}`, import.meta.url), 'utf8');
    expect(fuente).not.toMatch(/from\s+['"][^'"]*business/i);
    expect(fuente).not.toMatch(/from\s+['"][^'"]*presentation/i);
    expect(fuente).not.toMatch(/\bany\b/);
    expect(fuente).not.toMatch(/console\./);
  });

  it('el gateway satisface el puerto PlaylistGateway de Business por tipado estructural', () => {
    const { fetchSimulado } = crearFetchSimulado([]);
    const gateway: PlaylistGateway = crearPlaylistGateway({
      fetchInyectado: fetchSimulado,
      obtenerTestigoSesion: () => 'testigo-ficticio',
    });
    expect(gateway.crearPlaylist).toBeDefined();
    expect(gateway.listarPlaylistsPropias).toBeDefined();
  });
});

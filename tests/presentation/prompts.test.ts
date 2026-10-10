import type { Visibilidad } from '@/business/playlists/types.js';
import { MESSAGES } from '@/presentation/messages.js';
import {
  type EleccionDuplicados,
  type EleccionVisibilidad,
  type EntradaPrompt,
  FORMATO_CONFIRMACION,
  type LectorEntrada,
  type OpcionDuplicados,
  confirmarCreacion,
  interpretarConfirmacionS,
  interpretarOpcionDuplicados,
  interpretarVisibilidad,
  promptDescripcionPlaylist,
  promptModificarDescripcion,
  promptNombrePlaylist,
  promptOpcionDuplicados,
  promptVisibilidadPlaylist,
} from '@/presentation/prompts.js';
import { type Mock, describe, expect, it, vi } from 'vitest';

// TC-018 (TASK-012): peticiones, confirmaciones y elecciones del flujo de creación
// de playlist vacía con entrada simulada (doble de readline) y sin teclado real.
// RNF-002: los literales usados son los aprobados en TASK-011 y el formato (s/N).
// BR-007: solo `s` en minúscula confirma; `Ctrl+C` aborta sin crear ni registrar.

type RespuestaProgramada = string | 'ctrl+c';

/** Doble de `readline` que consume respuestas programadas y registra lo pedido. */
function crearLectorDoble(respuestas: readonly RespuestaProgramada[]): LectorEntrada & {
  readonly textos: string[];
} {
  const textos: string[] = [];
  const cola = [...respuestas];
  return {
    textos,
    async leer(texto: string): Promise<EntradaPrompt> {
      textos.push(texto);
      const siguiente = cola.shift();
      if (siguiente === undefined) {
        throw new Error('Doble de readline sin respuestas programadas.');
      }
      if (siguiente === 'ctrl+c') {
        return { estado: 'abortado' };
      }
      return { estado: 'respondido', valor: siguiente };
    },
  };
}

/** Entrada simulada que el doble de creación recibe en el mini-flujo. */
type EntradaCreacionSimulada = {
  nombre: string;
  descripcion: string;
  visibilidad: Visibilidad;
};

/** Doble de efectos secundarios (creación y registro) observables por aserción. */
type EfectosSimulados = {
  crear: Mock<(entrada: EntradaCreacionSimulada) => void>;
  registrar: Mock<() => void>;
};

/** Mini-flujo del coordinador (adelanto de TASK-014) para probar abortos. */
async function ejecutarFlujoCreacion(
  lector: LectorEntrada,
  efectos: EfectosSimulados
): Promise<'abortado' | 'cancelado' | 'creado'> {
  const nombre = await promptNombrePlaylist(lector);
  if (nombre.estado === 'abortado') return 'abortado';
  const descripcion = await promptDescripcionPlaylist(lector);
  if (descripcion.estado === 'abortado') return 'abortado';
  const eleccion = await promptVisibilidadPlaylist(lector);
  if (eleccion.estado === 'abortado') return 'abortado';
  const confirmacion = await confirmarCreacion(lector);
  if (confirmacion.estado === 'abortado') return 'abortado';
  if (!interpretarConfirmacionS(confirmacion.valor)) return 'cancelado';
  efectos.registrar();
  efectos.crear({
    nombre: nombre.valor,
    descripcion: descripcion.valor,
    visibilidad: eleccion.visibilidad,
  });
  return 'creado';
}

function crearEfectos(): EfectosSimulados {
  return {
    crear: vi.fn<(entrada: EntradaCreacionSimulada) => void>(),
    registrar: vi.fn<() => void>(),
  };
}

describe('TC-018 — Peticiones, confirmaciones y elecciones (TASK-012)', () => {
  describe('peticiones literales de nombre y descripción (RNF-002)', () => {
    it('la petición de nombre usa el literal aprobado y devuelve la respuesta en bruto', async () => {
      const doble = crearLectorDoble(['  Viaje 2026  ']);
      const resultado = await promptNombrePlaylist(doble);
      expect(MESSAGES.playlist.namePrompt).toBe('Nombre de la playlist (3-100 caracteres):');
      expect(doble.textos).toEqual([MESSAGES.playlist.namePrompt]);
      // El nombre viaja en bruto hacia la solicitud (SolicitudCreacion); lo recorta Business.
      expect(resultado).toEqual({ estado: 'respondido', valor: '  Viaje 2026  ' });
    });

    it('la petición de descripción usa el literal aprobado', async () => {
      const doble = crearLectorDoble(['Carretera']);
      const resultado = await promptDescripcionPlaylist(doble);
      expect(MESSAGES.playlist.descriptionPrompt).toBe(
        'Descripción (opcional, Enter para usar "Playlist sin descripción"):'
      );
      expect(doble.textos).toEqual([MESSAGES.playlist.descriptionPrompt]);
      expect(resultado).toEqual({ estado: 'respondido', valor: 'Carretera' });
    });

    it('Enter en descripción produce "Playlist sin descripción"', async () => {
      const doble = crearLectorDoble(['']);
      const resultado = await promptDescripcionPlaylist(doble);
      expect(resultado).toEqual({ estado: 'respondido', valor: 'Playlist sin descripción' });
    });

    it('descripción con solo espacios produce el valor por defecto', async () => {
      const doble = crearLectorDoble(['   ']);
      const resultado = await promptDescripcionPlaylist(doble);
      expect(resultado).toEqual({ estado: 'respondido', valor: 'Playlist sin descripción' });
    });
  });

  describe('lista de visibilidad con pública preseleccionada (P-002, BR-005)', () => {
    it('la lista presenta la opción pública como preseleccionada y Enter la elige', async () => {
      const doble = crearLectorDoble(['']);
      const resultado = await promptVisibilidadPlaylist(doble);
      expect(doble.textos[0]).toContain('Pública (preseleccionada)');
      expect(doble.textos[0]).toContain('Privada');
      expect(resultado).toEqual({ estado: 'seleccionada', visibilidad: 'publica' });
    });

    it('"1" elige pública y "2" elige privada, con equivalencia a los indicadores', async () => {
      const publica = await promptVisibilidadPlaylist(crearLectorDoble(['1']));
      expect(publica).toEqual({ estado: 'seleccionada', visibilidad: 'publica' });
      const privada = await promptVisibilidadPlaylist(crearLectorDoble(['2']));
      expect(privada).toEqual({ estado: 'seleccionada', visibilidad: 'privada' });
    });

    it('una elección inválida repite la lista hasta obtener una válida', async () => {
      const doble = crearLectorDoble(['3', 'x', '2']);
      const resultado = await promptVisibilidadPlaylist(doble);
      expect(doble.textos).toHaveLength(3);
      expect(resultado).toEqual({ estado: 'seleccionada', visibilidad: 'privada' });
    });
  });

  describe('confirmación final con formato (s/N) (BR-007, AC-003)', () => {
    it('la confirmación final usa el formato literal (s/N) con espacio final', async () => {
      const doble = crearLectorDoble(['s']);
      await confirmarCreacion(doble);
      expect(FORMATO_CONFIRMACION).toBe('(s/N): ');
      expect(doble.textos).toEqual(['(s/N): ']);
    });

    it('solo "s" en minúscula confirma; "S", "N", vacío u otra respuesta no confirman', () => {
      expect(interpretarConfirmacionS('s')).toBe(true);
      expect(interpretarConfirmacionS('S')).toBe(false);
      expect(interpretarConfirmacionS('N')).toBe(false);
      expect(interpretarConfirmacionS('')).toBe(false);
      expect(interpretarConfirmacionS('no')).toBe(false);
      expect(interpretarConfirmacionS('Si')).toBe(false);
    });

    it('confirmarCreacion devuelve la respuesta cruda para interpretarla con s/N', async () => {
      const casos: ReadonlyArray<RespuestaProgramada> = ['s', 'S', ''];
      for (const entrada of casos) {
        const doble = crearLectorDoble([entrada]);
        const respuesta = await confirmarCreacion(doble);
        expect(respuesta).toEqual({ estado: 'respondido', valor: entrada });
      }
    });
  });

  describe('menú de duplicados aceptando únicamente 0, 1 y 2 (UC-001-A1)', () => {
    it('el menú usa el literal aprobado y devuelve la opción elegida', async () => {
      const doble = crearLectorDoble(['1']);
      const resultado: EleccionDuplicados = await promptOpcionDuplicados(doble);
      expect(MESSAGES.playlist.duplicateMenu).toBe(
        '¿Qué deseas hacer? 1. Modificar nombre 2. Crear de todos modos con el mismo nombre ' +
          '0. Cancelar sin crear / Elige (0-2):'
      );
      expect(doble.textos).toEqual([MESSAGES.playlist.duplicateMenu]);
      expect(resultado).toEqual({ estado: 'elegida', opcion: '1' });
    });

    it('interpreta únicamente 0, 1 y 2; el resto de respuestas no es válido', () => {
      const opciones: ReadonlyArray<OpcionDuplicados> = ['0', '1', '2'];
      for (const opcion of opciones) {
        expect(interpretarOpcionDuplicados(opcion)).toBe(opcion);
      }
      for (const invalida of ['', '3', 'x', '01', 's']) {
        expect(interpretarOpcionDuplicados(invalida)).toBeNull();
      }
    });

    it('una opción inválida repite el menú hasta obtener 0, 1 o 2', async () => {
      const doble = crearLectorDoble(['9', 'x', '0']);
      const resultado: EleccionDuplicados = await promptOpcionDuplicados(doble);
      expect(doble.textos).toHaveLength(3);
      expect(resultado).toEqual({ estado: 'elegida', opcion: '0' });
    });
  });

  describe('pregunta de modificación de descripción y visibilidad (P-004)', () => {
    it('la pregunta usa el literal aprobado y devuelve la respuesta para interpretarla', async () => {
      const doble = crearLectorDoble(['N']);
      const respuesta = await promptModificarDescripcion(doble);
      expect(MESSAGES.playlist.modifyPrompt).toBe(
        '¿Deseas modificar descripción y visibilidad? (s/N): '
      );
      expect(doble.textos).toEqual([MESSAGES.playlist.modifyPrompt]);
      expect(respuesta).toEqual({ estado: 'respondido', valor: 'N' });
    });

    it('"s" afirma y "N" no afirma en la pregunta de modificación', async () => {
      const afirmativa = await promptModificarDescripcion(crearLectorDoble(['s']));
      const negativa = await promptModificarDescripcion(crearLectorDoble(['N']));
      expect(afirmativa.estado === 'respondido' && interpretarConfirmacionS(afirmativa.valor)).toBe(
        true
      );
      expect(negativa.estado === 'respondido' && interpretarConfirmacionS(negativa.valor)).toBe(
        false
      );
    });
  });

  describe('funciones puras de interpretación', () => {
    it('interpretarVisibilidad responde con equivalencia a --public/--private', () => {
      expect(interpretarVisibilidad('')).toBe('publica');
      expect(interpretarVisibilidad('1')).toBe('publica');
      expect(interpretarVisibilidad('2')).toBe('privada');
      expect(interpretarVisibilidad('3')).toBeNull();
      expect(interpretarVisibilidad('x')).toBeNull();
    });

    it('flujo completo: Enter en descripción produce el valor por defecto y "s" confirma', async () => {
      const efectos = crearEfectos();
      const doble = crearLectorDoble([' Viaje 2026 ', '', '', 's']);
      const desenlace = await ejecutarFlujoCreacion(doble, efectos);
      expect(desenlace).toBe('creado');
      expect(efectos.registrar).toHaveBeenCalledTimes(1);
      expect(efectos.crear).toHaveBeenCalledWith({
        nombre: ' Viaje 2026 ',
        descripcion: 'Playlist sin descripción',
        visibilidad: 'publica',
      });
    });

    it('respuesta distinta de "s" en la confirmación cancela sin crear ni registrar', async () => {
      const efectos = crearEfectos();
      const doble = crearLectorDoble(['Viaje 2026', 'Carretera', '2', 'N']);
      const desenlace = await ejecutarFlujoCreacion(doble, efectos);
      expect(desenlace).toBe('cancelado');
      expect(efectos.crear).not.toHaveBeenCalled();
      expect(efectos.registrar).not.toHaveBeenCalled();
    });

    it('las elecciones puras no tienen estado ambiguo', () => {
      const eleccion: EleccionVisibilidad = { estado: 'seleccionada', visibilidad: 'publica' };
      expect(eleccion.visibilidad).toBe('publica');
    });
  });

  describe('Ctrl+C durante cualquier petición aborta sin crear ni registrar (N-002)', () => {
    const casos: ReadonlyArray<[string, readonly RespuestaProgramada[]]> = [
      ['nombre', ['ctrl+c']],
      ['descripción', ['Viaje 2026', 'ctrl+c']],
      ['visibilidad', ['Viaje 2026', '', 'ctrl+c']],
      ['confirmación', ['Viaje 2026', '', '2', 'ctrl+c']],
    ];

    for (const [etiqueta, respuestas] of casos) {
      it(`aborta durante la petición de ${etiqueta} y no crea ni registra`, async () => {
        const efectos = crearEfectos();
        const doble = crearLectorDoble(respuestas);
        const desenlace = await ejecutarFlujoCreacion(doble, efectos);
        expect(desenlace).toBe('abortado');
        expect(efectos.crear).not.toHaveBeenCalled();
        expect(efectos.registrar).not.toHaveBeenCalled();
      });
    }

    it('el menú de duplicados y la pregunta de modificación también abortan ante Ctrl+C', async () => {
      const duplicados = await promptOpcionDuplicados(crearLectorDoble(['ctrl+c']));
      expect(duplicados).toEqual({ estado: 'abortado' });
      const modificacion = await promptModificarDescripcion(crearLectorDoble(['ctrl+c']));
      expect(modificacion).toEqual({ estado: 'abortado' });
    });
  });
});

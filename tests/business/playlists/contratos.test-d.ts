import type {
  CamposRegistro,
  DependenciasCreacion,
  Espera,
  PlaylistGateway,
  RegistroTecnico,
  SesionProveedor,
} from '@/business/playlists/puertos.js';
import type {
  Cancelado,
  DescripcionEfectiva,
  Duplicado,
  EntradaCreacionPlaylist,
  EntradaVisibilidad,
  ErrorValidacion,
  Exito,
  FalloInesperado,
  LimiteAgotado,
  PermisosInsuficientes,
  PlaylistCreada,
  ResultadoCreacion,
  SesionCaducada,
  SesionVigente,
  SinSesion,
  SolicitudCreacion,
  Visibilidad,
} from '@/business/playlists/types.js';
import { describe, expectTypeOf, it } from 'vitest';

type Desenlaces =
  | 'exito'
  | 'errorValidacion'
  | 'duplicado'
  | 'sinSesion'
  | 'sesionCaducada'
  | 'permisosInsuficientes'
  | 'limiteAgotado'
  | 'falloInesperado'
  | 'cancelado';

describe('TC-001 nivel tipo - contratos de dominio y puertos (TASK-001)', () => {
  describe('solicitud y descripción efectiva', () => {
    it('la solicitud expone nombre en bruto, descripción opcional y visibilidad', () => {
      expectTypeOf<SolicitudCreacion['nombre']>().toEqualTypeOf<string>();
      expectTypeOf<SolicitudCreacion['descripcion']>().toEqualTypeOf<string | undefined>();
      expectTypeOf<Visibilidad>().toEqualTypeOf<'publica' | 'privada'>();
      expectTypeOf<'colaborativa'>().not.toExtend<SolicitudCreacion['visibilidad']>();
      // BR-005 y ARCHITECTURE §6.3: la ausencia o la doble presencia viaja a Business
      // para que este produzca ErrorValidacion de visibilidad.
      expectTypeOf<SolicitudCreacion['visibilidad']>().toEqualTypeOf<EntradaVisibilidad>();
      expectTypeOf<EntradaVisibilidad>().toEqualTypeOf<Visibilidad | 'ausente' | 'doble'>();
      expectTypeOf<DescripcionEfectiva>().toEqualTypeOf<string>();
    });
  });

  describe('resultado de creación', () => {
    it('es una unión discriminada con exactamente los 9 desenlaces', () => {
      expectTypeOf<ResultadoCreacion['resultado']>().toEqualTypeOf<Desenlaces>();
      expectTypeOf<Extract<ResultadoCreacion, { resultado: 'exito' }>>().toEqualTypeOf<Exito>();
      expectTypeOf<
        Extract<ResultadoCreacion, { resultado: 'errorValidacion' }>
      >().toEqualTypeOf<ErrorValidacion>();
      expectTypeOf<
        Extract<ResultadoCreacion, { resultado: 'duplicado' }>
      >().toEqualTypeOf<Duplicado>();
      expectTypeOf<
        Extract<ResultadoCreacion, { resultado: 'sinSesion' }>
      >().toEqualTypeOf<SinSesion>();
      expectTypeOf<
        Extract<ResultadoCreacion, { resultado: 'sesionCaducada' }>
      >().toEqualTypeOf<SesionCaducada>();
      expectTypeOf<
        Extract<ResultadoCreacion, { resultado: 'permisosInsuficientes' }>
      >().toEqualTypeOf<PermisosInsuficientes>();
      expectTypeOf<
        Extract<ResultadoCreacion, { resultado: 'limiteAgotado' }>
      >().toEqualTypeOf<LimiteAgotado>();
      expectTypeOf<
        Extract<ResultadoCreacion, { resultado: 'falloInesperado' }>
      >().toEqualTypeOf<FalloInesperado>();
      expectTypeOf<
        Extract<ResultadoCreacion, { resultado: 'cancelado' }>
      >().toEqualTypeOf<Cancelado>();
    });

    it('cada desenlace es estrechable hasta la unión', () => {
      expectTypeOf<Exito>().toExtend<ResultadoCreacion>();
      expectTypeOf<ErrorValidacion>().toExtend<ResultadoCreacion>();
      expectTypeOf<Duplicado>().toExtend<ResultadoCreacion>();
      expectTypeOf<SinSesion>().toExtend<ResultadoCreacion>();
      expectTypeOf<SesionCaducada>().toExtend<ResultadoCreacion>();
      expectTypeOf<PermisosInsuficientes>().toExtend<ResultadoCreacion>();
      expectTypeOf<LimiteAgotado>().toExtend<ResultadoCreacion>();
      expectTypeOf<FalloInesperado>().toExtend<ResultadoCreacion>();
      expectTypeOf<Cancelado>().toExtend<ResultadoCreacion>();
    });

    it('Exito lleva identificador y enlace junto a los datos del mensaje de éxito', () => {
      expectTypeOf<Exito['identificador']>().toEqualTypeOf<string>();
      expectTypeOf<Exito['enlace']>().toEqualTypeOf<string>();
      expectTypeOf<Exito['nombreEfectivo']>().toEqualTypeOf<string>();
      expectTypeOf<Exito['visibilidad']>().toEqualTypeOf<Visibilidad>();
      expectTypeOf<Exito['descripcionEfectiva']>().toEqualTypeOf<DescripcionEfectiva>();
      expectTypeOf<ErrorValidacion['campo']>().toEqualTypeOf<'nombre' | 'visibilidad'>();
      expectTypeOf<Duplicado['nombreEfectivo']>().toEqualTypeOf<string>();
      expectTypeOf<FalloInesperado['causa']>().toEqualTypeOf<string>();
    });
  });

  describe('puertos de ARCHITECTURE §5', () => {
    it('exponen las operaciones exigidas con las firmas previstas', () => {
      expectTypeOf<SesionProveedor['obtenerSesionVigente']>().toEqualTypeOf<
        () => Promise<SesionVigente | null>
      >();
      expectTypeOf<PlaylistGateway['crearPlaylist']>().toEqualTypeOf<
        (entrada: EntradaCreacionPlaylist) => Promise<PlaylistCreada>
      >();
      expectTypeOf<PlaylistGateway['listarPlaylistsPropias']>().toEqualTypeOf<
        () => Promise<string[]>
      >();
      expectTypeOf<RegistroTecnico['info']>().toEqualTypeOf<
        (mensaje: string, campos?: CamposRegistro) => void
      >();
      expectTypeOf<RegistroTecnico['advertencia']>().toEqualTypeOf<
        (mensaje: string, campos?: CamposRegistro) => void
      >();
      expectTypeOf<RegistroTecnico['error']>().toEqualTypeOf<
        (mensaje: string, campos?: CamposRegistro) => void
      >();
      expectTypeOf<Espera['esperar']>().toEqualTypeOf<(milisegundos: number) => Promise<void>>();
    });

    it('los cuatro puertos son consumibles por el caso de uso', () => {
      const dependencias: DependenciasCreacion = {
        sesionProveedor: { obtenerSesionVigente: async () => null },
        playlistGateway: {
          crearPlaylist: async () => ({
            identificador: 'id-ficticio',
            enlace: 'https://open.spotify.com/playlist/id-ficticio',
          }),
          listarPlaylistsPropias: async () => [],
        },
        registroTecnico: {
          info: () => {},
          advertencia: () => {},
          error: () => {},
        },
        espera: { esperar: async () => {} },
      };

      expectTypeOf(dependencias).toExtend<DependenciasCreacion>();
    });
  });
});

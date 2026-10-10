/**
 * Primitivas de verificación transversal de TC-028 (TASK-020).
 *
 * Trazabilidad: `OBJ-001 → RNF-001, RNF-003, RNF-005 → UC-001 → AC-001,
 * AC-002, AC-003, AC-004, AC-005 → TASK-020 → TC-028`.
 *
 * El módulo es exclusivamente de pruebas: mecanismos de lectura, búsqueda de
 * patrones de testigo, revisión de imports por capas y ejecución de las
 * herramientas de calidad (`tsc` y Biome) invocando sus ficheros ya instalados,
 * sin dependencias nuevas y sin red (RNF-004, RNF-005). Las expectativas
 * viven en `tests/transversal/verificacion-rnf.test.ts`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Patrón de testigo, cabecera o credencial con su descripción. */
interface PatronTestigo {
  readonly descripcion: string;
  readonly patron: RegExp;
}

/**
 * Patrones de testigo (RNF-001): valores reales de token, cabeceras con
 * credencial y testigos JWT. Se definen sobre el valor —no sobre la clave— de
 * modo que las declaraciones de tipos (`access_token: string`) o el texto
 * técnico «Opening browser for authorization» no producen falsos positivos.
 */
const PATRONES_TESTIGO: readonly PatronTestigo[] = [
  {
    descripcion: 'campo de token con valor',
    patron: /"(access_token|refresh_token|id_token)"\s*:\s*"[^"]{8,}"/g,
  },
  { descripcion: 'testigo bearer largo', patron: /\bbearer\s+[A-Za-z0-9_-]{16,}/gi },
  {
    descripcion: 'cabecera authorization con testigo',
    patron: /\bauthorization\s*:\s*"?bearer\s+[A-Za-z0-9_-]{8,}/gi,
  },
  { descripcion: 'cabecera set-cookie', patron: /\bset-cookie\s*:\s*[^,;\n]+/gi },
  {
    descripcion: 'testigo JWT',
    patron: /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g,
  },
];

/**
 * Busca patrones de testigo en un texto y describe cada coincidencia sin
 * reproducir su valor: el diagnóstico jamás imprime un secreto (RNF-001).
 */
export function buscarTestigos(texto: string): string[] {
  const coincidencias: string[] = [];
  for (const { descripcion, patron } of PATRONES_TESTIGO) {
    const copia = new RegExp(patron.source, patron.flags);
    for (const coincidencia of texto.matchAll(copia)) {
      coincidencias.push(`${descripcion} en posición ${coincidencia.index ?? 0}`);
    }
  }
  return coincidencias;
}

/** Ficheros recursivos con alguna de las extensiones indicadas. Directorio ausente → []. */
export function listarFicheros(ruta: string, extensiones: readonly string[]): string[] {
  if (!existe(ruta)) {
    return [];
  }
  const ficheros: string[] = [];
  for (const entrada of readdirSync(ruta, { withFileTypes: true })) {
    const completa = join(ruta, entrada.name);
    if (entrada.isDirectory()) {
      ficheros.push(...listarFicheros(completa, extensiones));
    } else if (extensiones.some((extension) => entrada.name.endsWith(extension))) {
      ficheros.push(completa);
    }
  }
  return ficheros;
}

/** Ficheros `.ts` recursivos de un directorio con su contenido. Directorio ausente → []. */
export function fuentesDe(ruta: string): { readonly nombre: string; readonly contenido: string }[] {
  return listarFicheros(ruta, ['.ts']).map((fichero) => ({
    nombre: fichero,
    contenido: leerFichero(fichero),
  }));
}

/** Contenido UTF-8 de un fichero. */
export function leerFichero(ruta: string): string {
  return readFileSync(ruta, 'utf8');
}

function existe(ruta: string): boolean {
  try {
    return statSync(ruta).isDirectory();
  } catch {
    return false;
  }
}

/** Infracción detectada en una regla de capas. */
export interface Infraccion {
  readonly fichero: string;
  readonly motivo: string;
}

/** Regla sobre los módulos importados por un fichero. */
interface ReglaImport {
  readonly motivo: string;
  readonly prohibido: RegExp;
}

/** Regla sobre el contenido completo de un fichero. */
interface ReglaContenido {
  readonly motivo: string;
  readonly prohibido: RegExp;
}

const REGLAS_NEGOCIO: readonly ReglaImport[] = [
  { motivo: 'importa Presentation', prohibido: /(^|\/)presentation(\/|$)/ },
  { motivo: 'importa el punto de entrada CLI', prohibido: /(^|\/)cli(-main)?(\.|$)/ },
  { motivo: 'importa el paquete Pino', prohibido: /^pino(-pretty)?$/ },
];

const REGLAS_NEGOCIO_CONTENIDO: readonly ReglaContenido[] = [
  { motivo: 'escribe en consola', prohibido: /\bconsole\./ },
  { motivo: 'lee argv o termina el proceso', prohibido: /\bprocess\.(argv|exit)\b/ },
];

const REGLAS_MODULOS_CREACION: readonly ReglaImport[] = [
  { motivo: 'importa Presentation', prohibido: /presentation/ },
  { motivo: 'importa el punto de entrada CLI', prohibido: /cli/ },
  { motivo: 'importa Pino o pino-setup', prohibido: /pino/ },
  { motivo: 'importa Data', prohibido: /(^|\/)data\// },
  { motivo: 'importa el sistema', prohibido: /^node:/ },
];

const REGLAS_MODULOS_CREACION_CONTENIDO: readonly ReglaContenido[] = [
  { motivo: 'usa fetch directamente', prohibido: /\bfetch\s*\(/ },
  { motivo: 'usa process', prohibido: /\bprocess\./ },
  { motivo: 'usa consola', prohibido: /\bconsole\./ },
  { motivo: 'lee argv o readline', prohibido: /\b(argv|readline)\b/ },
  { motivo: 'declara any', prohibido: /\bany\b/ },
];

const REGLAS_DATOS: readonly ReglaImport[] = [
  { motivo: 'importa Presentation', prohibido: /(^|\/)presentation(\/|$)/ },
  { motivo: 'importa Business', prohibido: /(^|\/)business(\/|$)/ },
  { motivo: 'importa el punto de entrada CLI', prohibido: /(^|\/)cli(-main)?(\.|$)/ },
];

const REGLAS_DATOS_CONTENIDO: readonly ReglaContenido[] = [
  { motivo: 'decide longitud o duplicados', prohibido: /\bes(LongitudValida|DuplicadoPropio)\b/ },
  {
    motivo: 'conoce el canal de confirmación',
    prohibido: /\b(canalConfirmacion|duplicadoAceptado)\b/,
  },
];

const REGLAS_PRESENTACION: readonly ReglaImport[] = [
  { motivo: 'importa ficheros del sistema', prohibido: /^node:(fs|child_process|fs\/)/ },
];

const REGLAS_PRESENTACION_CONTENIDO: readonly ReglaContenido[] = [
  {
    motivo: 'define o invoca reglas de validación propias',
    prohibido: /\bes(LongitudValida|DuplicadoPropio)\b/,
  },
  { motivo: 'contiene la política de reintentos', prohibido: /\bwithRetry\b|\bRetry-After\b/ },
  { motivo: 'mapea estados HTTP', prohibido: /\b(401|403|429)\b/ },
];

function modulosImportados(contenido: string): string[] {
  const modulos: string[] = [];
  const expresiones = [/\bfrom\s*['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g];
  for (const expresion of expresiones) {
    for (const coincidencia of contenido.matchAll(new RegExp(expresion.source, expresion.flags))) {
      const origen = coincidencia[1];
      if (origen !== undefined) {
        modulos.push(origen);
      }
    }
  }
  return modulos;
}

function infraccionesDeImports(
  fuente: { readonly nombre: string; readonly contenido: string },
  reglas: readonly ReglaImport[]
): Infraccion[] {
  const infracciones: Infraccion[] = [];
  for (const origen of modulosImportados(fuente.contenido)) {
    for (const regla of reglas) {
      if (regla.prohibido.test(origen)) {
        infracciones.push({ fichero: fuente.nombre, motivo: `${regla.motivo}: ${origen}` });
      }
    }
  }
  return infracciones;
}

function infraccionesDeContenido(
  fuente: { readonly nombre: string; readonly contenido: string },
  reglas: readonly ReglaContenido[]
): Infraccion[] {
  return reglas
    .filter((regla) => regla.prohibido.test(fuente.contenido))
    .map((regla) => ({ fichero: fuente.nombre, motivo: regla.motivo }));
}

function revisar(
  fuentes: readonly { readonly nombre: string; readonly contenido: string }[],
  reglasImport: readonly ReglaImport[],
  reglasContenido: readonly ReglaContenido[]
): Infraccion[] {
  const infracciones: Infraccion[] = [];
  for (const fuente of fuentes) {
    infracciones.push(...infraccionesDeImports(fuente, reglasImport));
    infracciones.push(...infraccionesDeContenido(fuente, reglasContenido));
  }
  return infracciones;
}

/** Business global: sin Presentation, sin CLI, sin Pino directo ni consola (RNF-003). */
export function revisarBusiness(raiz: string): Infraccion[] {
  return revisar(
    fuentesDe(join(raiz, 'src', 'business')),
    REGLAS_NEGOCIO,
    REGLAS_NEGOCIO_CONTENIDO
  );
}

/** Módulos de la creación: además sin Data, sin sistema y sin `argv`, `readline` o `any`. */
export function revisarModulosCreacion(raiz: string): Infraccion[] {
  return revisar(
    fuentesDe(join(raiz, 'src', 'business', 'playlists')),
    REGLAS_MODULOS_CREACION,
    REGLAS_MODULOS_CREACION_CONTENIDO
  );
}

/** Data: encapsula efectos sin decisiones de dominio ni dependencias invertidas. */
export function revisarDatos(raiz: string): Infraccion[] {
  return revisar(fuentesDe(join(raiz, 'src', 'data')), REGLAS_DATOS, REGLAS_DATOS_CONTENIDO);
}

/** Presentation: coordina sin reglas propias de validación, duplicados ni reintentos. */
export function revisarPresentacion(raiz: string): Infraccion[] {
  return revisar(
    fuentesDe(join(raiz, 'src', 'presentation')),
    REGLAS_PRESENTACION,
    REGLAS_PRESENTACION_CONTENIDO
  );
}

/** Resultado de la ejecución de una herramienta de calidad. */
export interface ResultadoHerramienta {
  readonly codigo: number;
  readonly salida: string;
}

function codigoDeError(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const estado = (error as { status?: unknown }).status;
    if (typeof estado === 'number') {
      return estado;
    }
  }
  return -1;
}

function textoDeError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const detalle = error as { stdout?: unknown; stderr?: unknown; message?: unknown };
    const trozos = [detalle.stdout, detalle.stderr].filter(
      (trozo): trozo is string => typeof trozo === 'string' && trozo.trim() !== ''
    );
    if (trozos.length > 0) {
      return trozos.join('');
    }
    if (typeof detalle.message === 'string') {
      return detalle.message;
    }
  }
  return String(error);
}

function ejecutar(ruta: string, argumentos: readonly string[], raiz: string): ResultadoHerramienta {
  try {
    const salida = execFileSync(ruta, [...argumentos], {
      cwd: raiz,
      encoding: 'utf8',
      stdio: 'pipe',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { codigo: 0, salida: String(salida) };
  } catch (error) {
    return { codigo: codigoDeError(error), salida: textoDeError(error) };
  }
}

/** `tsc --noEmit` con cada configuración indicada, en el árbol del proyecto (RNF-005). */
export function ejecutarTypeScript(
  raiz: string,
  configuraciones: readonly string[]
): ResultadoHerramienta {
  const tsc = join(raiz, 'node_modules', 'typescript', 'bin', 'tsc');
  const argumentos = configuraciones.flatMap((configuracion) => ['-p', configuracion]);
  return ejecutar(process.execPath, [tsc, ...argumentos, '--noEmit'], raiz);
}

/** `biome check` sobre las rutas indicadas con la configuración del repositorio (RNF-005). */
export function ejecutarBiome(raiz: string, rutas: readonly string[]): ResultadoHerramienta {
  const biome = join(raiz, 'node_modules', '@biomejs', 'biome', 'bin', 'biome');
  return ejecutar(process.execPath, [biome, 'check', ...rutas], raiz);
}

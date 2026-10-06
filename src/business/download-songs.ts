import { fetchAllSavedTracks } from '../data/download-songs.service.js';
import { getStoredTokens } from './auth/tokens.js';

export interface DownloadSongsOptions {
  outputDir?: string;
}

export interface DownloadResult {
  success: boolean;
  filePath: string;
  totalTracks: number;
  error?: string;
}

export async function downloadSongs(options: DownloadSongsOptions): Promise<DownloadResult> {
  const tokens = getStoredTokens();

  if (!tokens) {
    return {
      success: false,
      filePath: '',
      totalTracks: 0,
      error: 'No hay tokens guardados. Ejecuta "spoty connect" primero.',
    };
  }

  if (!tokens.scope.includes('user-library-read')) {
    return {
      success: false,
      filePath: '',
      totalTracks: 0,
      error:
        'El token no tiene el scope "user-library-read". Ejecuta "spoty connect" con los permisos adecuados.',
    };
  }

  try {
    const tracks = await fetchAllSavedTracks(tokens.access_token);

    // Transform tracks to output JSON structure
    const totalTracks = tracks.length;
    const datePrefix = new Date().toISOString().split('T')[0];
    const filename = `${datePrefix}-download_songs.json`;
    const filePath = options.outputDir
      ? `${options.outputDir}/${filename}`
      : `${process.cwd()}/${filename}`;

    return {
      success: true,
      filePath,
      totalTracks,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido durante la descarga';
    return { success: false, filePath: '', totalTracks: 0, error: msg };
  }
}

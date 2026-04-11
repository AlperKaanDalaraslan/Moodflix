/**
 * TMDB credentials come from the project root ".env" (see .env.example).
 * Never commit ".env"; rotate keys if they are ever exposed.
 */
import {TMDB_API_KEY as envKey} from '@env';

export const TMDB_API_KEY = (envKey || '').trim();

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

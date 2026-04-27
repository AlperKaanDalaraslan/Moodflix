/**
 * TMDB (filmler / keşif / görseller) — Moodflix backend’inden ayrıdır.
 * Metro: shims/@env (scripts/write-env-shim.js). ".env" commitlenmez.
 */
import {TMDB_API_BASE_URL as envBase, TMDB_API_KEY as envKey} from '@env';

export const TMDB_API_KEY = (envKey || '').trim();

const DEFAULT_API = 'https://api.themoviedb.org/3';
const baseRaw = (envBase || '').trim().replace(/\/$/, '');
/** TMDB REST v3 kökü (path’ler /movie/... ile birleşir). */
export const TMDB_API_BASE = baseRaw || DEFAULT_API;

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

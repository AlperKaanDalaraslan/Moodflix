declare module '@env' {
  export const TMDB_API_KEY: string | undefined;
  /** Boşsa varsayılan TMDB v3 kökü kullanılır. */
  export const TMDB_API_BASE_URL: string | undefined;
  export const MOODFLIX_API_BASE_URL: string | undefined;
  /** Varsayılan /api/auth — backend farklı mount kullanıyorsa değiştir. */
  export const MOODFLIX_AUTH_API_PREFIX: string | undefined;
  /** Varsayılan /api/profile — sunucu sadece /profile kullanıyorsa `/profile` ver. */
  export const MOODFLIX_PROFILE_API_PREFIX: string | undefined;
}

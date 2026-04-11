/** Shared elevation for a premium, readable dark UI (iOS shadow + Android elevation). */
export const shadow = {
  /** Posters and media thumbnails */
  poster: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 12,
  },
  /** Hero CTAs and primary blocks */
  hero: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
  },
  /** Tab bar separation from content */
  tabBar: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 24,
  },
  /** Cards and inputs */
  soft: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
};

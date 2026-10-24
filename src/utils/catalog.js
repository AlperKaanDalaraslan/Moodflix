import {t} from '../i18n/translations';

export function mediaTypeOf(item) {
  return item?.media_type === 'tv' ? 'tv' : 'movie';
}

export function catalogKey(item) {
  if (!item || typeof item !== 'object') {
    return '';
  }
  const id = item.id ?? item.movieId ?? item.movie_id;
  if (id == null || id === '') {
    return '';
  }
  return `${mediaTypeOf(item)}:${id}`;
}

export function kindLabel(item, locale) {
  const blob = `${item?.title || ''} ${item?.original_title || ''} ${item?.name || ''}`.toLowerCase();
  const genres = item?.genre_ids || [];
  if (genres.includes(99)) {
    return t(locale, 'kindDoc');
  }
  if (/\bshort\b|kısa film/.test(blob)) {
    return t(locale, 'kindShort');
  }
  if (mediaTypeOf(item) === 'tv') {
    return t(locale, 'kindSeries');
  }
  return t(locale, 'kindMovie');
}

export function openTitle(navigation, item) {
  const id = Number(item?.id ?? item?.movieId);
  if (!navigation || !Number.isFinite(id)) {
    return;
  }
  navigation.navigate('MovieDetail', {
    movieId: id,
    mediaType: mediaTypeOf(item),
  });
}

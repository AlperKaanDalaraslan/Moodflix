import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {fetchWatchOffers} from '../api/watchOffers';
import {t} from '../i18n/translations';

const KIND_RANK = {included: 0, free: 1, rent: 2, buy: 3, cinema: 4};

function useWatchOffers(movie, locale) {
  const id = movie?.id;
  const mediaType = movie?.media_type === 'tv' ? 'tv' : 'movie';
  const title = movie?.title || movie?.name || '';
  const originalTitle = movie?.original_title || movie?.original_name || '';
  const releaseDate = movie?.release_date || movie?.first_air_date || '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({status: 'loading', summary: null});

  useEffect(() => {
    if (id == null) {
      setState({status: 'empty', summary: null});
      return undefined;
    }
    let cancelled = false;
    setState({status: 'loading', summary: null});
    fetchWatchOffers({
      id,
      mediaType,
      title,
      originalTitle,
      releaseDate,
      locale,
      fresh: attempt > 0,
    })
      .then(summary => {
        if (cancelled) {
          return;
        }
        setState({
          status: summary.offers.length ? 'ready' : 'empty',
          summary,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({status: 'error', summary: null});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, id, locale, mediaType, originalTitle, releaseDate, title]);

  return {...state, retry: () => setAttempt(value => value + 1)};
}

export function uniquePlatforms(offers) {
  const byName = new Map();
  for (const offer of offers || []) {
    if (!offer?.name) {
      continue;
    }
    const prev = byName.get(offer.name);
    if (!prev || (KIND_RANK[offer.kind] ?? 9) < (KIND_RANK[prev.kind] ?? 9)) {
      byName.set(offer.name, offer);
    }
  }
  return [...byName.values()].sort(
    (a, b) =>
      (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9) ||
      a.name.localeCompare(b.name),
  );
}

export function watchLine(_locale, summary) {
  return uniquePlatforms(summary?.offers).map(offer => offer.name).slice(0, 4).join(' · ');
}

function ProviderLogo({uri, name, colors}) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[styles.logoFallback, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        <Text style={[styles.logoLetter, {color: colors.text}]}>{String(name || '?').slice(0, 1)}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{uri}}
      style={styles.logo}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

async function openOffer(url) {
  if (!url) {
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    /* mağaza linki açılamadı */
  }
}

function PlatformRow({offer, locale, colors}) {
  const body = (
    <View style={styles.row}>
      <ProviderLogo uri={offer.icon} name={offer.name} colors={colors} />
      <Text numberOfLines={1} style={[styles.rowName, {color: colors.text}]}>
        {offer.name}
      </Text>
      {offer.url ? <Text style={[styles.open, {color: colors.primary}]}>{t(locale, 'watchOpen')}</Text> : null}
    </View>
  );
  if (!offer.url) {
    return body;
  }
  return (
    <Pressable onPress={() => { openOffer(offer.url); }} accessibilityRole="link">
      {body}
    </Pressable>
  );
}

export function WatchPriceLine({movie, locale, colors, lines = 1}) {
  const {status, summary} = useWatchOffers(movie, locale);
  if (status === 'loading') {
    return (
      <Text numberOfLines={1} style={[styles.compact, {color: colors.textMuted}]}>
        {t(locale, 'watchLoading')}
      </Text>
    );
  }
  const line = watchLine(locale, summary);
  if (!line) {
    return null;
  }
  return (
    <Text numberOfLines={lines} style={[styles.compact, {color: colors.primary}]}>
      {line}
    </Text>
  );
}

export function WhereToWatch({movie, locale, colors}) {
  const {status, summary, retry} = useWatchOffers(movie, locale);
  const platforms = status === 'ready' ? uniquePlatforms(summary.offers) : [];

  return (
    <View style={[styles.card, {backgroundColor: colors.surfaceElevated, borderColor: colors.border}]}>
      <Text style={[styles.kicker, {color: colors.primary}]}>{t(locale, 'whereToWatch')}</Text>
      <Text style={[styles.lead, {color: colors.textMuted}]}>{t(locale, 'whereToWatchLead')}</Text>

      {status === 'loading' ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.textMuted}]}>{t(locale, 'watchLoading')}</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View>
          <Text style={[styles.empty, {color: colors.text}]}>{t(locale, 'watchError')}</Text>
          <Pressable
            onPress={retry}
            style={[styles.retry, {backgroundColor: colors.primary}]}>
            <Text style={[styles.retryText, {color: colors.onPrimary}]}>{t(locale, 'tryAgain')}</Text>
          </Pressable>
        </View>
      ) : null}

      {status === 'empty' ? (
        <Text style={[styles.empty, {color: colors.text}]}>{t(locale, 'watchEmpty')}</Text>
      ) : null}

      {platforms.map(offer => (
        <PlatformRow key={offer.name} offer={offer} locale={locale} colors={colors} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  kicker: {fontSize: 13, fontWeight: '900', letterSpacing: 0.4},
  lead: {marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '600'},
  loadingRow: {flexDirection: 'row', alignItems: 'center', marginTop: 14},
  loadingText: {marginLeft: 10},
  empty: {marginTop: 12, fontSize: 15, fontWeight: '700', lineHeight: 21},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10},
  logo: {width: 36, height: 36, borderRadius: 8},
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {fontWeight: '900'},
  rowName: {flex: 1, fontSize: 15, fontWeight: '800'},
  open: {fontSize: 12, fontWeight: '800'},
  retry: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryText: {fontWeight: '800'},
  compact: {marginTop: 4, fontSize: 13, fontWeight: '800'},
});

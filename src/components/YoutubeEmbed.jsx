import React, {useMemo} from 'react';
import {ActivityIndicator, Platform, StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';

/** Permissions YouTube’s iframe expects; missing `allow` often triggers error 153 in WKWebView. */
const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';

/** YouTube IDs from TMDB are [A-Za-z0-9_-]; reject anything else for safe HTML. */
function sanitizeVideoId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{6,64}$/.test(id)) {
    return null;
  }
  return id;
}

function buildEmbedHtml(videoId, {autoPlay, muted, controls, cinemaMode, coverZoom, loop}) {
  const q = ['playsinline=1', 'rel=0', 'modestbranding=1', 'iv_load_policy=3', `controls=${controls ? '1' : '0'}`];
  /** Tek videoda loop için playlist aynı id olmalı; bitişte replay/end ekranında takılmayı azaltır */
  if (loop) {
    q.push('loop=1');
    q.push(`playlist=${videoId}`);
  }
  if (cinemaMode) {
    /** Daha sade tam ekran: altyazı varsayılan kapalı, ince beyaz scrubber */
    q.push('cc_load_policy=0');
    q.push('color=white');
  }
  if (autoPlay) {
    q.push('autoplay=1');
  }
  if (muted) {
    q.push('mute=1');
  }
  const qs = q.join('&');
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?${qs}`;
  const wCss = coverZoom
    ? '.w { position: fixed; inset: 0; overflow: hidden; background: #000; }'
    : '.w { position: fixed; inset: 0; }';
  const iframeCss = coverZoom
    ? 'iframe { position: absolute; border: 0; top: 50%; left: 50%; width: 100%; height: 100%; transform: translate(-50%, calc(-50% + 2%)) scale(1.045); transform-origin: center center; }'
    : 'iframe { display: block; width: 100%; height: 100%; border: 0; }';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0; background: #000; height: 100%; width: 100%; }
    ${wCss}
    ${iframeCss}
  </style>
</head>
<body>
  <div class="w">
    <iframe
      src="${src}"
      allow="${IFRAME_ALLOW}"
      allowfullscreen
    ></iframe>
  </div>
</body>
</html>`;
}

/** Mobile Safari–like UA: bare WKWebView user agent can make YouTube return error 153. */
const WEBVIEW_UA = Platform.select({
  ios:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  default: undefined,
});

/**
 * In-app YouTube playback via official embed (no external app handoff).
 * @param {boolean} passThroughTouches — Kaydır kartı: WebView dokunmaz (pan üstte), üstte şeffaf kalkan YouTube’un tıklanıp durmasını engeller.
 * @param {boolean} flexLayout — Modal gibi ortamlarda WebView’a flex ver (absoluteFill yükseklik 0 kalabiliyor).
 * @param {boolean} cinemaMode — Fragman modu: daha az YouTube kromu (cc_load_policy, scrubber rengi).
 * @param {boolean} coverZoom — Kaydır kartı: iframe hafif büyütülür, iç letterbox azalır (taşan kırpılır).
 * @param {boolean} loop — Bittiğinde YouTube son ekranında kalmaması için (playlist=aynı id gerekir).
 * @param {() => void} onShellLoadEnd — Kaydır kartı: ebeveyn tek spinner göstersin diye WebView yüklendiğinde (veya hata).
 */
export function YoutubeEmbed({
  videoId,
  style,
  autoPlay = true,
  muted = true,
  controls = true,
  passThroughTouches = false,
  flexLayout = false,
  cinemaMode = false,
  coverZoom = false,
  loop = false,
  onShellLoadEnd,
}) {
  const safeId = sanitizeVideoId(videoId);
  const html = useMemo(() => {
    if (!safeId) {
      return null;
    }
    return buildEmbedHtml(safeId, {autoPlay, muted, controls, cinemaMode, coverZoom, loop});
  }, [autoPlay, cinemaMode, controls, coverZoom, loop, muted, safeId]);

  if (!safeId || !html) {
    return null;
  }

  const webStyle = flexLayout ? styles.webFlex : styles.web;
  const hideWebViewSpinner = Boolean(onShellLoadEnd);

  return (
    <View
      style={[styles.wrap, style]}
      pointerEvents={passThroughTouches ? 'box-none' : 'auto'}
      collapsable={false}>
      <WebView
        source={{html, baseUrl: 'https://www.youtube-nocookie.com'}}
        style={webStyle}
        startInLoadingState={!hideWebViewSpinner}
        renderLoading={
          hideWebViewSpinner
            ? undefined
            : () => (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color="#888" size="large" />
                </View>
              )
        }
        onLoadEnd={() => {
          onShellLoadEnd?.();
        }}
        onError={() => {
          onShellLoadEnd?.();
        }}
        userAgent={WEBVIEW_UA}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo={!passThroughTouches}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        originWhitelist={['https://*', 'http://*']}
        setSupportMultipleWindows={false}
        pointerEvents={passThroughTouches ? 'none' : 'auto'}
        mixedContentMode="compatibility"
        cacheEnabled
        setBuiltInZoomControls={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
      {passThroughTouches ? <View style={styles.touchShield} pointerEvents="auto" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  web: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  /** Modal gibi flex ebeveynlerde absoluteFill yükseklik üretmeyebilir */
  webFlex: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** WKWebView iframe tıklamasını yutar; kaydırma üst ebeveyndeki PanResponder’da kalır */
  touchShield: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 3,
  },
});

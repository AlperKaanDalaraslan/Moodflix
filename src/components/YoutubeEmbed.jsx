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

function buildEmbedHtml(videoId, {autoPlay, muted, controls, cinemaMode, coverZoom, loop, captionsOn, captionLang}) {
  const q = [
    'playsinline=1',
    'rel=0',
    'modestbranding=1',
    'iv_load_policy=3',
    'fs=0',
    'disablekb=1',
    `controls=${controls ? '1' : '0'}`,
  ];
  if (loop) {
    q.push('loop=1');
    q.push(`playlist=${videoId}`);
  }
  if (captionsOn) {
    q.push('cc_load_policy=1');
    if (captionLang) {
      q.push(`cc_lang_pref=${encodeURIComponent(captionLang)}`);
      q.push(`hl=${encodeURIComponent(captionLang)}`);
    }
  } else if (cinemaMode) {
    q.push('cc_load_policy=0');
  }
  q.push('color=white');
  if (autoPlay) {
    q.push('autoplay=1');
  }
  if (muted) {
    q.push('mute=1');
  }
  const qs = q.join('&');
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?${qs}`;
  const wCss = '.w { position: fixed; inset: 0; overflow: hidden; background: #000; }';
  /** Kırpma yok: büyütmek kareyi kesiyor. “Diğer videolar” masaüstü UA ile kapanır. */
  const iframeCss =
    'iframe { display: block; width: 100%; height: 100%; border: 0; }';
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

/** Kaydır kartı: oynatma başlayana kadar YouTube’un kendi bekleme karesi görünmesin. */
function buildPlaybackHtml(videoId, {autoPlay, muted, controls, loop, captionsOn, captionLang}) {
  const playerVars = {
    playsinline: 1,
    rel: 0,
    modestbranding: 1,
    iv_load_policy: 3,
    fs: 0,
    disablekb: 1,
    controls: controls ? 1 : 0,
    autoplay: autoPlay ? 1 : 0,
    mute: muted ? 1 : 0,
    origin: 'https://www.youtube-nocookie.com',
  };
  if (loop) {
    playerVars.loop = 1;
    playerVars.playlist = videoId;
  }
  if (captionsOn) {
    playerVars.cc_load_policy = 1;
    if (captionLang) {
      playerVars.cc_lang_pref = captionLang;
      playerVars.hl = captionLang;
    }
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0; background: #000; height: 100%; width: 100%; overflow: hidden; }
    #player { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    #player iframe {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      width: 100% !important;
      height: 100% !important;
      min-width: 100% !important;
      min-height: 100% !important;
      transform: translate(-50%, -50%) scale(1.42);
      border: 0;
    }
  </style>
</head>
<body>
  <div id="player"></div>
  <script src="https://www.youtube.com/iframe_api"></script>
  <script>
    var told = false;
    function tell(msg) {
      if (told || !window.ReactNativeWebView) return;
      told = true;
      window.ReactNativeWebView.postMessage(msg);
    }
    function onYouTubeIframeAPIReady() {
      new YT.Player('player', {
        videoId: ${JSON.stringify(videoId)},
        playerVars: ${JSON.stringify(playerVars)},
        events: {
          onReady: function (e) {
            try { e.target.playVideo(); } catch (err) {}
          },
          onStateChange: function (e) {
            if (e.data === 1) tell('playing');
          },
          onError: function () { tell('error'); }
        }
      });
    }
    setTimeout(function () { tell('timeout'); }, 12000);
  </script>
</body>
</html>`;
}

/** Mobil Safari UA YouTube’da “Diğer videolar” şeridini açıyor; kaydır kartında masaüstü oynatıcı. */
const SWIPE_WEBVIEW_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Modal: bare WKWebView UA bazen error 153 verir. */
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
 * @param {boolean} cinemaMode — Fragman modalı: sade krom.
 * @param {boolean} coverZoom — Kaydır kartı: 16:9 kutuda YouTube başlık/öneri kırpılır.
 * @param {boolean} captionsOn — Altyazıyı aç (Kaydır).
 * @param {string} captionLang — cc_lang_pref (tr / en).
 * @param {boolean} loop — Bittiğinde YouTube son ekranında kalmaması için (playlist=aynı id gerekir).
 * @param {() => void} onShellLoadEnd — Kaydır kartı: video oynayınca (veya hata) ebeveyn poster animasyonunu kaldırsın.
 * @param {boolean} waitForPlayback — Oynatma başlayana kadar gömülü beklemeyi gizle.
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
  captionsOn = false,
  captionLang = 'tr',
  waitForPlayback = false,
  onShellLoadEnd,
}) {
  const safeId = sanitizeVideoId(videoId);
  const html = useMemo(() => {
    if (!safeId) {
      return null;
    }
    if (waitForPlayback) {
      return buildPlaybackHtml(safeId, {
        autoPlay,
        muted,
        controls,
        loop,
        captionsOn,
        captionLang,
      });
    }
    return buildEmbedHtml(safeId, {
      autoPlay,
      muted,
      controls,
      cinemaMode,
      coverZoom,
      loop,
      captionsOn,
      captionLang,
    });
  }, [
    autoPlay,
    captionLang,
    captionsOn,
    cinemaMode,
    controls,
    coverZoom,
    loop,
    muted,
    safeId,
    waitForPlayback,
  ]);

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
        onMessage={event => {
          if (!waitForPlayback) {
            return;
          }
          const data = event?.nativeEvent?.data;
          if (data === 'playing' || data === 'error' || data === 'timeout') {
            onShellLoadEnd?.();
          }
        }}
        onLoadEnd={() => {
          if (!waitForPlayback) {
            onShellLoadEnd?.();
          }
        }}
        onError={() => {
          onShellLoadEnd?.();
        }}
        userAgent={coverZoom ? SWIPE_WEBVIEW_UA : WEBVIEW_UA}
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

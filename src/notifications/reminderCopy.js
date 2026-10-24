import {contentLocaleToUiPackId} from '../i18n/contentLocaleToUiPack';

export const REMINDER_COPY_VERSION = 3;

const COPY = {
  tr: {
    weekend: [
      'Hafta sonu kapıyı çaldı. İçeri bir film al.',
      'Ekran yanıyor. Bu akşam ona bir hikâye ver.',
      'Gece yeni. İçine hâlâ bir film sığar.',
      'Ülkende bu hafta bir liste fısıldıyor.',
      'Bir cümle bırak. Film onu yakalasın.',
      'Işıklar kısık. Perde tam şimdi açılır.',
    ],
    midweek: [
      'Haftanın ortasında bir kapı. Arkası film.',
      'On dakika ver. Modun bir başlık seçsin.',
      'Favorilerin rafta. Yanlarına bir misafir.',
      'Tek cümle koy. Karanlık gerisini açsın.',
      'Akşam sustuysa kaydır. Bir sahne uyanır.',
      'İzlediklerin bitti. Sıradaki adını henüz bilmiyor.',
    ],
  },
  en: {
    weekend: [
      'The weekend knocked. Let a film in.',
      'The screen is glowing. Give it a story tonight.',
      'The night is young. A film still fits.',
      'This week, a list in your country is whispering.',
      'Leave one sentence. Let the film catch it.',
      'The lights are low. The curtain opens now.',
    ],
    midweek: [
      'Midweek, a door. A film behind it.',
      'Give it ten minutes. Let your mood name a title.',
      'Your favorites are on the shelf. A guest beside them.',
      'Set down one sentence. Let the dark open the rest.',
      'If the evening went quiet, swipe. A scene wakes.',
      'What you watched is over. The next one doesn’t know its name yet.',
    ],
  },
  de: {
    weekend: [
      'Das Wochenende klopft. Lass einen Film herein.',
      'Der Bildschirm glüht. Gib ihm heute eine Geschichte.',
      'Die Nacht ist jung. Ein Film passt noch hinein.',
      'Diese Woche flüstert eine Liste in deinem Land.',
      'Ein Satz. Der Film fängt ihn auf.',
      'Das Licht ist niedrig. Der Vorhang geht jetzt auf.',
    ],
    midweek: [
      'Wochenmitte, eine Tür. Dahinter ein Film.',
      'Zehn Minuten. Deine Stimmung nennt einen Titel.',
      'Deine Favoriten stehen im Regal. Ein Gast daneben.',
      'Ein Satz. Die Dunkelheit öffnet den Rest.',
      'Wenn der Abend still wurde, wisch. Eine Szene wacht.',
      'Gesehenes ist vorbei. Der nächste kennt seinen Namen noch nicht.',
    ],
  },
  fr: {
    weekend: [
      'Le week-end frappe. Laisse entrer un film.',
      'L’écran brille. Offre-lui une histoire ce soir.',
      'La nuit est jeune. Un film y tient encore.',
      'Cette semaine, une liste murmure dans ton pays.',
      'Une phrase. Le film la rattrape.',
      'Les lumières sont basses. Le rideau s’ouvre.',
    ],
    midweek: [
      'Milieu de semaine, une porte. Derrière, un film.',
      'Dix minutes. Ton humeur nomme un titre.',
      'Tes favoris sont sur l’étagère. Un invité à côté.',
      'Une phrase. Le noir ouvre le reste.',
      'Si le soir s’est tu, glisse. Une scène s’éveille.',
      'Ce que tu as vu est fini. Le suivant ignore encore son nom.',
    ],
  },
};

export function reminderBody(locale, pool, index) {
  const pack = COPY[contentLocaleToUiPackId(locale)] ?? COPY.en;
  const lines = pack[pool] ?? pack.weekend;
  const safe = ((index % lines.length) + lines.length) % lines.length;
  return lines[safe];
}

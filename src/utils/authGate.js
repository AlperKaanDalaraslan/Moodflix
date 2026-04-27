import {Alert} from 'react-native';
import {t} from '../i18n/translations';

/**
 * @param {import('@react-navigation/native').NavigationProp<any>} navigation
 * @param {string} locale
 */
export function showLoginRequiredAlert(navigation, locale) {
  Alert.alert(t(locale, 'authRequiredTitle'), t(locale, 'authRequiredBody'), [
    {text: t(locale, 'close'), style: 'cancel'},
    {
      text: t(locale, 'authLoginCta'),
      onPress: () => navigation.navigate('LoginRegister', {mode: 'login'}),
    },
  ]);
}

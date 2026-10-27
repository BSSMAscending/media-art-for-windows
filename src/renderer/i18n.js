// Korean / English for the exhibit's visible text. Data files write text as
// { ko, en } pairs; `t` picks the current language, and plain strings (digits,
// symbols) read the same in both.

const LANGUAGES = ['ko', 'en'];
let language = 'ko';
const listeners = new Set();

function getLanguage() {
  return language;
}

function t(text) {
  if (text === null || typeof text !== 'object') return text;
  return text[language] ?? text.ko;
}

function setLanguage(next) {
  if (!LANGUAGES.includes(next) || next === language) return;
  language = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  listeners.forEach((listener) => listener(next));
}

function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

module.exports = { LANGUAGES, getLanguage, setLanguage, onLanguageChange, t };

import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <button 
      onClick={toggleLanguage}
      className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm font-medium transition cursor-pointer"
    >
      {i18n.language === 'zh' ? 'English' : '中文'}
    </button>
  );
}

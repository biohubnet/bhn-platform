/**
 * Translation dictionaries. Add new keys here, then look them up via
 * useT() or t() in components. Falling back: a missing key returns the
 * English value or the key itself.
 *
 * To add a new language: copy `en` to a new code, translate the values,
 * register it in LOCALES below, and the picker picks it up automatically.
 */

export const LOCALES = [
  { id: "en", name: "English",     nativeName: "English" },
  { id: "es", name: "Spanish",     nativeName: "Español" },
  { id: "fr", name: "French",      nativeName: "Français" },
  { id: "zh", name: "Simplified Chinese", nativeName: "简体中文" },
] as const;

export type LocaleId = (typeof LOCALES)[number]["id"];

type Dict = Record<string, string>;

const en: Dict = {
  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.catalog": "Course Catalog",
  "nav.pathways": "Pathways",
  "nav.myCourses": "My Courses",
  "nav.gradebook": "Gradebook",
  "nav.certificates": "Certificates",
  "nav.credits": "My Credits",
  "nav.buddy": "Learning buddies",
  "nav.changelog": "Change log",
  "nav.changelogTrainee": "What's new",
  "nav.administration": "Administration",
  "nav.signOut": "Sign out",

  // Common buttons / labels
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.next": "Next",
  "common.back": "Back",
  "common.close": "Close",
  "common.search": "Search",
  "common.loading": "Loading…",
  "common.theme": "Theme",
  "common.language": "Language",

  // Profile
  "profile.title": "My profile",
  "profile.personalInfo": "Personal info",
  "profile.password": "Password",
  "profile.privacy": "Privacy & data",
  "profile.exportData": "Download my data",
  "profile.deleteAccount": "Delete my account",
  "profile.languagePicker": "Display language",

  // Consent
  "consent.title": "We respect your privacy",
  "consent.body": "We use cookies and similar technologies to keep BHN Training working, measure how it performs, and improve your experience. You can change your choices anytime in your profile.",
  "consent.necessary": "Necessary",
  "consent.necessaryHelp": "Required to keep you signed in and the platform secure.",
  "consent.analytics": "Analytics",
  "consent.analyticsHelp": "Page views and feature usage to improve the platform. Never sold.",
  "consent.marketing": "Marketing",
  "consent.marketingHelp": "Tied to optional newsletter or promotional follow-up.",
  "consent.acceptAll": "Accept all",
  "consent.necessaryOnly": "Necessary only",
  "consent.savePrefs": "Save preferences",
  "consent.privacyPolicy": "Privacy policy",
  "consent.termsOfService": "Terms",
};

const es: Dict = {
  "nav.dashboard": "Panel",
  "nav.catalog": "Catálogo de cursos",
  "nav.pathways": "Itinerarios",
  "nav.myCourses": "Mis cursos",
  "nav.gradebook": "Calificaciones",
  "nav.certificates": "Certificados",
  "nav.credits": "Mis créditos",
  "nav.buddy": "Compañeros de estudio",
  "nav.changelog": "Registro de cambios",
  "nav.changelogTrainee": "Novedades",
  "nav.administration": "Administración",
  "nav.signOut": "Cerrar sesión",

  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.next": "Siguiente",
  "common.back": "Atrás",
  "common.close": "Cerrar",
  "common.search": "Buscar",
  "common.loading": "Cargando…",
  "common.theme": "Tema",
  "common.language": "Idioma",

  "profile.title": "Mi perfil",
  "profile.personalInfo": "Información personal",
  "profile.password": "Contraseña",
  "profile.privacy": "Privacidad y datos",
  "profile.exportData": "Descargar mis datos",
  "profile.deleteAccount": "Eliminar mi cuenta",
  "profile.languagePicker": "Idioma de la interfaz",

  "consent.title": "Respetamos tu privacidad",
  "consent.body": "Usamos cookies y tecnologías similares para mantener BHN Training en funcionamiento, medir su rendimiento y mejorar tu experiencia. Puedes cambiar tus preferencias en cualquier momento desde tu perfil.",
  "consent.necessary": "Necesarias",
  "consent.necessaryHelp": "Requeridas para mantener tu sesión y la seguridad de la plataforma.",
  "consent.analytics": "Analítica",
  "consent.analyticsHelp": "Visitas y uso de funciones para mejorar la plataforma. Nunca se venden.",
  "consent.marketing": "Marketing",
  "consent.marketingHelp": "Vinculadas al boletín opcional o comunicaciones promocionales.",
  "consent.acceptAll": "Aceptar todo",
  "consent.necessaryOnly": "Solo necesarias",
  "consent.savePrefs": "Guardar preferencias",
  "consent.privacyPolicy": "Política de privacidad",
  "consent.termsOfService": "Términos",
};

const fr: Dict = {
  "nav.dashboard": "Tableau de bord",
  "nav.catalog": "Catalogue de cours",
  "nav.pathways": "Parcours",
  "nav.myCourses": "Mes cours",
  "nav.gradebook": "Notes",
  "nav.certificates": "Certificats",
  "nav.credits": "Mes crédits",
  "nav.buddy": "Binômes d'apprentissage",
  "nav.changelog": "Journal des modifications",
  "nav.changelogTrainee": "Nouveautés",
  "nav.administration": "Administration",
  "nav.signOut": "Se déconnecter",

  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.next": "Suivant",
  "common.back": "Retour",
  "common.close": "Fermer",
  "common.search": "Rechercher",
  "common.loading": "Chargement…",
  "common.theme": "Thème",
  "common.language": "Langue",

  "profile.title": "Mon profil",
  "profile.personalInfo": "Informations personnelles",
  "profile.password": "Mot de passe",
  "profile.privacy": "Confidentialité et données",
  "profile.exportData": "Télécharger mes données",
  "profile.deleteAccount": "Supprimer mon compte",
  "profile.languagePicker": "Langue d'affichage",

  "consent.title": "Nous respectons votre vie privée",
  "consent.body": "Nous utilisons des cookies et technologies similaires pour faire fonctionner BHN Training, mesurer ses performances et améliorer votre expérience. Vous pouvez modifier vos choix à tout moment depuis votre profil.",
  "consent.necessary": "Nécessaires",
  "consent.necessaryHelp": "Nécessaires pour vous garder connecté et sécuriser la plateforme.",
  "consent.analytics": "Analytique",
  "consent.analyticsHelp": "Vues et usage des fonctionnalités pour améliorer la plateforme. Jamais vendues.",
  "consent.marketing": "Marketing",
  "consent.marketingHelp": "Liées à la newsletter facultative ou aux communications promotionnelles.",
  "consent.acceptAll": "Tout accepter",
  "consent.necessaryOnly": "Nécessaires uniquement",
  "consent.savePrefs": "Enregistrer les préférences",
  "consent.privacyPolicy": "Politique de confidentialité",
  "consent.termsOfService": "Conditions",
};

const zh: Dict = {
  "nav.dashboard": "仪表板",
  "nav.catalog": "课程目录",
  "nav.pathways": "学习路径",
  "nav.myCourses": "我的课程",
  "nav.gradebook": "成绩册",
  "nav.certificates": "证书",
  "nav.credits": "我的积分",
  "nav.buddy": "学习伙伴",
  "nav.changelog": "更新日志",
  "nav.changelogTrainee": "新功能",
  "nav.administration": "管理",
  "nav.signOut": "退出登录",

  "common.save": "保存",
  "common.cancel": "取消",
  "common.delete": "删除",
  "common.edit": "编辑",
  "common.next": "下一步",
  "common.back": "返回",
  "common.close": "关闭",
  "common.search": "搜索",
  "common.loading": "加载中…",
  "common.theme": "主题",
  "common.language": "语言",

  "profile.title": "我的资料",
  "profile.personalInfo": "个人信息",
  "profile.password": "密码",
  "profile.privacy": "隐私与数据",
  "profile.exportData": "下载我的数据",
  "profile.deleteAccount": "注销账户",
  "profile.languagePicker": "界面语言",

  "consent.title": "我们尊重您的隐私",
  "consent.body": "我们使用 Cookie 等技术来保持 BHN 培训平台正常运作、衡量其性能并改善您的体验。您可以随时在个人资料中更改您的选择。",
  "consent.necessary": "必要",
  "consent.necessaryHelp": "用于保持您的登录状态和平台安全所必需。",
  "consent.analytics": "分析",
  "consent.analyticsHelp": "浏览量和功能使用情况,用于改进平台。绝不出售。",
  "consent.marketing": "营销",
  "consent.marketingHelp": "与可选的新闻通讯或推广跟进有关。",
  "consent.acceptAll": "全部接受",
  "consent.necessaryOnly": "仅必要",
  "consent.savePrefs": "保存偏好",
  "consent.privacyPolicy": "隐私政策",
  "consent.termsOfService": "服务条款",
};

export const DICTIONARIES: Record<LocaleId, Dict> = { en, es, fr, zh };

/** Static lookup. Falls back to English then to the key itself. */
export function translate(locale: LocaleId | string | undefined, key: string): string {
  const dict = DICTIONARIES[(locale ?? "en") as LocaleId] ?? DICTIONARIES.en;
  return dict[key] ?? DICTIONARIES.en[key] ?? key;
}

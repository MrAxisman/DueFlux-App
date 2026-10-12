const WEBSITE_BASE = "https://dueflux.com";
// Static website uses .html routes; keep links explicit to avoid host rewrite quirks.
const WEBSITE_LOGIN = WEBSITE_BASE + "/login.html";
const WEBSITE_SIGNUP = WEBSITE_BASE + "/signup.html";
const WEBSITE_ACCOUNT = WEBSITE_BASE + "/account.html";
const WEBSITE_PRICING = WEBSITE_BASE + "/#pricing";
const WEBSITE_RESET = WEBSITE_BASE + "/reset.html";

const firebaseConfig = {
  apiKey: "AIzaSyDPCDXynl6_SPbCrpsf0pmKsTVXqFPy_Sg",
  authDomain: "dueflux-product.firebaseapp.com",
  projectId: "dueflux-product",
  storageBucket: "dueflux-product.firebasestorage.app",
  messagingSenderId: "71833659340",
  appId: "1:71833659340:web:bf197cb41403034da51f69",
};

const firebaseApp = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebase.firestore();
const functions = firebase.app().functions("us-central1");

if (firestore && typeof firestore.enablePersistence === "function") {
  firestore.enablePersistence({ synchronizeTabs: true }).catch(function (err) {
    console.warn("firestore persistence", err && err.code ? err.code : err);
  });
}

let currentUser = null;
let currentLang = "en";
let planFromClaims = null;
let profileUnsub = null;
let invoicesUnsub = null;
let billingRefsUnsub = null;
let mailSyncPending = false;
let mailSyncErrorMessage = "";
let mailSyncNotice = "";
let mailAccounts = {};
let mailAccountsUnsub = null;
let billingReferences = [];
let invoicesById = new Map();
let invoicesVersion = 0;
let invoicesUiRefreshQueued = false;
let invoiceTableActionsBound = false;
let visibleInvoicesCacheKey = "";
let visibleInvoicesCache = [];
let invoiceSearchQuery = "";
let activeWorkspaceSpace = "home";
let activeActionInvoiceId = "";
let invoiceReminders = [];
let remindersUnsub = null;
let universalForwardingAddress = "";
let sensitivePreviewsHidden = localStorage.getItem("df_sensitive_previews") !== "false";
let mailConnectOpen = false;
let mailConnectEmail = "";
let mailConnectProvider = "unknown";
let mailConnectError = "";
let mailConnectDetecting = false;
let phoneVerifyBusy = false;
let phoneVerifyLastError = "";
let phoneVerifyCodeRequestedAt = 0;
let phoneSyncPending = false;
let phoneSyncErrorMessage = "";
const PHONE_SMS_STATUS_POLL_MAX_ATTEMPTS = 10;
const PHONE_SMS_STATUS_POLL_DELAY_MS = 4000;
const PHONE_SMS_PENDING_HINT_AFTER_MS = 25000;
const PHONE_FUNCTION_TIMEOUT_MS = 25000;
const PHONE_INBOX_INFO_MIN_REFRESH_MS = 45 * 1000;
let phoneInboxInfoLoading = false;
let phoneInboxInfoLastFetchedAt = 0;
const AUTO_MAIL_SYNC_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const AUTO_MAIL_SYNC_STALE_AFTER_MS = 10 * 60 * 1000;
const AUTO_MAIL_SYNC_MIN_GAP_MS = 3 * 60 * 1000;
const EXCHANGE_RATES_REFRESH_MS = 10 * 60 * 1000;
const DISPLAY_CURRENCY_STORAGE_KEY = "df_display_currency";
const AUTO_STATUS_STORAGE_KEY = "df_auto_status_enabled";
let autoMailSyncTimer = null;
let autoMailSyncRunning = false;
let autoMailSyncLastRunAt = 0;
let autoPhoneSyncRunning = false;
let autoPhoneSyncLastRunAt = 0;
let displayCurrency = "RON";
let autoStatusEnabled = true;
let exchangeRatesInfo = {
  base: "USD",
  rates: { USD: 1 },
  provider: "",
  updatedAt: "",
  fetchedAt: "",
};
let exchangeRatesTimer = null;
let exchangeRatesLoading = false;
let exchangeRatesLastFetchAt = 0;
const FALLBACK_CURRENCY_CODES = [
  "RON","EUR","USD","GBP","CHF","HUF","PLN","CZK","SEK","NOK","DKK","TRY",
  "JPY","CNY","AUD","CAD","NZD","MXN","BRL","INR","ZAR","AED","SAR","ILS"
];
const INTL_CURRENCY_CODES = (function () {
  try {
    if (
      typeof Intl !== "undefined" &&
      Intl &&
      typeof Intl.supportedValuesOf === "function"
    ) {
      const values = Intl.supportedValuesOf("currency") || [];
      return values
        .map(function (code) {
          return normalizeCurrencyCodeLocal(code);
        })
        .filter(Boolean);
    }
  } catch (_) {
    // fallback list will be used
  }
  return [];
})();
let updateState = {
  status: "idle",
  version: "",
  message: "",
  percent: 0,
  currentVersion: "",
  notes: "",
  releaseDate: "",
  bytes: 0,
};
let updatePromptOpen = false;
let updatePromptDetailsOpen = false;
let updatePromptAutoInstall = false;
let updatePromptInstallTriggered = false;
const SPLASH_MIN_MS = 7200;
let splashStartedAt = Date.now();
let splashTransitioned = false;
let splashTransitionTimer = null;
let forceLoginOnLaunch = true;
let confirmDialogResolve = null;
let toastHideTimer = null;
let toastFinalizeTimer = null;
const OFFLINE_CACHE_PREFIX = "df_offline_cache_";
const OFFLINE_QUEUE_PREFIX = "df_offline_queue_";

/* ---------- I18N (EN / RO / FR / DE / ES / RU / ZH / JA) ---------- */

const i18n = {};

i18n.en = {
  login_title: "DueFlux",
  login_subtitle: "Unified invoices for home & business.",
  login_email: "Email",
  login_password: "Password",
  login_btn: "Sign in",
  login_hint:
    "Press Enter to submit, or use the button. Missing fields will be highlighted.",
  login_signup_cta: "Don't have an account? Create it on the DueFlux website.",
  login_signup_link: "Create account on website",

  msg_missing_email: "Please enter an email.",
  msg_missing_password: "Please enter a password.",
  msg_missing_fields: "Email and password are required.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "Settings",
  settings_subtitle: "Personalize DueFlux for you.",
  settings_appearance_title: "Appearance",
  settings_theme_label: "Theme",
  settings_theme_hint:
    "Auto follows your system preference (Windows, macOS, Linux, mobile).",
  settings_display_title: "Display",
  settings_fullscreen_btn_enter: "Enter fullscreen",
  settings_fullscreen_btn_exit: "Exit fullscreen",
  settings_fullscreen_hint: "You can also press F11 while DueFlux is focused.",
  settings_language_title: "Language",
  settings_account_title: "Account",
  settings_updates_title: "Updates",
  settings_updates_subtitle: "Keep DueFlux updated with the latest improvements.",
  settings_updates_check: "Check for updates",
  settings_updates_checking: "Checking for updates...",
  settings_updates_available: "Update available.",
  settings_updates_none: "You're up to date.",
  settings_updates_downloading: "Downloading update...",
  settings_updates_download: "Download update",
  settings_updates_install: "Install update",
  settings_updates_ready: "Update ready. Restart to install.",
  settings_updates_error: "Update check failed.",
  settings_updates_current: "Current version",
  update_prompt_title: "DueFlux update",
  update_prompt_desc:
    "Choose how this update should be downloaded and installed.",
  update_prompt_core: "Product update",
  update_prompt_auto: "Install automatically after download",
  update_prompt_details: "Details",
  update_prompt_details_hide: "Hide details",
  update_prompt_later: "Later",
  update_prompt_action_download: "Download update",
  update_prompt_action_install: "Install now",
  update_prompt_action_downloading: "Downloading...",
  update_prompt_action_checking: "Checking...",
  update_prompt_release: "Release",
  update_prompt_published: "Published",
  update_prompt_notes_missing: "No release notes available.",
  update_prompt_size_unknown: "Size unavailable",
  settings_legal_title: "Legal",
  settings_switch_account: "Switch account",
  settings_logout: "Logout",

  theme_dark: "Dark",
  theme_light: "Light",
  theme_auto: "Auto",

  settings_link_gdpr: "GDPR & Data protection",
  settings_link_terms: "Terms of Service",
  settings_link_privacy: "Privacy Policy",

  legal_gdpr_title: "GDPR & Data protection",
  legal_gdpr_body:
    "We process your invoice data solely to provide the DueFlux service. You can request export or deletion of your data at any time. Your data is not sold to third parties.",
  legal_terms_title: "Terms of Service",
  legal_terms_body:
    "DueFlux is provided as-is, without any guarantee. You are responsible for the accuracy of invoices and payment deadlines. Using the app implies acceptance of these terms.",
  legal_privacy_title: "Privacy Policy",
  legal_privacy_body:
    "We store only the information required to operate your account and sync invoices. Cookies and local storage are used to remember your preferences on this device.",
  legal_close_btn: "Close",

  settings_no_accounts: "No stored accounts yet.",
  settings_last_used: "Last used {{min}} min ago",
  settings_last_just_now: "Just now",
  settings_use_account: "Use this account",

  app_tagline: "Unified invoices for home & business.",
  overview_title: "Overview",
  kpi_total: "Total this month",
  kpi_unpaid: "Unpaid",
  kpi_overdue: "Overdue",

  invoices_title: "Invoices",
  sync_now: "Sync now",
  mail_sync_panel_title: "Email sync",
  mail_sync_panel_desc:
    "Connect Gmail or Outlook to automatically sync all invoices from that mailbox.",
  mail_sync_panel_empty: "Connect an email account to enable sync.",
  mail_sync_panel_ready: "Email sync is active.",
  mail_sync_panel_syncing: "Syncing inboxes...",
  mail_sync_panel_error: "Email sync failed. Try again.",
  mail_sync_panel_last_sync: "Last sync: {{time}}",
  mail_sync_notice_browser: "Finish connecting in your browser.",
  mail_sync_connect_gmail: "Connect Gmail",
  mail_sync_connect_outlook: "Connect Outlook",
  mail_sync_disconnect: "Disconnect",
  mail_sync_status_connected: "Connected",
  mail_sync_status_not_connected: "Not connected",
  mail_sync_status_pending: "Pending authorization...",
  mail_sync_status_error: "Connection error",
  add_invoice: "Add invoice",
  col_company: "Company",
  col_category: "Category",
  col_number: "Number",
  col_issue: "Issue date",
  col_due: "Due date",
  col_amount: "Amount",
  col_status: "Status",
  col_actions: "Actions",
  status_unpaid: "Unpaid",
  status_paid: "Paid",
  status_overdue: "Overdue",
  table_actions_paid: "Paid",
  table_actions_overdue: "Overdue",

  modal_add_title: "Add invoice",
  modal_company: "Company",
  modal_category: "Category",
  modal_number: "Number",
  modal_issue: "Issue date",
  modal_due: "Due date",
  modal_amount: "Amount",
  modal_currency: "Currency",
  modal_status: "Status",
  modal_cancel: "Cancel",
  modal_save: "Save",

  modal_totp_title: "Enable 2FA",
  modal_totp_hint:
    "Scan the code or add the secret to your authenticator app, then enter the 6-digit code to confirm.",
  modal_totp_code_label: "6-digit code",
  modal_totp_cancel: "Cancel",
  modal_totp_confirm: "Confirm",

  modal_account_title: "Switch account",
  modal_account_add: "+ Add another account",

  profile_title: "My profile",
  profile_subtitle: "Account details and plan",
  profile_identity_title: "Identity & contact",
  profile_first_name: "First name",
  profile_last_name: "Last name",
  profile_company_label: "Company name",
  profile_company_hint: "Shown when your plan is Business.",
  profile_save_btn: "Save changes",
  profile_saved: "Profile updated.",
  profile_plan_title: "Your plan",
  profile_plan_note: "Plans can be changed only on the DueFlux website.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc:
    "Full features for families, households and personal invoices.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc:
    "Full features for companies handling supplier invoices with a business account.",
  profile_plan_device_note: "All plans work on desktop and mobile.",
  profile_manage_on_web: "Open website",
  profile_password_title: "Password",
  profile_password_body:
    "Change your password from the website for better security.",
  profile_password_btn: "Change on website",
  profile_close_btn: "Close",
  profile_plan_readonly: "Plan changes are managed on the website.",

  splash_subtitle: "Unified invoices for home & business.",
  splash_loading_1: "Loading assets...",
  splash_loading_2: "Syncing invoice engine...",
  splash_loading_3: "Preparing secure vault...",
  splash_loading_4: "Finalizing workspace...",

  alert_fill_all_fields: "Please fill all fields.",
  alert_offline: "You are offline. Mail sync requires internet.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Mail sync error.",
  alert_totp_code: "Enter the 6-digit code.",
  alert_totp_invalid: "Invalid TOTP code.",
  alert_totp_disable_password: "Enter your password to disable 2FA:",
  alert_totp_disable_error: "Cannot disable 2FA. Check your password.",
  alert_totp_setup_error: "Cannot set up 2FA now.",
  alert_profile_error: "Cannot save profile right now.",
  alert_profile_saved: "Profile saved.",
  offline_required: "Internet connection required. DueFlux is online-only.",

  plan_basic_label: "Basic",
  plan_business_label: "Business",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Open website",
  totp_cta_disable: "Open website",
  totp_on_label: "CLOUD CONNECTED",
  totp_on_desc: "You're online and syncing with DueFlux Cloud.",
  totp_off_label: "OFFLINE",
  totp_off_desc: "Reconnect to sync invoices and updates.",
  security_title: "Cloud status",
  security_subtitle: "DueFlux stays synced with your cloud account.",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
};

i18n.hu = {
  login_title: "DueFlux",
  login_subtitle: "Egyesített számlák otthonra és üzletre.",
  login_email: "E-mail",
  login_password: "Jelszó",
  login_btn: "Sign in",
  login_hint: "Használd ugyanazt a fiókot, mint az asztali/web alkalmazásban.",
  login_signup_cta: "Nincs fiókod? Hozd létre a DueFlux weboldalon.",
  login_signup_link: "Fiók létrehozása a weboldalon",
  msg_missing_email: "Please enter an email.",
  msg_missing_password: "Please enter a password.",
  msg_missing_fields: "Email and password are required.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "Beállítások",
  settings_subtitle: "Personalize DueFlux for you.",
  settings_appearance_title: "Appearance",
  settings_theme_label: "Theme",
  settings_theme_hint: "Auto follows your system preference (Windows, macOS, Linux, mobile).",
  settings_display_title: "Display",
  settings_fullscreen_btn_enter: "Enter fullscreen",
  settings_fullscreen_btn_exit: "Exit fullscreen",
  settings_fullscreen_hint: "You can also press F11 while DueFlux is focused.",
  settings_language_title: "Language",
  settings_account_title: "Account",
  settings_updates_title: "Updates",
  settings_updates_subtitle: "Keep DueFlux updated with the latest improvements.",
  settings_updates_check: "Check for updates",
  settings_updates_checking: "Checking for updates...",
  settings_updates_available: "Update available.",
  settings_updates_none: "You're up to date.",
  settings_updates_downloading: "Downloading update...",
  settings_updates_download: "Download update",
  settings_updates_install: "Install update",
  settings_updates_ready: "Update ready. Restart to install.",
  settings_updates_error: "Update check failed.",
  settings_updates_current: "Current version",
  settings_legal_title: "Legal",
  settings_switch_account: "Fiók váltása",
  settings_logout: "Kijelentkezés",
  theme_dark: "Dark",
  theme_light: "Light",
  theme_auto: "Auto",
  settings_link_gdpr: "GDPR & Data protection",
  settings_link_terms: "Terms of Service",
  settings_link_privacy: "Privacy Policy",
  legal_gdpr_title: "GDPR & Data protection",
  legal_gdpr_body: "We process your invoice data solely to provide the DueFlux service. You can request export or deletion of your data at any time. Your data is not sold to third parties.",
  legal_terms_title: "Terms of Service",
  legal_terms_body: "DueFlux is provided as-is, without any guarantee. You are responsible for the accuracy of invoices and payment deadlines. Using the app implies acceptance of these terms.",
  legal_privacy_title: "Privacy Policy",
  legal_privacy_body: "We store only the information required to operate your account and sync invoices. Cookies and local storage are used to remember your preferences on this device.",
  legal_close_btn: "Close",
  settings_no_accounts: "No stored accounts yet.",
  settings_last_used: "Last used {{min}} min ago",
  settings_last_just_now: "Just now",
  settings_use_account: "Use this account",
  app_tagline: "Unified invoices for home & business.",
  overview_title: "Áttekintés",
  kpi_total: "Total this month",
  kpi_unpaid: "Unpaid",
  kpi_overdue: "Overdue",
  invoices_title: "Számlák",
  sync_now: "Szinkronizalas most",
  mail_sync_panel_title: "Email szinkron",
  mail_sync_panel_desc:
    "Csatlakoztasd a Gmailt vagy Outlookot a szamlak automatikus importjahoz.",
  mail_sync_panel_empty: "A szinkronhoz csatlakoztass egy email fiokot.",
  mail_sync_panel_ready: "Az email szinkron aktiv.",
  mail_sync_panel_syncing: "Postafiokok szinkronizalasa...",
  mail_sync_panel_error: "A szinkron sikertelen. Probald ujra.",
  mail_sync_panel_last_sync: "Utolso szinkron: {{time}}",
  mail_sync_notice_browser: "Fejezd be a csatlakozast a bongeszoben.",
  mail_sync_connect_gmail: "Gmail csatlakoztatasa",
  mail_sync_connect_outlook: "Outlook csatlakoztatasa",
  mail_sync_disconnect: "Levalasztas",
  mail_sync_status_connected: "Csatlakozva",
  mail_sync_status_not_connected: "Nincs csatlakoztatva",
  mail_sync_status_pending: "Jovahagyas folyamatban...",
  mail_sync_status_error: "Csatlakozasi hiba",
  add_invoice: "Add invoice",
  col_company: "Company",
  col_category: "Category",
  col_number: "Number",
  col_issue: "Issue date",
  col_due: "Due date",
  col_amount: "Amount",
  col_status: "Status",
  col_actions: "Actions",
  status_unpaid: "Unpaid",
  status_paid: "Paid",
  status_overdue: "Overdue",
  table_actions_paid: "Paid",
  table_actions_overdue: "Overdue",
  modal_add_title: "Add invoice",
  modal_company: "Company",
  modal_category: "Category",
  modal_number: "Number",
  modal_issue: "Issue date",
  modal_due: "Due date",
  modal_amount: "Amount",
  modal_currency: "Currency",
  modal_status: "Status",
  modal_cancel: "Cancel",
  modal_save: "Save",
  modal_totp_title: "Enable email 2FA",
  modal_totp_hint: "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
  modal_totp_code_label: "6-digit code",
  modal_totp_cancel: "Megse",
  modal_totp_confirm: "Megerősites",
  modal_account_title: "Switch account",
  modal_account_add: "+ Add another account",
  profile_title: "Profilom",
  profile_subtitle: "Fiók adatai és csomag",
  profile_identity_title: "Identity & contact",
  profile_first_name: "Keresztnév",
  profile_last_name: "Vezetéknév",
  profile_company_label: "Company name",
  profile_company_hint: "Shown when your plan is Business.",
  profile_save_btn: "Save changes",
  profile_saved: "Profile updated.",
  profile_plan_title: "Your plan",
  profile_plan_note: "Plans can be changed only on the DueFlux website.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc: "Full features for families, households and personal invoices.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc: "Full features for companies handling supplier invoices with a business account.",
  profile_plan_device_note: "All plans work on desktop and mobile.",
  profile_manage_on_web: "Open website",
  profile_password_title: "Password",
  profile_password_body: "Change your password from the website for better security.",
  profile_password_btn: "Change on website",
  profile_close_btn: "Close",
  profile_plan_readonly: "Plan changes are managed on the website.",
  splash_subtitle: "Unified invoices for home & business.",
  splash_loading_1: "Loading assets...",
  splash_loading_2: "Syncing invoice engine...",
  splash_loading_3: "Preparing secure vault...",
  splash_loading_4: "Finalizing workspace...",
  alert_fill_all_fields: "Please fill all fields.",
  alert_offline: "You are offline. Mail sync requires internet.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Mail sync error.",
  alert_totp_code: "Add meg a 6 jegyu kodot.",
  alert_totp_invalid: "Invalid verification code.",
  alert_totp_disable_password: "Enter the 6-digit code.",
  alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
  alert_totp_setup_error: "Cannot send verification code.",
  alert_profile_error: "Cannot save profile right now.",
  alert_profile_saved: "Profile saved.",
  offline_required: "Internet connection required. DueFlux is online-only.",
  plan_basic_label: "Basic",
  plan_business_label: "Business",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Enable email 2FA",
  totp_cta_disable: "Disable email 2FA",
  totp_on_label: "EMAIL VERIFIED",
  totp_on_desc: "You're online and syncing with DueFlux Cloud.",
  totp_off_label: "EMAIL NOT VERIFIED",
  totp_off_desc: "Reconnect to sync invoices and updates.",
  security_title: "Email verification",
  security_subtitle: "Email verification is managed on the DueFlux website.",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
};

i18n.it = {
  login_title: "DueFlux",
  login_subtitle: "Fatture unificate per casa e business.",
  login_email: "Email",
  login_password: "Password",
  login_btn: "Sign in",
  login_hint: "Usa lo stesso account dell'app desktop/web.",
  login_signup_cta: "Non hai un account? Crealo sul sito DueFlux.",
  login_signup_link: "Crea account sul sito",
  msg_missing_email: "Please enter an email.",
  msg_missing_password: "Please enter a password.",
  msg_missing_fields: "Email and password are required.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "Impostazioni",
  settings_subtitle: "Personalize DueFlux for you.",
  settings_appearance_title: "Appearance",
  settings_theme_label: "Theme",
  settings_theme_hint: "Auto follows your system preference (Windows, macOS, Linux, mobile).",
  settings_display_title: "Display",
  settings_fullscreen_btn_enter: "Enter fullscreen",
  settings_fullscreen_btn_exit: "Exit fullscreen",
  settings_fullscreen_hint: "You can also press F11 while DueFlux is focused.",
  settings_language_title: "Language",
  settings_account_title: "Account",
  settings_updates_title: "Updates",
  settings_updates_subtitle: "Keep DueFlux updated with the latest improvements.",
  settings_updates_check: "Check for updates",
  settings_updates_checking: "Checking for updates...",
  settings_updates_available: "Update available.",
  settings_updates_none: "You're up to date.",
  settings_updates_downloading: "Downloading update...",
  settings_updates_download: "Download update",
  settings_updates_install: "Install update",
  settings_updates_ready: "Update ready. Restart to install.",
  settings_updates_error: "Update check failed.",
  settings_updates_current: "Current version",
  settings_legal_title: "Legal",
  settings_switch_account: "Cambia account",
  settings_logout: "Esci",
  theme_dark: "Dark",
  theme_light: "Light",
  theme_auto: "Auto",
  settings_link_gdpr: "GDPR & Data protection",
  settings_link_terms: "Terms of Service",
  settings_link_privacy: "Privacy Policy",
  legal_gdpr_title: "GDPR & Data protection",
  legal_gdpr_body: "We process your invoice data solely to provide the DueFlux service. You can request export or deletion of your data at any time. Your data is not sold to third parties.",
  legal_terms_title: "Terms of Service",
  legal_terms_body: "DueFlux is provided as-is, without any guarantee. You are responsible for the accuracy of invoices and payment deadlines. Using the app implies acceptance of these terms.",
  legal_privacy_title: "Privacy Policy",
  legal_privacy_body: "We store only the information required to operate your account and sync invoices. Cookies and local storage are used to remember your preferences on this device.",
  legal_close_btn: "Close",
  settings_no_accounts: "No stored accounts yet.",
  settings_last_used: "Last used {{min}} min ago",
  settings_last_just_now: "Just now",
  settings_use_account: "Use this account",
  app_tagline: "Unified invoices for home & business.",
  overview_title: "Panoramica",
  kpi_total: "Total this month",
  kpi_unpaid: "Unpaid",
  kpi_overdue: "Overdue",
  invoices_title: "Fatture",
  sync_now: "Sincronizza ora",
  mail_sync_panel_title: "Sync email",
  mail_sync_panel_desc:
    "Collega Gmail o Outlook per importare automaticamente le fatture.",
  mail_sync_panel_empty: "Collega un account email per abilitare la sincronizzazione.",
  mail_sync_panel_ready: "La sincronizzazione email e attiva.",
  mail_sync_panel_syncing: "Sincronizzazione caselle di posta...",
  mail_sync_panel_error: "Sincronizzazione non riuscita. Riprova.",
  mail_sync_panel_last_sync: "Ultima sincronizzazione: {{time}}",
  mail_sync_notice_browser: "Completa la connessione nel browser.",
  mail_sync_connect_gmail: "Connetti Gmail",
  mail_sync_connect_outlook: "Connetti Outlook",
  mail_sync_disconnect: "Disconnetti",
  mail_sync_status_connected: "Connesso",
  mail_sync_status_not_connected: "Non connesso",
  mail_sync_status_pending: "Autorizzazione in corso...",
  mail_sync_status_error: "Errore di connessione",
  add_invoice: "Add invoice",
  col_company: "Company",
  col_category: "Category",
  col_number: "Number",
  col_issue: "Issue date",
  col_due: "Due date",
  col_amount: "Amount",
  col_status: "Status",
  col_actions: "Actions",
  status_unpaid: "Unpaid",
  status_paid: "Paid",
  status_overdue: "Overdue",
  table_actions_paid: "Paid",
  table_actions_overdue: "Overdue",
  modal_add_title: "Add invoice",
  modal_company: "Company",
  modal_category: "Category",
  modal_number: "Number",
  modal_issue: "Issue date",
  modal_due: "Due date",
  modal_amount: "Amount",
  modal_currency: "Currency",
  modal_status: "Status",
  modal_cancel: "Cancel",
  modal_save: "Save",
  modal_totp_title: "Enable email 2FA",
  modal_totp_hint: "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
  modal_totp_code_label: "6-digit code",
  modal_totp_cancel: "Annulla",
  modal_totp_confirm: "Conferma",
  modal_account_title: "Switch account",
  modal_account_add: "+ Add another account",
  profile_title: "Il mio profilo",
  profile_subtitle: "Dettagli account e piano",
  profile_identity_title: "Identity & contact",
  profile_first_name: "Nome",
  profile_last_name: "Cognome",
  profile_company_label: "Company name",
  profile_company_hint: "Shown when your plan is Business.",
  profile_save_btn: "Save changes",
  profile_saved: "Profile updated.",
  profile_plan_title: "Your plan",
  profile_plan_note: "Plans can be changed only on the DueFlux website.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc: "Full features for families, households and personal invoices.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc: "Full features for companies handling supplier invoices with a business account.",
  profile_plan_device_note: "All plans work on desktop and mobile.",
  profile_manage_on_web: "Open website",
  profile_password_title: "Password",
  profile_password_body: "Change your password from the website for better security.",
  profile_password_btn: "Change on website",
  profile_close_btn: "Close",
  profile_plan_readonly: "Plan changes are managed on the website.",
  splash_subtitle: "Unified invoices for home & business.",
  splash_loading_1: "Loading assets...",
  splash_loading_2: "Syncing invoice engine...",
  splash_loading_3: "Preparing secure vault...",
  splash_loading_4: "Finalizing workspace...",
  alert_fill_all_fields: "Please fill all fields.",
  alert_offline: "You are offline. Mail sync requires internet.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Mail sync error.",
  alert_totp_code: "Inserisci il codice a 6 cifre.",
  alert_totp_invalid: "Invalid verification code.",
  alert_totp_disable_password: "Enter the 6-digit code.",
  alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
  alert_totp_setup_error: "Cannot send verification code.",
  alert_profile_error: "Cannot save profile right now.",
  alert_profile_saved: "Profile saved.",
  offline_required: "Internet connection required. DueFlux is online-only.",
  plan_basic_label: "Basic",
  plan_business_label: "Business",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Enable email 2FA",
  totp_cta_disable: "Disable email 2FA",
  totp_on_label: "EMAIL VERIFIED",
  totp_on_desc: "You're online and syncing with DueFlux Cloud.",
  totp_off_label: "EMAIL NOT VERIFIED",
  totp_off_desc: "Reconnect to sync invoices and updates.",
  security_title: "Email verification",
  security_subtitle: "Email verification is managed on the DueFlux website.",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
};

i18n.tr = {
  login_title: "DueFlux",
  login_subtitle: "Ev ve iş için birleştirilmiş faturalar.",
  login_email: "E-posta",
  login_password: "Şifre",
  login_btn: "Sign in",
  login_hint: "Masaüstü/web uygulamasıyla aynı hesabı kullan.",
  login_signup_cta: "Hesabınız yok mu? DueFlux sitesinden oluşturun.",
  login_signup_link: "Siteden hesap oluştur",
  msg_missing_email: "Please enter an email.",
  msg_missing_password: "Please enter a password.",
  msg_missing_fields: "Email and password are required.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "Ayarlar",
  settings_subtitle: "Personalize DueFlux for you.",
  settings_appearance_title: "Appearance",
  settings_theme_label: "Theme",
  settings_theme_hint: "Auto follows your system preference (Windows, macOS, Linux, mobile).",
  settings_display_title: "Display",
  settings_fullscreen_btn_enter: "Enter fullscreen",
  settings_fullscreen_btn_exit: "Exit fullscreen",
  settings_fullscreen_hint: "You can also press F11 while DueFlux is focused.",
  settings_language_title: "Language",
  settings_account_title: "Account",
  settings_updates_title: "Updates",
  settings_updates_subtitle: "Keep DueFlux updated with the latest improvements.",
  settings_updates_check: "Check for updates",
  settings_updates_checking: "Checking for updates...",
  settings_updates_available: "Update available.",
  settings_updates_none: "You're up to date.",
  settings_updates_downloading: "Downloading update...",
  settings_updates_download: "Download update",
  settings_updates_install: "Install update",
  settings_updates_ready: "Update ready. Restart to install.",
  settings_updates_error: "Update check failed.",
  settings_updates_current: "Current version",
  settings_legal_title: "Legal",
  settings_switch_account: "Hesap değiştir",
  settings_logout: "Çıkış yap",
  theme_dark: "Dark",
  theme_light: "Light",
  theme_auto: "Auto",
  settings_link_gdpr: "GDPR & Data protection",
  settings_link_terms: "Terms of Service",
  settings_link_privacy: "Privacy Policy",
  legal_gdpr_title: "GDPR & Data protection",
  legal_gdpr_body: "We process your invoice data solely to provide the DueFlux service. You can request export or deletion of your data at any time. Your data is not sold to third parties.",
  legal_terms_title: "Terms of Service",
  legal_terms_body: "DueFlux is provided as-is, without any guarantee. You are responsible for the accuracy of invoices and payment deadlines. Using the app implies acceptance of these terms.",
  legal_privacy_title: "Privacy Policy",
  legal_privacy_body: "We store only the information required to operate your account and sync invoices. Cookies and local storage are used to remember your preferences on this device.",
  legal_close_btn: "Close",
  settings_no_accounts: "No stored accounts yet.",
  settings_last_used: "Last used {{min}} min ago",
  settings_last_just_now: "Just now",
  settings_use_account: "Use this account",
  app_tagline: "Unified invoices for home & business.",
  overview_title: "Genel bakış",
  kpi_total: "Total this month",
  kpi_unpaid: "Unpaid",
  kpi_overdue: "Overdue",
  invoices_title: "Faturalar",
  sync_now: "Simdi senkronize et",
  mail_sync_panel_title: "E-posta senkronu",
  mail_sync_panel_desc:
    "Faturalari otomatik almak icin Gmail veya Outlook'u baglayin.",
  mail_sync_panel_empty: "Senkron icin bir e-posta hesabi baglayin.",
  mail_sync_panel_ready: "E-posta senkronu aktif.",
  mail_sync_panel_syncing: "Gelen kutulari senkronize ediliyor...",
  mail_sync_panel_error: "Senkronizasyon basarisiz. Tekrar deneyin.",
  mail_sync_panel_last_sync: "Son senkron: {{time}}",
  mail_sync_notice_browser: "Baglantiyi tarayicida tamamlayin.",
  mail_sync_connect_gmail: "Gmail bagla",
  mail_sync_connect_outlook: "Outlook bagla",
  mail_sync_disconnect: "Baglantiyi kes",
  mail_sync_status_connected: "Bagli",
  mail_sync_status_not_connected: "Bagli degil",
  mail_sync_status_pending: "Yetkilendirme bekleniyor...",
  mail_sync_status_error: "Baglanti hatasi",
  add_invoice: "Add invoice",
  col_company: "Company",
  col_category: "Category",
  col_number: "Number",
  col_issue: "Issue date",
  col_due: "Due date",
  col_amount: "Amount",
  col_status: "Status",
  col_actions: "Actions",
  status_unpaid: "Unpaid",
  status_paid: "Paid",
  status_overdue: "Overdue",
  table_actions_paid: "Paid",
  table_actions_overdue: "Overdue",
  modal_add_title: "Add invoice",
  modal_company: "Company",
  modal_category: "Category",
  modal_number: "Number",
  modal_issue: "Issue date",
  modal_due: "Due date",
  modal_amount: "Amount",
  modal_currency: "Currency",
  modal_status: "Status",
  modal_cancel: "Cancel",
  modal_save: "Save",
  modal_totp_title: "Enable email 2FA",
  modal_totp_hint: "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
  modal_totp_code_label: "6-digit code",
  modal_totp_cancel: "İptal",
  modal_totp_confirm: "Onayla",
  modal_account_title: "Switch account",
  modal_account_add: "+ Add another account",
  profile_title: "Profilim",
  profile_subtitle: "Hesap bilgileri ve plan",
  profile_identity_title: "Identity & contact",
  profile_first_name: "Ad",
  profile_last_name: "Soyad",
  profile_company_label: "Company name",
  profile_company_hint: "Shown when your plan is Business.",
  profile_save_btn: "Save changes",
  profile_saved: "Profile updated.",
  profile_plan_title: "Your plan",
  profile_plan_note: "Plans can be changed only on the DueFlux website.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc: "Full features for families, households and personal invoices.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc: "Full features for companies handling supplier invoices with a business account.",
  profile_plan_device_note: "All plans work on desktop and mobile.",
  profile_manage_on_web: "Open website",
  profile_password_title: "Password",
  profile_password_body: "Change your password from the website for better security.",
  profile_password_btn: "Change on website",
  profile_close_btn: "Close",
  profile_plan_readonly: "Plan changes are managed on the website.",
  splash_subtitle: "Unified invoices for home & business.",
  splash_loading_1: "Loading assets...",
  splash_loading_2: "Syncing invoice engine...",
  splash_loading_3: "Preparing secure vault...",
  splash_loading_4: "Finalizing workspace...",
  alert_fill_all_fields: "Please fill all fields.",
  alert_offline: "You are offline. Mail sync requires internet.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Mail sync error.",
  alert_totp_code: "6 haneli kodu gir.",
  alert_totp_invalid: "Invalid verification code.",
  alert_totp_disable_password: "Enter the 6-digit code.",
  alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
  alert_totp_setup_error: "Cannot send verification code.",
  alert_profile_error: "Cannot save profile right now.",
  alert_profile_saved: "Profile saved.",
  offline_required: "Internet connection required. DueFlux is online-only.",
  plan_basic_label: "Basic",
  plan_business_label: "Business",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Enable email 2FA",
  totp_cta_disable: "Disable email 2FA",
  totp_on_label: "EMAIL VERIFIED",
  totp_on_desc: "You're online and syncing with DueFlux Cloud.",
  totp_off_label: "EMAIL NOT VERIFIED",
  totp_off_desc: "Reconnect to sync invoices and updates.",
  security_title: "Email verification",
  security_subtitle: "Email verification is managed on the DueFlux website.",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
};

i18n.ar = {
  login_title: "DueFlux",
  login_subtitle: "فواتير موحدة للمنزل والعمل.",
  login_email: "البريد الإلكتروني",
  login_password: "كلمة المرور",
  login_btn: "Sign in",
  login_hint: "استخدم نفس الحساب الموجود في تطبيق سطح المكتب/الويب.",
  login_signup_cta: "ليس لديك حساب؟ أنشئه على موقع DueFlux.",
  login_signup_link: "إنشاء حساب على الموقع",
  msg_missing_email: "Please enter an email.",
  msg_missing_password: "Please enter a password.",
  msg_missing_fields: "Email and password are required.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "الإعدادات",
  settings_subtitle: "Personalize DueFlux for you.",
  settings_appearance_title: "Appearance",
  settings_theme_label: "Theme",
  settings_theme_hint: "Auto follows your system preference (Windows, macOS, Linux, mobile).",
  settings_display_title: "Display",
  settings_fullscreen_btn_enter: "Enter fullscreen",
  settings_fullscreen_btn_exit: "Exit fullscreen",
  settings_fullscreen_hint: "You can also press F11 while DueFlux is focused.",
  settings_language_title: "Language",
  settings_account_title: "Account",
  settings_updates_title: "Updates",
  settings_updates_subtitle: "Keep DueFlux updated with the latest improvements.",
  settings_updates_check: "Check for updates",
  settings_updates_checking: "Checking for updates...",
  settings_updates_available: "Update available.",
  settings_updates_none: "You're up to date.",
  settings_updates_downloading: "Downloading update...",
  settings_updates_download: "Download update",
  settings_updates_install: "Install update",
  settings_updates_ready: "Update ready. Restart to install.",
  settings_updates_error: "Update check failed.",
  settings_updates_current: "Current version",
  settings_legal_title: "Legal",
  settings_switch_account: "تبديل الحساب",
  settings_logout: "تسجيل الخروج",
  theme_dark: "Dark",
  theme_light: "Light",
  theme_auto: "Auto",
  settings_link_gdpr: "GDPR & Data protection",
  settings_link_terms: "Terms of Service",
  settings_link_privacy: "Privacy Policy",
  legal_gdpr_title: "GDPR & Data protection",
  legal_gdpr_body: "We process your invoice data solely to provide the DueFlux service. You can request export or deletion of your data at any time. Your data is not sold to third parties.",
  legal_terms_title: "Terms of Service",
  legal_terms_body: "DueFlux is provided as-is, without any guarantee. You are responsible for the accuracy of invoices and payment deadlines. Using the app implies acceptance of these terms.",
  legal_privacy_title: "Privacy Policy",
  legal_privacy_body: "We store only the information required to operate your account and sync invoices. Cookies and local storage are used to remember your preferences on this device.",
  legal_close_btn: "Close",
  settings_no_accounts: "No stored accounts yet.",
  settings_last_used: "Last used {{min}} min ago",
  settings_last_just_now: "Just now",
  settings_use_account: "Use this account",
  app_tagline: "Unified invoices for home & business.",
  overview_title: "نظرة عامة",
  kpi_total: "Total this month",
  kpi_unpaid: "Unpaid",
  kpi_overdue: "Overdue",
  invoices_title: "الفواتير",
  sync_mail: "Sync mail",
  sync_panel_title: "صندوق الفواتير",
  sync_panel_desc: "قم بإعادة توجيه الفواتير إلى عنوان DueFlux الخاص بك.",
  sync_panel_copy: "نسخ العنوان",
  sync_panel_copied: "تم نسخ العنوان.",
  sync_panel_pending: "جارٍ إنشاء الصندوق...",
  sync_panel_ready: "جاهز. قم بإعادة توجيه الفواتير إلى هذا العنوان.",
  sync_panel_empty: "اضغط مزامنة البريد لإنشاء صندوق الفواتير.",
  sync_panel_error: "تعذر إنشاء الصندوق. حاول مرة أخرى.",
  add_invoice: "Add invoice",
  col_company: "Company",
  col_category: "Category",
  col_number: "Number",
  col_issue: "Issue date",
  col_due: "Due date",
  col_amount: "Amount",
  col_status: "Status",
  col_actions: "Actions",
  status_unpaid: "Unpaid",
  status_paid: "Paid",
  status_overdue: "Overdue",
  table_actions_paid: "Paid",
  table_actions_overdue: "Overdue",
  modal_add_title: "Add invoice",
  modal_company: "Company",
  modal_category: "Category",
  modal_number: "Number",
  modal_issue: "Issue date",
  modal_due: "Due date",
  modal_amount: "Amount",
  modal_currency: "Currency",
  modal_status: "Status",
  modal_cancel: "Cancel",
  modal_save: "Save",
  modal_totp_title: "Enable email 2FA",
  modal_totp_hint: "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
  modal_totp_code_label: "6-digit code",
  modal_totp_cancel: "إلغاء",
  modal_totp_confirm: "تأكيد",
  modal_account_title: "Switch account",
  modal_account_add: "+ Add another account",
  profile_title: "ملفي",
  profile_subtitle: "تفاصيل الحساب والخطة",
  profile_identity_title: "Identity & contact",
  profile_first_name: "الاسم الأول",
  profile_last_name: "اسم العائلة",
  profile_company_label: "Company name",
  profile_company_hint: "Shown when your plan is Business.",
  profile_save_btn: "Save changes",
  profile_saved: "Profile updated.",
  profile_plan_title: "Your plan",
  profile_plan_note: "Plans can be changed only on the DueFlux website.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc: "Full features for families, households and personal invoices.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc: "Full features for companies handling supplier invoices with a business account.",
  profile_plan_device_note: "All plans work on desktop and mobile.",
  profile_manage_on_web: "Open website",
  profile_password_title: "Password",
  profile_password_body: "Change your password from the website for better security.",
  profile_password_btn: "Change on website",
  profile_close_btn: "Close",
  profile_plan_readonly: "Plan changes are managed on the website.",
  splash_subtitle: "Unified invoices for home & business.",
  splash_loading_1: "Loading assets...",
  splash_loading_2: "Syncing invoice engine...",
  splash_loading_3: "Preparing secure vault...",
  splash_loading_4: "Finalizing workspace...",
  alert_fill_all_fields: "Please fill all fields.",
  alert_offline: "You are offline. Mail sync requires internet.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Mail sync error.",
  alert_totp_code: "أدخل رمز الـ 6 أرقام.",
  alert_totp_invalid: "Invalid verification code.",
  alert_totp_disable_password: "Enter the 6-digit code.",
  alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
  alert_totp_setup_error: "Cannot send verification code.",
  alert_profile_error: "Cannot save profile right now.",
  alert_profile_saved: "Profile saved.",
  offline_required: "Internet connection required. DueFlux is online-only.",
  plan_basic_label: "Basic",
  plan_business_label: "Business",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Enable email 2FA",
  totp_cta_disable: "Disable email 2FA",
  totp_on_label: "EMAIL VERIFIED",
  totp_on_desc: "You're online and syncing with DueFlux Cloud.",
  totp_off_label: "EMAIL NOT VERIFIED",
  totp_off_desc: "Reconnect to sync invoices and updates.",
  security_title: "Email verification",
  security_subtitle: "Email verification is managed on the DueFlux website.",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
};

i18n.ro = {
  login_title: "DueFlux",
  login_subtitle: "Facturi unificate pentru acasă și afaceri.",
  login_email: "Email",
  login_password: "Parolă",
  login_btn: "Autentificare",
  login_hint:
    "Apasă Enter pentru a trimite sau folosește butonul. Câmpurile lipsă vor fi evidențiate.",
  login_signup_cta: "Nu ai cont? Creează-l pe site-ul DueFlux.",
  login_signup_link: "Creează cont pe site",

  msg_missing_email: "Introdu emailul.",
  msg_missing_password: "Introdu parola.",
  msg_missing_fields: "Emailul și parola sunt obligatorii.",
  msg_invalid_credentials: "Email sau parola incorecte.",
  settings_title: "Setări",
  settings_subtitle: "Personalizează DueFlux pentru tine.",
  settings_appearance_title: "Aspect",
  settings_theme_label: "Temă",
  settings_theme_hint:
    "Auto urmărește preferința din sistem (Windows, macOS, Linux, mobil).",
  settings_display_title: "Afișare",
  settings_fullscreen_btn_enter: "Intră în fullscreen",
  settings_fullscreen_btn_exit: "Ieși din fullscreen",
  settings_fullscreen_hint:
    "Poți folosi și tasta F11 cât timp DueFlux este activ.",
  settings_language_title: "Limba",
  settings_account_title: "Cont",
  settings_updates_title: "Actualizari",
  settings_updates_subtitle: "Pastreaza DueFlux la zi cu ultimele imbunatatiri.",
  settings_updates_check: "Verifica actualizari",
  settings_updates_checking: "Verificam actualizarile...",
  settings_updates_available: "Actualizare disponibila.",
  settings_updates_none: "Esti la zi.",
  settings_updates_downloading: "Se descarca actualizarea...",
  settings_updates_download: "Descarca actualizarea",
  settings_updates_install: "Instaleaza actualizarea",
  settings_updates_ready: "Actualizare gata. Reporneste pentru instalare.",
  settings_updates_error: "Nu am putut verifica actualizarile.",
  settings_updates_current: "Versiunea curenta",
  update_prompt_title: "Actualizare DueFlux",
  update_prompt_desc:
    "Alege cum vrei sa fie descarcata si instalata aceasta actualizare.",
  update_prompt_core: "Actualizare produs",
  update_prompt_auto: "Instaleaza automat dupa descarcare",
  update_prompt_details: "Detalii",
  update_prompt_details_hide: "Ascunde detaliile",
  update_prompt_later: "Mai tarziu",
  update_prompt_action_download: "Descarca actualizarea",
  update_prompt_action_install: "Instaleaza acum",
  update_prompt_action_downloading: "Se descarca...",
  update_prompt_action_checking: "Verificam...",
  update_prompt_release: "Versiune",
  update_prompt_published: "Publicata",
  update_prompt_notes_missing: "Nu sunt disponibile note de release.",
  update_prompt_size_unknown: "Dimensiune indisponibila",
  settings_legal_title: "Legal",
  settings_switch_account: "Schimbă contul",
  settings_logout: "Deconectare",

  theme_dark: "Întunecat",
  theme_light: "Luminos",
  theme_auto: "Auto",

  settings_link_gdpr: "GDPR și protecția datelor",
  settings_link_terms: "Termeni și condiții",
  settings_link_privacy: "Politica de confidențialitate",

  legal_gdpr_title: "GDPR și protecția datelor",
  legal_gdpr_body:
    "Prelucrăm datele facturilor doar pentru a furniza serviciul DueFlux. Poți solicita oricând exportul sau ștergerea datelor tale. Nu vindem date către terți.",
  legal_terms_title: "Termeni și condiții",
  legal_terms_body:
    "DueFlux este oferit ca atare, fără garanții. Ești responsabil pentru corectitudinea facturilor și a termenelor de plată. Utilizarea aplicației implică acceptarea acestor termeni.",
  legal_privacy_title: "Politica de confidențialitate",
  legal_privacy_body:
    "Stocăm doar informațiile necesare funcționării contului și sincronizării facturilor. Cookie-urile și stocarea locală sunt folosite pentru a reține preferințele pe acest dispozitiv.",
  legal_close_btn: "Închide",

  settings_no_accounts: "Nu există conturi salvate.",
  settings_last_used: "Ultima utilizare acum {{min}} min",
  settings_last_just_now: "Chiar acum",
  settings_use_account: "Folosește acest cont",

  app_tagline: "Facturi unificate pentru acasă și afaceri.",
  overview_title: "Prezentare",
  kpi_total: "Total luna aceasta",
  kpi_unpaid: "Neplătite",
  kpi_overdue: "Întârziate",

  invoices_title: "Facturi",
  sync_mail: "Sincronizează email",
  sync_panel_title: "Inbox facturi",
  sync_panel_desc: "Redirecționează facturile către adresa ta personală DueFlux.",
  sync_panel_copy: "Copiază adresa",
  sync_panel_copied: "Adresa a fost copiată.",
  sync_panel_pending: "Se generează inboxul...",
  sync_panel_ready: "Gata. Redirecționează facturile la această adresă.",
  sync_panel_empty: "Apasă Sincronizează email pentru a genera inboxul de facturi.",
  sync_panel_error: "Nu am putut crea inboxul. Încearcă din nou.",
  add_invoice: "Adaugă factură",
  col_company: "Companie",
  col_category: "Categorie",
  col_number: "Număr",
  col_issue: "Data emiterii",
  col_due: "Data scadenței",
  col_amount: "Sumă",
  col_status: "Stare",
  col_actions: "Acțiuni",
  status_unpaid: "Neplătită",
  status_paid: "Plătită",
  status_overdue: "Întârziată",
  table_actions_paid: "Plătită",
  table_actions_overdue: "Întârziată",

  modal_add_title: "Adaugă factură",
  modal_company: "Companie",
  modal_category: "Categorie",
  modal_number: "Număr",
  modal_issue: "Data emiterii",
  modal_due: "Data scadenței",
  modal_amount: "Sumă",
  modal_currency: "Monedă",
  modal_status: "Stare",
  modal_cancel: "Anulează",
  modal_save: "Salvează",

  modal_totp_title: "Activează 2FA",
  modal_totp_hint:
    "Scanează codul sau adaugă secretul în aplicația de autentificare, apoi introdu codul de 6 cifre.",
  modal_totp_code_label: "Cod de 6 cifre",
  modal_totp_cancel: "Anulează",
  modal_totp_confirm: "Confirmă",

  modal_account_title: "Schimbă contul",
  modal_account_add: "+ Adaugă alt cont",

  profile_title: "Profilul meu",
  profile_subtitle: "Detalii cont și plan",
  profile_identity_title: "Identitate și date",
  profile_first_name: "Prenume",
  profile_last_name: "Nume",
  profile_company_label: "Nume companie",
  profile_company_hint: "Afișat când planul este Business.",
  profile_save_btn: "Salvează modificările",
  profile_saved: "Profil actualizat.",
  profile_plan_title: "Planul tău",
  profile_plan_note: "Planurile se pot schimba doar pe site-ul DueFlux.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc:
    "Funcții complete pentru familii, gospodării și facturi personale.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc:
    "Funcții complete pentru companii care gestionează facturi de la furnizori cu un cont de business.",
  profile_plan_device_note: "Toate planurile funcționează pe desktop și mobil.",
  profile_manage_on_web: "Deschide site-ul",
  profile_password_title: "Parolă",
  profile_password_body:
    "Schimbă parola din site pentru mai multă siguranță.",
  profile_password_btn: "Schimbă pe site",
  profile_close_btn: "Închide",
  profile_plan_readonly: "Modificarea planului se face doar pe site.",

  splash_subtitle: "Facturi unificate pentru acasă și afaceri.",
  splash_loading_1: "Se încarcă resursele...",
  splash_loading_2: "Sincronizare motor de facturi...",
  splash_loading_3: "Pregătire seif securizat...",
  splash_loading_4: "Finalizare spațiu de lucru...",

  alert_fill_all_fields: "Completează toate câmpurile.",
  alert_offline: "Ești offline. Sincronizarea email necesită internet.",
  alert_sync_done: "Sincronizare ceruta.",
  alert_sync_error: "Eroare la sincronizarea emailului.",
  alert_totp_code: "Introdu codul de 6 cifre.",
  alert_totp_invalid: "Cod TOTP invalid.",
  alert_totp_disable_password: "Introdu parola pentru a dezactiva 2FA:",
  alert_totp_disable_error: "Nu putem dezactiva 2FA. Verifică parola.",
  alert_totp_setup_error: "Nu putem configura 2FA acum.",
  alert_profile_error: "Nu putem salva profilul acum.",
  alert_profile_saved: "Profil salvat.",

  plan_basic_label: "Basic",
  plan_business_label: "Business",
  msg_email_unverified: "Email neverificat. Verifica pe site-ul DueFlux.",
  settings_footnote: "c 2025 DueFlux. Setarile se sincronizeaza in contul tau.",
  totp_cta_enable: "Deschide site-ul",
  totp_cta_disable: "Deschide site-ul",
  totp_on_label: "CLOUD CONECTAT",
  totp_on_desc: "Esti online si sincronizezi cu DueFlux Cloud.",
  totp_off_label: "OFFLINE",
  totp_off_desc: "Reconecteaza-te pentru a sincroniza facturile si actualizarile.",
  security_title: "Status cloud",
  security_subtitle: "DueFlux ramane sincronizat cu contul tau din cloud.",
};

i18n.fr = {
  login_title: "DueFlux",
  login_subtitle: "Factures unifiées pour la maison et l'entreprise.",
  login_email: "E-mail",
  login_password: "Mot de passe",
  login_btn: "Connexion",
  login_hint:
    "Appuyez sur Entrée ou utilisez le bouton. Les champs manquants seront signalés.",
  login_signup_cta: "Pas de compte ? Créez-le sur le site DueFlux.",
  login_signup_link: "Créer un compte sur le site",

  msg_missing_email: "Veuillez saisir un e-mail.",
  msg_missing_password: "Veuillez saisir un mot de passe.",
  msg_missing_fields: "E-mail et mot de passe sont requis.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "Paramètres",
  settings_subtitle: "Personnalisez DueFlux pour vous.",
  settings_appearance_title: "Apparence",
  settings_theme_label: "Thème",
  settings_theme_hint:
    "Auto suit la préférence du système (Windows, macOS, Linux, mobile).",
  settings_display_title: "Affichage",
  settings_fullscreen_btn_enter: "Mode plein écran",
  settings_fullscreen_btn_exit: "Quitter le plein écran",
  settings_fullscreen_hint:
    "Vous pouvez aussi utiliser F11 lorsque DueFlux est actif.",
  settings_language_title: "Langue",
  settings_account_title: "Compte",
  settings_updates_title: "Mises a jour",
  settings_updates_subtitle: "Gardez DueFlux a jour avec les dernieres ameliorations.",
  settings_updates_check: "Verifier les mises a jour",
  settings_updates_checking: "Verification des mises a jour...",
  settings_updates_available: "Mise a jour disponible.",
  settings_updates_none: "Vous etes a jour.",
  settings_updates_downloading: "Telechargement de la mise a jour...",
  settings_updates_download: "Telecharger la mise a jour",
  settings_updates_install: "Installer la mise a jour",
  settings_updates_ready: "Mise a jour prete. Redemarrez pour l'installer.",
  settings_updates_error: "Echec de la verification des mises a jour.",
  settings_updates_current: "Version actuelle",
  settings_legal_title: "Légal",
  settings_switch_account: "Changer de compte",
  settings_logout: "Déconnexion",

  theme_dark: "Sombre",
  theme_light: "Clair",
  theme_auto: "Auto",

  settings_link_gdpr: "RGPD et protection des données",
  settings_link_terms: "Conditions d'utilisation",
  settings_link_privacy: "Politique de confidentialité",

  legal_gdpr_title: "RGPD et protection des données",
  legal_gdpr_body:
    "Nous traitons vos données de factures uniquement pour fournir le service DueFlux. Vous pouvez demander l'export ou la suppression de vos données à tout moment. Vos données ne sont pas vendues à des tiers.",
  legal_terms_title: "Conditions d'utilisation",
  legal_terms_body:
    "DueFlux est fourni tel quel, sans garantie. Vous êtes responsable de l'exactitude des factures et des échéances. L'utilisation de l'application implique l'acceptation de ces conditions.",
  legal_privacy_title: "Politique de confidentialité",
  legal_privacy_body:
    "Nous stockons uniquement les informations nécessaires au fonctionnement de votre compte et à la synchronisation des factures. Les cookies et le stockage local mémorisent vos préférences sur cet appareil.",
  legal_close_btn: "Fermer",

  settings_no_accounts: "Aucun compte enregistré.",
  settings_last_used: "Dernière utilisation il y a {{min}} min",
  settings_last_just_now: "À l'instant",
  settings_use_account: "Utiliser ce compte",

  app_tagline: "Factures unifiées pour la maison et l'entreprise.",
  overview_title: "Vue d'ensemble",
  kpi_total: "Total ce mois-ci",
  kpi_unpaid: "Impayées",
  kpi_overdue: "En retard",

  invoices_title: "Factures",
  sync_mail: "Synchroniser l'e-mail",
  sync_panel_title: "Boîte de factures",
  sync_panel_desc: "Transférez vos factures vers votre adresse DueFlux personnelle.",
  sync_panel_copy: "Copier l'adresse",
  sync_panel_copied: "Adresse copiée.",
  sync_panel_pending: "Création de la boîte...",
  sync_panel_ready: "Prêt. Transférez les factures vers cette adresse.",
  sync_panel_empty: "Cliquez sur Synchroniser l'e-mail pour générer votre boîte.",
  sync_panel_error: "Impossible de créer la boîte. Réessayez.",
  add_invoice: "Ajouter une facture",
  col_company: "Entreprise",
  col_category: "Catégorie",
  col_number: "Numéro",
  col_issue: "Date d'émission",
  col_due: "Date d'échéance",
  col_amount: "Montant",
  col_status: "Statut",
  col_actions: "Actions",
  status_unpaid: "Impayée",
  status_paid: "Payée",
  status_overdue: "En retard",
  table_actions_paid: "Payée",
  table_actions_overdue: "En retard",

  modal_add_title: "Ajouter une facture",
  modal_company: "Entreprise",
  modal_category: "Catégorie",
  modal_number: "Numéro",
  modal_issue: "Date d'émission",
  modal_due: "Date d'échéance",
  modal_amount: "Montant",
  modal_currency: "Devise",
  modal_status: "Statut",
  modal_cancel: "Annuler",
  modal_save: "Enregistrer",

  modal_totp_title: "Activer 2FA",
  modal_totp_hint:
    "Scannez le code ou ajoutez le secret dans votre application, puis saisissez le code à 6 chiffres.",
  modal_totp_code_label: "Code à 6 chiffres",
  modal_totp_cancel: "Annuler",
  modal_totp_confirm: "Confirmer",

  modal_account_title: "Changer de compte",
  modal_account_add: "+ Ajouter un autre compte",

  profile_title: "Mon profil",
  profile_subtitle: "Détails du compte et plan",
  profile_identity_title: "Identité et contact",
  profile_first_name: "Prénom",
  profile_last_name: "Nom",
  profile_company_label: "Nom de l'entreprise",
  profile_company_hint: "Affiché lorsque votre plan est Business.",
  profile_save_btn: "Enregistrer",
  profile_saved: "Profil mis à jour.",
  profile_plan_title: "Votre plan",
  profile_plan_note: "Les plans se modifient uniquement sur le site DueFlux.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc:
    "Toutes les fonctionnalités pour familles, foyers et facturation personnelle.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc:
    "Toutes les fonctionnalités pour les entreprises qui gèrent les factures fournisseurs avec un compte professionnel.",
  profile_plan_device_note: "Tous les plans fonctionnent sur ordinateur et mobile.",
  profile_manage_on_web: "Ouvrir le site",
  profile_password_title: "Mot de passe",
  profile_password_body:
    "Changez votre mot de passe depuis le site pour plus de sécurité.",
  profile_password_btn: "Changer sur le site",
  profile_close_btn: "Fermer",
  profile_plan_readonly: "Les changements de plan se font sur le site.",

  splash_subtitle: "Factures unifiées pour la maison et l'entreprise.",
  splash_loading_1: "Chargement des ressources...",
  splash_loading_2: "Synchronisation du moteur de factures...",
  splash_loading_3: "Préparation du coffre sécurisé...",
  splash_loading_4: "Finalisation de l'espace de travail...",

  alert_fill_all_fields: "Veuillez remplir tous les champs.",
  alert_offline: "Vous êtes hors ligne. La synchronisation de l'e-mail nécessite internet.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Erreur lors de la synchronisation de l'e-mail.",
  alert_totp_code: "Saisissez le code à 6 chiffres.",
  alert_totp_invalid: "Code TOTP invalide.",
  alert_totp_disable_password: "Saisissez votre mot de passe pour désactiver 2FA :",
  alert_totp_disable_error: "Impossible de désactiver 2FA. Vérifiez le mot de passe.",
  alert_totp_setup_error: "Impossible de configurer 2FA pour le moment.",
  alert_profile_error: "Impossible d'enregistrer le profil.",
  alert_profile_saved: "Profil enregistré.",

  plan_basic_label: "Basic",
  plan_business_label: "Business",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Open website",
  totp_cta_disable: "Open website",
  totp_on_label: "CLOUD CONNECTE",
  totp_on_desc: "Vous etes en ligne et synchronisez avec DueFlux Cloud.",
  totp_off_label: "HORS LIGNE",
  totp_off_desc: "Reconnectez-vous pour synchroniser les factures et mises a jour.",
  security_title: "Statut cloud",
  security_subtitle: "DueFlux reste synchronise avec votre compte cloud.",
};

i18n.de = {
  login_title: "DueFlux",
  login_subtitle: "Vereinte Rechnungen für Zuhause und Unternehmen.",
  login_email: "E-Mail",
  login_password: "Passwort",
  login_btn: "Anmelden",
  login_hint:
    "Drücke Enter oder nutze den Button. Fehlende Felder werden hervorgehoben.",
  login_signup_cta: "Noch kein Konto? Erstelle es auf der DueFlux-Website.",
  login_signup_link: "Konto auf der Website erstellen",

  msg_missing_email: "Bitte E-Mail eingeben.",
  msg_missing_password: "Bitte Passwort eingeben.",
  msg_missing_fields: "E-Mail und Passwort sind erforderlich.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "Einstellungen",
  settings_subtitle: "Passe DueFlux für dich an.",
  settings_appearance_title: "Aussehen",
  settings_theme_label: "Thema",
  settings_theme_hint:
    "Auto folgt deiner Systemeinstellung (Windows, macOS, Linux, Mobil).",
  settings_display_title: "Anzeige",
  settings_fullscreen_btn_enter: "Vollbildmodus",
  settings_fullscreen_btn_exit: "Vollbild verlassen",
  settings_fullscreen_hint:
    "Du kannst auch F11 drücken, solange DueFlux aktiv ist.",
  settings_language_title: "Sprache",
  settings_account_title: "Konto",
  settings_updates_title: "Updates",
  settings_updates_subtitle: "Halte DueFlux mit den neuesten Verbesserungen aktuell.",
  settings_updates_check: "Nach Updates suchen",
  settings_updates_checking: "Suche nach Updates...",
  settings_updates_available: "Update verfugbar.",
  settings_updates_none: "Du bist auf dem neuesten Stand.",
  settings_updates_downloading: "Update wird heruntergeladen...",
  settings_updates_download: "Update herunterladen",
  settings_updates_install: "Update installieren",
  settings_updates_ready: "Update bereit. Starte neu zur Installation.",
  settings_updates_error: "Update-Prufung fehlgeschlagen.",
  settings_updates_current: "Aktuelle Version",
  settings_legal_title: "Rechtliches",
  settings_switch_account: "Konto wechseln",
  settings_logout: "Abmelden",

  theme_dark: "Dunkel",
  theme_light: "Hell",
  theme_auto: "Auto",

  settings_link_gdpr: "DSGVO & Datenschutz",
  settings_link_terms: "Nutzungsbedingungen",
  settings_link_privacy: "Datenschutzrichtlinie",

  legal_gdpr_title: "DSGVO & Datenschutz",
  legal_gdpr_body:
    "Wir verarbeiten deine Rechnungsdaten nur, um den DueFlux-Dienst bereitzustellen. Du kannst jederzeit den Export oder das Löschen deiner Daten anfordern. Deine Daten werden nicht verkauft.",
  legal_terms_title: "Nutzungsbedingungen",
  legal_terms_body:
    "DueFlux wird wie besehen bereitgestellt, ohne Garantie. Du bist verantwortlich für die Richtigkeit der Rechnungen und Fälligkeiten. Die Nutzung der App bedeutet die Zustimmung zu diesen Bedingungen.",
  legal_privacy_title: "Datenschutzrichtlinie",
  legal_privacy_body:
    "Wir speichern nur die Informationen, die für dein Konto und die Synchronisierung der Rechnungen nötig sind. Cookies und lokaler Speicher merken sich deine Einstellungen auf diesem Gerät.",
  legal_close_btn: "Schließen",

  settings_no_accounts: "Noch keine gespeicherten Konten.",
  settings_last_used: "Zuletzt verwendet vor {{min}} Min",
  settings_last_just_now: "Gerade eben",
  settings_use_account: "Dieses Konto nutzen",

  app_tagline: "Vereinte Rechnungen für Zuhause und Unternehmen.",
  overview_title: "Übersicht",
  kpi_total: "Summe diesen Monat",
  kpi_unpaid: "Offen",
  kpi_overdue: "Überfällig",

  invoices_title: "Rechnungen",
  sync_mail: "E-Mails synchronisieren",
  sync_panel_title: "Rechnungs-Postfach",
  sync_panel_desc: "Leite Rechnungen an deine persönliche DueFlux-Adresse weiter.",
  sync_panel_copy: "Adresse kopieren",
  sync_panel_copied: "Adresse kopiert.",
  sync_panel_pending: "Postfach wird erstellt...",
  sync_panel_ready: "Bereit. Leite Rechnungen an diese Adresse weiter.",
  sync_panel_empty: "Klicke auf E-Mail-Sync, um dein Postfach zu erstellen.",
  sync_panel_error: "Postfach konnte nicht erstellt werden. Bitte erneut versuchen.",
  add_invoice: "Rechnung hinzufügen",
  col_company: "Unternehmen",
  col_category: "Kategorie",
  col_number: "Nummer",
  col_issue: "Ausstellungsdatum",
  col_due: "Fälligkeitsdatum",
  col_amount: "Betrag",
  col_status: "Status",
  col_actions: "Aktionen",
  status_unpaid: "Offen",
  status_paid: "Bezahlt",
  status_overdue: "Überfällig",
  table_actions_paid: "Bezahlt",
  table_actions_overdue: "Überfällig",

  modal_add_title: "Rechnung hinzufügen",
  modal_company: "Unternehmen",
  modal_category: "Kategorie",
  modal_number: "Nummer",
  modal_issue: "Ausstellungsdatum",
  modal_due: "Fälligkeitsdatum",
  modal_amount: "Betrag",
  modal_currency: "Währung",
  modal_status: "Status",
  modal_cancel: "Abbrechen",
  modal_save: "Speichern",

  modal_totp_title: "2FA aktivieren",
  modal_totp_hint:
    "Scanne den Code oder füge das Geheimnis in deiner Auth-App hinzu und gib dann den 6-stelligen Code ein.",
  modal_totp_code_label: "6-stelliger Code",
  modal_totp_cancel: "Abbrechen",
  modal_totp_confirm: "Bestätigen",

  modal_account_title: "Konto wechseln",
  modal_account_add: "+ Weiteres Konto hinzufügen",

  profile_title: "Mein Profil",
  profile_subtitle: "Kontodaten und Plan",
  profile_identity_title: "Identität & Kontakt",
  profile_first_name: "Vorname",
  profile_last_name: "Nachname",
  profile_company_label: "Firmenname",
  profile_company_hint: "Wird angezeigt, wenn der Plan Business ist.",
  profile_save_btn: "Änderungen speichern",
  profile_saved: "Profil aktualisiert.",
  profile_plan_title: "Dein Plan",
  profile_plan_note: "Pläne lassen sich nur auf der DueFlux-Website ändern.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc:
    "Volle Funktionen für Familien, Haushalte und private Rechnungen.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc:
    "Volle Funktionen für Firmen, die Lieferantenrechnungen mit einem Geschäftskonto verwalten.",
  profile_plan_device_note: "Alle Pläne funktionieren auf Desktop und Mobil.",
  profile_manage_on_web: "Website öffnen",
  profile_password_title: "Passwort",
  profile_password_body:
    "Ändere dein Passwort auf der Website für mehr Sicherheit.",
  profile_password_btn: "Auf der Website ändern",
  profile_close_btn: "Schließen",
  profile_plan_readonly: "Planänderungen erfolgen auf der Website.",

  splash_subtitle: "Vereinte Rechnungen für Zuhause und Unternehmen.",
  splash_loading_1: "Ressourcen werden geladen...",
  splash_loading_2: "Rechnungs-Engine wird synchronisiert...",
  splash_loading_3: "Sicherer Tresor wird vorbereitet...",
  splash_loading_4: "Arbeitsbereich wird fertiggestellt...",

  alert_fill_all_fields: "Bitte alle Felder ausfüllen.",
  alert_offline: "Du bist offline. E-Mail-Sync benötigt Internet.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Fehler beim E-Mail-Sync.",
  alert_totp_code: "Bitte den 6-stelligen Code eingeben.",
  alert_totp_invalid: "Ungültiger TOTP-Code.",
  alert_totp_disable_password: "Passwort eingeben, um 2FA zu deaktivieren:",
  alert_totp_disable_error: "2FA kann nicht deaktiviert werden. Passwort prüfen.",
  alert_totp_setup_error: "2FA kann derzeit nicht eingerichtet werden.",
  alert_profile_error: "Profil kann derzeit nicht gespeichert werden.",
  alert_profile_saved: "Profil gespeichert.",

  plan_basic_label: "Basic",
  plan_business_label: "Business",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Open website",
  totp_cta_disable: "Open website",
  totp_on_label: "CLOUD VERBUNDEN",
  totp_on_desc: "Du bist online und synchronisierst mit DueFlux Cloud.",
  totp_off_label: "OFFLINE",
  totp_off_desc: "Verbinde dich neu, um Rechnungen und Updates zu synchronisieren.",
  security_title: "Cloud-Status",
  security_subtitle: "DueFlux bleibt mit deinem Cloud-Konto synchronisiert.",
};

i18n.es = {
  login_title: "DueFlux",
  login_subtitle: "Facturas unificadas para hogar y negocio.",
  login_email: "Correo",
  login_password: "Contraseña",
  login_btn: "Iniciar sesión",
  login_hint:
    "Pulsa Enter o usa el botón. Los campos faltantes se resaltarán.",
  login_signup_cta: "¿No tienes cuenta? Créala en el sitio de DueFlux.",
  login_signup_link: "Crear cuenta en el sitio",

  msg_missing_email: "Ingresa el correo electrónico.",
  msg_missing_password: "Ingresa la contraseña.",
  msg_missing_fields: "Correo y contraseña son obligatorios.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "Configuración",
  settings_subtitle: "Personaliza DueFlux para ti.",
  settings_appearance_title: "Apariencia",
  settings_theme_label: "Tema",
  settings_theme_hint:
    "Auto sigue la preferencia del sistema (Windows, macOS, Linux, móvil).",
  settings_display_title: "Pantalla",
  settings_fullscreen_btn_enter: "Entrar en pantalla completa",
  settings_fullscreen_btn_exit: "Salir de pantalla completa",
  settings_fullscreen_hint:
    "También puedes usar F11 mientras DueFlux está activo.",
  settings_language_title: "Idioma",
  settings_account_title: "Cuenta",
  settings_updates_title: "Actualizaciones",
  settings_updates_subtitle: "Manten DueFlux actualizado con las ultimas mejoras.",
  settings_updates_check: "Buscar actualizaciones",
  settings_updates_checking: "Buscando actualizaciones...",
  settings_updates_available: "Actualizacion disponible.",
  settings_updates_none: "Estas al dia.",
  settings_updates_downloading: "Descargando actualizacion...",
  settings_updates_download: "Descargar actualizacion",
  settings_updates_install: "Instalar actualizacion",
  settings_updates_ready: "Actualizacion lista. Reinicia para instalar.",
  settings_updates_error: "No se pudo comprobar actualizaciones.",
  settings_updates_current: "Version actual",
  settings_legal_title: "Legal",
  settings_switch_account: "Cambiar cuenta",
  settings_logout: "Cerrar sesión",

  theme_dark: "Oscuro",
  theme_light: "Claro",
  theme_auto: "Auto",

  settings_link_gdpr: "RGPD y protección de datos",
  settings_link_terms: "Términos de servicio",
  settings_link_privacy: "Política de privacidad",

  legal_gdpr_title: "RGPD y protección de datos",
  legal_gdpr_body:
    "Procesamos tus datos de facturas solo para ofrecer el servicio DueFlux. Puedes solicitar la exportación o eliminación de tus datos en cualquier momento. No vendemos tus datos a terceros.",
  legal_terms_title: "Términos de servicio",
  legal_terms_body:
    "DueFlux se ofrece tal cual, sin garantía. Eres responsable de la exactitud de las facturas y las fechas de pago. El uso de la app implica la aceptación de estos términos.",
  legal_privacy_title: "Política de privacidad",
  legal_privacy_body:
    "Solo almacenamos la información necesaria para operar tu cuenta y sincronizar facturas. Las cookies y el almacenamiento local recuerdan tus preferencias en este dispositivo.",
  legal_close_btn: "Cerrar",

  settings_no_accounts: "No hay cuentas guardadas.",
  settings_last_used: "Último uso hace {{min}} min",
  settings_last_just_now: "Justo ahora",
  settings_use_account: "Usar esta cuenta",

  app_tagline: "Facturas unificadas para hogar y negocio.",
  overview_title: "Resumen",
  kpi_total: "Total este mes",
  kpi_unpaid: "Sin pagar",
  kpi_overdue: "Vencidas",

  invoices_title: "Facturas",
  sync_mail: "Sincronizar correo",
  sync_panel_title: "Buzon de facturas",
  sync_panel_desc: "Redirige las facturas a tu direccion personal DueFlux.",
  sync_panel_copy: "Copiar direccion",
  sync_panel_copied: "Direccion copiada.",
  sync_panel_pending: "Creando tu buzon...",
  sync_panel_ready: "Listo. Redirige las facturas a esta direccion.",
  sync_panel_empty: "Pulsa Sincronizar correo para generar tu buzon de facturas.",
  sync_panel_error: "No se pudo crear el buzon. Intenta otra vez.",
  add_invoice: "Agregar factura",
  col_company: "Empresa",
  col_category: "Categoría",
  col_number: "Número",
  col_issue: "Fecha de emisión",
  col_due: "Fecha de vencimiento",
  col_amount: "Importe",
  col_status: "Estado",
  col_actions: "Acciones",
  status_unpaid: "Sin pagar",
  status_paid: "Pagada",
  status_overdue: "Vencida",
  table_actions_paid: "Pagada",
  table_actions_overdue: "Vencida",

  modal_add_title: "Agregar factura",
  modal_company: "Empresa",
  modal_category: "Categoría",
  modal_number: "Número",
  modal_issue: "Fecha de emisión",
  modal_due: "Fecha de vencimiento",
  modal_amount: "Importe",
  modal_currency: "Moneda",
  modal_status: "Estado",
  modal_cancel: "Cancelar",
  modal_save: "Guardar",

  modal_totp_title: "Activar 2FA",
  modal_totp_hint:
    "Escanea el código o añade el secreto en tu app de autenticación y luego introduce el código de 6 dígitos.",
  modal_totp_code_label: "Código de 6 dígitos",
  modal_totp_cancel: "Cancelar",
  modal_totp_confirm: "Confirmar",

  modal_account_title: "Cambiar cuenta",
  modal_account_add: "+ Agregar otra cuenta",

  profile_title: "Mi perfil",
  profile_subtitle: "Datos de la cuenta y plan",
  profile_identity_title: "Identidad y contacto",
  profile_first_name: "Nombre",
  profile_last_name: "Apellido",
  profile_company_label: "Nombre de la empresa",
  profile_company_hint: "Se muestra cuando tu plan es Business.",
  profile_save_btn: "Guardar cambios",
  profile_saved: "Perfil actualizado.",
  profile_plan_title: "Tu plan",
  profile_plan_note: "Los planes solo se cambian en el sitio de DueFlux.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc:
    "Funciones completas para familias, hogares y facturación personal.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc:
    "Funciones completas para empresas que gestionan facturas de proveedores con una cuenta de negocio.",
  profile_plan_device_note: "Todos los planes funcionan en escritorio y móvil.",
  profile_manage_on_web: "Abrir sitio web",
  profile_password_title: "Contraseña",
  profile_password_body:
    "Cambia tu contraseña desde el sitio web para mayor seguridad.",
  profile_password_btn: "Cambiar en el sitio",
  profile_close_btn: "Cerrar",
  profile_plan_readonly: "Los cambios de plan se gestionan en el sitio web.",

  splash_subtitle: "Facturas unificadas para hogar y negocio.",
  splash_loading_1: "Cargando recursos...",
  splash_loading_2: "Sincronizando motor de facturas...",
  splash_loading_3: "Preparando bóveda segura...",
  splash_loading_4: "Finalizando espacio de trabajo...",

  alert_fill_all_fields: "Completa todos los campos.",
  alert_offline: "Estás sin conexión. La sincronización de correo requiere internet.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Error al sincronizar el correo.",
  alert_totp_code: "Introduce el código de 6 dígitos.",
  alert_totp_invalid: "Código TOTP inválido.",
  alert_totp_disable_password: "Ingresa la contraseña para desactivar 2FA:",
  alert_totp_disable_error: "No se puede desactivar 2FA. Verifica la contraseña.",
  alert_totp_setup_error: "No se puede configurar 2FA ahora.",
  alert_profile_error: "No se puede guardar el perfil ahora.",
  alert_profile_saved: "Perfil guardado.",

  plan_basic_label: "Basic",
  plan_business_label: "Business",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Open website",
  totp_cta_disable: "Open website",
  totp_on_label: "CLOUD CONECTADO",
  totp_on_desc: "Estas en linea y sincronizas con DueFlux Cloud.",
  totp_off_label: "SIN CONEXION",
  totp_off_desc: "Vuelve a conectarte para sincronizar facturas y actualizaciones.",
  security_title: "Estado cloud",
  security_subtitle: "DueFlux se mantiene sincronizado con tu cuenta en la nube.",
};

i18n.ru = {
  login_title: "DueFlux",
  login_subtitle: "Единые счета для дома и бизнеса.",
  login_email: "Email",
  login_password: "Пароль",
  login_btn: "Войти",
  login_hint:
    "Нажмите Enter или используйте кнопку. Пропущенные поля будут подсвечены.",
  login_signup_cta: "Нет аккаунта? Создайте его на сайте DueFlux.",
  login_signup_link: "Создать аккаунт на сайте",

  msg_missing_email: "Введите email.",
  msg_missing_password: "Введите пароль.",
  msg_missing_fields: "Email и пароль обязательны.",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "Настройки",
  settings_subtitle: "Настройте DueFlux под себя.",
  settings_appearance_title: "Внешний вид",
  settings_theme_label: "Тема",
  settings_theme_hint:
    "Auto следует настройкам системы (Windows, macOS, Linux, мобильные).",
  settings_display_title: "Экран",
  settings_fullscreen_btn_enter: "Во весь экран",
  settings_fullscreen_btn_exit: "Выйти из полноэкрана",
  settings_fullscreen_hint:
    "Можно нажать F11, пока DueFlux активен.",
  settings_language_title: "Язык",
  settings_account_title: "Аккаунт",
  settings_updates_title: "Обновления",
  settings_updates_subtitle: "Держите DueFlux обновленным с последними улучшениями.",
  settings_updates_check: "Проверить обновления",
  settings_updates_checking: "Проверяем обновления...",
  settings_updates_available: "Доступно обновление.",
  settings_updates_none: "У вас последняя версия.",
  settings_updates_downloading: "Скачивание обновления...",
  settings_updates_download: "Скачать обновление",
  settings_updates_install: "Установить обновление",
  settings_updates_ready: "Обновление готово. Перезапустите для установки.",
  settings_updates_error: "Не удалось проверить обновления.",
  settings_updates_current: "Текущая версия",
  settings_legal_title: "Право",
  settings_switch_account: "Сменить аккаунт",
  settings_logout: "Выйти",

  theme_dark: "Тёмная",
  theme_light: "Светлая",
  theme_auto: "Auto",

  settings_link_gdpr: "GDPR и защита данных",
  settings_link_terms: "Условия использования",
  settings_link_privacy: "Политика конфиденциальности",

  legal_gdpr_title: "GDPR и защита данных",
  legal_gdpr_body:
    "Мы обрабатываем данные ваших счетов только для работы сервиса DueFlux. Вы можете запросить экспорт или удаление данных в любое время. Мы не продаём данные третьим лицам.",
  legal_terms_title: "Условия использования",
  legal_terms_body:
    "DueFlux предоставляется как есть, без гарантий. Вы отвечаете за точность счетов и сроков оплаты. Использование приложения означает согласие с этими условиями.",
  legal_privacy_title: "Политика конфиденциальности",
  legal_privacy_body:
    "Мы храним только сведения, необходимые для работы аккаунта и синхронизации счетов. Cookies и локальное хранилище запоминают ваши предпочтения на этом устройстве.",
  legal_close_btn: "Закрыть",

  settings_no_accounts: "Сохранённых аккаунтов пока нет.",
  settings_last_used: "Последнее использование {{min}} мин назад",
  settings_last_just_now: "Только что",
  settings_use_account: "Использовать этот аккаунт",

  app_tagline: "Единые счета для дома и бизнеса.",
  overview_title: "Обзор",
  kpi_total: "Итого за месяц",
  kpi_unpaid: "Неоплаченные",
  kpi_overdue: "Просроченные",

  invoices_title: "Счета",
  sync_mail: "Синхронизировать почту",
  sync_panel_title: "Почтовый ящик счетов",
  sync_panel_desc: "Пересылайте счета на ваш личный адрес DueFlux.",
  sync_panel_copy: "Копировать адрес",
  sync_panel_copied: "Адрес скопирован.",
  sync_panel_pending: "Создаем почтовый ящик...",
  sync_panel_ready: "Готово. Пересылайте счета на этот адрес.",
  sync_panel_empty: "Нажмите «Синхронизация почты», чтобы создать ящик для счетов.",
  sync_panel_error: "Не удалось создать ящик. Попробуйте еще раз.",
  add_invoice: "Добавить счёт",
  col_company: "Компания",
  col_category: "Категория",
  col_number: "Номер",
  col_issue: "Дата выставления",
  col_due: "Срок оплаты",
  col_amount: "Сумма",
  col_status: "Статус",
  col_actions: "Действия",
  status_unpaid: "Неоплачен",
  status_paid: "Оплачен",
  status_overdue: "Просрочен",
  table_actions_paid: "Отметить оплаченным",
  table_actions_overdue: "Отметить просроченным",

  modal_add_title: "Добавить счёт",
  modal_company: "Компания",
  modal_category: "Категория",
  modal_number: "Номер",
  modal_issue: "Дата выставления",
  modal_due: "Срок оплаты",
  modal_amount: "Сумма",
  modal_currency: "Валюта",
  modal_status: "Статус",
  modal_cancel: "Отмена",
  modal_save: "Сохранить",

  modal_totp_title: "Включить 2FA",
  modal_totp_hint:
    "Сканируйте код или добавьте секрет в приложение-аутентификатор, затем введите 6-значный код.",
  modal_totp_code_label: "6-значный код",
  modal_totp_cancel: "Отмена",
  modal_totp_confirm: "Подтвердить",

  modal_account_title: "Сменить аккаунт",
  modal_account_add: "+ Добавить другой аккаунт",

  profile_title: "Мой профиль",
  profile_subtitle: "Данные аккаунта и план",
  profile_identity_title: "Личные данные",
  profile_first_name: "Имя",
  profile_last_name: "Фамилия",
  profile_company_label: "Название компании",
  profile_company_hint: "Показывается, если у вас план Business.",
  profile_save_btn: "Сохранить изменения",
  profile_saved: "Профиль обновлён.",
  profile_plan_title: "Ваш план",
  profile_plan_note: "Планы меняются только на сайте DueFlux.",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc:
    "Все функции для семей, домохозяйств и личных счетов.",
  profile_plan_business_title: "Business",
  profile_plan_business_desc:
    "Все функции для компаний, которые ведут счета поставщиков через бизнес-аккаунт.",
  profile_plan_device_note: "Все планы работают на компьютере и мобильных устройствах.",
  profile_manage_on_web: "Открыть сайт",
  profile_password_title: "Пароль",
  profile_password_body:
    "Меняйте пароль на сайте для большей безопасности.",
  profile_password_btn: "Сменить на сайте",
  profile_close_btn: "Закрыть",
  profile_plan_readonly: "Изменение плана выполняется на сайте.",

  splash_subtitle: "Единые счета для дома и бизнеса.",
  splash_loading_1: "Загрузка ресурсов...",
  splash_loading_2: "Синхронизация движка счетов...",
  splash_loading_3: "Подготовка защищённого хранилища...",
  splash_loading_4: "Завершение рабочего пространства...",

  alert_fill_all_fields: "Заполните все поля.",
  alert_offline: "Нет соединения. Для синхронизации почты нужен интернет.",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "Ошибка синхронизации почты.",
  alert_totp_code: "Введите 6-значный код.",
  alert_totp_invalid: "Неверный TOTP-код.",
  alert_totp_disable_password: "Введите пароль, чтобы отключить 2FA:",
  alert_totp_disable_error: "Не удаётся отключить 2FA. Проверьте пароль.",
  alert_totp_setup_error: "Не удаётся настроить 2FA сейчас.",
  alert_profile_error: "Не удаётся сохранить профиль.",
  alert_profile_saved: "Профиль сохранён.",

  plan_basic_label: "Basic",
  plan_business_label: "Business",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Open website",
  totp_cta_disable: "Open website",
  totp_on_label: "ОБЛАКО ПОДКЛЮЧЕНО",
  totp_on_desc: "Вы онлайн и синхронизируетесь с DueFlux Cloud.",
  totp_off_label: "ОФЛАЙН",
  totp_off_desc: "Подключитесь снова, чтобы синхронизировать счета и обновления.",
  security_title: "Статус облака",
  security_subtitle: "DueFlux синхронизируется с вашей учетной записью в облаке.",
};

i18n.zh = {
  login_title: "DueFlux",
  login_subtitle: "为家庭和企业统一管理发票。",
  login_email: "邮箱",
  login_password: "密码",
  login_btn: "登录",
  login_hint:
    "按 Enter 或使用按钮提交。缺失的字段会被标记。",
  login_signup_cta: "还没有账号？请在 DueFlux 网站创建。",
  login_signup_link: "在网站创建账号",

  msg_missing_email: "请输入邮箱。",
  msg_missing_password: "请输入密码。",
  msg_missing_fields: "邮箱和密码是必填项。",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "设置",
  settings_subtitle: "为你个性化 DueFlux。",
  settings_appearance_title: "外观",
  settings_theme_label: "主题",
  settings_theme_hint:
    "自动跟随系统偏好（Windows、macOS、Linux、移动端）。",
  settings_display_title: "显示",
  settings_fullscreen_btn_enter: "进入全屏",
  settings_fullscreen_btn_exit: "退出全屏",
  settings_fullscreen_hint:
    "DueFlux 激活时也可以按 F11。",
  settings_language_title: "语言",
  settings_account_title: "账户",
  settings_updates_title: "更新",
  settings_updates_subtitle: "保持 DueFlux 为最新版本。",
  settings_updates_check: "检查更新",
  settings_updates_checking: "正在检查更新...",
  settings_updates_available: "有可用更新。",
  settings_updates_none: "已是最新版本。",
  settings_updates_downloading: "正在下载更新...",
  settings_updates_download: "下载更新",
  settings_updates_install: "安装更新",
  settings_updates_ready: "更新已准备好，重启以安装。",
  settings_updates_error: "无法检查更新。",
  settings_updates_current: "当前版本",
  settings_legal_title: "法律",
  settings_switch_account: "切换账户",
  settings_logout: "退出登录",

  theme_dark: "深色",
  theme_light: "浅色",
  theme_auto: "自动",

  settings_link_gdpr: "GDPR 与数据保护",
  settings_link_terms: "服务条款",
  settings_link_privacy: "隐私政策",

  legal_gdpr_title: "GDPR 与数据保护",
  legal_gdpr_body:
    "我们只为提供 DueFlux 服务而处理你的发票数据。你可随时请求导出或删除数据。我们不会将数据出售给第三方。",
  legal_terms_title: "服务条款",
  legal_terms_body:
    "DueFlux 按“现状”提供，不提供保证。你对发票准确性和付款期限负责。使用应用表示你接受这些条款。",
  legal_privacy_title: "隐私政策",
  legal_privacy_body:
    "我们只存储运营账户和同步发票所需的信息。Cookies 和本地存储用于在此设备上记住你的偏好。",
  legal_close_btn: "关闭",

  settings_no_accounts: "尚无已保存的账户。",
  settings_last_used: "上次使用 {{min}} 分钟前",
  settings_last_just_now: "刚刚",
  settings_use_account: "使用此账户",

  app_tagline: "为家庭和企业统一管理发票。",
  overview_title: "概览",
  kpi_total: "本月合计",
  kpi_unpaid: "未支付",
  kpi_overdue: "已逾期",

  invoices_title: "发票",
  sync_mail: "同步邮箱",
  sync_panel_title: "发票收件箱",
  sync_panel_desc: "将发票转发到你的 DueFlux 专属邮箱地址。",
  sync_panel_copy: "复制地址",
  sync_panel_copied: "地址已复制。",
  sync_panel_pending: "正在生成收件箱...",
  sync_panel_ready: "已就绪。将发票转发到此地址。",
  sync_panel_empty: "点击“同步邮箱”生成发票收件箱。",
  sync_panel_error: "无法创建收件箱，请重试。",
  add_invoice: "添加发票",
  col_company: "公司",
  col_category: "类别",
  col_number: "编号",
  col_issue: "开票日期",
  col_due: "到期日期",
  col_amount: "金额",
  col_status: "状态",
  col_actions: "操作",
  status_unpaid: "未支付",
  status_paid: "已支付",
  status_overdue: "逾期",
  table_actions_paid: "标记已付",
  table_actions_overdue: "标记逾期",

  modal_add_title: "添加发票",
  modal_company: "公司",
  modal_category: "类别",
  modal_number: "编号",
  modal_issue: "开票日期",
  modal_due: "到期日期",
  modal_amount: "金额",
  modal_currency: "货币",
  modal_status: "状态",
  modal_cancel: "取消",
  modal_save: "保存",

  modal_totp_title: "开启 2FA",
  modal_totp_hint:
    "扫描二维码或将秘钥加入验证器，然后输入 6 位代码确认。",
  modal_totp_code_label: "6 位代码",
  modal_totp_cancel: "取消",
  modal_totp_confirm: "确认",

  modal_account_title: "切换账户",
  modal_account_add: "+ 添加其他账户",

  profile_title: "我的资料",
  profile_subtitle: "账户详情与套餐",
  profile_identity_title: "身份与联系方式",
  profile_first_name: "名",
  profile_last_name: "姓",
  profile_company_label: "公司名称",
  profile_company_hint: "当套餐为 Business 时显示。",
  profile_save_btn: "保存更改",
  profile_saved: "资料已更新。",
  profile_plan_title: "你的套餐",
  profile_plan_note: "套餐只能在 DueFlux 网站上变更。",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc:
    "面向家庭、日常账单和个人发票的全部功能。",
  profile_plan_business_title: "Business",
  profile_plan_business_desc:
    "面向企业处理供应商发票的全部功能。",
  profile_plan_device_note: "所有套餐均支持桌面和移动端。",
  profile_manage_on_web: "打开网站",
  profile_password_title: "密码",
  profile_password_body:
    "请在网站上修改密码以提高安全性。",
  profile_password_btn: "在网站上修改",
  profile_close_btn: "关闭",
  profile_plan_readonly: "套餐更改请前往网站。",

  splash_subtitle: "为家庭和企业统一管理发票。",
  splash_loading_1: "加载资源...",
  splash_loading_2: "同步发票引擎...",
  splash_loading_3: "准备安全库...",
  splash_loading_4: "完成工作区...",

  alert_fill_all_fields: "请填写所有字段。",
  alert_offline: "当前离线。同步邮件需要网络。",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "同步邮件时出错。",
  alert_totp_code: "请输入 6 位代码。",
  alert_totp_invalid: "TOTP 代码无效。",
  alert_totp_disable_password: "输入密码以关闭 2FA：",
  alert_totp_disable_error: "无法关闭 2FA。请检查密码。",
  alert_totp_setup_error: "暂时无法配置 2FA。",
  alert_profile_error: "暂时无法保存资料。",
  alert_profile_saved: "资料已保存。",

  plan_basic_label: "Basic",
  plan_business_label: "Business",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Open website",
  totp_cta_disable: "Open website",
  totp_on_label: "云已连接",
  totp_on_desc: "你已在线，正在与 DueFlux Cloud 同步。",
  totp_off_label: "离线",
  totp_off_desc: "重新连接以同步发票和更新。",
  security_title: "云状态",
  security_subtitle: "DueFlux 与你的云账户保持同步。",
};

i18n.ja = {
  login_title: "DueFlux",
  login_subtitle: "家庭とビジネスの請求書を一元管理。",
  login_email: "メール",
  login_password: "パスワード",
  login_btn: "ログイン",
  login_hint:
    "Enter かボタンで送信します。未入力の項目はハイライトされます。",
  login_signup_cta:
    "アカウントがありませんか？DueFlux のサイトで作成してください。",
  login_signup_link: "サイトでアカウントを作成",

  msg_missing_email: "メールアドレスを入力してください。",
  msg_missing_password: "パスワードを入力してください。",
  msg_missing_fields: "メールとパスワードは必須です。",
  msg_invalid_credentials: "Invalid email or password.",
  settings_title: "設定",
  settings_subtitle: "あなた用に DueFlux をカスタマイズ。",
  settings_appearance_title: "外観",
  settings_theme_label: "テーマ",
  settings_theme_hint:
    "Auto はシステム設定に従います（Windows、macOS、Linux、モバイル）。",
  settings_display_title: "表示",
  settings_fullscreen_btn_enter: "全画面表示",
  settings_fullscreen_btn_exit: "全画面を終了",
  settings_fullscreen_hint:
    "DueFlux がアクティブなときは F11 でも切り替えできます。",
  settings_language_title: "言語",
  settings_account_title: "アカウント",
  settings_updates_title: "アップデート",
  settings_updates_subtitle: "DueFlux を最新の状態に保ちます。",
  settings_updates_check: "アップデートを確認",
  settings_updates_checking: "アップデートを確認中...",
  settings_updates_available: "アップデートがあります。",
  settings_updates_none: "最新の状態です。",
  settings_updates_downloading: "アップデートをダウンロード中...",
  settings_updates_download: "アップデートをダウンロード",
  settings_updates_install: "アップデートをインストール",
  settings_updates_ready: "アップデートの準備完了。再起動してインストールしてください。",
  settings_updates_error: "アップデート確認に失敗しました。",
  settings_updates_current: "現在のバージョン",
  settings_legal_title: "法務",
  settings_switch_account: "アカウントを切替",
  settings_logout: "ログアウト",

  theme_dark: "ダーク",
  theme_light: "ライト",
  theme_auto: "自動",

  settings_link_gdpr: "GDPR とデータ保護",
  settings_link_terms: "利用規約",
  settings_link_privacy: "プライバシーポリシー",

  legal_gdpr_title: "GDPR とデータ保護",
  legal_gdpr_body:
    "請求書データは DueFlux サービスの提供のみに利用します。データの書き出しや削除はいつでも依頼できます。第三者への販売は行いません。",
  legal_terms_title: "利用規約",
  legal_terms_body:
    "DueFlux は現状のまま提供され、保証はありません。請求書や支払期限の正確性はご自身の責任です。アプリを利用するとこれらの条件に同意したことになります。",
  legal_privacy_title: "プライバシーポリシー",
  legal_privacy_body:
    "アカウント運用と請求書同期に必要な情報のみ保存します。クッキーとローカルストレージでこのデバイスの設定を記憶します。",
  legal_close_btn: "閉じる",

  settings_no_accounts: "保存されたアカウントはまだありません。",
  settings_last_used: "最終利用 {{min}} 分前",
  settings_last_just_now: "たった今",
  settings_use_account: "このアカウントを使う",

  app_tagline: "家庭とビジネスの請求書を一元管理。",
  overview_title: "概要",
  kpi_total: "今月の合計",
  kpi_unpaid: "未払い",
  kpi_overdue: "期限切れ",

  invoices_title: "請求書",
  sync_mail: "メールを同期",
  sync_panel_title: "請求書受信箱",
  sync_panel_desc: "請求書をあなた専用のDueFluxアドレスへ転送してください。",
  sync_panel_copy: "アドレスをコピー",
  sync_panel_copied: "アドレスをコピーしました。",
  sync_panel_pending: "受信箱を作成しています...",
  sync_panel_ready: "準備完了。このアドレスに転送してください。",
  sync_panel_empty: "「メール同期」をクリックして請求書受信箱を作成します。",
  sync_panel_error: "受信箱を作成できませんでした。もう一度お試しください。",
  add_invoice: "請求書を追加",
  col_company: "会社",
  col_category: "カテゴリ",
  col_number: "番号",
  col_issue: "発行日",
  col_due: "期日",
  col_amount: "金額",
  col_status: "ステータス",
  col_actions: "操作",
  status_unpaid: "未払い",
  status_paid: "支払い済み",
  status_overdue: "期限切れ",
  table_actions_paid: "支払い済みにする",
  table_actions_overdue: "期限切れにする",

  modal_add_title: "請求書を追加",
  modal_company: "会社",
  modal_category: "カテゴリ",
  modal_number: "番号",
  modal_issue: "発行日",
  modal_due: "期日",
  modal_amount: "金額",
  modal_currency: "通貨",
  modal_status: "ステータス",
  modal_cancel: "キャンセル",
  modal_save: "保存",

  modal_totp_title: "2FA を有効化",
  modal_totp_hint:
    "コードをスキャンするか秘密鍵を認証アプリに追加し、6桁コードを入力してください。",
  modal_totp_code_label: "6桁コード",
  modal_totp_cancel: "キャンセル",
  modal_totp_confirm: "確認",

  modal_account_title: "アカウントを切替",
  modal_account_add: "+ 別のアカウントを追加",

  profile_title: "マイプロフィール",
  profile_subtitle: "アカウント情報とプラン",
  profile_identity_title: "本人情報と連絡先",
  profile_first_name: "名",
  profile_last_name: "姓",
  profile_company_label: "会社名",
  profile_company_hint: "プランが Business のときに表示されます。",
  profile_save_btn: "変更を保存",
  profile_saved: "プロフィールを更新しました。",
  profile_plan_title: "あなたのプラン",
  profile_plan_note: "プラン変更は DueFlux サイトでのみ行えます。",
  profile_plan_basic_title: "Basic",
  profile_plan_basic_desc:
    "家庭や個人請求向けの全機能。",
  profile_plan_business_title: "Business",
  profile_plan_business_desc:
    "ビジネスアカウントで仕入先請求を扱う企業向けの全機能。",
  profile_plan_device_note: "すべてのプランはデスクトップとモバイルで利用できます。",
  profile_manage_on_web: "ウェブサイトを開く",
  profile_password_title: "パスワード",
  profile_password_body:
    "パスワード変更はウェブサイトで行ってください。",
  profile_password_btn: "サイトで変更",
  profile_close_btn: "閉じる",
  profile_plan_readonly: "プランの変更はサイトで行います。",

  splash_subtitle: "家庭とビジネスの請求書を一元管理。",
  splash_loading_1: "リソースを読み込み中...",
  splash_loading_2: "請求エンジンを同期中...",
  splash_loading_3: "セキュアボルトを準備中...",
  splash_loading_4: "ワークスペースを仕上げています...",

  alert_fill_all_fields: "すべての項目を入力してください。",
  alert_offline: "オフラインです。メール同期にはネット接続が必要です。",
  alert_sync_done: "Sync requested.",
  alert_sync_error: "メール同期でエラーが発生しました。",
  alert_totp_code: "6桁のコードを入力してください。",
  alert_totp_invalid: "TOTP コードが無効です。",
  alert_totp_disable_password:
    "2FA を無効化するにはパスワードを入力してください:",
  alert_totp_disable_error:
    "2FA を無効化できません。パスワードを確認してください。",
  alert_totp_setup_error: "現在 2FA を設定できません。",
  alert_profile_error: "プロフィールを保存できません。",
  alert_profile_saved: "プロフィールを保存しました。",

  plan_basic_label: "Basic",
  plan_business_label: "Business",
  msg_email_unverified: "Email not verified. Verify your email on the DueFlux website.",
  settings_footnote: "© 2025 DueFlux. Settings sync with your account.",
  totp_cta_enable: "Open website",
  totp_cta_disable: "Open website",
  totp_on_label: "クラウド接続",
  totp_on_desc: "オンラインで DueFlux Cloud と同期しています。",
  totp_off_label: "オフライン",
  totp_off_desc: "再接続して請求書と更新を同期してください。",
  security_title: "クラウド状態",
  security_subtitle: "DueFlux はクラウドアカウントと同期します。",
};

const mailSyncI18n = {
  en: {
    sync_now: "Sync now",
    mail_sync_panel_title: "Email sync",
    mail_sync_panel_desc:
      "Connect your email account to sync invoices automatically.",
    mail_sync_panel_empty: "Connect an email account to enable sync.",
    mail_sync_panel_ready: "Email sync is active.",
    mail_sync_panel_syncing: "Syncing inboxes...",
    mail_sync_panel_error: "Email sync failed. Try again.",
    mail_sync_panel_last_sync: "Last sync: {{time}}",
    mail_sync_notice_browser: "Finish connecting in your browser.",
    mail_sync_connect: "Connect email",
    mail_sync_connect_title: "Connect email",
    mail_sync_connect_desc:
      "Enter the email address you want to sync. We'll detect the provider and open the secure sign-in flow.",
    mail_sync_connect_email_label: "Email address",
    mail_sync_connect_email_placeholder: "you@company.com",
    mail_sync_connect_provider_label: "Provider",
    mail_sync_connect_provider_detecting: "Detecting...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Unknown",
    mail_sync_connect_cancel: "Cancel",
    mail_sync_connect_continue: "Continue",
    mail_sync_connect_error_invalid: "Enter a valid email address.",
    mail_sync_connect_error_unsupported:
      "This provider isn't supported yet. Use Gmail or Outlook.",
    mail_sync_connect_error_outlook_plan: "Outlook requires the Business plan.",
    mail_sync_connect_gmail: "Connect Gmail",
    mail_sync_connect_outlook: "Connect Outlook",
    mail_sync_disconnect: "Disconnect",
    mail_sync_status_connected: "Connected",
    mail_sync_status_not_connected: "Not connected",
    mail_sync_status_pending: "Pending authorization...",
    mail_sync_status_error: "Connection error",
    mail_sync_error_config:
      "Mail sync isn't configured. Add OAuth credentials in Firebase Functions.",
    mail_sync_error_auth: "Sign in again to connect your mailbox.",
  },
  ro: {
    sync_now: "Sincronizeaza acum",
    mail_sync_panel_title: "Sincronizare email",
    mail_sync_panel_desc:
      "Conecteaza contul de email pentru a sincroniza automat facturile.",
    mail_sync_panel_empty: "Conecteaza un cont de email pentru sincronizare.",
    mail_sync_panel_ready: "Sincronizarea email este activa.",
    mail_sync_panel_syncing: "Se sincronizeaza inboxurile...",
    mail_sync_panel_error: "Sincronizarea a esuat. Incearca din nou.",
    mail_sync_panel_last_sync: "Ultima sincronizare: {{time}}",
    mail_sync_notice_browser: "Finalizeaza conectarea in browser.",
    mail_sync_connect: "Conecteaza email",
    mail_sync_connect_title: "Conecteaza email",
    mail_sync_connect_desc:
      "Introdu adresa de email pe care vrei sa o sincronizezi. Detectam furnizorul si deschidem autentificarea securizata.",
    mail_sync_connect_email_label: "Adresa de email",
    mail_sync_connect_email_placeholder: "nume@companie.ro",
    mail_sync_connect_provider_label: "Furnizor",
    mail_sync_connect_provider_detecting: "Se detecteaza...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Necunoscut",
    mail_sync_connect_cancel: "Renunta",
    mail_sync_connect_continue: "Continua",
    mail_sync_connect_error_invalid: "Introdu o adresa de email valida.",
    mail_sync_connect_error_unsupported:
      "Furnizorul nu este suportat inca. Foloseste Gmail sau Outlook.",
    mail_sync_connect_error_outlook_plan: "Outlook necesita planul Business.",
    mail_sync_connect_gmail: "Conecteaza Gmail",
    mail_sync_connect_outlook: "Conecteaza Outlook",
    mail_sync_disconnect: "Deconecteaza",
    mail_sync_status_connected: "Conectat",
    mail_sync_status_not_connected: "Neconectat",
    mail_sync_status_pending: "In asteptare...",
    mail_sync_status_error: "Eroare de conexiune",
    mail_sync_error_config:
      "Sincronizarea email nu e configurata. Adauga credentialele OAuth in Firebase Functions.",
    mail_sync_error_auth: "Autentifica-te din nou pentru a conecta inboxul.",
  },
  hu: {
    sync_now: "Szinkronizalas most",
    mail_sync_panel_title: "Email szinkron",
    mail_sync_panel_desc:
      "Csatlakoztasd az e-mail fiokodat a szamlak automatikus szinkronjahoz.",
    mail_sync_panel_empty: "A szinkronhoz csatlakoztass egy email fiokot.",
    mail_sync_panel_ready: "Az email szinkron aktiv.",
    mail_sync_panel_syncing: "Postafiokok szinkronizalasa...",
    mail_sync_panel_error: "A szinkron sikertelen. Probald ujra.",
    mail_sync_panel_last_sync: "Utolso szinkron: {{time}}",
    mail_sync_notice_browser: "Fejezd be a csatlakozast a bongeszoben.",
    mail_sync_connect: "E-mail csatlakoztatasa",
    mail_sync_connect_title: "E-mail csatlakoztatasa",
    mail_sync_connect_desc:
      "Add meg a szinkronizalni kivant e-mail cimet. Felismerjuk a szolgaltatot es megnyitjuk a biztonsagos bejelentkezest.",
    mail_sync_connect_email_label: "E-mail cim",
    mail_sync_connect_email_placeholder: "nev@ceg.hu",
    mail_sync_connect_provider_label: "Szolgaltato",
    mail_sync_connect_provider_detecting: "Felismeres...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Ismeretlen",
    mail_sync_connect_cancel: "Megse",
    mail_sync_connect_continue: "Folytatas",
    mail_sync_connect_error_invalid: "Adj meg ervenyes e-mail cimet.",
    mail_sync_connect_error_unsupported:
      "Ez a szolgaltato meg nem tamogatott. Hasznald a Gmailt vagy az Outlookot.",
    mail_sync_connect_error_outlook_plan: "Az Outlookhoz Business csomag kell.",
    mail_sync_connect_gmail: "Gmail csatlakoztatasa",
    mail_sync_connect_outlook: "Outlook csatlakoztatasa",
    mail_sync_disconnect: "Levalasztas",
    mail_sync_status_connected: "Csatlakozva",
    mail_sync_status_not_connected: "Nincs csatlakoztatva",
    mail_sync_status_pending: "Jovahagyas folyamatban...",
    mail_sync_status_error: "Csatlakozasi hiba",
  },
  fr: {
    sync_now: "Synchroniser maintenant",
    mail_sync_panel_title: "Synchronisation e-mail",
    mail_sync_panel_desc:
      "Connectez votre compte e-mail pour synchroniser automatiquement les factures.",
    mail_sync_panel_empty:
      "Connectez un compte e-mail pour activer la synchronisation.",
    mail_sync_panel_ready: "La synchronisation e-mail est active.",
    mail_sync_panel_syncing: "Synchronisation des boites de reception...",
    mail_sync_panel_error: "Echec de la synchronisation. Reessayez.",
    mail_sync_panel_last_sync: "Derniere synchro : {{time}}",
    mail_sync_notice_browser: "Terminez la connexion dans le navigateur.",
    mail_sync_connect: "Connecter l'e-mail",
    mail_sync_connect_title: "Connecter l'e-mail",
    mail_sync_connect_desc:
      "Saisissez l'adresse e-mail a synchroniser. Nous detectons le fournisseur et ouvrons la connexion securisee.",
    mail_sync_connect_email_label: "Adresse e-mail",
    mail_sync_connect_email_placeholder: "nom@entreprise.fr",
    mail_sync_connect_provider_label: "Fournisseur",
    mail_sync_connect_provider_detecting: "Detection...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Inconnu",
    mail_sync_connect_cancel: "Annuler",
    mail_sync_connect_continue: "Continuer",
    mail_sync_connect_error_invalid: "Saisissez une adresse e-mail valide.",
    mail_sync_connect_error_unsupported:
      "Ce fournisseur n'est pas encore pris en charge. Utilisez Gmail ou Outlook.",
    mail_sync_connect_error_outlook_plan: "Outlook necessite le plan Business.",
    mail_sync_connect_gmail: "Connecter Gmail",
    mail_sync_connect_outlook: "Connecter Outlook",
    mail_sync_disconnect: "Deconnecter",
    mail_sync_status_connected: "Connecte",
    mail_sync_status_not_connected: "Non connecte",
    mail_sync_status_pending: "Autorisation en attente...",
    mail_sync_status_error: "Erreur de connexion",
  },
  de: {
    sync_now: "Jetzt synchronisieren",
    mail_sync_panel_title: "E-Mail-Sync",
    mail_sync_panel_desc:
      "Verbinde dein E-Mail-Konto, um Rechnungen automatisch zu synchronisieren.",
    mail_sync_panel_empty:
      "Verbinde ein E-Mail-Konto, um die Synchronisierung zu aktivieren.",
    mail_sync_panel_ready: "E-Mail-Sync ist aktiv.",
    mail_sync_panel_syncing: "Postfacher werden synchronisiert...",
    mail_sync_panel_error: "Synchronisierung fehlgeschlagen. Bitte erneut versuchen.",
    mail_sync_panel_last_sync: "Letzte Synchronisierung: {{time}}",
    mail_sync_notice_browser: "Schliesse die Verbindung im Browser ab.",
    mail_sync_connect: "E-Mail verbinden",
    mail_sync_connect_title: "E-Mail verbinden",
    mail_sync_connect_desc:
      "Gib die E-Mail-Adresse ein, die du synchronisieren willst. Wir erkennen den Anbieter und oeffnen die sichere Anmeldung.",
    mail_sync_connect_email_label: "E-Mail-Adresse",
    mail_sync_connect_email_placeholder: "name@firma.de",
    mail_sync_connect_provider_label: "Anbieter",
    mail_sync_connect_provider_detecting: "Erkennen...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Unbekannt",
    mail_sync_connect_cancel: "Abbrechen",
    mail_sync_connect_continue: "Weiter",
    mail_sync_connect_error_invalid: "Bitte eine gueltige E-Mail-Adresse eingeben.",
    mail_sync_connect_error_unsupported:
      "Dieser Anbieter wird noch nicht unterstuetzt. Nutze Gmail oder Outlook.",
    mail_sync_connect_error_outlook_plan: "Outlook erfordert den Business-Plan.",
    mail_sync_connect_gmail: "Gmail verbinden",
    mail_sync_connect_outlook: "Outlook verbinden",
    mail_sync_disconnect: "Trennen",
    mail_sync_status_connected: "Verbunden",
    mail_sync_status_not_connected: "Nicht verbunden",
    mail_sync_status_pending: "Ausstehende Freigabe...",
    mail_sync_status_error: "Verbindungsfehler",
  },
  it: {
    sync_now: "Sincronizza ora",
    mail_sync_panel_title: "Sync email",
    mail_sync_panel_desc:
      "Collega il tuo account email per sincronizzare automaticamente le fatture.",
    mail_sync_panel_empty:
      "Collega un account email per abilitare la sincronizzazione.",
    mail_sync_panel_ready: "La sincronizzazione email e attiva.",
    mail_sync_panel_syncing: "Sincronizzazione caselle di posta...",
    mail_sync_panel_error: "Sincronizzazione non riuscita. Riprova.",
    mail_sync_panel_last_sync: "Ultima sincronizzazione: {{time}}",
    mail_sync_notice_browser: "Completa la connessione nel browser.",
    mail_sync_connect: "Connetti email",
    mail_sync_connect_title: "Connetti email",
    mail_sync_connect_desc:
      "Inserisci l'indirizzo email da sincronizzare. Rileviamo il provider e apriamo l'accesso sicuro.",
    mail_sync_connect_email_label: "Indirizzo email",
    mail_sync_connect_email_placeholder: "nome@azienda.it",
    mail_sync_connect_provider_label: "Provider",
    mail_sync_connect_provider_detecting: "Rilevamento...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Sconosciuto",
    mail_sync_connect_cancel: "Annulla",
    mail_sync_connect_continue: "Continua",
    mail_sync_connect_error_invalid: "Inserisci un indirizzo email valido.",
    mail_sync_connect_error_unsupported:
      "Provider non ancora supportato. Usa Gmail o Outlook.",
    mail_sync_connect_error_outlook_plan: "Outlook richiede il piano Business.",
    mail_sync_connect_gmail: "Connetti Gmail",
    mail_sync_connect_outlook: "Connetti Outlook",
    mail_sync_disconnect: "Disconnetti",
    mail_sync_status_connected: "Connesso",
    mail_sync_status_not_connected: "Non connesso",
    mail_sync_status_pending: "Autorizzazione in corso...",
    mail_sync_status_error: "Errore di connessione",
  },
  tr: {
    sync_now: "Simdi senkronize et",
    mail_sync_panel_title: "E-posta senkronu",
    mail_sync_panel_desc:
      "Faturalari otomatik senkronize etmek icin e-posta hesabini bagla.",
    mail_sync_panel_empty: "Senkron icin bir e-posta hesabi baglayin.",
    mail_sync_panel_ready: "E-posta senkronu aktif.",
    mail_sync_panel_syncing: "Gelen kutulari senkronize ediliyor...",
    mail_sync_panel_error: "Senkronizasyon basarisiz. Tekrar deneyin.",
    mail_sync_panel_last_sync: "Son senkron: {{time}}",
    mail_sync_notice_browser: "Baglantiyi tarayicida tamamlayin.",
    mail_sync_connect: "E-posta bagla",
    mail_sync_connect_title: "E-posta bagla",
    mail_sync_connect_desc:
      "Senkronize etmek istedigin e-posta adresini gir. Saglayiciyi algilar ve guvenli girisi acariz.",
    mail_sync_connect_email_label: "E-posta adresi",
    mail_sync_connect_email_placeholder: "ad@firma.com",
    mail_sync_connect_provider_label: "Saglayici",
    mail_sync_connect_provider_detecting: "Algilaniyor...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Bilinmiyor",
    mail_sync_connect_cancel: "Iptal",
    mail_sync_connect_continue: "Devam",
    mail_sync_connect_error_invalid: "Gecerli bir e-posta adresi gir.",
    mail_sync_connect_error_unsupported:
      "Bu saglayici henuz desteklenmiyor. Gmail veya Outlook kullan.",
    mail_sync_connect_error_outlook_plan: "Outlook icin Business plan gerekli.",
    mail_sync_connect_gmail: "Gmail bagla",
    mail_sync_connect_outlook: "Outlook bagla",
    mail_sync_disconnect: "Baglantiyi kes",
    mail_sync_status_connected: "Bagli",
    mail_sync_status_not_connected: "Bagli degil",
    mail_sync_status_pending: "Yetkilendirme bekleniyor...",
    mail_sync_status_error: "Baglanti hatasi",
  },
  zh: {
    sync_now: "立即同步",
    mail_sync_panel_title: "邮箱同步",
    mail_sync_panel_desc: "连接邮箱账户以自动同步发票。",
    mail_sync_panel_empty: "连接邮箱账户以启用同步。",
    mail_sync_panel_ready: "邮箱同步已启用。",
    mail_sync_panel_syncing: "正在同步收件箱...",
    mail_sync_panel_error: "同步失败，请重试。",
    mail_sync_panel_last_sync: "上次同步：{{time}}",
    mail_sync_notice_browser: "请在浏览器中完成连接。",
    mail_sync_connect: "连接邮箱",
    mail_sync_connect_title: "连接邮箱",
    mail_sync_connect_desc:
      "输入要同步的邮箱地址。我们将识别服务商并打开安全登录。",
    mail_sync_connect_email_label: "邮箱地址",
    mail_sync_connect_email_placeholder: "name@company.com",
    mail_sync_connect_provider_label: "服务商",
    mail_sync_connect_provider_detecting: "识别中...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "未知",
    mail_sync_connect_cancel: "取消",
    mail_sync_connect_continue: "继续",
    mail_sync_connect_error_invalid: "请输入有效的邮箱地址。",
    mail_sync_connect_error_unsupported:
      "暂不支持该服务商，请使用 Gmail 或 Outlook。",
    mail_sync_connect_error_outlook_plan: "Outlook 需要 Business 套餐。",
    mail_sync_connect_gmail: "连接 Gmail",
    mail_sync_connect_outlook: "连接 Outlook",
    mail_sync_disconnect: "断开连接",
    mail_sync_status_connected: "已连接",
    mail_sync_status_not_connected: "未连接",
    mail_sync_status_pending: "等待授权...",
    mail_sync_status_error: "连接错误",
  },
  ar: {
    sync_now: "زامن الآن",
    mail_sync_panel_title: "مزامنة البريد",
    mail_sync_panel_desc: "اربط حساب بريدك لمزامنة الفواتير تلقائيا.",
    mail_sync_panel_empty: "اربط حساب بريد لتفعيل المزامنة.",
    mail_sync_panel_ready: "مزامنة البريد مفعلة.",
    mail_sync_panel_syncing: "جار مزامنة صناديق البريد...",
    mail_sync_panel_error: "فشلت المزامنة. حاول مرة أخرى.",
    mail_sync_panel_last_sync: "آخر مزامنة: {{time}}",
    mail_sync_notice_browser: "اكمل الربط في المتصفح.",
    mail_sync_connect: "ربط البريد",
    mail_sync_connect_title: "ربط البريد",
    mail_sync_connect_desc:
      "ادخل عنوان البريد الذي تريد مزامنته. سنحدد المزود ونفتح تسجيل الدخول الامن.",
    mail_sync_connect_email_label: "عنوان البريد",
    mail_sync_connect_email_placeholder: "name@company.com",
    mail_sync_connect_provider_label: "المزود",
    mail_sync_connect_provider_detecting: "جارٍ التعرف...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "غير معروف",
    mail_sync_connect_cancel: "الغاء",
    mail_sync_connect_continue: "متابعة",
    mail_sync_connect_error_invalid: "ادخل عنوان بريد صالح.",
    mail_sync_connect_error_unsupported:
      "هذا المزود غير مدعوم بعد. استخدم Gmail او Outlook.",
    mail_sync_connect_error_outlook_plan: "Outlook يتطلب خطة Business.",
    mail_sync_connect_gmail: "ربط Gmail",
    mail_sync_connect_outlook: "ربط Outlook",
    mail_sync_disconnect: "قطع الاتصال",
    mail_sync_status_connected: "متصل",
    mail_sync_status_not_connected: "غير متصل",
    mail_sync_status_pending: "بانتظار التفويض...",
    mail_sync_status_error: "خطأ في الاتصال",
  },
  ru: {
    sync_now: "Синхронизировать сейчас",
    mail_sync_panel_title: "Синхронизация почты",
    mail_sync_panel_desc:
      "Подключите почтовый аккаунт для автоматической синхронизации счетов.",
    mail_sync_panel_empty: "Подключите почтовый аккаунт для синхронизации.",
    mail_sync_panel_ready: "Синхронизация почты активна.",
    mail_sync_panel_syncing: "Синхронизация ящиков...",
    mail_sync_panel_error: "Синхронизация не удалась. Повторите.",
    mail_sync_panel_last_sync: "Последняя синхронизация: {{time}}",
    mail_sync_notice_browser: "Завершите подключение в браузере.",
    mail_sync_connect: "Подключить почту",
    mail_sync_connect_title: "Подключить почту",
    mail_sync_connect_desc:
      "Введите адрес почты для синхронизации. Мы определим провайдера и откроем безопасный вход.",
    mail_sync_connect_email_label: "Адрес почты",
    mail_sync_connect_email_placeholder: "name@company.ru",
    mail_sync_connect_provider_label: "Провайдер",
    mail_sync_connect_provider_detecting: "Определяем...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Неизвестно",
    mail_sync_connect_cancel: "Отмена",
    mail_sync_connect_continue: "Продолжить",
    mail_sync_connect_error_invalid: "Введите корректный адрес почты.",
    mail_sync_connect_error_unsupported:
      "Провайдер пока не поддерживается. Используйте Gmail или Outlook.",
    mail_sync_connect_error_outlook_plan: "Outlook доступен только в плане Business.",
    mail_sync_connect_gmail: "Подключить Gmail",
    mail_sync_connect_outlook: "Подключить Outlook",
    mail_sync_disconnect: "Отключить",
    mail_sync_status_connected: "Подключено",
    mail_sync_status_not_connected: "Не подключено",
    mail_sync_status_pending: "Ожидание подтверждения...",
    mail_sync_status_error: "Ошибка подключения",
  },
  es: {
    sync_now: "Sincronizar ahora",
    mail_sync_panel_title: "Sincronizacion de correo",
    mail_sync_panel_desc:
      "Conecta tu cuenta de correo para sincronizar facturas automaticamente.",
    mail_sync_panel_empty:
      "Conecta una cuenta de correo para habilitar la sincronizacion.",
    mail_sync_panel_ready: "La sincronizacion de correo esta activa.",
    mail_sync_panel_syncing: "Sincronizando bandejas de entrada...",
    mail_sync_panel_error: "La sincronizacion fallo. Intentalo de nuevo.",
    mail_sync_panel_last_sync: "Ultima sincronizacion: {{time}}",
    mail_sync_notice_browser: "Completa la conexion en el navegador.",
    mail_sync_connect: "Conectar correo",
    mail_sync_connect_title: "Conectar correo",
    mail_sync_connect_desc:
      "Introduce el correo que quieres sincronizar. Detectaremos el proveedor y abriremos el acceso seguro.",
    mail_sync_connect_email_label: "Correo electronico",
    mail_sync_connect_email_placeholder: "nombre@empresa.com",
    mail_sync_connect_provider_label: "Proveedor",
    mail_sync_connect_provider_detecting: "Detectando...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "Desconocido",
    mail_sync_connect_cancel: "Cancelar",
    mail_sync_connect_continue: "Continuar",
    mail_sync_connect_error_invalid: "Introduce un correo valido.",
    mail_sync_connect_error_unsupported:
      "Este proveedor aun no es compatible. Usa Gmail u Outlook.",
    mail_sync_connect_error_outlook_plan: "Outlook requiere el plan Business.",
    mail_sync_connect_gmail: "Conectar Gmail",
    mail_sync_connect_outlook: "Conectar Outlook",
    mail_sync_disconnect: "Desconectar",
    mail_sync_status_connected: "Conectado",
    mail_sync_status_not_connected: "No conectado",
    mail_sync_status_pending: "Esperando autorizacion...",
    mail_sync_status_error: "Error de conexion",
  },
  ja: {
    sync_now: "今すぐ同期",
    mail_sync_panel_title: "メール同期",
    mail_sync_panel_desc:
      "メールアカウントを接続して請求書を自動同期します。",
    mail_sync_panel_empty:
      "同期を有効にするにはメールアカウントを接続してください。",
    mail_sync_panel_ready: "メール同期が有効です。",
    mail_sync_panel_syncing: "受信トレイを同期中...",
    mail_sync_panel_error: "同期に失敗しました。再試行してください。",
    mail_sync_panel_last_sync: "最終同期: {{time}}",
    mail_sync_notice_browser: "ブラウザで接続を完了してください。",
    mail_sync_connect: "メールを接続",
    mail_sync_connect_title: "メールを接続",
    mail_sync_connect_desc:
      "同期したいメールアドレスを入力してください。プロバイダーを判定して安全なログインを開きます。",
    mail_sync_connect_email_label: "メールアドレス",
    mail_sync_connect_email_placeholder: "name@company.com",
    mail_sync_connect_provider_label: "プロバイダー",
    mail_sync_connect_provider_detecting: "判定中...",
    mail_sync_connect_provider_gmail: "Gmail",
    mail_sync_connect_provider_outlook: "Outlook",
    mail_sync_connect_provider_unknown: "不明",
    mail_sync_connect_cancel: "キャンセル",
    mail_sync_connect_continue: "続行",
    mail_sync_connect_error_invalid: "有効なメールアドレスを入力してください。",
    mail_sync_connect_error_unsupported:
      "このプロバイダーは未対応です。Gmail または Outlook を使用してください。",
    mail_sync_connect_error_outlook_plan: "Outlook は Business プランが必要です。",
    mail_sync_connect_gmail: "Gmail を接続",
    mail_sync_connect_outlook: "Outlook を接続",
    mail_sync_disconnect: "切断",
    mail_sync_status_connected: "接続済み",
    mail_sync_status_not_connected: "未接続",
    mail_sync_status_pending: "承認待ち...",
    mail_sync_status_error: "接続エラー",
  },
};

Object.keys(mailSyncI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, mailSyncI18n[lang]);
});

const mailSyncPlanI18n = {
  en: {
    mail_sync_connect_locked: "Business plan",
    mail_sync_status_locked: "Business plan required",
    mail_sync_outlook_business_hint: "Outlook is available on Business plan.",
  },
  ro: {
    mail_sync_connect_locked: "Plan Business",
    mail_sync_status_locked: "Necesita plan Business",
    mail_sync_outlook_business_hint: "Outlook este disponibil pe planul Business.",
  },
  hu: {
    mail_sync_connect_locked: "Business csomag",
    mail_sync_status_locked: "Business csomag szukseges",
    mail_sync_outlook_business_hint:
      "Az Outlook a Business csomagban erheto el.",
  },
  fr: {
    mail_sync_connect_locked: "Plan Business",
    mail_sync_status_locked: "Plan Business requis",
    mail_sync_outlook_business_hint:
      "Outlook est disponible avec le plan Business.",
  },
  de: {
    mail_sync_connect_locked: "Business-Plan",
    mail_sync_status_locked: "Business-Plan erforderlich",
    mail_sync_outlook_business_hint: "Outlook ist im Business-Plan verfugbar.",
  },
  it: {
    mail_sync_connect_locked: "Piano Business",
    mail_sync_status_locked: "Richiede piano Business",
    mail_sync_outlook_business_hint:
      "Outlook e disponibile con il piano Business.",
  },
  tr: {
    mail_sync_connect_locked: "Business plan",
    mail_sync_status_locked: "Business plan gerekli",
    mail_sync_outlook_business_hint: "Outlook Business planda kullanilabilir.",
  },
  zh: {
    mail_sync_connect_locked: "Business 套餐",
    mail_sync_status_locked: "需要 Business 套餐",
    mail_sync_outlook_business_hint: "Outlook 仅在 Business 套餐可用。",
  },
  ar: {
    mail_sync_connect_locked: "خطة Business",
    mail_sync_status_locked: "يتطلب خطة Business",
    mail_sync_outlook_business_hint: "Outlook متاح في خطة Business.",
  },
  ru: {
    mail_sync_connect_locked: "План Business",
    mail_sync_status_locked: "Нужен план Business",
    mail_sync_outlook_business_hint: "Outlook доступен в плане Business.",
  },
  es: {
    mail_sync_connect_locked: "Plan Business",
    mail_sync_status_locked: "Requiere plan Business",
    mail_sync_outlook_business_hint: "Outlook esta disponible en el plan Business.",
  },
  ja: {
    mail_sync_connect_locked: "Business プラン",
    mail_sync_status_locked: "Business プランが必要",
    mail_sync_outlook_business_hint: "Outlook は Business プランで利用できます。",
  },
};

Object.keys(mailSyncPlanI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, mailSyncPlanI18n[lang]);
});

const invoiceDeleteI18n = {
  en: {
    table_actions_delete: "Delete",
    delete_all_invoices: "Delete all",
    confirm_ok: "OK",
    confirm_cancel: "Cancel",
    invoice_delete_title: "Delete invoice",
    invoice_delete_all_title: "Delete all invoices",
    invoice_delete_confirm: "Delete this invoice?",
    invoice_delete_all_confirm:
      "Delete all invoices from your cloud account? This action cannot be undone.",
    invoice_delete_error: "Could not delete invoice. Try again.",
    invoice_delete_all_done: "Deleted {{count}} invoice(s).",
    invoice_delete_all_none: "No invoices found.",
    invoice_delete_all_error: "Could not delete all invoices. Try again.",
  },
  ro: {
    table_actions_delete: "Șterge",
    delete_all_invoices: "Șterge tot",
    confirm_ok: "OK",
    confirm_cancel: "Renunță",
    invoice_delete_title: "Ștergere factură",
    invoice_delete_all_title: "Șterge toate facturile",
    invoice_delete_confirm: "Ștergi această factură?",
    invoice_delete_all_confirm:
      "Ștergi toate facturile din cloud? Acțiunea nu poate fi anulată.",
    invoice_delete_error: "Factura nu a putut fi ștearsă. Încearcă din nou.",
    invoice_delete_all_done: "Au fost șterse {{count}} facturi.",
    invoice_delete_all_none: "Nu există facturi.",
    invoice_delete_all_error:
      "Toate facturile nu au putut fi șterse. Încearcă din nou.",
  },
};

Object.keys(invoiceDeleteI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, invoiceDeleteI18n[lang]);
});

const invoiceHistoryI18n = {
  en: {
    month_current: "Current month",
    month_empty: "No invoices in the selected month.",
    amount_unknown: "-",
  },
  ro: {
    month_current: "Luna curenta",
    month_empty: "Nu exista facturi in luna selectata.",
    amount_unknown: "-",
  },
};

Object.keys(invoiceHistoryI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, invoiceHistoryI18n[lang]);
});

const loginRecoveryI18n = {
  en: {
    login_forgot_link: "Forgot password?",
  },
  ro: {
    login_forgot_link: "Ai uitat parola?",
  },
};

Object.keys(loginRecoveryI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, loginRecoveryI18n[lang]);
});

const financePrefsI18n = {
  en: {
    settings_finance_title: "Finance",
    settings_display_currency_label: "Display currency",
    settings_display_currency_hint:
      "KPI total is converted in real time using live exchange rates.",
    settings_auto_status_label: "Automatic invoice status",
    settings_auto_status_hint:
      "Automatically detects paid/overdue from invoice due dates and payment confirmations.",
    settings_exchange_rate_loading: "Exchange rates: updating...",
    settings_exchange_rate_error: "Exchange rates unavailable right now.",
    settings_exchange_rate_unavailable: "Exchange rates not loaded yet.",
    settings_exchange_rate_updated: "Exchange rates updated: {{time}}",
    kpi_total_all_time: "Total all time",
    kpi_month_total: "Selected month ({{month}}): {{amount}}",
    kpi_sub_refs: "Subscription references this month: {{count}} ({{amount}})",
    kpi_conversion_missing: "Unconverted items: {{count}}",
  },
  ro: {
    settings_finance_title: "Finante",
    settings_display_currency_label: "Valuta afisare",
    settings_display_currency_hint:
      "Totalul KPI este convertit in timp real cu curs valutar live.",
    settings_auto_status_label: "Status factura automat",
    settings_auto_status_hint:
      "Detecteaza automat platita/intarziata pe baza scadentei si a confirmarilor de plata.",
    settings_exchange_rate_loading: "Curs valutar: se actualizeaza...",
    settings_exchange_rate_error: "Cursul valutar nu este disponibil acum.",
    settings_exchange_rate_unavailable: "Cursul valutar nu a fost incarcat inca.",
    settings_exchange_rate_updated: "Curs valutar actualizat: {{time}}",
    kpi_total_all_time: "Total acumulat",
    kpi_month_total: "Luna selectata ({{month}}): {{amount}}",
    kpi_sub_refs: "Referinte abonamente luna: {{count}} ({{amount}})",
    kpi_conversion_missing: "Intrari neconvertite: {{count}}",
  },
};

Object.keys(financePrefsI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, financePrefsI18n[lang]);
});

const phonePrefsI18n = {
  en: {
    profile_phone_label: "Phone number",
    profile_phone_hint:
      "Used for SMS verification, alerts, and upcoming mobile invoice capture (SMS/WhatsApp).",
    settings_phone_title: "Phone inbox",
    settings_phone_subtitle:
      "Connect a phone number for SMS verification, alerts, and upcoming SMS/WhatsApp invoice capture.",
    settings_phone_label: "Phone number",
    settings_phone_save: "Save",
    settings_phone_send_code: "Send code",
    settings_phone_verify: "Verify",
    settings_phone_code_placeholder: "6-digit code",
    settings_phone_inbox_label: "DueFlux inbox number",
    settings_phone_inbox_hint:
      "Forward invoice SMS/WhatsApp messages to this number.",
    settings_phone_inbox_number_missing: "Not configured",
    settings_phone_inbox_last_none: "No phone sync yet.",
    settings_phone_inbox_last_inbound: "Last phone message: {{time}}",
    settings_phone_inbox_last_invoice: "Last phone invoice captured: {{time}}",
    settings_phone_status_empty: "No phone connected",
    settings_phone_status_verified: "Phone verified",
    settings_phone_status_unverified: "Not verified. Send a code to verify.",
    settings_phone_status_pending: "Verification pending",
    settings_phone_status_provider_pending:
      "Code requested. Waiting for carrier delivery confirmation.",
    phone_panel_title: "Phone inbox",
    phone_panel_desc:
      "Connect your phone to verify ownership, then forward invoice SMS/WhatsApp messages to DueFlux inbox.",
    phone_panel_inbox_label: "DueFlux inbox number",
    phone_panel_inbox_hint:
      "Use this number to forward invoice SMS/WhatsApp messages for sync.",
    phone_panel_inbox_number_missing: "Not configured",
    phone_panel_last_none: "No phone sync yet.",
    phone_panel_last_inbound: "Last phone message: {{time}}",
    phone_panel_last_invoice: "Last phone invoice captured: {{time}}",
    phone_panel_cta_connect: "Connect phone",
    phone_panel_cta_verify: "Verify phone",
    phone_panel_cta_manage: "Manage phone",
    phone_panel_status_empty: "No phone connected.",
    phone_panel_status_verified: "Connected: {{phone}} (verified).",
    phone_panel_status_pending: "Connected: {{phone}} (verification pending).",
    phone_inbox_copy: "Copy",
    phone_inbox_copy_done: "Inbox number copied: {{number}}",
    phone_inbox_copy_missing: "Inbox number is not configured yet.",
    alert_phone_saved: "Phone number saved.",
    alert_phone_invalid: "Enter a valid phone number.",
    alert_phone_code_sent: "Verification code sent to {{phone}}.",
    alert_phone_code_requested:
      "Verification code requested for {{phone}}. Waiting for provider delivery.",
    alert_phone_code_throttled: "Please wait before requesting a new code.",
    alert_phone_code_invalid: "Enter the 6-digit verification code.",
    alert_phone_verify_success: "Phone number verified.",
    alert_phone_verify_failed: "Phone verification failed. Try again.",
    alert_phone_sms_not_configured: "SMS verification is not configured yet.",
    alert_phone_sms_delivery_failed: "SMS delivery failed",
    alert_phone_sms_still_pending:
      "SMS is still pending at provider level. Check Twilio Messaging logs and sender configuration.",
    alert_phone_sms_trial_restriction:
      "SMS couldn't be sent: Twilio Trial doesn't allow branded (alphanumeric) Sender IDs. Upgrade Twilio to paid or configure a numeric sender phone number.",
    alert_phone_sms_trial_destination_unverified:
      "SMS couldn't be delivered: on Twilio Trial, the destination number must be verified in Twilio.",
    alert_phone_sms_geo_permission:
      "SMS couldn't be delivered: Twilio Geo Permissions may block this destination country. Enable SMS for the destination in Twilio Console.",
    alert_phone_sms_a2p_required:
      "SMS couldn't be delivered: this sender requires US A2P 10DLC registration. Complete A2P registration or use an alphanumeric sender for non-US destinations.",
    alert_phone_sms_no_delivery_hint:
      "No SMS received yet. Check Twilio Message Logs for final status, sender route, and destination restrictions.",
  },
  ro: {
    profile_phone_label: "Numar de telefon",
    profile_phone_hint:
      "Folosit pentru verificare prin SMS, alerte si captare viitoare de facturi pe mobil (SMS/WhatsApp).",
    settings_phone_title: "Inbox telefon",
    settings_phone_subtitle:
      "Conecteaza un numar pentru verificare prin SMS, alerte si captare viitoare de facturi via SMS/WhatsApp.",
    settings_phone_label: "Numar de telefon",
    settings_phone_save: "Salveaza",
    settings_phone_send_code: "Trimite cod",
    settings_phone_verify: "Verifica",
    settings_phone_code_placeholder: "Cod 6 cifre",
    settings_phone_inbox_label: "Numar inbox DueFlux",
    settings_phone_inbox_hint:
      "Redirectioneaza mesajele SMS/WhatsApp de factura catre acest numar.",
    settings_phone_inbox_number_missing: "Neconfigurat",
    settings_phone_inbox_last_none: "Nu exista sincronizare telefon inca.",
    settings_phone_inbox_last_inbound: "Ultimul mesaj telefon: {{time}}",
    settings_phone_inbox_last_invoice: "Ultima factura captata din telefon: {{time}}",
    settings_phone_status_empty: "Niciun telefon conectat",
    settings_phone_status_verified: "Telefon verificat",
    settings_phone_status_unverified: "Neconfirmat. Trimite cod pentru verificare.",
    settings_phone_status_pending: "Verificare in asteptare",
    settings_phone_status_provider_pending:
      "Cod solicitat. Astept confirmarea de livrare de la operator.",
    phone_panel_title: "Inbox telefon",
    phone_panel_desc:
      "Conecteaza telefonul pentru verificare, apoi redirectioneaza SMS/WhatsApp cu facturi catre inboxul DueFlux.",
    phone_panel_inbox_label: "Numar inbox DueFlux",
    phone_panel_inbox_hint:
      "Foloseste acest numar pentru redirectionarea mesajelor SMS/WhatsApp cu facturi.",
    phone_panel_inbox_number_missing: "Neconfigurat",
    phone_panel_last_none: "Nu exista sincronizare telefon inca.",
    phone_panel_last_inbound: "Ultimul mesaj telefon: {{time}}",
    phone_panel_last_invoice: "Ultima factura captata din telefon: {{time}}",
    phone_panel_cta_connect: "Conecteaza telefon",
    phone_panel_cta_verify: "Verifica telefon",
    phone_panel_cta_manage: "Setari telefon",
    phone_panel_status_empty: "Niciun telefon conectat.",
    phone_panel_status_verified: "Conectat: {{phone}} (verificat).",
    phone_panel_status_pending: "Conectat: {{phone}} (in asteptare).",
    phone_inbox_copy: "Copiaza",
    phone_inbox_copy_done: "Numar inbox copiat: {{number}}",
    phone_inbox_copy_missing: "Numarul de inbox nu este configurat inca.",
    alert_phone_saved: "Numarul de telefon a fost salvat.",
    alert_phone_invalid: "Introdu un numar de telefon valid.",
    alert_phone_code_sent: "Codul a fost trimis la {{phone}}.",
    alert_phone_code_requested:
      "Cod solicitat pentru {{phone}}. Se asteapta livrarea de la provider.",
    alert_phone_code_throttled: "Asteapta putin inainte de un nou cod.",
    alert_phone_code_invalid: "Introdu codul de verificare din 6 cifre.",
    alert_phone_verify_success: "Numarul de telefon a fost verificat.",
    alert_phone_verify_failed: "Verificarea telefonului a esuat. Incearca din nou.",
    alert_phone_sms_not_configured: "Verificarea prin SMS nu este configurata inca.",
    alert_phone_sms_delivery_failed: "Trimiterea SMS-ului a esuat",
    alert_phone_sms_still_pending:
      "SMS-ul este inca in asteptare la provider. Verifica Twilio Messaging logs si configurarea sender-ului.",
    alert_phone_sms_trial_restriction:
      "SMS-ul nu a putut fi trimis: Twilio Trial nu permite Sender ID alfanumeric. Treci pe paid sau configureaza un numar de telefon (numeric) pentru trimitere.",
    alert_phone_sms_trial_destination_unverified:
      "SMS-ul nu a putut fi livrat: pe Twilio Trial, numarul destinatar trebuie verificat in Twilio.",
    alert_phone_sms_geo_permission:
      "SMS-ul nu a putut fi livrat: Twilio Geo Permissions poate bloca tara destinatie. Activeaza tara in Twilio Console.",
    alert_phone_sms_a2p_required:
      "SMS-ul nu a putut fi livrat: sender-ul necesita inregistrare US A2P 10DLC. Finalizeaza A2P sau foloseste sender alfanumeric pentru destinatii non-US.",
    alert_phone_sms_no_delivery_hint:
      "Daca SMS-ul nu ajunge, verifica Twilio Message Logs pentru status final, ruta sender-ului si restrictiile de destinatie.",
  },
};

Object.keys(phonePrefsI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, phonePrefsI18n[lang]);
});

const heroDashboardI18n = {
  en: {
    hero_eyebrow: "DueFlux cloud workspace",
    hero_title: "Invoice command center",
    hero_subtitle:
      "Automatic sync, smart categorization and clear monthly control for all connected inboxes.",
    hero_pill_sync_on: "Auto sync active",
    hero_pill_sync_off: "No inbox connected",
    hero_pill_status_auto: "Status automation active",
    hero_pill_status_manual: "Manual status mode",
    hero_pill_cloud: "Cloud only",
    hero_metric_month_label: "Selected month total",
    hero_metric_all_label: "All time total",
    hero_metric_sync_label: "Last inbox sync",
    hero_metric_sync_none: "No sync yet",
  },
  ro: {
    hero_eyebrow: "Workspace cloud DueFlux",
    hero_title: "Centru de comanda facturi",
    hero_subtitle:
      "Sincronizare automata, categorizare inteligenta si control lunar clar pentru toate inboxurile conectate.",
    hero_pill_sync_on: "Sincronizare automata activa",
    hero_pill_sync_off: "Niciun inbox conectat",
    hero_pill_status_auto: "Automatizare status activa",
    hero_pill_status_manual: "Status manual activ",
    hero_pill_cloud: "Doar cloud",
    hero_metric_month_label: "Total luna selectata",
    hero_metric_all_label: "Total acumulat",
    hero_metric_sync_label: "Ultima sincronizare inbox",
    hero_metric_sync_none: "Fara sincronizare",
  },
};

Object.keys(heroDashboardI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, heroDashboardI18n[lang]);
});

const workspaceFeatureI18n = {
  en: {
    offline_required:
      "Offline mode is active. You can view, search, add, and delete local invoices; cloud sync resumes when internet returns.",
    offline_cache_badge: "Offline cache",
    offline_queue_synced: "Offline changes synced to cloud.",
    offline_queue_pending:
      "Offline changes saved locally. They will sync when internet returns.",
    setup_panel_eyebrow: "First setup",
    setup_panel_title: "Connect your invoice sources",
    setup_panel_desc:
      "Choose email or phone now. You can manage both later from Settings.",
    setup_panel_settings: "Open settings",
    invoice_search_placeholder: "Search invoices...",
    invoice_search_label: "Search invoices",
    reports_button: "Reports",
    reports_title: "Reports",
    reports_desc:
      "Build a report from your invoice data, choose the fields, preview it, then export it in the format you need.",
    reports_scope_label: "Scope",
    reports_scope_month: "Selected month",
    reports_scope_all: "All time",
    reports_scope_visible: "Current search results",
    reports_fields_label: "Fields",
    reports_preview_title: "Preview",
    reports_rows: "{{count}} rows",
    reports_export_csv: "CSV",
    reports_export_json: "JSON",
    reports_export_html: "HTML",
    reports_export_txt: "TXT",
    reports_export_pdf: "PDF / Print",
    reports_cancel: "Cancel",
    reports_empty: "No report rows for this selection.",
    reports_downloaded: "Report exported.",
    settings_email_title: "Email sync",
    settings_email_subtitle:
      "Manage connected inboxes for automatic invoice sync.",
    settings_email_connect: "Connect email",
    settings_email_sync: "Sync now",
  },
  ro: {
    offline_required:
      "Modul offline este activ. Poti vedea, cauta, adauga si sterge facturi local; sincronizarea cloud reia automat cand revine internetul.",
    offline_cache_badge: "Cache offline",
    offline_queue_synced: "Modificarile offline au fost sincronizate in cloud.",
    offline_queue_pending:
      "Modificarile offline sunt salvate local si se vor sincroniza cand revine internetul.",
    setup_panel_eyebrow: "Configurare initiala",
    setup_panel_title: "Conecteaza sursele de facturi",
    setup_panel_desc:
      "Alege email sau telefon acum. Le poti administra pe ambele ulterior din Setari.",
    setup_panel_settings: "Deschide setarile",
    invoice_search_placeholder: "Cauta facturi...",
    invoice_search_label: "Cauta facturi",
    reports_button: "Reports",
    reports_title: "Reports",
    reports_desc:
      "Construieste un raport din facturi, alege campurile, previzualizeaza si exporta in formatul necesar.",
    reports_scope_label: "Zona raport",
    reports_scope_month: "Luna selectata",
    reports_scope_all: "Tot istoricul",
    reports_scope_visible: "Rezultatele cautarii",
    reports_fields_label: "Campuri",
    reports_preview_title: "Previzualizare",
    reports_rows: "{{count}} randuri",
    reports_export_csv: "CSV",
    reports_export_json: "JSON",
    reports_export_html: "HTML",
    reports_export_txt: "TXT",
    reports_export_pdf: "PDF / Print",
    reports_cancel: "Renunta",
    reports_empty: "Nu exista randuri pentru selectia curenta.",
    reports_downloaded: "Raport exportat.",
    settings_email_title: "Sincronizare email",
    settings_email_subtitle:
      "Administreaza inboxurile conectate pentru sincronizarea automata a facturilor.",
    settings_email_connect: "Conecteaza email",
    settings_email_sync: "Sincronizeaza acum",
  },
};

Object.keys(workspaceFeatureI18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18n[lang] || {}, workspaceFeatureI18n[lang]);
});

const sharedFeatureLocales = window.DueFluxFeatureLocales || {};
Object.keys(sharedFeatureLocales).forEach(function (lang) {
  const currentPack = i18n[lang] || {};
  const englishPack = i18n.en || {};
  Object.keys(sharedFeatureLocales[lang] || {}).forEach(function (key) {
    if (!currentPack[key] || currentPack[key] === englishPack[key]) {
      currentPack[key] = sharedFeatureLocales[lang][key];
    }
  });
  i18n[lang] = currentPack;
});

const intelligenceFeatureI18n = {
  en: {
    space_all: "All", space_home: "Home", space_business: "Business",
    inbox_mesh: "Inbox Mesh", privacy_vault: "Privacy Vault",
    pulse_eyebrow: "DueFlux Pulse", pulse_title: "What needs your attention", pulse_live: "Live intelligence",
    pulse_attention: "Needs attention", pulse_attention_desc: "Invoices, renewals or anomalies to review.",
    pulse_upcoming: "Due soon", pulse_upcoming_desc: "Subscriptions due during the next 14 days.",
    pulse_guarded: "Guard alerts", pulse_guarded_desc: "Records with incomplete or unusual evidence.",
    pulse_verified: "Evidence verified", pulse_verified_desc: "Records backed by strong source evidence.",
    twin_eyebrow: "Obligation Twin", twin_title: "Upcoming subscription timeline",
    guard_eyebrow: "DueFlux Guard", guard_title: "Evidence and anomaly protection",
    twin_empty: "No predicted renewals yet. DueFlux learns after recurring records are available.",
    guard_empty: "No anomalies detected in the current workspace.",
    action_eyebrow: "Evidence Graph", action_title: "Invoice action center",
    evidence_title: "Why DueFlux trusts this invoice", actions_title: "Available actions",
    action_paid: "Mark or confirm paid", action_payment: "Open official payment page",
    action_cancel: "Stop subscription", action_reminder: "Schedule reminder",
    reminder_label: "Reminder date and time", reminder_save: "Save reminder",
    sources_eyebrow: "Inbox Mesh", sources_title: "Connect any email provider",
    sources_desc: "Gmail and Outlook use secure direct sync. Every other provider works through your private DueFlux forwarding inbox.",
    forwarding_label: "Your universal forwarding address", provider_direct: "Direct sync", provider_forward: "Forwarding", provider_locked: "Business plan",
    vault_eyebrow: "Privacy Vault", vault_title: "Your data, under your control",
    vault_cloud_title: "Private cloud", vault_cloud_desc: "Invoice data is isolated under your Firebase user account.",
    vault_offline_title: "Protected device cache", vault_offline_desc: "Offline data stays inside the application cache and syncs only after authentication.",
    vault_control_title: "Lifecycle control", vault_control_desc: "Delete, export and audit your records whenever you need.",
    vault_previews: "Hide sensitive message previews by default",
    evidence_email: "Email source", evidence_phone: "Phone source", evidence_manual: "Manual record", evidence_cloud: "Cloud record",
    evidence_attachment: "Original attachment", evidence_payment_confirmation: "Payment confirmation", evidence_extraction: "Smart extraction",
    risk_missing_amount: "Amount is missing", risk_missing_company: "Company is missing", risk_missing_date: "Reference date is missing",
    risk_weak_evidence: "Evidence needs review", risk_price_jump: "Amount is unusually high", risk_overdue: "Payment is overdue",
    action_unavailable: "No verified official page is available for this provider.", action_paid_success: "Payment status confirmed.",
    reminder_saved: "Reminder scheduled.", forwarding_copied: "Forwarding address copied.",
    report_evidence: "Evidence confidence", report_cadence: "Cadence", report_space: "Workspace", report_risk: "Guard alerts",
    invoice_open: "Open center", space_saved: "Workspace updated.",
  },
  ro: {
    space_all: "Toate", space_home: "Acasă", space_business: "Afaceri",
    inbox_mesh: "Inbox universal", privacy_vault: "Seif de confidențialitate",
    pulse_eyebrow: "DueFlux Pulse", pulse_title: "Ce necesită atenția ta", pulse_live: "Inteligență live",
    pulse_attention: "Necesită atenție", pulse_attention_desc: "Facturi, reînnoiri sau anomalii de verificat.",
    pulse_upcoming: "Scadente în curând", pulse_upcoming_desc: "Abonamente scadente în următoarele 14 zile.",
    pulse_guarded: "Alerte Guard", pulse_guarded_desc: "Înregistrări cu dovezi incomplete sau neobișnuite.",
    pulse_verified: "Dovezi verificate", pulse_verified_desc: "Înregistrări susținute de dovezi clare.",
    twin_eyebrow: "Geamănul obligațiilor", twin_title: "Cronologia abonamentelor viitoare",
    guard_eyebrow: "DueFlux Guard", guard_title: "Protecție pentru dovezi și anomalii",
    twin_empty: "Nu există încă reînnoiri estimate. DueFlux învață din înregistrările recurente.",
    guard_empty: "Nu au fost detectate anomalii în spațiul curent.",
    action_eyebrow: "Graficul dovezilor", action_title: "Centrul de acțiuni al facturii",
    evidence_title: "De ce DueFlux are încredere în această factură", actions_title: "Acțiuni disponibile",
    action_paid: "Marchează sau confirmă plata", action_payment: "Deschide pagina oficială de plată",
    action_cancel: "Oprește abonamentul", action_reminder: "Programează reminder",
    reminder_label: "Data și ora reminderului", reminder_save: "Salvează reminderul",
    sources_eyebrow: "Inbox universal", sources_title: "Conectează orice furnizor de email",
    sources_desc: "Gmail și Outlook folosesc sincronizare directă securizată. Ceilalți furnizori funcționează prin inboxul privat de redirecționare DueFlux.",
    forwarding_label: "Adresa ta universală de redirecționare", provider_direct: "Sincronizare directă", provider_forward: "Redirecționare", provider_locked: "Plan Business",
    vault_eyebrow: "Seif de confidențialitate", vault_title: "Datele tale, sub controlul tău",
    vault_cloud_title: "Cloud privat", vault_cloud_desc: "Datele facturilor sunt izolate în contul tău Firebase.",
    vault_offline_title: "Cache protejat pe dispozitiv", vault_offline_desc: "Datele offline rămân în aplicație și se sincronizează numai după autentificare.",
    vault_control_title: "Controlul ciclului de viață", vault_control_desc: "Șterge, exportă și auditează înregistrările oricând.",
    vault_previews: "Ascunde implicit previzualizările sensibile ale mesajelor",
    evidence_email: "Sursă email", evidence_phone: "Sursă telefon", evidence_manual: "Înregistrare manuală", evidence_cloud: "Înregistrare cloud",
    evidence_attachment: "Atașament original", evidence_payment_confirmation: "Confirmare de plată", evidence_extraction: "Extragere inteligentă",
    risk_missing_amount: "Suma lipsește", risk_missing_company: "Compania lipsește", risk_missing_date: "Data de referință lipsește",
    risk_weak_evidence: "Dovezile trebuie verificate", risk_price_jump: "Suma este neobișnuit de mare", risk_overdue: "Plata este întârziată",
    action_unavailable: "Nu există o pagină oficială verificată pentru acest furnizor.", action_paid_success: "Starea plății a fost confirmată.",
    reminder_saved: "Reminder programat.", forwarding_copied: "Adresa de redirecționare a fost copiată.",
    report_evidence: "Încredere dovezi", report_cadence: "Frecvență", report_space: "Spațiu", report_risk: "Alerte Guard",
    invoice_open: "Deschide centrul", space_saved: "Spațiul a fost actualizat.",
  },
};

const intelligenceCompactKeys = [
  "space_all", "space_home", "space_business", "inbox_mesh", "privacy_vault",
  "pulse_title", "pulse_attention", "pulse_upcoming", "pulse_guarded", "pulse_verified",
  "twin_title", "guard_title", "action_title", "evidence_title", "actions_title",
  "action_paid", "action_payment", "action_cancel", "action_reminder", "reminder_save",
  "sources_title", "forwarding_label", "vault_title", "invoice_open",
];
const intelligenceCompactPacks = {
  hu: ["Mind", "Otthon", "Üzlet", "Univerzális postaláda", "Adatvédelmi trezor", "Ami figyelmet igényel", "Figyelmet igényel", "Hamarosan esedékes", "Guard riasztások", "Ellenőrzött bizonyíték", "Közelgő előfizetések", "Bizonyíték- és anomáliavédelem", "Számla műveleti központ", "Miért megbízható ez a számla", "Elérhető műveletek", "Fizetés megerősítése", "Hivatalos fizetési oldal", "Előfizetés leállítása", "Emlékeztető ütemezése", "Emlékeztető mentése", "Bármely e-mail szolgáltató", "Univerzális továbbítási cím", "Az adataid a te kezedben", "Központ megnyitása"],
  de: ["Alle", "Privat", "Geschäftlich", "Universeller Posteingang", "Datentresor", "Was Ihre Aufmerksamkeit braucht", "Prüfen", "Bald fällig", "Guard-Warnungen", "Belege verifiziert", "Bevorstehende Abonnements", "Beleg- und Anomalieschutz", "Rechnungs-Aktionscenter", "Warum DueFlux dieser Rechnung vertraut", "Verfügbare Aktionen", "Zahlung bestätigen", "Offizielle Zahlungsseite öffnen", "Abonnement beenden", "Erinnerung planen", "Erinnerung speichern", "Beliebigen E-Mail-Anbieter verbinden", "Universelle Weiterleitungsadresse", "Ihre Daten unter Ihrer Kontrolle", "Center öffnen"],
  fr: ["Tout", "Maison", "Entreprise", "Boîte universelle", "Coffre de confidentialité", "Ce qui demande votre attention", "À vérifier", "Bientôt dû", "Alertes Guard", "Preuves vérifiées", "Abonnements à venir", "Protection des preuves et anomalies", "Centre d'actions de la facture", "Pourquoi DueFlux fait confiance à cette facture", "Actions disponibles", "Confirmer le paiement", "Ouvrir la page de paiement officielle", "Arrêter l'abonnement", "Planifier un rappel", "Enregistrer le rappel", "Connecter tout fournisseur e-mail", "Adresse de transfert universelle", "Vos données sous votre contrôle", "Ouvrir le centre"],
  it: ["Tutte", "Casa", "Azienda", "Posta universale", "Cassaforte privacy", "Cosa richiede attenzione", "Da controllare", "In scadenza", "Avvisi Guard", "Prove verificate", "Abbonamenti futuri", "Protezione prove e anomalie", "Centro azioni fattura", "Perché DueFlux considera attendibile questa fattura", "Azioni disponibili", "Conferma pagamento", "Apri pagina ufficiale di pagamento", "Interrompi abbonamento", "Programma promemoria", "Salva promemoria", "Connetti qualsiasi provider email", "Indirizzo di inoltro universale", "I tuoi dati sotto il tuo controllo", "Apri centro"],
  tr: ["Tümü", "Ev", "İş", "Evrensel gelen kutusu", "Gizlilik kasası", "Dikkat etmeniz gerekenler", "Dikkat gerekli", "Yakında vadesi dolacak", "Guard uyarıları", "Kanıt doğrulandı", "Yaklaşan abonelikler", "Kanıt ve anomali koruması", "Fatura işlem merkezi", "DueFlux bu faturaya neden güveniyor", "Kullanılabilir işlemler", "Ödemeyi onayla", "Resmi ödeme sayfasını aç", "Aboneliği durdur", "Hatırlatıcı planla", "Hatırlatıcıyı kaydet", "Her e-posta sağlayıcısını bağla", "Evrensel yönlendirme adresi", "Verileriniz kontrolünüz altında", "Merkezi aç"],
  es: ["Todas", "Hogar", "Empresa", "Bandeja universal", "Bóveda de privacidad", "Lo que requiere tu atención", "Requiere atención", "Vence pronto", "Alertas Guard", "Evidencia verificada", "Suscripciones próximas", "Protección de evidencia y anomalías", "Centro de acciones de factura", "Por qué DueFlux confía en esta factura", "Acciones disponibles", "Confirmar pago", "Abrir página oficial de pago", "Cancelar suscripción", "Programar recordatorio", "Guardar recordatorio", "Conectar cualquier proveedor de correo", "Dirección universal de reenvío", "Tus datos bajo tu control", "Abrir centro"],
  ru: ["Все", "Дом", "Бизнес", "Универсальная почта", "Хранилище конфиденциальности", "Что требует внимания", "Требует внимания", "Скоро срок", "Оповещения Guard", "Доказательства проверены", "Будущие подписки", "Защита доказательств и аномалий", "Центр действий по счету", "Почему DueFlux доверяет этому счету", "Доступные действия", "Подтвердить оплату", "Открыть официальную оплату", "Остановить подписку", "Запланировать напоминание", "Сохранить напоминание", "Подключить любую почту", "Адрес пересылки", "Ваши данные под вашим контролем", "Открыть центр"],
  zh: ["全部", "家庭", "企业", "通用收件箱", "隐私保险库", "需要你关注的事项", "需要关注", "即将到期", "Guard 警报", "证据已验证", "即将续订的订阅", "证据与异常保护", "发票操作中心", "DueFlux 信任此发票的原因", "可用操作", "确认付款", "打开官方付款页面", "停止订阅", "设置提醒", "保存提醒", "连接任意邮件服务商", "通用转发地址", "你的数据由你掌控", "打开中心"],
  ja: ["すべて", "家庭", "ビジネス", "ユニバーサル受信箱", "プライバシー保管庫", "確認が必要な項目", "要確認", "まもなく期限", "Guard アラート", "証拠確認済み", "今後のサブスクリプション", "証拠と異常の保護", "請求書アクションセンター", "DueFlux が信頼する理由", "利用可能な操作", "支払いを確認", "公式支払いページを開く", "サブスクリプションを停止", "リマインダーを設定", "リマインダーを保存", "すべてのメールを接続", "ユニバーサル転送アドレス", "データを自分で管理", "センターを開く"],
  ar: ["الكل", "المنزل", "الأعمال", "صندوق وارد موحد", "خزنة الخصوصية", "ما يحتاج إلى انتباهك", "يحتاج إلى انتباه", "يستحق قريبًا", "تنبيهات Guard", "أدلة موثقة", "الاشتراكات القادمة", "حماية الأدلة والشذوذ", "مركز إجراءات الفاتورة", "لماذا يثق DueFlux بهذه الفاتورة", "الإجراءات المتاحة", "تأكيد الدفع", "فتح صفحة الدفع الرسمية", "إيقاف الاشتراك", "جدولة تذكير", "حفظ التذكير", "ربط أي مزود بريد", "عنوان إعادة التوجيه الموحد", "بياناتك تحت سيطرتك", "فتح المركز"],
};

Object.keys(intelligenceCompactPacks).forEach(function (lang) {
  const compact = {};
  intelligenceCompactKeys.forEach(function (key, index) {
    compact[key] = intelligenceCompactPacks[lang][index];
  });
  intelligenceFeatureI18n[lang] = compact;
});
Object.keys(intelligenceFeatureI18n).forEach(function (lang) {
  i18n[lang] = Object.assign(
    {},
    i18n[lang] || {},
    intelligenceFeatureI18n.en,
    sharedFeatureLocales[lang] || {},
    intelligenceFeatureI18n[lang]
  );
});

// Ensure every language has a full keyset (fallback to English for missing strings).
const i18nBase = i18n.en || {};
Object.keys(i18n).forEach(function (lang) {
  i18n[lang] = Object.assign({}, i18nBase, i18n[lang] || {});
});

// fallback: other languages copy from EN if key missing
function t(key) {
  const pack = i18n[currentLang] || {};
  if (pack[key]) return pack[key];
  const enPack = i18n.en || {};
  if (enPack[key]) return enPack[key];
  return key;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && typeof value === "string") {
    el.textContent = value;
  }
}

function setPlaceholder(id, value) {
  const el = document.getElementById(id);
  if (el && typeof value === "string") {
    el.setAttribute("placeholder", value);
  }
}

function ensureToastDom() {
  let toast = document.getElementById("app-toast");
  if (toast) return toast;
  const host = document.body || document.getElementById("app-screen");
  if (!host) return null;
  toast = document.createElement("div");
  toast.id = "app-toast";
  toast.className = "app-toast hidden";
  toast.setAttribute("aria-live", "polite");
  toast.setAttribute("aria-atomic", "true");
  toast.innerHTML =
    '<div id="app-toast-pill" class="app-toast-pill">' +
    '<span id="app-toast-text" class="app-toast-text"></span>' +
    "</div>";
  host.appendChild(toast);
  return toast;
}

function hideToast() {
  const toast = document.getElementById("app-toast");
  if (!toast) return;
  toast.classList.remove("is-visible");
  if (toastHideTimer) {
    clearTimeout(toastHideTimer);
    toastHideTimer = null;
  }
  if (toastFinalizeTimer) {
    clearTimeout(toastFinalizeTimer);
    toastFinalizeTimer = null;
  }
  toastFinalizeTimer = setTimeout(function () {
    toast.classList.add("hidden");
    toastFinalizeTimer = null;
  }, 180);
}

function showToast(message, variant) {
  const toast = ensureToastDom();
  if (!toast) return;
  const pill = document.getElementById("app-toast-pill");
  const text = document.getElementById("app-toast-text");
  if (!pill || !text) return;

  if (toastHideTimer) {
    clearTimeout(toastHideTimer);
    toastHideTimer = null;
  }
  if (toastFinalizeTimer) {
    clearTimeout(toastFinalizeTimer);
    toastFinalizeTimer = null;
  }

  text.textContent = String(message || "");
  pill.classList.remove("is-info", "is-success", "is-error");
  const safeVariant =
    variant === "success" || variant === "error" ? variant : "info";
  pill.classList.add("is-" + safeVariant);
  toast.classList.remove("hidden");
  requestAnimationFrame(function () {
    toast.classList.add("is-visible");
  });
  toastHideTimer = setTimeout(function () {
    hideToast();
  }, 3400);
}

function notifyUser(message, variant) {
  showToast(message, variant);
}

/* ---------- CONNECTIVITY ---------- */

function setOnlineState(isOnline) {
  const banner = document.getElementById("offline-banner");
  const text = document.getElementById("offline-text");
  const online = isOnline !== false;
  if (banner) {
    if (online) {
      banner.classList.add("hidden");
    } else {
      if (text) text.textContent = t("offline_required");
      banner.classList.remove("hidden");
    }
  }
  const gated = document.querySelectorAll("[data-online-only]");
  gated.forEach(function (el) {
    if (!el) return;
    if (online) {
      el.classList.remove("is-disabled");
      el.removeAttribute("disabled");
    } else {
      el.classList.add("is-disabled");
      el.setAttribute("disabled", "true");
    }
  });
  setOfflineCacheIndicator(!online && !!currentUser);
  refreshVerificationUi();
}

function ensureOnline() {
  const online = isOnlineNow();
  setOnlineState(online);
  if (!online) {
    notifyUser(t("offline_required"), "error");
  }
  return online;
}

function isOnlineNow() {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function setOfflineCacheIndicator(active) {
  const indicator = document.getElementById("offline-cache-indicator");
  if (!indicator) return;
  indicator.textContent = t("offline_cache_badge");
  indicator.classList.toggle("hidden", !active);
}

function getOfflineCacheKey(uid) {
  return OFFLINE_CACHE_PREFIX + String(uid || "");
}

function getOfflineQueueKey(uid) {
  return OFFLINE_QUEUE_PREFIX + String(uid || "");
}

function serializeForOfflineCache(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toDate === "function") {
    const date = value.toDate();
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
  }
  if (Array.isArray(value)) {
    return value.map(serializeForOfflineCache);
  }
  if (typeof value === "object") {
    const out = {};
    Object.keys(value).forEach(function (key) {
      if (typeof value[key] !== "function") {
        out[key] = serializeForOfflineCache(value[key]);
      }
    });
    return out;
  }
  return value;
}

function loadOfflineCache(uid) {
  if (!uid) return null;
  try {
    return JSON.parse(localStorage.getItem(getOfflineCacheKey(uid)) || "null");
  } catch (err) {
    console.error("offline cache read", err);
    return null;
  }
}

function saveOfflineCache() {
  if (!currentUser || !currentUser.uid) return;
  const payload = {
    savedAt: new Date().toISOString(),
    profile: serializeForOfflineCache(currentUser),
    invoices: serializeForOfflineCache(invoices || []),
    billingReferences: serializeForOfflineCache(billingReferences || []),
    mailAccounts: serializeForOfflineCache(mailAccounts || {}),
  };
  try {
    localStorage.setItem(getOfflineCacheKey(currentUser.uid), JSON.stringify(payload));
  } catch (err) {
    console.error("offline cache write", err);
  }
}

function applyOfflineCache(authUser) {
  if (!authUser) return false;
  const cache = loadOfflineCache(authUser.uid);
  if (!cache) return false;
  if (cache.profile) {
    currentUser = Object.assign(
      {
        uid: authUser.uid,
        email: authUser.email || "",
        plan: "basic",
        emailVerified: !!authUser.emailVerified,
      },
      cache.profile,
      { uid: authUser.uid }
    );
    applyProfileToHeader(currentUser);
    upsertAccountFromUser(currentUser);
    syncProfileForm();
  }
  if (Array.isArray(cache.invoices)) {
    invoicesById = new Map();
    cache.invoices.forEach(function (inv) {
      if (inv && inv.id) invoicesById.set(inv.id, inv);
    });
    invoices = Array.from(invoicesById.values());
    markInvoicesChanged();
  }
  if (Array.isArray(cache.billingReferences)) {
    billingReferences = cache.billingReferences;
  }
  if (cache.mailAccounts && typeof cache.mailAccounts === "object") {
    mailAccounts = cache.mailAccounts;
  }
  syncPhoneSettings();
  refreshMailSyncPanel();
  syncDisplayCurrencySelect();
  scheduleInvoiceUiRefresh();
  setOfflineCacheIndicator(!isOnlineNow());
  return true;
}

function getOfflineQueue(uid) {
  if (!uid) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(getOfflineQueueKey(uid)) || "[]");
    if (!Array.isArray(parsed)) throw new Error("Invalid offline queue");
    return parsed;
  } catch (err) {
    console.error("offline queue read", err);
    throw err;
  }
}

function setOfflineQueue(uid, queue) {
  if (!uid) return;
  try {
    localStorage.setItem(getOfflineQueueKey(uid), JSON.stringify(queue || []));
  } catch (err) {
    console.error("offline queue write", err);
    throw err;
  }
}

function queueOfflineMutation(mutation) {
  if (!currentUser || !currentUser.uid || !mutation) return;
  const queue = getOfflineQueue(currentUser.uid);
  queue.push(
    Object.assign({}, mutation, {
      operationId: DueFluxOfflineQueue.newId(),
      queuedAt: new Date().toISOString(),
    })
  );
  setOfflineQueue(currentUser.uid, queue);
  notifyUser(t("offline_queue_pending"), "info");
  if (isOnlineNow()) void flushOfflineQueue();
}

function removeQueuedLocalAdd(uid, localId) {
  if (!uid || !localId) return;
  const queue = getOfflineQueue(uid).filter(function (item) {
    return !(item && !item.dispatched && item.type === "addInvoice" && item.localId === localId);
  });
  setOfflineQueue(uid, queue);
}

const offlineQueueEngine = DueFluxOfflineQueue.create({
  read: getOfflineQueue,
  write: setOfflineQueue,
  apply: async function (uid, mutation) {
    if (!auth.currentUser || auth.currentUser.uid !== uid) throw new Error("Account changed");
    await callFunctionWithAuth("applyOfflineMutation", { mutation: mutation });
  },
});

function hasPendingLocalAdd(id) {
  return !!currentUser && getOfflineQueue(currentUser.uid).some(function (item) {
    return !item.dispatched && item.type === "addInvoice" && item.localId === id;
  });
}

function hasQueuedInvoice(id) {
  return !!currentUser && getOfflineQueue(currentUser.uid).some(function (item) { return (item.id || item.localId) === id; });
}

async function flushOfflineQueue() {
  if (!currentUser || !auth.currentUser || !isOnlineNow()) return;
  const uid = auth.currentUser.uid;
  try {
    const active = function () {
      return !!auth.currentUser && auth.currentUser.uid === uid && isOnlineNow();
    };
    let remaining;
    do { remaining = await offlineQueueEngine.flush(uid, active); } while (remaining && active());
    if (!remaining) setOfflineCacheIndicator(false);
  } catch (err) {
    console.error("offline sync", err);
    notifyUser(t("offline_queue_pending"), "error");
  }
}

/* ---------- THEME HANDLING ---------- */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("df_theme", theme);
  const btns = [
    document.getElementById("theme-toggle"),
    document.getElementById("theme-toggle-app"),
  ];
  for (let i = 0; i < btns.length; i++) {
    const btn = btns[i];
    if (!btn) continue;
    if (theme === "dark") btn.textContent = "🌙";
    else if (theme === "light") btn.textContent = "☀️";
    else btn.textContent = "🌓";
  }
}

function detectSystemTheme() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

function getThemeMode() {
  return localStorage.getItem("df_theme_mode") || "auto";
}

function setThemeMode(mode, persist) {
  localStorage.setItem("df_theme_mode", mode);
  const theme = mode === "auto" ? detectSystemTheme() : mode;
  applyTheme(theme);
  syncSettingsThemeChips(mode);
  if (persist) {
    persistUserPreference({ themeMode: mode });
  }
}

function initTheme() {
  const mode = getThemeMode();
  const theme = mode === "auto" ? detectSystemTheme() : mode;
  applyTheme(theme);
}

function persistUserPreference(patch) {
  if (!auth || !auth.currentUser) return;
  firestore
    .collection("users")
    .doc(auth.currentUser.uid)
    .set(
      Object.assign({}, patch, {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
      { merge: true }
    )
    .catch(function (err) {
      console.error("persist preference", err);
    });
}

function normalizeCurrencyCodeLocal(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return "";
  return code;
}

function loadDisplayCurrencyPreference() {
  const saved = normalizeCurrencyCodeLocal(
    localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY) || ""
  );
  if (saved) return saved;
  return "RON";
}

function loadAutoStatusPreference() {
  const raw = localStorage.getItem(AUTO_STATUS_STORAGE_KEY);
  if (raw === "false") return false;
  return true;
}

function setDisplayCurrency(currency, persist) {
  const code = normalizeCurrencyCodeLocal(currency) || "RON";
  displayCurrency = code;
  localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, code);
  syncDisplayCurrencySelect();
  updateKpis();
  if (persist) {
    persistUserPreference({ displayCurrency: code });
  }
}

function setAutoStatusEnabled(enabled, persist) {
  autoStatusEnabled = enabled !== false;
  localStorage.setItem(
    AUTO_STATUS_STORAGE_KEY,
    autoStatusEnabled ? "true" : "false"
  );
  const toggle = document.getElementById("settings-auto-status-toggle");
  if (toggle) toggle.checked = autoStatusEnabled;
  if (persist) {
    persistUserPreference({ autoStatusEnabled: autoStatusEnabled });
  }
}

function getKnownCurrencyCodes() {
  const set = new Set(
    INTL_CURRENCY_CODES && INTL_CURRENCY_CODES.length
      ? INTL_CURRENCY_CODES
      : FALLBACK_CURRENCY_CODES
  );
  set.add(displayCurrency || "RON");
  (invoices || []).forEach(function (inv) {
    const code = normalizeCurrencyCodeLocal(inv && inv.currency);
    if (code) set.add(code);
  });
  (billingReferences || []).forEach(function (ref) {
    const code = normalizeCurrencyCodeLocal(ref && ref.currency);
    if (code) set.add(code);
  });
  const rates = exchangeRatesInfo && exchangeRatesInfo.rates ? exchangeRatesInfo.rates : {};
  Object.keys(rates).forEach(function (codeRaw) {
    const code = normalizeCurrencyCodeLocal(codeRaw);
    if (code) set.add(code);
  });
  return Array.from(set).sort();
}

function syncDisplayCurrencySelect() {
  const select = document.getElementById("settings-display-currency-select");
  if (!select) return;
  const currentValue = normalizeCurrencyCodeLocal(select.value);
  const codes = getKnownCurrencyCodes();
  if (!codes.length) return;
  const needsRebuild =
    select.options.length !== codes.length ||
    codes.some(function (code, index) {
      const opt = select.options[index];
      return !opt || opt.value !== code;
    });
  if (needsRebuild) {
    select.innerHTML = "";
    codes.forEach(function (code) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = code;
      select.appendChild(option);
    });
  }
  const target =
    normalizeCurrencyCodeLocal(displayCurrency) ||
    currentValue ||
    "RON";
  select.value = codes.includes(target) ? target : codes[0];
}

function getExchangeRateForCurrency(code) {
  const normalized = normalizeCurrencyCodeLocal(code);
  const base = normalizeCurrencyCodeLocal(exchangeRatesInfo.base) || "USD";
  if (!normalized) return null;
  if (normalized === base) return 1;
  const rates = exchangeRatesInfo && exchangeRatesInfo.rates ? exchangeRatesInfo.rates : {};
  const raw = rates[normalized];
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function convertAmountUsingRates(amount, fromCurrency, toCurrency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  const from = normalizeCurrencyCodeLocal(fromCurrency) || "RON";
  const to = normalizeCurrencyCodeLocal(toCurrency) || "RON";
  if (from === to) return value;
  const base = normalizeCurrencyCodeLocal(exchangeRatesInfo.base) || "USD";
  const fromRate = from === base ? 1 : getExchangeRateForCurrency(from);
  const toRate = to === base ? 1 : getExchangeRateForCurrency(to);
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
    return null;
  }
  const valueInBase = value / fromRate;
  return valueInBase * toRate;
}

function formatMoney(amount, currency) {
  const value = Number(amount);
  const code = normalizeCurrencyCodeLocal(currency) || "RON";
  if (!Number.isFinite(value)) return "0.00 " + code;
  return value.toFixed(2) + " " + code;
}

function formatDateTimeLabel(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(currentLang === "ro" ? "ro-RO" : undefined);
}

function refreshExchangeRateStatus(mode) {
  const el = document.getElementById("settings-exchange-rate-status");
  if (!el) return;
  if (mode === "loading" || exchangeRatesLoading) {
    el.textContent = t("settings_exchange_rate_loading");
    return;
  }
  if (mode === "error") {
    el.textContent = t("settings_exchange_rate_error");
    return;
  }
  if (exchangeRatesInfo && exchangeRatesInfo.updatedAt) {
    const timeLabel = formatDateTimeLabel(exchangeRatesInfo.updatedAt);
    el.textContent = t("settings_exchange_rate_updated").replace(
      "{{time}}",
      timeLabel || exchangeRatesInfo.updatedAt
    );
    return;
  }
  el.textContent = t("settings_exchange_rate_unavailable");
}

async function requestExchangeRates(force) {
  if (!auth.currentUser) {
    const err = new Error("Sign in required.");
    err.code = "unauthenticated";
    throw err;
  }
  const token = await auth.currentUser.getIdToken(true);
  const endpoint =
    "https://us-central1-" +
    firebaseConfig.projectId +
    ".cloudfunctions.net/getExchangeRatesHttp";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      idToken: token,
      force: !!force,
    }),
  });
  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }
  if (!response.ok) {
    const code =
      body && body.error && body.error.status
        ? String(body.error.status)
        : String(response.status || "");
    const message =
      body && body.error && body.error.message
        ? String(body.error.message)
        : "Request failed";
    const err = new Error(message);
    err.code = code;
    throw err;
  }
  return body || {};
}

async function refreshExchangeRates(options) {
  const opts = options || {};
  if (!auth.currentUser || !navigator.onLine) return false;
  if (exchangeRatesLoading) return false;
  const now = Date.now();
  if (
    !opts.force &&
    Number.isFinite(exchangeRatesLastFetchAt) &&
    now - exchangeRatesLastFetchAt < EXCHANGE_RATES_REFRESH_MS
  ) {
    return true;
  }
  exchangeRatesLoading = true;
  refreshExchangeRateStatus("loading");
  try {
    const payload = await requestExchangeRates(!!opts.force);
    const base = normalizeCurrencyCodeLocal(payload.base) || "USD";
    const rawRates = payload && payload.rates ? payload.rates : {};
    const safeRates = {};
    Object.keys(rawRates || {}).forEach(function (codeRaw) {
      const code = normalizeCurrencyCodeLocal(codeRaw);
      const value = Number(rawRates[codeRaw]);
      if (!code) return;
      if (!Number.isFinite(value) || value <= 0) return;
      safeRates[code] = value;
    });
    safeRates[base] = 1;
    exchangeRatesInfo = {
      base: base,
      rates: safeRates,
      provider: String(payload.provider || ""),
      updatedAt: String(payload.updatedAt || ""),
      fetchedAt: String(payload.fetchedAt || ""),
    };
    exchangeRatesLastFetchAt = now;
    syncDisplayCurrencySelect();
    refreshExchangeRateStatus();
    updateKpis();
    return true;
  } catch (err) {
    console.error("refreshExchangeRates", err);
    refreshExchangeRateStatus("error");
    return false;
  } finally {
    exchangeRatesLoading = false;
  }
}

function ensureExchangeRatesScheduler() {
  if (exchangeRatesTimer) return;
  exchangeRatesTimer = setInterval(function () {
    refreshExchangeRates({ force: false }).catch(function () {});
  }, EXCHANGE_RATES_REFRESH_MS);
}

function clearExchangeRatesScheduler() {
  if (!exchangeRatesTimer) return;
  clearInterval(exchangeRatesTimer);
  exchangeRatesTimer = null;
}

/* ---------- LANGUAGE HANDLING ---------- */

function loadLanguagePreference() {
  const saved = localStorage.getItem("df_lang");
  if (saved) return saved;
  return "en";
}

function setLanguage(lang, save) {
  if (!i18n[lang]) lang = "en";
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  if (save) {
    localStorage.setItem("df_lang", lang);
    persistUserPreference({ lang: lang });
  }

  // sync selects if they exist
  const loginSelect = document.getElementById("lang-select");
  if (loginSelect) {
    loginSelect.value = lang;
  }
  const settingsSelect = document.getElementById("settings-language-select");
  if (settingsSelect) {
    settingsSelect.value = lang;
  }

  applyLanguageForLogin();
  applyLanguageForSettings();
  applyLanguageForAppTexts();
  applyProfileToHeader(currentUser);
  refreshVerificationUi();
  // if legal modal is open, refresh text
  refreshLegalModalTextsIfOpen();
  if (Array.isArray(invoices)) {
    scheduleInvoiceUiRefresh();
  }
}

function applyLanguageForLogin() {
  setText("login-title", t("login_title"));
  setText("login-subtitle", t("login_subtitle"));
  setText("login-email-label", t("login_email"));
  setText("login-password-label", t("login_password"));
  setText("btn-login", t("login_btn"));
  setText("login-hint", t("login_hint"));
  setText("login-signup-cta", t("login_signup_cta"));
  setText("login-signup-link", t("login_signup_link"));
  setText("login-forgot-link", t("login_forgot_link"));
  const signupLink = document.getElementById("login-signup-link");
  if (signupLink) signupLink.setAttribute("href", WEBSITE_SIGNUP);
  const forgotLink = document.getElementById("login-forgot-link");
  if (forgotLink) forgotLink.setAttribute("href", WEBSITE_RESET);
  setPlaceholder("login-email", "you@mail.com");
}

function applyLanguageForSettings() {
  const stTitle = document.getElementById("settings-title");
  const stSubtitle = document.getElementById("settings-subtitle");
  const appTitle = document.getElementById("settings-appearance-title");
  const themeLabel = document.getElementById("settings-theme-label");
  const themeHint = document.getElementById("settings-theme-hint");
  const dispTitle = document.getElementById("settings-display-title");
  const fsBtn = document.getElementById("settings-fullscreen-btn");
  const fsHint = document.getElementById("settings-fullscreen-hint");
  const financeTitle = document.getElementById("settings-finance-title");
  const displayCurrencyLabel = document.getElementById(
    "settings-display-currency-label"
  );
  const displayCurrencyHint = document.getElementById(
    "settings-display-currency-hint"
  );
  const autoStatusLabel = document.getElementById("settings-auto-status-label");
  const autoStatusHint = document.getElementById("settings-auto-status-hint");
  const langTitle = document.getElementById("settings-language-title");
  const accTitle = document.getElementById("settings-account-title");
  const updatesTitle = document.getElementById("settings-updates-title");
  const updatesSubtitle = document.getElementById("settings-updates-subtitle");
  const updatesCheck = document.getElementById("settings-check-updates");
  const updatesInstall = document.getElementById("settings-install-update");
  const updatesVersion = document.getElementById("settings-update-version");
  const updatesStatus = document.getElementById("settings-update-status");
  const legalTitle = document.getElementById("settings-legal-title");
  const foot = document.getElementById("settings-footnote");
  const swAcc = document.getElementById("settings-switch-account");
  const logoutBtn = document.getElementById("settings-logout");
  const chipDark = document.getElementById("settings-theme-dark");
  const chipLight = document.getElementById("settings-theme-light");
  const chipAuto = document.getElementById("settings-theme-auto");
  const linkGdpr = document.getElementById("settings-link-gdpr");
  const linkTerms = document.getElementById("settings-link-terms");
  const linkPrivacy = document.getElementById("settings-link-privacy");

  if (stTitle) stTitle.textContent = t("settings_title");
  if (stSubtitle) stSubtitle.textContent = t("settings_subtitle");
  if (appTitle) appTitle.textContent = t("settings_appearance_title");
  if (themeLabel) themeLabel.textContent = t("settings_theme_label");
  if (themeHint) themeHint.textContent = t("settings_theme_hint");
  if (dispTitle) dispTitle.textContent = t("settings_display_title");
  if (fsBtn) {
    fsBtn.textContent = document.fullscreenElement
      ? t("settings_fullscreen_btn_exit")
      : t("settings_fullscreen_btn_enter");
  }
  if (fsHint) fsHint.textContent = t("settings_fullscreen_hint");
  if (financeTitle) financeTitle.textContent = t("settings_finance_title");
  if (displayCurrencyLabel) {
    displayCurrencyLabel.textContent = t("settings_display_currency_label");
  }
  if (displayCurrencyHint) {
    displayCurrencyHint.textContent = t("settings_display_currency_hint");
  }
  if (autoStatusLabel) autoStatusLabel.textContent = t("settings_auto_status_label");
  if (autoStatusHint) autoStatusHint.textContent = t("settings_auto_status_hint");
  setText("settings-email-title", t("settings_email_title"));
  setText("settings-email-subtitle", t("settings_email_subtitle"));
  setText("settings-email-connect", t("settings_email_connect"));
  setText("settings-email-sync", t("settings_email_sync"));
  setText("settings-email-source-hub", t("inbox_mesh"));
  setText("settings-privacy-vault", t("privacy_vault"));
  setText("settings-phone-title", t("settings_phone_title"));
  setText("settings-phone-subtitle", t("settings_phone_subtitle"));
  setText("settings-phone-inbox-label", t("settings_phone_inbox_label"));
  setText("settings-phone-inbox-hint", t("settings_phone_inbox_hint"));
  setText("settings-phone-inbox-copy", t("phone_inbox_copy"));
  setText("settings-phone-label", t("settings_phone_label"));
  setText("settings-phone-save", t("settings_phone_save"));
  setText("settings-phone-send-code", t("settings_phone_send_code"));
  setText("settings-phone-verify", t("settings_phone_verify"));
  setPlaceholder("settings-phone-code", t("settings_phone_code_placeholder"));
  if (langTitle) langTitle.textContent = t("settings_language_title");
  if (accTitle) accTitle.textContent = t("settings_account_title");
  if (updatesTitle) updatesTitle.textContent = t("settings_updates_title");
  if (updatesSubtitle) updatesSubtitle.textContent = t("settings_updates_subtitle");
  if (updatesCheck) updatesCheck.textContent = t("settings_updates_check");
  if (updatesInstall) {
    updatesInstall.textContent = t("settings_updates_install");
  }
  if (updatesVersion && updatesVersion.dataset.version) {
    updatesVersion.textContent =
      t("settings_updates_current") + ": " + updatesVersion.dataset.version;
  }
  if (updatesStatus && updatesStatus.dataset.status) {
    updatesStatus.textContent = updatesStatus.dataset.status;
  }
  if (legalTitle) legalTitle.textContent = t("settings_legal_title");
  if (foot) foot.textContent = t("settings_footnote");
  if (swAcc) swAcc.textContent = t("settings_switch_account");
  if (logoutBtn) logoutBtn.textContent = t("settings_logout");
  if (chipDark) chipDark.textContent = t("theme_dark");
  if (chipLight) chipLight.textContent = t("theme_light");
  if (chipAuto) chipAuto.textContent = t("theme_auto");
  if (linkGdpr) linkGdpr.textContent = t("settings_link_gdpr");
  if (linkTerms) linkTerms.textContent = t("settings_link_terms");
  if (linkPrivacy) linkPrivacy.textContent = t("settings_link_privacy");

  syncPhoneSettings();
  refreshUpdateUi();
  const langOptions = {
    ro: "Română",
    hu: "Magyar",
    de: "Deutsch",
    fr: "Français",
    en: "English",
    it: "Italiano",
    tr: "Türkçe",
    zh: "中文",
    ar: "العربية",
    ru: "Русский",
    es: "Español",
    ja: "日本語",
  };
  ["lang-select", "settings-language-select"].forEach(function (id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    Array.from(sel.options || []).forEach(function (opt) {
      if (langOptions[opt.value]) opt.textContent = langOptions[opt.value];
    });
  });
  syncDisplayCurrencySelect();
  refreshExchangeRateStatus();
}

function applyLanguageForAppTexts() {
  setText("splash-subtitle", t("splash_subtitle"));
  setText("app-tagline", t("app_tagline"));
  setText("btn-switch-account", t("settings_switch_account"));
  setText("btn-logout", t("settings_logout"));
  setText("hero-eyebrow", t("hero_eyebrow"));
  setText("hero-title", t("hero_title"));
  setText("hero-subtitle", t("hero_subtitle"));
  setText("hero-pill-cloud", t("hero_pill_cloud"));
  setText("hero-metric-month-label", t("hero_metric_month_label"));
  setText("hero-metric-all-label", t("hero_metric_all_label"));
  setText("hero-metric-sync-label", t("hero_metric_sync_label"));

  setText("kpi-title", t("overview_title"));
  setText("kpi-label-total", t("kpi_total_all_time"));
  setText("kpi-label-unpaid", t("kpi_unpaid"));
  setText("kpi-label-overdue", t("kpi_overdue"));

  setText("security-title", t("security_title"));
  setText("security-subtitle", t("security_subtitle"));

  setText("invoices-title", t("invoices_title"));
  setText("btn-fast-reports", t("reports_button"));
  setText("btn-sync", t("sync_now"));
  setText("btn-delete-all-invoices", t("delete_all_invoices"));
  setText("btn-add-invoice", t("add_invoice"));
  setText("btn-month-current", t("month_current"));
  setText("setup-panel-eyebrow", t("setup_panel_eyebrow"));
  setText("setup-panel-title", t("setup_panel_title"));
  setText("setup-panel-desc", t("setup_panel_desc"));
  setText("setup-panel-settings", t("setup_panel_settings"));
  setText("invoice-search-label", t("invoice_search_label"));
  setPlaceholder("invoice-search", t("invoice_search_placeholder"));
  setText("reports-title", t("reports_title"));
  setText("reports-desc", t("reports_desc"));
  setText("reports-scope-label", t("reports_scope_label"));
  setText("reports-fields-label", t("reports_fields_label"));
  setText("reports-preview-title", t("reports_preview_title"));
  setText("reports-cancel", t("reports_cancel"));
  setText("reports-export-csv", t("reports_export_csv"));
  setText("reports-export-json", t("reports_export_json"));
  setText("reports-export-html", t("reports_export_html"));
  setText("reports-export-txt", t("reports_export_txt"));
  setText("reports-export-pdf", t("reports_export_pdf"));
  setText("reports-field-company", t("col_company"));
  setText("reports-field-category", t("col_category"));
  setText("reports-field-number", t("col_number"));
  setText("reports-field-issue", t("col_issue"));
  setText("reports-field-due", t("col_due"));
  setText("reports-field-amount", t("col_amount"));
  setText("reports-field-status", t("col_status"));
  setText("reports-field-evidence", t("report_evidence"));
  setText("reports-field-cadence", t("report_cadence"));
  setText("reports-field-space", t("report_space"));
  setText("reports-field-risk", t("report_risk"));
  const reportsScope = document.getElementById("reports-scope");
  if (reportsScope) {
    Array.from(reportsScope.options || []).forEach(function (option) {
      if (option.value === "month") option.textContent = t("reports_scope_month");
      if (option.value === "all") option.textContent = t("reports_scope_all");
      if (option.value === "visible") option.textContent = t("reports_scope_visible");
    });
  }
  setText("phone-inbox-title", t("phone_panel_title"));
  setText("phone-inbox-desc", t("phone_panel_desc"));
  setText("phone-inbox-number-label", t("phone_panel_inbox_label"));
  setText("phone-inbox-number-hint", t("phone_panel_inbox_hint"));
  setText("phone-inbox-copy", t("phone_inbox_copy"));
  setText("th-company", t("col_company"));
  setText("th-category", t("col_category"));
  setText("th-number", t("col_number"));
  setText("th-issue", t("col_issue"));
  setText("th-due", t("col_due"));
  setText("th-amount", t("col_amount"));
  setText("th-status", t("col_status"));
  setText("th-actions", t("col_actions"));

  setText("modal-add-title", t("modal_add_title"));
  setText("label-inv-company", t("modal_company"));
  setText("label-inv-category", t("modal_category"));
  setText("label-inv-number", t("modal_number"));
  setText("label-inv-issue", t("modal_issue"));
  setText("label-inv-due", t("modal_due"));
  setText("label-inv-amount", t("modal_amount"));
  setText("label-inv-currency", t("modal_currency"));
  setText("label-inv-status", t("modal_status"));
  setText("modal-cancel", t("modal_cancel"));
  setText("modal-save", t("modal_save"));
  setText("confirm-cancel", t("confirm_cancel"));
  setText("confirm-ok", t("confirm_ok"));

  setText("account-modal-title", t("modal_account_title"));
  setText("account-add", t("modal_account_add"));

  setText("mail-connect-title", t("mail_sync_connect_title"));
  setText("mail-connect-desc", t("mail_sync_connect_desc"));
  setText("mail-connect-email-label", t("mail_sync_connect_email_label"));
  setPlaceholder(
    "mail-connect-email",
    t("mail_sync_connect_email_placeholder")
  );
  setText("mail-connect-provider-label", t("mail_sync_connect_provider_label"));
  setText("mail-connect-cancel", t("mail_sync_connect_cancel"));
  setText("mail-connect-continue", t("mail_sync_connect_continue"));

  setText("update-prompt-title", t("update_prompt_title"));
  setText("update-prompt-desc", t("update_prompt_desc"));
  setText("update-prompt-core-label", t("update_prompt_core"));
  setText("update-prompt-auto-label", t("update_prompt_auto"));
  setText("update-prompt-details-toggle", t("update_prompt_details"));
  setText("update-prompt-later", t("update_prompt_later"));
  setText("update-prompt-action", t("update_prompt_action_download"));

  setText("profile-title", t("profile_title"));
  setText("profile-subtitle", t("profile_subtitle"));
  setText("profile-plan-section-title", t("profile_plan_title"));
  setText("profile-plan-note", t("profile_plan_note"));
  setText("profile-basic-name", t("profile_plan_basic_title"));
  setText("profile-basic-desc", t("profile_plan_basic_desc"));
  setText("profile-business-name", t("profile_plan_business_title"));
  setText("profile-business-desc", t("profile_plan_business_desc"));
  setText("profile-plan-device-note", t("profile_plan_device_note"));
  setText("profile-plan-readonly", t("profile_plan_readonly"));
  setText("profile-manage-link", t("profile_manage_on_web"));
  setText("profile-details-title", t("profile_identity_title"));
  setText("profile-first-label", t("profile_first_name"));
  setText("profile-last-label", t("profile_last_name"));
  setText("profile-phone-label", t("profile_phone_label"));
  setText("profile-phone-hint", t("profile_phone_hint"));
  setText("profile-company-label", t("profile_company_label"));
  setText("profile-company-hint", t("profile_company_hint"));
  setText("profile-save", t("profile_save_btn"));
  setText("profile-password-title", t("profile_password_title"));
  setText("profile-password-body", t("profile_password_body"));
  setText("profile-password-link", t("profile_password_btn"));
  setText("profile-plan-pill", planLabel(currentUser && currentUser.plan));

  const statusSelect = document.getElementById("inv-status");
  if (statusSelect) {
    Array.from(statusSelect.options || []).forEach(function (opt) {
      if (opt.value === "unpaid") opt.textContent = t("status_unpaid");
      if (opt.value === "paid") opt.textContent = t("status_paid");
      if (opt.value === "overdue") opt.textContent = t("status_overdue");
    });
  }
  refreshMailSyncPanel();
  refreshUpdatePromptUi();
  syncInvoiceMonthControls();
  renderIntelligenceStaticTexts();
  renderIntelligenceWorkspace();
}



/* ---------- SPLASH ---------- */

function runSplashSequence() {
  const statusEl = document.getElementById("splash-status");
  const messages = [
    t("splash_loading_1"),
    t("splash_loading_2"),
    t("splash_loading_3"),
    t("splash_loading_4"),
  ];
  let idx = 1;
  if (statusEl) statusEl.textContent = messages[0];
  const interval = setInterval(function () {
    if (!statusEl) return;
    statusEl.textContent = messages[idx];
    idx++;
    if (idx >= messages.length) {
      clearInterval(interval);
    }
  }, 1600);
}

function hideSplashShowLogin() {
  const shouldShowApp = !!auth.currentUser && !forceLoginOnLaunch;
  if (splashTransitioned) {
    if (shouldShowApp) {
      showAppScreen();
    } else {
      showLoginScreen();
    }
    return;
  }
  const elapsed = Date.now() - splashStartedAt;
  const remaining = SPLASH_MIN_MS - elapsed;
  if (remaining > 0) {
    if (!splashTransitionTimer) {
      splashTransitionTimer = setTimeout(function () {
        splashTransitionTimer = null;
        hideSplashShowLogin();
      }, remaining);
    }
    return;
  }
  splashTransitioned = true;
  const splash = document.getElementById("splash");
  if (splash) splash.classList.add("hidden");
  setTimeout(function () {
    if (splash) splash.style.display = "none";
  }, 500);
  if (shouldShowApp) {
    showAppScreen();
  } else {
    showLoginScreen();
  }
}

/* ---------- SESSION HELPERS ---------- */

function setLoginMessage(text, isError) {
  const msg = document.getElementById("login-message");
  if (!msg) return;
  if (isError) {
    msg.style.color = "var(--danger)";
  } else {
    msg.style.color = "";
  }
  msg.textContent = text || "";
}

function showLoginScreen() {
  const login = document.getElementById("login-screen");
  const app = document.getElementById("app-screen");
  if (app) app.classList.add("hidden");
  if (login) login.classList.remove("hidden");
}

function showAppScreen() {
  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("hidden");
    splash.style.display = "none";
  }
  const login = document.getElementById("login-screen");
  const app = document.getElementById("app-screen");
  if (login) login.classList.add("hidden");
  if (app) app.classList.remove("hidden");
}

function clearSubscriptions() {
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }
  if (invoicesUnsub) {
    invoicesUnsub();
    invoicesUnsub = null;
  }
  if (billingRefsUnsub) {
    billingRefsUnsub();
    billingRefsUnsub = null;
  }
  if (mailAccountsUnsub) {
    mailAccountsUnsub();
    mailAccountsUnsub = null;
  }
  if (remindersUnsub) {
    remindersUnsub();
    remindersUnsub = null;
  }
  invoiceReminders = [];
}

async function loadPlanClaims(authUser) {
  planFromClaims = null;
  if (!authUser) return;
  try {
    const tokenResult = await authUser.getIdTokenResult();
    if (tokenResult && tokenResult.claims && tokenResult.claims.plan) {
      planFromClaims = String(tokenResult.claims.plan || "").toLowerCase();
    }
  } catch (err) {
    console.error("plan claims", err);
  }
}

function resolvePlan(profile) {
  const docPlan =
    profile && profile.plan ? String(profile.plan || "").toLowerCase() : "";
  return planFromClaims || docPlan || "basic";
}

function normalizeAccountPlan(plan) {
  return String(plan || "").toLowerCase() === "business" ? "business" : "basic";
}

function workspaceSpaceForPlan(plan) {
  return normalizeAccountPlan(plan) === "business" ? "business" : "home";
}

function getAccountWorkspaceSpace() {
  return workspaceSpaceForPlan(
    (currentUser && currentUser.plan) || planFromClaims || "basic"
  );
}

async function ensureUserDoc(authUser) {
  if (!authUser) return;
  try {
    const ref = firestore.collection("users").doc(authUser.uid);
    const payload = {
      email: authUser.email || "",
      displayName: authUser.displayName || "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(payload, { merge: true });
  } catch (err) {
    console.error("profile sync", err);
  }
}

function applyUserProfile(authUser, data) {
  const profile = data || {};
  const plan = resolvePlan(profile);
  currentUser = {
    uid: authUser.uid,
    email: authUser.email || profile.email || "",
    firstName: profile.firstName || profile.first_name || "",
    lastName: profile.lastName || profile.last_name || "",
    company: profile.company || profile.companyName || profile.company_name || "",
    phone: profile.phone || profile.phoneNumber || "",
    phoneVerified: !!profile.phoneVerified,
    phoneInboxNumber: normalizePhoneInput(
      profile.phoneInboxNumber || profile.phone_inbox_number || ""
    ),
    phoneInboxLastInboundAt:
      profile.phoneInboxLastInboundAt || profile.phone_inbox_last_inbound_at || null,
    phoneInboxLastInvoiceAt:
      profile.phoneInboxLastInvoiceAt || profile.phone_inbox_last_invoice_at || null,
    plan: plan,
    emailVerified: !!authUser.emailVerified,
    displayName: profile.displayName || authUser.displayName || "",
  };

  if (profile.lang) {
    setLanguage(profile.lang, false);
  }
  if (profile.themeMode) {
    setThemeMode(profile.themeMode, false);
  }
  if (profile.displayCurrency) {
    setDisplayCurrency(profile.displayCurrency, false);
  }
  if (typeof profile.autoStatusEnabled === "boolean") {
    setAutoStatusEnabled(profile.autoStatusEnabled, false);
  }
  setActiveWorkspaceSpace(workspaceSpaceForPlan(plan), false);

  if (currentUser.email && currentUser.company) {
    saveCompanyName(currentUser.email, currentUser.company);
  }

  applyProfileToHeader(currentUser);
  upsertAccountFromUser(currentUser);
  syncProfileForm();
  syncPhoneSettings();
  refreshVerificationUi();
  refreshMailSyncPanel();
}

function subscribeProfile(authUser) {
  if (!authUser) return;
  if (profileUnsub) profileUnsub();
  const ref = firestore.collection("users").doc(authUser.uid);
  profileUnsub = ref.onSnapshot(
    function (doc) {
      const data = doc && doc.exists ? doc.data() : {};
      applyUserProfile(authUser, data);
      saveOfflineCache();
    },
    function (err) {
      console.error("profile snapshot", err);
      applyOfflineCache(authUser);
    }
  );
}

function normalizeInvoiceDoc(doc) {
  const data = doc && doc.data ? doc.data() : {};
  return Object.assign({ id: doc.id }, data);
}

function markInvoicesChanged() {
  invoicesVersion += 1;
  visibleInvoicesCacheKey = "";
}

function replaceInvoicesFromSnapshot(snapshot) {
  const nextMap = new Map();
  if (snapshot && typeof snapshot.forEach === "function") {
    snapshot.forEach(function (doc) {
      nextMap.set(doc.id, normalizeInvoiceDoc(doc));
    });
  }
  invoicesById = nextMap;
  invoices = Array.from(invoicesById.values());
  markInvoicesChanged();
}

function applyInvoiceSnapshotChanges(snapshot) {
  if (!snapshot || typeof snapshot.docChanges !== "function") return false;
  const changes = snapshot.docChanges();
  if (!changes.length) return false;

  changes.forEach(function (change) {
    if (!change || !change.doc) return;
    const id = change.doc.id;
    if (!id) return;
    if (change.type === "removed") {
      invoicesById.delete(id);
      return;
    }
    invoicesById.set(id, normalizeInvoiceDoc(change.doc));
  });

  invoices = Array.from(invoicesById.values());
  markInvoicesChanged();
  return true;
}

function scheduleInvoiceUiRefresh() {
  if (invoicesUiRefreshQueued) return;
  invoicesUiRefreshQueued = true;
  const refresh = function () {
    invoicesUiRefreshQueued = false;
    renderInvoiceTable();
    updateKpis();
    renderIntelligenceWorkspace();
  };
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(refresh);
    return;
  }
  setTimeout(refresh, 0);
}

function subscribeInvoices(authUser) {
  if (!authUser) return;
  if (invoicesUnsub) invoicesUnsub();
  if (!applyOfflineCache(authUser)) {
    invoices = [];
    invoicesById = new Map();
    markInvoicesChanged();
    scheduleInvoiceUiRefresh();
  }
  const ref = firestore
    .collection("users")
    .doc(authUser.uid)
    .collection("invoices");
  invoicesUnsub = ref.onSnapshot(
    function (snapshot) {
      const changed = applyInvoiceSnapshotChanges(snapshot);
      if (!changed && invoicesById.size !== snapshot.size) {
        replaceInvoicesFromSnapshot(snapshot);
      }
      syncDisplayCurrencySelect();
      saveOfflineCache();
      scheduleInvoiceUiRefresh();
      flushOfflineQueue().catch(function (err) {
        console.error("offline queue flush", err);
      });
    },
    function (err) {
      console.error("invoice snapshot", err);
      applyOfflineCache(authUser);
    }
  );
  subscribeInvoiceReminders(authUser);
}

function normalizeBillingReferenceDoc(doc) {
  const data = doc && doc.data ? doc.data() : {};
  return Object.assign({ id: doc.id }, data);
}

function subscribeBillingReferences(authUser) {
  if (!authUser) return;
  if (billingRefsUnsub) billingRefsUnsub();
  const cached = loadOfflineCache(authUser.uid);
  billingReferences = cached && Array.isArray(cached.billingReferences)
    ? cached.billingReferences
    : [];
  const ref = firestore
    .collection("users")
    .doc(authUser.uid)
    .collection("billing_references");
  billingRefsUnsub = ref.onSnapshot(
    function (snapshot) {
      billingReferences = snapshot.docs
        .map(normalizeBillingReferenceDoc)
        .sort(function (a, b) {
          const da = toDate(a.createdAt) || toDate(a.referenceDate) || new Date(0);
          const db = toDate(b.createdAt) || toDate(b.referenceDate) || new Date(0);
          return db.getTime() - da.getTime();
        });
      syncDisplayCurrencySelect();
      saveOfflineCache();
      scheduleInvoiceUiRefresh();
    },
    function (err) {
      console.error("billing references snapshot", err);
      applyOfflineCache(authUser);
    }
  );
}

function subscribeMailAccounts(authUser) {
  if (!authUser) return;
  if (mailAccountsUnsub) mailAccountsUnsub();
  const cached = loadOfflineCache(authUser.uid);
  mailAccounts =
    cached && cached.mailAccounts && typeof cached.mailAccounts === "object"
      ? cached.mailAccounts
      : {};
  const ref = firestore
    .collection("users")
    .doc(authUser.uid)
    .collection("mail_accounts");
  mailAccountsUnsub = ref.onSnapshot(
    function (snapshot) {
      const next = {};
      snapshot.forEach(function (doc) {
        next[doc.id] = Object.assign({ accountId: doc.id }, doc.data() || {});
      });
      mailAccounts = next;
      if (Object.values(next).some((acc) => acc && acc.connected)) {
        mailSyncNotice = "";
        mailSyncErrorMessage = "";
      }
      refreshMailSyncPanel();
      saveOfflineCache();
      maybeRunAutoMailSync("mail_accounts_snapshot").catch(function () {});
    },
    function (err) {
      console.error("mail accounts snapshot", err);
      applyOfflineCache(authUser);
    }
  );
}

function getCompanyMap() {
  try {
    return JSON.parse(localStorage.getItem("df_company_names") || "{}");
  } catch (e) {
    return {};
  }
}

function saveCompanyName(email, name) {
  if (!email) return;
  const map = getCompanyMap();
  if (name) map[email] = name;
  else delete map[email];
  localStorage.setItem("df_company_names", JSON.stringify(map));
}

function getCompanyName(email) {
  if (!email) return "";
  const map = getCompanyMap();
  return map[email] || "";
}

function getDisplayName(user) {
  if (!user) return "User";
  const plan = (user.plan || "basic").toLowerCase();
  if (plan === "business") {
    const company =
      user.company ||
      getCompanyName(user.email) ||
      user.lastName ||
      user.firstName;
    return (company || user.email || "Business").trim();
  }
  if (user.displayName) return user.displayName;
  if (user.lastName) return user.lastName;
  if (user.firstName) return user.firstName;
  return user.email || "User";
}

function planLabel(plan) {
  return plan && plan.toLowerCase() === "business"
    ? t("plan_business_label")
    : t("plan_basic_label");
}

/* ---------- ACCOUNT STORE (multi-account) ---------- */

function getStoredAccounts() {
  try {
    return JSON.parse(localStorage.getItem("df_accounts") || "[]");
  } catch (e) {
    return [];
  }
}

function saveStoredAccounts(list) {
  localStorage.setItem("df_accounts", JSON.stringify(list));
}

function upsertAccountFromUser(user) {
  if (!user || !user.email) return;
  const accounts = getStoredAccounts();
  let idx = -1;
  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].email === user.email) {
      idx = i;
      break;
    }
  }

  const fullName =
    (user.firstName || "") + (user.lastName ? " " + user.lastName : "");

  const acc = {
    email: user.email,
    name: getDisplayName(user) || fullName.trim() || user.email,
    plan: (user.plan || "basic").toLowerCase(),
    lastUsed: Date.now(),
  };

  if (idx >= 0) accounts[idx] = acc;
  else accounts.push(acc);

  saveStoredAccounts(accounts);
}

function renderAccountList() {
  const container = document.getElementById("account-list");
  if (!container) return;

  const accounts = getStoredAccounts().sort(function (a, b) {
    return (b.lastUsed || 0) - (a.lastUsed || 0);
  });

  if (!accounts.length) {
    container.innerHTML =
      '<p class="small muted">' + t("settings_no_accounts") + "</p>";
    return;
  }

  container.innerHTML = "";
  const now = Date.now();

  accounts.forEach(function (acc) {
    const div = document.createElement("div");
    div.className = "account-card";

    let lastText = t("settings_last_just_now");
    if (acc.lastUsed) {
      const minutes = Math.round((now - acc.lastUsed) / (1000 * 60));
      if (minutes > 0) {
        lastText = t("settings_last_used").replace("{{min}}", String(minutes));
      }
    }

    div.innerHTML =
      '<div class="account-info">' +
      '<div class="account-name">' +
      acc.name +
      "</div>" +
      '<div class="account-email">' +
      acc.email +
      "</div>" +
      "</div>" +
      '<div class="account-meta">' +
      '<span class="plan-tag">' +
      planLabel(acc.plan || "basic") +
      "</span>" +
      '<span class="last-used">' +
      lastText +
      "</span>" +
      '<button class="primary-btn small" data-email="' +
      acc.email +
      '">' +
      t("settings_use_account") +
      "</button>" +
      "</div>";

    container.appendChild(div);
  });

  container.onclick = function (e) {
    const btn = e.target.closest("button[data-email]");
    if (!btn) return;
    const email = btn.getAttribute("data-email");
    const backdrop = document.getElementById("account-modal-backdrop");
    if (backdrop) backdrop.classList.add("hidden");
    logout(true);
    const emailInput = document.getElementById("login-email");
    if (emailInput) emailInput.value = email;
  };
}

/* ---------- AUTH FLOWS ---------- */

function clearLoginErrors() {
  const fields = [
    document.getElementById("login-email"),
    document.getElementById("login-password"),
  ];
  fields.forEach(function (f) {
    if (f) f.classList.remove("error");
  });
}

async function handleLogin() {
  clearLoginErrors();
  setLoginMessage("", true);

  const emailInput = document.getElementById("login-email");
  const passInput = document.getElementById("login-password");
  const email = emailInput.value.trim();
  const pass = passInput.value;

  let hasError = false;
  if (!email) {
    emailInput.classList.add("error");
    hasError = true;
  }
  if (!pass) {
    passInput.classList.add("error");
    hasError = true;
  }
  if (hasError) {
    setLoginMessage(t("msg_missing_fields"), true);
    return;
  }

  if (!ensureOnline()) {
    setLoginMessage(t("offline_required"), true);
    return;
  }

  setLoginMessage("...", false);

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    setLoginMessage("", false);
  } catch (err) {
    console.error(err);
    setLoginMessage(t("msg_invalid_credentials"), true);
  }
}

async function startSession(authUser) {
  if (isOnlineNow()) {
    await loadPlanClaims(authUser);
    await ensureUserDoc(authUser);
  } else {
    planFromClaims = null;
  }
  currentUser = {
    uid: authUser.uid,
    email: authUser.email || "",
    plan: planFromClaims || "basic",
    emailVerified: !!authUser.emailVerified,
    displayName: authUser.displayName || "",
    phone: "",
    phoneVerified: false,
    phoneInboxNumber: "",
    phoneInboxLastInboundAt: null,
    phoneInboxLastInvoiceAt: null,
  };
  invoiceMonthCursor = startOfMonth(new Date());
  syncInvoiceMonthControls();
  setDisplayCurrency(loadDisplayCurrencyPreference(), false);
  setAutoStatusEnabled(loadAutoStatusPreference(), false);
  resetMailSyncState();
  refreshMailSyncPanel();
  refreshExchangeRateStatus();
  applyProfileToHeader(currentUser);
  refreshVerificationUi();
  applyOfflineCache(authUser);
  subscribeProfile(authUser);
  subscribeInvoices(authUser);
  subscribeBillingReferences(authUser);
  subscribeMailAccounts(authUser);
  ensureAutoMailSyncScheduler();
  ensureExchangeRatesScheduler();
  phoneInboxInfoLastFetchedAt = 0;
  if (isOnlineNow()) {
    flushOfflineQueue().catch(function (err) {
      console.error("offline queue flush", err);
    });
    refreshExchangeRates({ force: true }).catch(function () {});
  }
  setTimeout(function () {
    refreshPhoneInboxInfo({ force: true }).catch(function () {});
  }, 1200);
  setTimeout(function () {
    maybeRunAutoMailSync("session_start", { force: true }).catch(function () {});
    maybeRunAutoPhoneSync("session_start", { force: true }).catch(function () {});
  }, 5000);
  hideSplashShowLogin();
  setLoginMessage("", false);
}

function handleSignedOut() {
  clearAutoMailSyncScheduler();
  clearExchangeRatesScheduler();
  clearSubscriptions();
  currentUser = null;
  invoices = [];
  invoicesById = new Map();
  markInvoicesChanged();
  billingReferences = [];
  invoiceMonthCursor = startOfMonth(new Date());
  visibleInvoicesCacheKey = "";
  syncInvoiceMonthControls();
  resetMailSyncState();
  exchangeRatesInfo = { base: "USD", rates: { USD: 1 }, provider: "", updatedAt: "", fetchedAt: "" };
  exchangeRatesLastFetchAt = 0;
  exchangeRatesLoading = false;
  phoneVerifyBusy = false;
  phoneVerifyLastError = "";
  phoneVerifyCodeRequestedAt = 0;
  phoneSyncPending = false;
  phoneSyncErrorMessage = "";
  phoneInboxInfoLoading = false;
  phoneInboxInfoLastFetchedAt = 0;
  autoPhoneSyncRunning = false;
  autoPhoneSyncLastRunAt = 0;
  scheduleInvoiceUiRefresh();
  hideSplashShowLogin();
  refreshVerificationUi();
  refreshMailSyncPanel();
  refreshExchangeRateStatus();
  setOfflineCacheIndicator(false);
}

function logout() {
  if (auth && auth.currentUser) {
    auth.signOut().catch(function (err) {
      console.error("signOut", err);
    });
  } else {
    handleSignedOut();
  }
}

/* ---------- PROFILE / PLAN ---------- */

async function loadProfile() {
  if (!auth.currentUser) return;
  try {
    const doc = await firestore.collection("users").doc(auth.currentUser.uid).get();
    const data = doc && doc.exists ? doc.data() : {};
    applyUserProfile(auth.currentUser, data);
  } catch (err) {
    console.error("loadProfile error", err);
  }
}

async function changePlan(plan) {
  notifyUser(t("profile_plan_readonly"), "info");
  return { plan: plan };
}

function applyProfileToHeader(user) {
  const safeUser = user || { plan: "basic" };
  const nameEl = document.getElementById("user-name");
  if (nameEl) nameEl.textContent = getDisplayName(safeUser);
  const planEl = document.getElementById("user-plan");
  if (planEl) planEl.textContent = planLabel(safeUser.plan);
  const planPill = document.getElementById("profile-plan-pill");
  if (planPill) planPill.textContent = planLabel(safeUser.plan);
}

function normalizePhoneInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  let normalized = cleaned;
  if (normalized.startsWith("00")) {
    normalized = "+" + normalized.slice(2);
  }
  const hasPlus = normalized.startsWith("+");
  const digits = normalized.replace(/\D/g, "");
  if (!digits) return "";
  return (hasPlus ? "+" : "") + digits;
}

function isPhoneValid(value) {
  if (!value) return true;
  const normalized = normalizePhoneInput(value);
  const digits = normalized.replace(/\D/g, "");
  return normalized.startsWith("+") && digits.length >= 8 && digits.length <= 15;
}

function syncPhoneSettings() {
  const input = document.getElementById("settings-phone-input");
  const codeInput = document.getElementById("settings-phone-code");
  const status = document.getElementById("settings-phone-status");
  const sendBtn = document.getElementById("settings-phone-send-code");
  const verifyBtn = document.getElementById("settings-phone-verify");
  const saveBtn = document.getElementById("settings-phone-save");
  const storedPhone = (currentUser && currentUser.phone) || "";
  if (input && document.activeElement !== input && input.value !== storedPhone) {
    input.value = storedPhone;
  }
  const phone = normalizePhoneInput(input ? input.value : storedPhone);
  const isVerified =
    !!(currentUser && currentUser.phoneVerified) && phone === storedPhone;
  const hasPhone = !!phone;
  const hasCode = !!(
    codeInput && String(codeInput.value || "").replace(/\D/g, "").length === 6
  );
  if (status) {
    if (!hasPhone) {
      status.textContent = t("settings_phone_status_empty");
      phoneVerifyLastError = "";
      phoneVerifyCodeRequestedAt = 0;
    } else if (isVerified) {
      status.textContent = t("settings_phone_status_verified");
      phoneVerifyLastError = "";
      phoneVerifyCodeRequestedAt = 0;
    } else if (phoneVerifyLastError) {
      status.textContent = phoneVerifyLastError;
    } else if (phoneVerifyCodeRequestedAt) {
      const elapsed = Date.now() - Number(phoneVerifyCodeRequestedAt || 0);
      status.textContent =
        elapsed >= PHONE_SMS_PENDING_HINT_AFTER_MS
          ? t("settings_phone_status_provider_pending")
          : t("settings_phone_status_pending");
    } else {
      status.textContent = t("settings_phone_status_unverified");
    }
  }
  if (saveBtn) saveBtn.disabled = phoneVerifyBusy;
  if (sendBtn) sendBtn.disabled = phoneVerifyBusy || !hasPhone || !isPhoneValid(phone);
  if (verifyBtn) verifyBtn.disabled = phoneVerifyBusy || !hasPhone || !hasCode || isVerified;
  if (codeInput) {
    codeInput.disabled = phoneVerifyBusy || !hasPhone || isVerified;
    if (isVerified) codeInput.value = "";
  }

  syncPhoneInboxInfoUi();
  syncPhoneDashboardPanel();
  refreshMailSyncPanel();
}

function maskPhoneForUi(phone) {
  const normalized = normalizePhoneInput(phone);
  if (!normalized) return "";
  const digits = normalized.replace(/\D/g, "");
  if (digits.length <= 4) return normalized;
  const keepStart = Math.min(3, Math.max(1, digits.length - 2));
  const keepEnd = 2;
  const start = digits.slice(0, keepStart);
  const end = digits.slice(-keepEnd);
  const maskedCount = Math.max(0, digits.length - keepStart - keepEnd);
  const masked = start + "*".repeat(maskedCount) + end;
  return normalized.startsWith("+") ? "+" + masked : masked;
}

function getPhoneInboxNumberForUi() {
  return normalizePhoneInput((currentUser && currentUser.phoneInboxNumber) || "");
}

function getPhoneInboxLastStatusText(invoiceKey, inboundKey, emptyKey) {
  const lastInvoiceAt = toDate(currentUser && currentUser.phoneInboxLastInvoiceAt);
  if (lastInvoiceAt) {
    return t(invoiceKey).replace("{{time}}", formatSyncTime(lastInvoiceAt));
  }
  const lastInboundAt = toDate(currentUser && currentUser.phoneInboxLastInboundAt);
  if (lastInboundAt) {
    return t(inboundKey).replace("{{time}}", formatSyncTime(lastInboundAt));
  }
  return t(emptyKey);
}

function syncPhoneInboxInfoUi() {
  const inboxNumber = getPhoneInboxNumberForUi();

  const panelNumber = document.getElementById("phone-inbox-number-value");
  if (panelNumber) {
    panelNumber.textContent = inboxNumber || t("phone_panel_inbox_number_missing");
  }
  const panelLast = document.getElementById("phone-inbox-last");
  if (panelLast) {
    panelLast.textContent = getPhoneInboxLastStatusText(
      "phone_panel_last_invoice",
      "phone_panel_last_inbound",
      "phone_panel_last_none"
    );
  }
  const panelCopy = document.getElementById("phone-inbox-copy");
  if (panelCopy) {
    panelCopy.disabled = !inboxNumber;
  }

  const settingsNumber = document.getElementById("settings-phone-inbox-number");
  if (settingsNumber) {
    settingsNumber.textContent = inboxNumber || t("settings_phone_inbox_number_missing");
  }
  const settingsLast = document.getElementById("settings-phone-inbox-last");
  if (settingsLast) {
    settingsLast.textContent = getPhoneInboxLastStatusText(
      "settings_phone_inbox_last_invoice",
      "settings_phone_inbox_last_inbound",
      "settings_phone_inbox_last_none"
    );
  }
  const settingsCopy = document.getElementById("settings-phone-inbox-copy");
  if (settingsCopy) {
    settingsCopy.disabled = !inboxNumber;
  }
}

function syncPhoneDashboardPanel() {
  const panel = document.getElementById("phone-inbox-panel");
  if (!panel) return;
  const statusEl = document.getElementById("phone-inbox-status");
  const btn = document.getElementById("phone-inbox-manage");

  const storedPhoneRaw = (currentUser && currentUser.phone) || "";
  const storedPhone = normalizePhoneInput(storedPhoneRaw);
  const hasPhone = !!storedPhone;
  const isVerified = !!(currentUser && currentUser.phoneVerified) && hasPhone;
  const masked = maskPhoneForUi(storedPhone);

  if (statusEl) {
    if (!hasPhone) {
      statusEl.textContent = t("phone_panel_status_empty");
    } else if (isVerified) {
      statusEl.textContent = t("phone_panel_status_verified").replace(
        "{{phone}}",
        masked || storedPhone
      );
    } else {
      statusEl.textContent = t("phone_panel_status_pending").replace(
        "{{phone}}",
        masked || storedPhone
      );
    }
  }

  if (btn) {
    if (!hasPhone) {
      btn.textContent = t("phone_panel_cta_connect");
    } else if (isVerified) {
      btn.textContent = t("phone_panel_cta_manage");
    } else {
      btn.textContent = t("phone_panel_cta_verify");
    }
  }
}

function syncProfileForm() {
  const first = document.getElementById("profile-first");
  const last = document.getElementById("profile-last");
  const company = document.getElementById("profile-company");
  const phone = document.getElementById("profile-phone");
  if (first && currentUser) first.value = currentUser.firstName || "";
  if (last && currentUser) last.value = currentUser.lastName || "";
  if (phone && currentUser) phone.value = currentUser.phone || "";
  if (company && currentUser) {
    company.value = currentUser.company || getCompanyName(currentUser.email);
  }

  const wrap = document.getElementById("profile-company-wrap");
  if (wrap) {
    if ((currentUser.plan || "basic") === "business") {
      wrap.classList.remove("hidden");
    } else {
      wrap.classList.add("hidden");
    }
  }
}

function openWebsite(url) {
  if (!url) return;
  try {
    if (window.DueFlux && typeof window.DueFlux.openExternal === "function") {
      window.DueFlux.openExternal(url);
      return;
    }
    window.open(url, "_blank");
  } catch (e) {
    console.error("openWebsite", e);
  }
}

async function copyTextToClipboard(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  try {
    if (
      navigator &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (_) {}

  try {
    const probe = document.createElement("textarea");
    probe.value = value;
    probe.setAttribute("readonly", "true");
    probe.style.position = "fixed";
    probe.style.opacity = "0";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
    probe.select();
    probe.setSelectionRange(0, probe.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(probe);
    return !!copied;
  } catch (_) {
    return false;
  }
}

async function copyPhoneInboxNumber() {
  const inboxNumber = getPhoneInboxNumberForUi();
  if (!inboxNumber) {
    notifyUser(t("phone_inbox_copy_missing"), "info");
    return;
  }
  const ok = await copyTextToClipboard(inboxNumber);
  if (!ok) {
    notifyUser(t("alert_profile_error"), "error");
    return;
  }
  notifyUser(t("phone_inbox_copy_done").replace("{{number}}", inboxNumber), "success");
}

async function refreshPhoneInboxInfo(options) {
  const opts = options || {};
  const force = !!opts.force;
  if (!currentUser || !auth.currentUser) return null;
  if (!navigator.onLine) return null;
  if (phoneInboxInfoLoading) return null;
  if (!force && Date.now() - phoneInboxInfoLastFetchedAt < PHONE_INBOX_INFO_MIN_REFRESH_MS) {
    return null;
  }

  phoneInboxInfoLoading = true;
  try {
    const result = await callFunctionWithAuth("getPhoneInboxInfo", {});
    if (!result || result.ok !== true || !currentUser) return result || null;
    if (typeof result.phone === "string" && result.phone) {
      currentUser.phone = normalizePhoneInput(result.phone);
    }
    if (typeof result.phoneVerified === "boolean") {
      currentUser.phoneVerified = !!result.phoneVerified;
    }
    if (typeof result.inboxNumber === "string") {
      currentUser.phoneInboxNumber = normalizePhoneInput(result.inboxNumber);
    }
    currentUser.phoneInboxLastInboundAt = result.lastInboundAt || null;
    currentUser.phoneInboxLastInvoiceAt = result.lastInvoiceAt || null;
    phoneSyncErrorMessage = "";
    phoneInboxInfoLastFetchedAt = Date.now();
    syncProfileForm();
    syncPhoneSettings();
    updateKpis();
    return result;
  } catch (err) {
    console.error("refreshPhoneInboxInfo", err);
    return null;
  } finally {
    phoneInboxInfoLoading = false;
  }
}

function openProfileModal() {
  syncProfileForm();
  applyProfileToHeader(currentUser || {});
  const manageLink = document.getElementById("profile-manage-link");
  if (manageLink) manageLink.setAttribute("href", WEBSITE_PRICING);
  const passLink = document.getElementById("profile-password-link");
  if (passLink) passLink.setAttribute("href", WEBSITE_ACCOUNT);
  const plan = (currentUser && currentUser.plan) || "basic";
  const basicCard = document.getElementById("profile-basic-card");
  const businessCard = document.getElementById("profile-business-card");
  if (basicCard) basicCard.classList.toggle("active", plan === "basic");
  if (businessCard)
    businessCard.classList.toggle("active", plan === "business");
  const bd = document.getElementById("profile-backdrop");
  if (bd) bd.classList.remove("hidden");
}

function closeProfileModal() {
  const bd = document.getElementById("profile-backdrop");
  if (bd) bd.classList.add("hidden");
}

async function saveProfileDetails() {
  const first = (document.getElementById("profile-first").value || "").trim();
  const last = (document.getElementById("profile-last").value || "").trim();
  const company = (document.getElementById("profile-company").value || "").trim();
  const phoneRaw = (document.getElementById("profile-phone").value || "").trim();
  const phone = normalizePhoneInput(phoneRaw);

  if (!isPhoneValid(phone)) {
    notifyUser(t("alert_phone_invalid"), "error");
    return;
  }

  if (!ensureOnline()) return;
  if (!auth.currentUser) return;

  try {
    const displayName = [first, last].filter(Boolean).join(" ");
    const phoneChanged =
      phone !== ((currentUser && currentUser.phone) || "");
    await firestore
      .collection("users")
      .doc(auth.currentUser.uid)
      .set(
        {
          firstName: first,
          lastName: last,
          company: company,
          phone: phone,
          phoneVerified: phoneChanged ? false : currentUser.phoneVerified || false,
          phoneUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          displayName: displayName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    if (displayName) {
      try {
        await auth.currentUser.updateProfile({ displayName: displayName });
      } catch (err) {
        console.error("updateProfile", err);
      }
    }

    if (currentUser) {
      currentUser.firstName = first;
      currentUser.lastName = last;
      currentUser.company = company;
      currentUser.phone = phone;
      if (phoneChanged) currentUser.phoneVerified = false;
      if (displayName) currentUser.displayName = displayName;
    }
    if (currentUser && currentUser.email) {
      saveCompanyName(currentUser.email, company);
    }

    applyProfileToHeader(currentUser);
    upsertAccountFromUser(currentUser);
    syncProfileForm();
    syncPhoneSettings();
    notifyUser(t("alert_profile_saved"), "success");
  } catch (err) {
    console.error("saveProfileDetails", err);
    notifyUser(t("alert_profile_error"), "error");
  }
}

async function savePhoneFromSettings() {
  const input = document.getElementById("settings-phone-input");
  if (!input) return;
  const phoneRaw = String(input.value || "").trim();
  const phone = normalizePhoneInput(phoneRaw);
  if (!isPhoneValid(phone)) {
    notifyUser(t("alert_phone_invalid"), "error");
    return;
  }
  if (!ensureOnline()) return;
  if (!auth.currentUser) return;

  try {
    const phoneChanged =
      phone !== ((currentUser && currentUser.phone) || "");
    await firestore
      .collection("users")
      .doc(auth.currentUser.uid)
      .set(
        {
          phone: phone,
          phoneVerified: phoneChanged ? false : currentUser.phoneVerified || false,
          phoneUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    if (currentUser) {
      currentUser.phone = phone;
      if (phoneChanged) currentUser.phoneVerified = false;
    }
    phoneVerifyLastError = "";
    if (phoneChanged) phoneVerifyCodeRequestedAt = 0;
    syncProfileForm();
    syncPhoneSettings();
    notifyUser(t("alert_phone_saved"), "success");
    refreshPhoneInboxInfo({ force: true }).catch(function () {});

    // UX: if the user just connected/changed a phone, automatically send the verification code.
    // (Backend has a resend cooldown to prevent spam.)
    if (phoneChanged && phone) {
      await requestPhoneVerificationCodeFromSettings();
    }
  } catch (err) {
    console.error("savePhoneFromSettings", err);
    notifyUser(t("alert_profile_error"), "error");
  }
}

function normalizePhoneCodeInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

async function withRequestTimeout(promise, timeoutMs, timeoutMessage) {
  const ms = Number(timeoutMs) > 0 ? Number(timeoutMs) : PHONE_FUNCTION_TIMEOUT_MS;
  const message = timeoutMessage || "Request timeout.";
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise(function (_, reject) {
        timer = setTimeout(function () {
          const err = new Error(message);
          err.code = "deadline-exceeded";
          reject(err);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mapPhoneVerificationErrorMessage(err) {
  const code = String((err && err.code) || "").toLowerCase();
  const message = String((err && err.message) || "");
  if (/30034/.test(message) || /a2p/i.test(message) || /10dlc/i.test(message)) {
    return t("alert_phone_sms_a2p_required");
  }
  if (
    /21408/.test(message) ||
    /geo permissions?/i.test(message) ||
    /permission to send an sms has not been enabled/i.test(message)
  ) {
    return t("alert_phone_sms_geo_permission");
  }
  if (/21608/.test(message) || (/trial/i.test(message) && /unverified/i.test(message))) {
    return t("alert_phone_sms_trial_destination_unverified");
  }
  if (
    /21267/.test(message) ||
    /alphanumeric sender/i.test(message) ||
    /twilio trial/i.test(message)
  ) {
    return t("alert_phone_sms_trial_restriction");
  }
  if (code === "failed-precondition" || /not configured/i.test(message)) {
    if (
      /21267/.test(message) ||
      /alphanumeric sender/i.test(message) ||
      /twilio trial/i.test(message)
    ) {
      return t("alert_phone_sms_trial_restriction");
    }
    return t("alert_phone_sms_not_configured");
  }
  if (code === "resource-exhausted") {
    return t("alert_phone_code_throttled");
  }
  if (code === "deadline-exceeded") {
    return t("alert_phone_verify_failed");
  }
  if (code === "unavailable") {
    if (message && !/request failed/i.test(message)) return message;
    return t("alert_phone_verify_failed");
  }
  if (code === "invalid-argument") {
    return t("alert_phone_verify_failed");
  }
  if (code === "unauthenticated") {
    return t("offline_required");
  }
  return t("alert_phone_verify_failed");
}

function buildSmsDeliveryFailureMessage(result) {
  const status = String((result && result.status) || "");
  const errCode = String((result && result.errorCode) || "");
  const errMsg = String((result && result.errorMessage) || "");

  if (
    errCode === "30034" ||
    /30034/.test(errMsg) ||
    /a2p/i.test(errMsg) ||
    /10dlc/i.test(errMsg)
  ) {
    return t("alert_phone_sms_a2p_required");
  }
  if (
    errCode === "21408" ||
    /geo permissions?/i.test(errMsg) ||
    /permission to send an sms has not been enabled/i.test(errMsg)
  ) {
    return t("alert_phone_sms_geo_permission");
  }
  if (
    errCode === "21608" ||
    /trial/i.test(errMsg) && /unverified/i.test(errMsg)
  ) {
    return t("alert_phone_sms_trial_destination_unverified");
  }
  if (errCode === "21267" || /21267/.test(errMsg)) {
    return t("alert_phone_sms_trial_restriction");
  }

  if (!errMsg) {
    return `${t("alert_phone_sms_delivery_failed")}${status ? ` (${status})` : ""}.`;
  }

  const suffix = errCode ? ` (Twilio error ${errCode})` : "";
  return `${t("alert_phone_sms_delivery_failed")}: ${errMsg}${suffix}`;
}

function shouldContinueSmsStatusPolling(status) {
  const s = String(status || "").toLowerCase();
  return (
    s === "queued" ||
    s === "accepted" ||
    s === "sending" ||
    s === "sent" ||
    s === "scheduled"
  );
}

async function pollPhoneVerificationSmsStatus(attempt) {
  if (!ensureOnline()) return;
  if (!auth.currentUser) return;
  const tries = Number(attempt || 1);

  try {
    const result = await callFunctionWithAuth("getPhoneVerificationSmsStatus", {});
    if (!result || result.ok !== true) return;

    const status = String(result.status || "").toLowerCase();
    if (status === "failed" || status === "undelivered") {
      const msg = buildSmsDeliveryFailureMessage(result);
      phoneVerifyLastError = msg;
      phoneVerifyCodeRequestedAt = 0;
      syncPhoneSettings();
      notifyUser(msg, "error");
      return;
    }

    // If it's still moving through the provider, poll for longer to catch delayed carrier failures.
    if (tries < PHONE_SMS_STATUS_POLL_MAX_ATTEMPTS && shouldContinueSmsStatusPolling(status)) {
      setTimeout(function () {
        pollPhoneVerificationSmsStatus(tries + 1);
      }, PHONE_SMS_STATUS_POLL_DELAY_MS);
      return;
    }

    if (tries >= PHONE_SMS_STATUS_POLL_MAX_ATTEMPTS && shouldContinueSmsStatusPolling(status)) {
      const msg = `${t("alert_phone_sms_still_pending")} ${t("alert_phone_sms_no_delivery_hint")}`;
      phoneVerifyLastError = msg;
      syncPhoneSettings();
      notifyUser(msg, "info");
    }
  } catch (err) {
    console.error("pollPhoneVerificationSmsStatus", err);
  }
}

async function requestPhoneVerificationCodeFromSettings() {
  const input = document.getElementById("settings-phone-input");
  if (!input) return;
  const phone = normalizePhoneInput(input.value || "");
  if (!isPhoneValid(phone)) {
    notifyUser(t("alert_phone_invalid"), "error");
    return;
  }
  if (!ensureOnline()) return;
  if (!auth.currentUser) return;

  phoneVerifyLastError = "";
  phoneVerifyCodeRequestedAt = 0;
  phoneVerifyBusy = true;
  syncPhoneSettings();
  try {
    const result = await withRequestTimeout(
      callFunctionWithAuth("requestPhoneVerificationCode", {
        phone: phone,
      }),
      PHONE_FUNCTION_TIMEOUT_MS,
      "Phone verification request timeout."
    );
    if (currentUser) {
      currentUser.phone = phone;
      currentUser.phoneVerified = false;
    }
    syncProfileForm();
    syncPhoneSettings();

    phoneVerifyCodeRequestedAt = Date.now();
    const maskedPhone = result && result.maskedPhone ? String(result.maskedPhone) : phone;
    const providerStatus = String(
      result && result.sms && result.sms.status ? result.sms.status : ""
    ).toLowerCase();
    const providerPending = shouldContinueSmsStatusPolling(providerStatus);
    if (result && result.throttled) {
      notifyUser(t("alert_phone_code_throttled"), "info");
    } else if (providerPending) {
      notifyUser(
        t("alert_phone_code_requested").replace("{{phone}}", maskedPhone),
        "info"
      );
    } else {
      notifyUser(
        t("alert_phone_code_sent").replace("{{phone}}", maskedPhone),
        "success"
      );
    }

    // Catch provider-side fast failures (ex: blocked sender/route) and show a clear error instead of "pending".
    setTimeout(function () {
      pollPhoneVerificationSmsStatus(1);
    }, 2200);
  } catch (err) {
    console.error("requestPhoneVerificationCodeFromSettings", err);
    const msg = mapPhoneVerificationErrorMessage(err);
    phoneVerifyLastError = msg;
    phoneVerifyCodeRequestedAt = 0;
    notifyUser(msg, "error");
  } finally {
    phoneVerifyBusy = false;
    syncPhoneSettings();
  }
}

async function verifyPhoneCodeFromSettings() {
  const input = document.getElementById("settings-phone-input");
  const codeInput = document.getElementById("settings-phone-code");
  if (!input || !codeInput) return;
  const phone = normalizePhoneInput(input.value || "");
  const code = normalizePhoneCodeInput(codeInput.value || "");
  codeInput.value = code;
  if (!isPhoneValid(phone)) {
    notifyUser(t("alert_phone_invalid"), "error");
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    notifyUser(t("alert_phone_code_invalid"), "error");
    return;
  }
  if (!ensureOnline()) return;
  if (!auth.currentUser) return;

  phoneVerifyBusy = true;
  syncPhoneSettings();
  try {
    const result = await withRequestTimeout(
      callFunctionWithAuth("verifyPhoneVerificationCode", {
        phone: phone,
        code: code,
      }),
      PHONE_FUNCTION_TIMEOUT_MS,
      "Phone verification request timeout."
    );
    const verifiedPhone =
      normalizePhoneInput(result && result.phone) || phone;
    if (currentUser) {
      currentUser.phone = verifiedPhone;
      currentUser.phoneVerified = true;
    }
    phoneVerifyLastError = "";
    phoneVerifyCodeRequestedAt = 0;
    codeInput.value = "";
    syncProfileForm();
    syncPhoneSettings();
    notifyUser(t("alert_phone_verify_success"), "success");
    refreshPhoneInboxInfo({ force: true }).catch(function () {});
  } catch (err) {
    console.error("verifyPhoneCodeFromSettings", err);
    const msg = mapPhoneVerificationErrorMessage(err);
    phoneVerifyLastError = msg;
    notifyUser(msg, "error");
  } finally {
    phoneVerifyBusy = false;
    syncPhoneSettings();
  }
}

/* ---------- INVOICES ---------- */

let invoices = [];
let invoiceMonthCursor = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1
);
const SUBSCRIPTION_PROVIDER_HINTS = [
  "netflix",
  "voyo",
  "hbo max",
  "hbomax",
  "disney+",
  "spotify",
  "youtube premium",
  "apple tv",
  "google one",
  "icloud",
  "prime video",
  "amazon prime",
  "deezer",
  "tidal",
  "yoxo",
  "orange",
  "vodafone",
  "telekom",
  "digi",
  "enel",
  "eon",
  "engie",
  "hidroelectrica",
  "adobe",
  "microsoft 365",
  "office 365",
  "dropbox",
  "notion",
  "canva",
  "chatgpt plus",
  "openai",
];
const SUBSCRIPTION_RECURRING_HINTS = [
  "subscription",
  "recurring",
  "monthly",
  "annual",
  "yearly",
  "renewal",
  "membership",
  "plan",
  "billing period",
  "next billing",
  "auto-renew",
  "abonament",
  "recurent",
  "recurenta",
  "lunar",
  "anual",
  "prelungire",
];
const NON_SUBSCRIPTION_HINTS = [
  "order",
  "commande",
  "comanda",
  "booking",
  "reservation",
  "flight",
  "hotel",
  "ticket",
  "bilet",
  "itinerary",
  "travel",
  "shipping",
  "livrare",
  "marketplace",
  "purchase",
  "wizzair",
  "ryanair",
  "airbnb",
];

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date) {
  const base = date instanceof Date ? date : new Date(date);
  if (isNaN(base.getTime())) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function monthInputValue(date) {
  const d = startOfMonth(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}`;
}

function parseMonthInputValue(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return new Date(year, month - 1, 1);
}

function formatMonthLabel(date) {
  const d = startOfMonth(date);
  const locale = currentLang === "ro" ? "ro-RO" : undefined;
  return d.toLocaleDateString(locale, { month: "short", year: "numeric" });
}

function resolveInvoiceDate(inv) {
  if (!inv) return null;
  return (
    toDate(inv.issueDate) ||
    toDate(inv.dueDate) ||
    toDate(inv.receivedAt) ||
    toDate(inv.createdAt)
  );
}

function isDateInSelectedMonth(date) {
  const d = toDate(date);
  if (!d) return false;
  return (
    d.getFullYear() === invoiceMonthCursor.getFullYear() &&
    d.getMonth() === invoiceMonthCursor.getMonth()
  );
}

function isInvoiceInSelectedMonth(inv) {
  return isDateInSelectedMonth(resolveInvoiceDate(inv));
}

function invoiceLooksLikeSubscription(inv) {
  if (!inv || typeof inv !== "object") return false;
  if (inv.recurring === true) return true;
  if (String(inv.invoiceType || "").toLowerCase() === "subscription") return true;

  const categoryToken = String(inv.category || "").toLowerCase();
  if (
    categoryToken.includes("subscription") ||
    categoryToken.includes("abonament") ||
    categoryToken.includes("membership") ||
    categoryToken.includes("utility") ||
    categoryToken.includes("telecom") ||
    categoryToken.includes("saas")
  ) {
    return true;
  }

  const haystack = [
    String(inv.company || ""),
    String(inv.subject || ""),
    String(inv.from || ""),
    String(inv.emailPreview || ""),
    String(inv.sourceAccountEmail || ""),
  ]
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;

  const hasProviderHint = SUBSCRIPTION_PROVIDER_HINTS.some(function (hint) {
    return haystack.includes(hint);
  });
  const hasRecurringHint = SUBSCRIPTION_RECURRING_HINTS.some(function (hint) {
    return haystack.includes(hint);
  });
  const hasNonSubscriptionHint = NON_SUBSCRIPTION_HINTS.some(function (hint) {
    return haystack.includes(hint);
  });

  if (hasNonSubscriptionHint && !hasProviderHint && !hasRecurringHint) return false;
  return hasProviderHint || hasRecurringHint;
}

function getVisibleInvoicesCacheCursorKey() {
  const d = startOfMonth(invoiceMonthCursor);
  return `${d.getFullYear()}-${d.getMonth()}-${activeWorkspaceSpace}`;
}

function inferInvoiceSpace(inv) {
  void inv;
  return getAccountWorkspaceSpace();
}

function invoiceMatchesActiveSpace(inv) {
  return inferInvoiceSpace(inv) === getAccountWorkspaceSpace();
}

function getVisibleInvoices() {
  const cacheKey = getVisibleInvoicesCacheCursorKey() + "|" + String(invoicesVersion);
  if (visibleInvoicesCacheKey === cacheKey) {
    return visibleInvoicesCache;
  }
  const computed = (invoices || [])
    .filter(invoiceLooksLikeSubscription)
    .filter(invoiceMatchesActiveSpace)
    .filter(isInvoiceInSelectedMonth)
    .slice()
    .sort(function (a, b) {
      const da = resolveInvoiceDate(a);
      const db = resolveInvoiceDate(b);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
  visibleInvoicesCacheKey = cacheKey;
  visibleInvoicesCache = computed;
  return computed;
}

function syncInvoiceMonthControls() {
  const picker = document.getElementById("invoice-month-picker");
  if (picker) picker.value = monthInputValue(invoiceMonthCursor);
  setText("btn-month-current", t("month_current"));
}

function setInvoiceMonthCursor(date) {
  invoiceMonthCursor = startOfMonth(date);
  visibleInvoicesCacheKey = "";
  syncInvoiceMonthControls();
  scheduleInvoiceUiRefresh();
}

function shiftInvoiceMonth(delta) {
  const d = startOfMonth(invoiceMonthCursor);
  d.setMonth(d.getMonth() + Number(delta || 0));
  setInvoiceMonthCursor(d);
}

function formatInvoiceDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : "-";
}

function normalizeAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function hasTextValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isGenericInvoiceToken(value) {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!token) return true;
  const blocked = new Set([
    "number",
    "numar",
    "invoice",
    "factura",
    "electronic",
    "receipt",
    "chitanta",
    "bill",
    "none",
    "null",
    "undefined",
    "na",
    "n",
  ]);
  return blocked.has(token);
}

function normalizeInvoiceStatusLocal(value) {
  const status = String(value || "").toLowerCase();
  if (status === "paid") return "paid";
  if (status === "overdue") return "overdue";
  return "unpaid";
}

function isInvoicePastDue(inv) {
  const dueDate = toDate(inv && inv.dueDate);
  if (!dueDate) return false;
  const dueEnd = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
    23,
    59,
    59,
    999
  );
  return dueEnd.getTime() < Date.now();
}

function getInvoiceEffectiveStatus(inv) {
  const storedStatus = normalizeInvoiceStatusLocal(inv && inv.status);
  if (storedStatus === "paid") return "paid";
  if (isInvoicePastDue(inv)) return "overdue";
  if (storedStatus === "overdue" && !toDate(inv && inv.dueDate)) return "overdue";
  return "unpaid";
}

function isMeaningfulInvoice(inv) {
  if (!inv) return false;
  const amount = Number(inv.amount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const hasCompany = hasTextValue(inv.company);
  const hasNumber = hasTextValue(inv.number) && !isGenericInvoiceToken(inv.number);
  const hasReferenceDate = !!resolveInvoiceDate(inv);
  const hasDueDate = !!toDate(inv.dueDate);
  const amountSource = String(inv.amountSource || "").toLowerCase();
  const weakEmailTextAmount =
    hasAmount &&
    amountSource.includes("email_text") &&
    amount > 5000 &&
    !hasDueDate &&
    !hasNumber;
  if (weakEmailTextAmount) return false;
  if (hasAmount && (hasCompany || hasNumber || hasReferenceDate || hasDueDate)) return true;
  if (hasNumber && (hasCompany || hasReferenceDate || hasDueDate)) return true;
  if (hasCompany && (hasReferenceDate || hasDueDate)) return true;
  return false;
}

function isPlaceholderInvoice(inv) {
  if (!inv) return true;
  const hasAmount = Number.isFinite(Number(inv.amount)) && Number(inv.amount) > 0;
  const hasCompany = hasTextValue(inv.company) && String(inv.company).trim() !== "-";
  const hasNumber = hasTextValue(inv.number) && !isGenericInvoiceToken(inv.number);
  const hasDate = !!resolveInvoiceDate(inv) || !!toDate(inv.dueDate);
  return !(hasAmount || hasCompany || hasNumber || hasDate);
}

async function deleteInvoiceById(id) {
  if (!id || !auth.currentUser) return;
  await firestore
    .collection("users")
    .doc(auth.currentUser.uid)
    .collection("invoices")
    .doc(id)
    .delete();
}

async function deleteAllInvoicesFromCloud(uid) {
  if (!uid) return 0;
  const chunkSize = 400;
  let totalDeleted = 0;
  const collectionRef = firestore
    .collection("users")
    .doc(uid)
    .collection("invoices");

  while (true) {
    const snapshot = await collectionRef
      .orderBy(firebase.firestore.FieldPath.documentId())
      .limit(chunkSize)
      .get();
    if (snapshot.empty) break;

    const batch = firestore.batch();
    snapshot.forEach(function (docSnap) {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < chunkSize) break;
  }
  return totalDeleted;
}

function removeInvoiceLocally(id) {
  if (!id) return false;
  const existed = invoicesById.delete(id);
  invoices = Array.from(invoicesById.values());
  markInvoicesChanged();
  scheduleInvoiceUiRefresh();
  saveOfflineCache();
  return existed;
}

function updateInvoiceLocally(id, patch) {
  if (!id) return false;
  const current = invoicesById.get(id);
  if (!current) return false;
  if (hasPendingLocalAdd(id)) {
    const queue = getOfflineQueue(currentUser.uid);
    const pending = queue.find(function (item) { return item.type === "addInvoice" && item.localId === id; });
    if (pending) pending.data = Object.assign({}, pending.data, serializeForOfflineCache(patch));
    setOfflineQueue(currentUser.uid, queue);
  }
  invoicesById.set(id, Object.assign({}, current, patch || {}));
  invoices = Array.from(invoicesById.values());
  markInvoicesChanged();
  scheduleInvoiceUiRefresh();
  saveOfflineCache();
  return true;
}

function closeConfirmDialog(confirmed) {
  const backdrop = document.getElementById("confirm-backdrop");
  if (backdrop) backdrop.classList.add("hidden");
  const resolve = confirmDialogResolve;
  confirmDialogResolve = null;
  if (resolve) resolve(!!confirmed);
}

function ensureConfirmDialogDom() {
  let backdrop = document.getElementById("confirm-backdrop");
  if (backdrop) return backdrop;

  const host = document.getElementById("app-screen") || document.body;
  if (!host) return null;

  backdrop = document.createElement("div");
  backdrop.id = "confirm-backdrop";
  backdrop.className = "modal-backdrop hidden";
  backdrop.innerHTML =
    '<div class="modal confirm-modal">' +
    '<div class="modal-header">' +
    '<h3 id="confirm-title">DueFlux</h3>' +
    '<button id="confirm-close" class="icon-btn small" type="button">x</button>' +
    "</div>" +
    '<div class="modal-body"><p id="confirm-message" class="small"></p></div>' +
    '<div class="modal-footer">' +
    '<button id="confirm-cancel" type="button" class="ghost-btn">Cancel</button>' +
    '<button id="confirm-ok" type="button" class="primary-btn small">OK</button>' +
    "</div></div>";
  host.appendChild(backdrop);

  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) closeConfirmDialog(false);
  });
  const closeBtn = document.getElementById("confirm-close");
  const cancelBtn = document.getElementById("confirm-cancel");
  const okBtn = document.getElementById("confirm-ok");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      closeConfirmDialog(false);
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      closeConfirmDialog(false);
    });
  }
  if (okBtn) {
    okBtn.addEventListener("click", function () {
      closeConfirmDialog(true);
    });
  }

  return backdrop;
}

function openConfirmDialog(message, options) {
  const backdrop = ensureConfirmDialogDom();
  const titleEl = document.getElementById("confirm-title");
  const messageEl = document.getElementById("confirm-message");
  const okBtn = document.getElementById("confirm-ok");
  const cancelBtn = document.getElementById("confirm-cancel");
  if (!backdrop || !messageEl || !okBtn || !cancelBtn) {
    return Promise.resolve(false);
  }

  if (confirmDialogResolve) {
    const previous = confirmDialogResolve;
    confirmDialogResolve = null;
    previous(false);
  }

  const opts = options || {};
  if (titleEl) titleEl.textContent = opts.title || "DueFlux";
  messageEl.textContent = String(message || "");
  okBtn.textContent = opts.okLabel || t("confirm_ok");
  cancelBtn.textContent = opts.cancelLabel || t("confirm_cancel");
  backdrop.classList.remove("hidden");

  return new Promise(function (resolve) {
    confirmDialogResolve = resolve;
  });
}

async function loadInvoices() {
  scheduleInvoiceUiRefresh();
}

function bindInvoiceTableActions() {
  if (invoiceTableActionsBound) return;
  const tbody = document.getElementById("tbl-invoices");
  if (!tbody) return;

  tbody.addEventListener("click", async function (e) {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action") || "status";
    try {
      if (!auth.currentUser || !id) return;
      if (action === "center") {
        openInvoiceActionCenter(id);
        return;
      }
      if (action === "delete") {
        const confirmed = await openConfirmDialog(t("invoice_delete_confirm"), {
          title: t("invoice_delete_title"),
        });
        if (!confirmed) return;
        if (!isOnlineNow() || hasQueuedInvoice(id)) {
          removeInvoiceLocally(id);
          if (hasPendingLocalAdd(id)) {
            removeQueuedLocalAdd(auth.currentUser.uid, id);
          } else {
            queueOfflineMutation({ type: "deleteInvoice", id: id });
          }
          return;
        }
        await deleteInvoiceById(id);
        return;
      }
      if (action === "status" && autoStatusEnabled !== false) {
        return;
      }
      const status = btn.getAttribute("data-status");
      if (!status) return;
      if (!isOnlineNow() || hasQueuedInvoice(id)) {
        updateInvoiceLocally(id, { status: status, updatedAt: new Date().toISOString() });
        if (!hasPendingLocalAdd(id)) {
          queueOfflineMutation({
            type: "updateInvoice",
            id: id,
            data: { status: status },
          });
        }
        return;
      }
      await firestore
        .collection("users")
        .doc(auth.currentUser.uid)
        .collection("invoices")
        .doc(id)
        .set({ status: status }, { merge: true });
    } catch (err) {
      console.error("invoice action", err);
      if (action === "delete") {
        notifyUser(t("invoice_delete_error"), "error");
      }
    }
  });

  invoiceTableActionsBound = true;
}

function invoiceMatchesSearch(inv) {
  const query = String(invoiceSearchQuery || "").trim().toLowerCase();
  if (!query) return true;
  const fields = [
    inv && inv.company,
    inv && inv.category,
    inv && inv.number,
    inv && inv.currency,
    inv && inv.status,
    formatInvoiceDate(inv && inv.issueDate),
    formatInvoiceDate(inv && inv.dueDate),
    inv && inv.amount,
  ];
  return fields.some(function (field) {
    return String(field == null ? "" : field).toLowerCase().includes(query);
  });
}

function renderInvoiceTable() {
  const tbody = document.getElementById("tbl-invoices");
  if (!tbody) return;
  bindInvoiceTableActions();
  tbody.innerHTML = "";
  const visibleInvoices = getVisibleInvoices();
  const displayInvoices = visibleInvoices.filter(function (inv) {
    return !isPlaceholderInvoice(inv) && invoiceMatchesSearch(inv);
  });
  if (!displayInvoices.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="8" class="small muted">' + t("month_empty") + "</td>";
    tbody.appendChild(tr);
    return;
  }

  displayInvoices.forEach(function (inv) {
    const tr = document.createElement("tr");
    const effectiveStatus = getInvoiceEffectiveStatus(inv);
    const statusLabel = t("status_" + effectiveStatus);
    const amountValue = Number(inv.amount);
    const hasAmount = Number.isFinite(amountValue) && amountValue > 0;
    const issueDate = formatInvoiceDate(inv.issueDate);
    const dueDate = formatInvoiceDate(inv.dueDate);
    const currency = (inv.currency || "RON").toUpperCase();
    const amountText = hasAmount
      ? amountValue.toFixed(2) + " " + currency
      : t("amount_unknown");
    const manualStatusActionsEnabled = autoStatusEnabled === false;
    const statusActionHtml = manualStatusActionsEnabled
      ? '<button class="text-btn" data-id="' +
        inv.id +
        '" data-action="status" data-status="paid">' +
        t("table_actions_paid") +
        "</button>" +
        '<button class="text-btn" data-id="' +
        inv.id +
        '" data-action="status" data-status="overdue">' +
        t("table_actions_overdue") +
        "</button>"
      : "";

    tr.innerHTML =
      "<td>" +
      (inv.company || "-") +
      "</td>" +
      "<td>" +
      (inv.category || "-") +
      "</td>" +
      "<td>" +
      (inv.number || "-") +
      "</td>" +
      "<td>" +
      issueDate +
      "</td>" +
      "<td>" +
      dueDate +
      "</td>" +
      "<td>" +
      amountText +
      "</td>" +
      '<td><span class="status-badge status-' +
      effectiveStatus +
      '">' +
      statusLabel +
      "</span></td>" +
      '<td>' +
      '<button class="df-row-action" data-id="' +
      inv.id +
      '" data-action="center">' +
      t("invoice_open") +
      "</button>" +
      statusActionHtml +
      '<button class="text-btn" data-id="' +
      inv.id +
      '" data-action="delete">' +
      t("table_actions_delete") +
      "</button>" +
      "</td>";

    tbody.appendChild(tr);
  });
}

function getIntelligenceApi() {
  return window.DueFluxIntelligence || null;
}

function getIntelligenceInvoices() {
  return (invoices || [])
    .filter(invoiceLooksLikeSubscription)
    .filter(function (inv) { return !isPlaceholderInvoice(inv); })
    .filter(invoiceMatchesActiveSpace);
}

function setActiveWorkspaceSpace(space, persist) {
  void space;
  const safe = getAccountWorkspaceSpace();
  activeWorkspaceSpace = safe;
  visibleInvoicesCacheKey = "";
  if (persist !== false) {
    localStorage.setItem("df_active_space", safe);
    persistUserPreference({ activeWorkspaceSpace: safe });
  }
  Array.from(document.querySelectorAll("[data-space]")).forEach(function (button) {
    const isAllowed = button.getAttribute("data-space") === safe;
    button.hidden = !isAllowed;
    button.disabled = isAllowed;
    button.classList.toggle("is-active", isAllowed);
    button.setAttribute("aria-current", isAllowed ? "true" : "false");
  });
  scheduleInvoiceUiRefresh();
}

function pulseCardHtml(label, value, description, invoiceId) {
  const action = invoiceId
    ? ' role="button" tabindex="0" data-pulse-invoice="' + escapeHtml(invoiceId) + '"'
    : "";
  return '<article class="df-pulse-card"' + action + '><span class="small muted">' +
    escapeHtml(label) + '</span><strong>' + escapeHtml(String(value)) + '</strong><p>' +
    escapeHtml(description) + '</p></article>';
}

function renderIntelligenceWorkspace() {
  const api = getIntelligenceApi();
  if (!api) return;
  const source = getIntelligenceInvoices();
  const pulse = api.computePulse(source);
  const cards = document.getElementById("df-pulse-cards");
  const reminderAttention = (invoiceReminders || []).filter(function (item) {
    const when = toDate(item && item.remindAt);
    return when && when.getTime() <= Date.now() + 24 * 60 * 60 * 1000 && item.status !== "done";
  });
  if (cards) {
    cards.innerHTML =
      pulseCardHtml(t("pulse_attention"), pulse.attention.length + reminderAttention.length, t("pulse_attention_desc"), pulse.attention[0] && pulse.attention[0].id) +
      pulseCardHtml(t("pulse_upcoming"), pulse.upcoming.length, t("pulse_upcoming_desc"), pulse.upcoming[0] && pulse.upcoming[0].id) +
      pulseCardHtml(t("pulse_guarded"), pulse.guarded, t("pulse_guarded_desc"), pulse.attention[0] && pulse.attention[0].id) +
      pulseCardHtml(t("pulse_verified"), pulse.verified, t("pulse_verified_desc"), "");
  }

  const timeline = document.getElementById("df-obligation-timeline");
  const renewals = pulse.renewals.filter(function (inv) {
    const next = inv.intelligence.recurrence.nextExpectedAt;
    return next && next.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).slice(0, 5);
  setText("df-timeline-count", String(renewals.length));
  if (timeline) {
    timeline.innerHTML = renewals.length
      ? renewals.map(function (inv) {
          const next = inv.intelligence.recurrence.nextExpectedAt;
          const day = next.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
          const amount = Number(inv.intelligence.recurrence.expectedAmount || inv.amount || 0);
          return '<button type="button" class="df-timeline-item" data-intelligence-invoice="' + escapeHtml(inv.id) + '">' +
            '<span class="df-timeline-date">' + escapeHtml(day) + '</span>' +
            '<span class="df-timeline-copy"><strong>' + escapeHtml(inv.company || "-") + '</strong><span>' +
            escapeHtml(t("cadence_" + inv.intelligence.recurrence.cadence)) + ' · ' + escapeHtml(formatMoney(amount, inv.currency || "RON")) +
            '</span></span><span aria-hidden="true">›</span></button>';
        }).join("")
      : '<div class="df-empty-state">' + escapeHtml(t("twin_empty")) + '</div>';
  }

  const guard = document.getElementById("df-guard-feed");
  const guarded = pulse.attention.filter(function (inv) {
    return inv.intelligence.risk.flags.length > 0;
  }).slice(0, 5);
  setText("df-guard-count", String(guarded.length));
  if (guard) {
    guard.innerHTML = guarded.length
      ? guarded.map(function (inv) {
          const flag = inv.intelligence.risk.flags[0];
          return '<button type="button" class="df-guard-item" data-intelligence-invoice="' + escapeHtml(inv.id) + '">' +
            '<span class="df-risk-dot"></span><span class="df-guard-copy"><strong>' + escapeHtml(inv.company || "-") +
            '</strong><span>' + escapeHtml(t("risk_" + flag.code)) + '</span></span><span>' +
            escapeHtml(String(inv.intelligence.evidence.confidence)) + '%</span></button>';
        }).join("")
      : '<div class="df-empty-state">' + escapeHtml(t("guard_empty")) + '</div>';
  }
  renderIntelligenceStaticTexts();
}

function renderIntelligenceStaticTexts() {
  const workspaceSwitcher = document.querySelector(".df-space-switcher");
  if (workspaceSwitcher) workspaceSwitcher.setAttribute("aria-label", t("report_space"));
  setText("df-space-all", t("space_all"));
  setText("df-space-home", t("space_home"));
  setText("df-space-business", t("space_business"));
  setText(
    "df-workspace-plan-note",
    t(getAccountWorkspaceSpace() === "business" ? "profile_plan_business_desc" : "profile_plan_basic_desc")
  );
  setText("df-source-hub-open", t("inbox_mesh"));
  setText("df-privacy-vault-open", t("privacy_vault"));
  setText("df-pulse-eyebrow", t("pulse_eyebrow"));
  setText("df-pulse-title", t("pulse_title"));
  setText("df-pulse-state", t("pulse_live"));
  setText("df-timeline-eyebrow", t("twin_eyebrow"));
  setText("df-timeline-title", t("twin_title"));
  setText("df-guard-eyebrow", t("guard_eyebrow"));
  setText("df-guard-title", t("guard_title"));
  setText("df-action-eyebrow", t("action_eyebrow"));
  setText("df-action-title", t("action_title"));
  setText("df-evidence-title", t("evidence_title"));
  setText("df-actions-title", t("actions_title"));
  setText("df-action-paid", t("action_paid"));
  setText("df-action-payment", t("action_payment"));
  setText("df-action-cancel-subscription", t("action_cancel"));
  setText("df-action-reminder", t("action_reminder"));
  setText("df-reminder-label", t("reminder_label"));
  setText("df-reminder-save", t("reminder_save"));
  setText("df-sources-eyebrow", t("sources_eyebrow"));
  setText("df-sources-title", t("sources_title"));
  setText("df-sources-desc", t("sources_desc"));
  setText("df-forwarding-label", t("forwarding_label"));
  setText("df-vault-eyebrow", t("vault_eyebrow"));
  setText("df-vault-title", t("vault_title"));
  setText("df-vault-cloud-title", t("vault_cloud_title"));
  setText("df-vault-cloud-desc", t("vault_cloud_desc"));
  setText("df-vault-offline-title", t("vault_offline_title"));
  setText("df-vault-offline-desc", t("vault_offline_desc"));
  setText("df-vault-control-title", t("vault_control_title"));
  setText("df-vault-control-desc", t("vault_control_desc"));
  setText("df-vault-previews-label", t("vault_previews"));
}

function evidenceLabel(item) {
  const label = String(item && item.label || "").toLowerCase();
  if (label === "attachment") return t("evidence_attachment");
  if (label === "payment_confirmation") return t("evidence_payment_confirmation");
  if (label === "extraction") return t("evidence_extraction");
  if (label === "phone") return t("evidence_phone");
  if (label === "manual") return t("evidence_manual");
  if (label === "email") return t("evidence_email");
  return t("evidence_cloud");
}

function getActiveActionInvoice() {
  return invoicesById.get(activeActionInvoiceId) || (invoices || []).find(function (inv) { return inv.id === activeActionInvoiceId; }) || null;
}

function renderInvoiceActionCenter() {
  const invoice = getActiveActionInvoice();
  const api = getIntelligenceApi();
  if (!invoice || !api) return;
  const enriched = api.enrichInvoice(invoice, invoices || []);
  const intelligence = enriched.intelligence;
  const summary = document.getElementById("df-action-summary");
  if (summary) {
    summary.innerHTML = '<div><span class="small muted">' + escapeHtml(invoice.category || t("invoice_category_default")) +
      '</span><h3>' + escapeHtml(invoice.company || "-") + '</h3></div>' +
      '<strong>' + escapeHtml(formatMoney(invoice.amount, invoice.currency || "RON")) + '</strong>' +
      '<span class="status-badge status-' + escapeHtml(getInvoiceEffectiveStatus(invoice)) + '">' +
      escapeHtml(t("status_" + getInvoiceEffectiveStatus(invoice))) + '</span>' +
      '<span class="df-space-chip is-active" aria-label="' + escapeHtml(t("report_space")) + '">' +
      escapeHtml(t("space_" + getAccountWorkspaceSpace())) + '</span>';
  }
  const evidenceList = document.getElementById("df-evidence-list");
  if (evidenceList) {
    evidenceList.innerHTML = '<div class="df-confidence-badge">' + intelligence.evidence.confidence + '%</div>' +
      intelligence.evidence.items.map(function (item) {
        const value = sensitivePreviewsHidden && item.value ? "••••••" : item.value || t(item.verified ? "evidence_verified" : "evidence_review");
        return '<div class="df-evidence-item"><span class="df-evidence-icon">' + (item.verified ? '✓' : '!') +
          '</span><span class="df-evidence-copy"><strong>' + escapeHtml(evidenceLabel(item)) +
          '</strong><span>' + escapeHtml(value) + '</span></span></div>';
      }).join("");
  }
  const paymentButton = document.getElementById("df-action-payment");
  const cancelButton = document.getElementById("df-action-cancel-subscription");
  if (paymentButton) paymentButton.disabled = !intelligence.actions.paymentUrl;
  if (cancelButton) cancelButton.disabled = !intelligence.actions.cancellationUrl;
  renderIntelligenceStaticTexts();
}

function openInvoiceActionCenter(invoiceId) {
  if (!invoiceId) return;
  activeActionInvoiceId = invoiceId;
  renderInvoiceActionCenter();
  const backdrop = document.getElementById("df-action-backdrop");
  if (backdrop) backdrop.classList.remove("hidden");
}

function closeInvoiceActionCenter() {
  const backdrop = document.getElementById("df-action-backdrop");
  const reminder = document.getElementById("df-reminder-editor");
  if (backdrop) backdrop.classList.add("hidden");
  if (reminder) reminder.classList.add("hidden");
  activeActionInvoiceId = "";
}

async function updateInvoiceSpace(invoiceId, space) {
  if (!invoiceId || !auth.currentUser) return;
  void space;
  const patch = { spaceId: getAccountWorkspaceSpace() };
  if (!isOnlineNow() || hasQueuedInvoice(invoiceId)) {
    updateInvoiceLocally(invoiceId, patch);
    if (!hasPendingLocalAdd(invoiceId)) queueOfflineMutation({ type: "updateInvoice", id: invoiceId, data: patch });
  } else {
    await firestore.collection("users").doc(auth.currentUser.uid).collection("invoices").doc(invoiceId).set(patch, { merge: true });
  }
  notifyUser(t("space_saved"), "success");
}

async function confirmActiveInvoicePaid() {
  const invoice = getActiveActionInvoice();
  if (!invoice || !auth.currentUser) return;
  const patch = { status: "paid", paymentSource: "manual_confirmation", paidAt: new Date().toISOString() };
  if (!isOnlineNow() || hasQueuedInvoice(invoice.id)) {
    updateInvoiceLocally(invoice.id, patch);
    if (!hasPendingLocalAdd(invoice.id)) queueOfflineMutation({ type: "updateInvoice", id: invoice.id, data: patch });
  } else {
    patch.paidAt = firebase.firestore.FieldValue.serverTimestamp();
    await firestore.collection("users").doc(auth.currentUser.uid).collection("invoices").doc(invoice.id).set(patch, { merge: true });
  }
  notifyUser(t("action_paid_success"), "success");
  closeInvoiceActionCenter();
}

function openActiveInvoiceOfficialUrl(kind) {
  const invoice = getActiveActionInvoice();
  const api = getIntelligenceApi();
  if (!invoice || !api) return;
  const actions = api.officialActions(invoice);
  const url = kind === "cancel" ? actions.cancellationUrl : actions.paymentUrl;
  if (!url) {
    notifyUser(t("action_unavailable"), "error");
    return;
  }
  openWebsite(url);
}

async function saveActiveInvoiceReminder() {
  const invoice = getActiveActionInvoice();
  const input = document.getElementById("df-reminder-at");
  if (!invoice || !input || !auth.currentUser) return;
  const remindAt = new Date(input.value);
  if (Number.isNaN(remindAt.getTime()) || remindAt.getTime() <= Date.now()) {
    notifyUser(t("reminder_label"), "error");
    return;
  }
  if (!ensureOnline()) return;
  await firestore.collection("users").doc(auth.currentUser.uid).collection("reminders").add({
    invoiceId: invoice.id,
    company: invoice.company || "",
    amount: Number(invoice.amount) || 0,
    currency: invoice.currency || "RON",
    remindAt: firebase.firestore.Timestamp.fromDate(remindAt),
    status: "scheduled",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await firestore.collection("users").doc(auth.currentUser.uid).collection("invoices").doc(invoice.id).set({ reminderAt: firebase.firestore.Timestamp.fromDate(remindAt) }, { merge: true });
  notifyUser(t("reminder_saved"), "success");
  const editor = document.getElementById("df-reminder-editor");
  if (editor) editor.classList.add("hidden");
}

function subscribeInvoiceReminders(authUser) {
  if (remindersUnsub) remindersUnsub();
  remindersUnsub = null;
  invoiceReminders = [];
  if (!authUser) return;
  remindersUnsub = firestore.collection("users").doc(authUser.uid).collection("reminders").onSnapshot(function (snapshot) {
    invoiceReminders = snapshot.docs.map(function (docSnap) { return Object.assign({ id: docSnap.id }, docSnap.data() || {}); });
    renderIntelligenceWorkspace();
  }, function (err) { console.error("reminders snapshot", err); });
}

function renderProviderCatalog() {
  const api = getIntelligenceApi();
  const host = document.getElementById("df-provider-catalog");
  if (!api || !host) return;
  const plan = currentUser && currentUser.plan || "basic";
  host.innerHTML = api.providerCatalog(plan).map(function (provider) {
    const mode = provider.mode === "oauth" ? t("provider_direct") : t("provider_forward");
    const locked = provider.available ? "" : " is-locked";
    return '<button type="button" class="df-provider-item' + locked + '" data-provider-id="' + provider.id +
      '" data-provider-mode="' + provider.mode + '"' + (provider.available ? '' : ' disabled') + '>' +
      '<span class="df-provider-icon">' + escapeHtml(provider.name.charAt(0)) + '</span>' +
      '<span class="df-provider-copy"><strong>' + escapeHtml(provider.name) + '</strong><span>' +
      escapeHtml(provider.available ? mode : t("provider_locked")) + '</span></span><span class="df-provider-mode">' +
      escapeHtml(mode) + '</span></button>';
  }).join("");
}

async function ensureUniversalForwardingAddress() {
  const value = document.getElementById("df-forwarding-value");
  if (universalForwardingAddress) {
    if (value) value.textContent = universalForwardingAddress;
    return universalForwardingAddress;
  }
  if (!auth.currentUser || !isOnlineNow()) return "";
  try {
    const result = await callFunctionWithAuth("getMailSyncInfo", {});
    universalForwardingAddress = String(result && result.address || "");
    if (value) value.textContent = universalForwardingAddress || "-";
  } catch (err) {
    console.error("getMailSyncInfo", err);
    if (value) value.textContent = "-";
  }
  return universalForwardingAddress;
}

async function copyUniversalForwardingAddress() {
  const address = await ensureUniversalForwardingAddress();
  if (!address) return;
  try {
    await navigator.clipboard.writeText(address);
    notifyUser(t("forwarding_copied"), "success");
  } catch (_) {
    const input = document.createElement("textarea");
    input.value = address;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    notifyUser(t("forwarding_copied"), "success");
  }
}

function openSourcesHub() {
  renderProviderCatalog();
  renderIntelligenceStaticTexts();
  const backdrop = document.getElementById("df-sources-backdrop");
  if (backdrop) backdrop.classList.remove("hidden");
  ensureUniversalForwardingAddress();
}

function closeSourcesHub() {
  const backdrop = document.getElementById("df-sources-backdrop");
  if (backdrop) backdrop.classList.add("hidden");
}

function openPrivacyVault() {
  const toggle = document.getElementById("df-vault-previews");
  if (toggle) toggle.checked = sensitivePreviewsHidden;
  renderIntelligenceStaticTexts();
  const backdrop = document.getElementById("df-vault-backdrop");
  if (backdrop) backdrop.classList.remove("hidden");
}

function closePrivacyVault() {
  const backdrop = document.getElementById("df-vault-backdrop");
  if (backdrop) backdrop.classList.add("hidden");
}

const REPORT_FIELDS = [
  { key: "company", labelKey: "col_company" },
  { key: "category", labelKey: "col_category" },
  { key: "number", labelKey: "col_number" },
  { key: "issueDate", labelKey: "col_issue" },
  { key: "dueDate", labelKey: "col_due" },
  { key: "amount", labelKey: "col_amount" },
  { key: "status", labelKey: "col_status" },
  { key: "evidence", labelKey: "report_evidence" },
  { key: "cadence", labelKey: "report_cadence" },
  { key: "space", labelKey: "report_space" },
  { key: "risk", labelKey: "report_risk" },
];

function getSelectedReportFields() {
  const checked = Array.from(
    document.querySelectorAll("[data-report-field]:checked")
  ).map(function (input) {
    return input.getAttribute("data-report-field");
  });
  return REPORT_FIELDS.filter(function (field) {
    return checked.includes(field.key);
  });
}

function getReportSourceInvoices(scope) {
  let source;
  if (scope === "all") {
    source = (invoices || [])
      .filter(invoiceLooksLikeSubscription)
      .filter(function (inv) {
        return !isPlaceholderInvoice(inv);
      });
  } else {
    source = getVisibleInvoices().filter(function (inv) {
      return !isPlaceholderInvoice(inv);
    });
  }
  if (scope === "visible") {
    source = source.filter(invoiceMatchesSearch);
  }
  return source.slice().sort(function (a, b) {
    const da = resolveInvoiceDate(a);
    const db = resolveInvoiceDate(b);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });
}

function getReportFieldValue(inv, key) {
  if (!inv) return "";
  if (key === "issueDate") return formatInvoiceDate(inv.issueDate);
  if (key === "dueDate") return formatInvoiceDate(inv.dueDate);
  if (key === "amount") return formatMoney(inv.amount, inv.currency || "RON");
  if (key === "status") return t("status_" + getInvoiceEffectiveStatus(inv));
  if (key === "space") return t("space_" + inferInvoiceSpace(inv));
  if (key === "evidence" || key === "cadence" || key === "risk") {
    const api = getIntelligenceApi();
    const enriched = api ? api.enrichInvoice(inv, invoices || []) : null;
    if (!enriched) return "-";
    if (key === "evidence") return enriched.intelligence.evidence.confidence + "%";
    if (key === "cadence") return t("cadence_" + (enriched.intelligence.recurrence.cadence || "unknown"));
    if (key === "risk") {
      return enriched.intelligence.risk.flags.map(function (flag) { return t("risk_" + flag.code); }).join(", ") || "-";
    }
  }
  return inv[key] == null || inv[key] === "" ? "-" : String(inv[key]);
}

function getReportRows() {
  const scopeEl = document.getElementById("reports-scope");
  const scope = scopeEl ? scopeEl.value : "month";
  const fields = getSelectedReportFields();
  const activeFields = fields.length ? fields : REPORT_FIELDS;
  const rows = getReportSourceInvoices(scope).map(function (inv) {
    const row = {};
    activeFields.forEach(function (field) {
      row[t(field.labelKey)] = getReportFieldValue(inv, field.key);
    });
    return row;
  });
  return { fields: activeFields, rows: rows, scope: scope };
}

function renderReportsPreview() {
  const preview = document.getElementById("reports-preview");
  const countEl = document.getElementById("reports-preview-count");
  if (!preview) return;
  const result = getReportRows();
  if (countEl) {
    countEl.textContent = t("reports_rows").replace(
      "{{count}}",
      String(result.rows.length)
    );
  }
  if (!result.rows.length) {
    preview.innerHTML =
      '<p class="small muted">' + escapeHtml(t("reports_empty")) + "</p>";
    return;
  }
  const fields = result.fields.length ? result.fields : REPORT_FIELDS;
  const head =
    "<thead><tr>" +
    fields
      .map(function (field) {
        return "<th>" + escapeHtml(t(field.labelKey)) + "</th>";
      })
      .join("") +
    "</tr></thead>";
  const body =
    "<tbody>" +
    result.rows
      .slice(0, 30)
      .map(function (row) {
        return (
          "<tr>" +
          fields
            .map(function (field) {
              return "<td>" + escapeHtml(row[t(field.labelKey)] || "") + "</td>";
            })
            .join("") +
          "</tr>"
        );
      })
      .join("") +
    "</tbody>";
  preview.innerHTML = '<table class="reports-preview-table">' + head + body + "</table>";
}

function openReportsModal() {
  const backdrop = document.getElementById("reports-backdrop");
  if (!backdrop) return;
  renderReportsPreview();
  backdrop.classList.remove("hidden");
}

function closeReportsModal() {
  const backdrop = document.getElementById("reports-backdrop");
  if (backdrop) backdrop.classList.add("hidden");
}

function csvEscape(value) {
  const valueText = String(value == null ? "" : value);
  const raw = /^[\s\uFEFF]*[=+@-]/.test(valueText) ? "'" + valueText : valueText;
  if (/[",\r\n;]/.test(raw)) {
    return '"' + raw.replace(/"/g, '""') + '"';
  }
  return raw;
}

function buildReportCsv(result) {
  const fields = result.fields.length ? result.fields : REPORT_FIELDS;
  const header = fields.map(function (field) {
    return csvEscape(t(field.labelKey));
  });
  const lines = result.rows.map(function (row) {
    return fields
      .map(function (field) {
        return csvEscape(row[t(field.labelKey)] || "");
      })
      .join(",");
  });
  return [header.join(","), ...lines].join("\r\n");
}

function buildReportText(result) {
  const fields = result.fields.length ? result.fields : REPORT_FIELDS;
  return result.rows
    .map(function (row) {
      return fields
        .map(function (field) {
          return t(field.labelKey) + ": " + (row[t(field.labelKey)] || "");
        })
        .join(" | ");
    })
    .join("\r\n");
}

function buildReportHtml(result) {
  const fields = result.fields.length ? result.fields : REPORT_FIELDS;
  const rowsHtml = result.rows
    .map(function (row) {
      return (
        "<tr>" +
        fields
          .map(function (field) {
            return "<td>" + escapeHtml(row[t(field.labelKey)] || "") + "</td>";
          })
          .join("") +
        "</tr>"
      );
    })
    .join("");
  return (
    "<!doctype html><html><head><meta charset=\"utf-8\"><title>DueFlux Report</title>" +
    "<style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dbe5f3;padding:8px;text-align:left}th{background:#eff6ff}</style>" +
    "</head><body><h1>DueFlux Report</h1><table><thead><tr>" +
    fields
      .map(function (field) {
        return "<th>" + escapeHtml(t(field.labelKey)) + "</th>";
      })
      .join("") +
    "</tr></thead><tbody>" +
    rowsHtml +
    "</tbody></table></body></html>"
  );
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

function downloadReportBytes(filename, base64, mimeType) {
  const bytes = Uint8Array.from(atob(base64), function (c) { return c.charCodeAt(0); });
  downloadTextFile(filename, bytes, mimeType);
}

async function exportReport(format) {
  const result = getReportRows();
  const stamp = monthInputValue(invoiceMonthCursor);
  if (!result.rows.length) { notifyUser(t("reports_empty"), "info"); return; }
  try {
  if ((format === "pdf" || format === "html") && isOnlineNow() && result.rows.length <= 1000) {
    try {
      const report = await callFunctionWithAuth("createReport", { report: {
        title: t("reports_title"), language: currentLang, format: format,
        columns: result.fields.map(function (field) { return { key: field.key, label: t(field.labelKey) }; }),
        rows: result.rows.map(function (row) { return result.fields.map(function (field) { return String(row[t(field.labelKey)] ?? ""); }); }),
      } });
      downloadReportBytes("dueflux-report-" + stamp + "." + format, report.base64, report.mimeType);
      notifyUser(t("reports_downloaded"), "success");
      return;
    } catch (err) {
      if (!["failed-precondition", "not-found", "unavailable", "network-request-failed"].includes(err.code)) throw err;
    }
  }
  if (format === "csv") {
    downloadTextFile("dueflux-report-" + stamp + ".csv", buildReportCsv(result), "text/csv;charset=utf-8");
  } else if (format === "json") {
    downloadTextFile(
      "dueflux-report-" + stamp + ".json",
      JSON.stringify(result.rows, null, 2),
      "application/json;charset=utf-8"
    );
  } else if (format === "html") {
    downloadTextFile("dueflux-report-" + stamp + ".html", buildReportHtml(result), "text/html;charset=utf-8");
  } else if (format === "txt") {
    downloadTextFile("dueflux-report-" + stamp + ".txt", buildReportText(result), "text/plain;charset=utf-8");
  } else if (format === "pdf") {
    const base64 = await window.DueFlux.printReportPdf(buildReportHtml(result));
    downloadReportBytes("dueflux-report-" + stamp + ".pdf", base64, "application/pdf");
  }
  notifyUser(t("reports_downloaded"), "success");
  } catch (err) {
    console.error("report export", err.code || err.message);
    notifyUser(t("reports_failed"), "error");
  }
}

async function deleteAllInvoices() {
  if (!auth.currentUser) return;

  const confirmed = await openConfirmDialog(t("invoice_delete_all_confirm"), {
    title: t("invoice_delete_all_title"),
  });
  if (!confirmed) return;

  if (!isOnlineNow()) {
    const ids = Array.from(invoicesById.keys());
    const cloudIds = ids.filter(function (id) {
      return !hasPendingLocalAdd(id);
    });
    ids.forEach(function (id) {
      invoicesById.delete(id);
    });
    invoices = [];
    markInvoicesChanged();
    const queued = getOfflineQueue(auth.currentUser.uid).filter(function (item) {
      return !(item && !item.dispatched && item.type === "addInvoice");
    });
    cloudIds.forEach(function (id) {
      queued.push({
        type: "deleteInvoice",
        id: id,
        queuedAt: new Date().toISOString(),
      });
    });
    setOfflineQueue(auth.currentUser.uid, queued);
    saveOfflineCache();
    scheduleInvoiceUiRefresh();
    notifyUser(
      t("invoice_delete_all_done").replace("{{count}}", String(ids.length)),
      "success"
    );
    notifyUser(t("offline_queue_pending"), "info");
    return;
  }

  try {
    const deleted = await deleteAllInvoicesFromCloud(auth.currentUser.uid);
    if (deleted > 0) {
      notifyUser(
        t("invoice_delete_all_done").replace("{{count}}", String(deleted)),
        "success"
      );
      return;
    }
    notifyUser(t("invoice_delete_all_none"), "info");
  } catch (err) {
    console.error("deleteAllInvoices", err);
    notifyUser(t("invoice_delete_all_error"), "error");
  }
}

function getSelectedMonthReferenceSummary() {
  let count = 0;
  let convertedTotal = 0;
  let convertedMissing = 0;
  (billingReferences || []).forEach(function (ref) {
    if (!ref || !isDateInSelectedMonth(ref.referenceDate || ref.createdAt)) return;
    const amount = normalizeAmount(ref.amount);
    if (!(Number.isFinite(amount) && amount > 0)) return;
    count += 1;
    const converted = convertAmountUsingRates(
      amount,
      ref.currency || displayCurrency,
      displayCurrency
    );
    if (Number.isFinite(converted) && converted > 0) {
      convertedTotal += converted;
    } else {
      convertedMissing += 1;
    }
  });
  return {
    count,
    convertedTotal,
    convertedMissing,
  };
}

function addCurrencyTotal(totals, currency, amount) {
  const code = String(currency || "RON").toUpperCase();
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return;
  totals[code] = (totals[code] || 0) + value;
}

function formatCurrencyTotals(totals) {
  const entries = Object.keys(totals || {})
    .map(function (currency) {
      return {
        currency: currency,
        amount: Number(totals[currency] || 0),
      };
    })
    .filter(function (entry) {
      return Number.isFinite(entry.amount) && entry.amount > 0;
    })
    .sort(function (a, b) {
      if (a.currency === "RON" && b.currency !== "RON") return -1;
      if (b.currency === "RON" && a.currency !== "RON") return 1;
      return a.currency.localeCompare(b.currency);
    });
  if (!entries.length) return "0.00 RON";
  return entries
    .map(function (entry) {
      return entry.amount.toFixed(2) + " " + entry.currency;
    })
    .join(" + ");
}

function updateKpis() {
  const visibleInvoices = getVisibleInvoices();
  const meaningful = visibleInvoices.filter(isMeaningfulInvoice);
  const meaningfulAll = (invoices || [])
    .filter(invoiceLooksLikeSubscription)
    .filter(isMeaningfulInvoice);
  const refSummaryMonth = getSelectedMonthReferenceSummary();

  const totalAll = { value: 0, missing: 0 };
  const totalMonth = { value: 0, missing: 0 };

  function addToConvertedTotal(target, amount, currency) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const converted = convertAmountUsingRates(
      value,
      currency || displayCurrency,
      displayCurrency
    );
    if (Number.isFinite(converted) && converted > 0) {
      target.value += converted;
    } else {
      target.missing += 1;
    }
  }

  meaningfulAll.forEach(function (inv) {
    addToConvertedTotal(totalAll, normalizeAmount(inv.amount), inv.currency || "RON");
  });
  meaningful.forEach(function (inv) {
    addToConvertedTotal(totalMonth, normalizeAmount(inv.amount), inv.currency || "RON");
  });
  (billingReferences || []).forEach(function (ref) {
    if (!ref) return;
    addToConvertedTotal(totalAll, normalizeAmount(ref.amount), ref.currency || "RON");
    if (isDateInSelectedMonth(ref.referenceDate || ref.createdAt)) {
      addToConvertedTotal(totalMonth, normalizeAmount(ref.amount), ref.currency || "RON");
    }
  });

  const totalAllLabel = formatMoney(totalAll.value, displayCurrency);
  const totalMonthLabel = formatMoney(totalMonth.value, displayCurrency);
  const unpaid = meaningful.filter(function (i) {
    return getInvoiceEffectiveStatus(i) === "unpaid";
  }).length;
  const overdue = meaningful.filter(function (i) {
    return getInvoiceEffectiveStatus(i) === "overdue";
  }).length;

  const kTotal = document.getElementById("kpi-total");
  const kUnpaid = document.getElementById("kpi-unpaid");
  const kOverdue = document.getElementById("kpi-overdue");
  const totalNote = document.getElementById("kpi-total-note");
  const kTotalLabel = document.getElementById("kpi-label-total");

  if (kTotalLabel) {
    kTotalLabel.textContent = t("kpi_total_all_time");
  }
  if (kTotal) kTotal.textContent = totalAllLabel;
  if (kUnpaid) kUnpaid.textContent = unpaid;
  if (kOverdue) kOverdue.textContent = overdue;
  if (totalNote) {
    let note = t("kpi_month_total")
      .replace("{{month}}", formatMonthLabel(invoiceMonthCursor))
      .replace("{{amount}}", totalMonthLabel);
    if (refSummaryMonth.count > 0) {
      note +=
        " | " +
        t("kpi_sub_refs")
          .replace("{{count}}", String(refSummaryMonth.count))
          .replace(
            "{{amount}}",
            formatMoney(refSummaryMonth.convertedTotal, displayCurrency)
          );
    }
    const missingCount = totalAll.missing;
    if (missingCount > 0) {
      note +=
        " | " +
        t("kpi_conversion_missing").replace("{{count}}", String(missingCount));
    }
    totalNote.textContent = note;
  }

  const heroMonthValue = document.getElementById("hero-metric-month-value");
  const heroAllValue = document.getElementById("hero-metric-all-value");
  const heroSyncValue = document.getElementById("hero-metric-sync-value");
  const heroSyncPill = document.getElementById("hero-pill-sync");
  const heroStatusPill = document.getElementById("hero-pill-status");
  const latestSyncDate = getLatestInboxSyncDate();
  const hasAnyInboxConnected = hasConnectedMailAccount() || hasPhoneInboxConnected();

  if (heroMonthValue) heroMonthValue.textContent = totalMonthLabel;
  if (heroAllValue) heroAllValue.textContent = totalAllLabel;
  if (heroSyncValue) {
    heroSyncValue.textContent = latestSyncDate
      ? formatDateTimeLabel(latestSyncDate)
      : t("hero_metric_sync_none");
  }
  if (heroSyncPill) {
    heroSyncPill.textContent = hasAnyInboxConnected
      ? t("hero_pill_sync_on")
      : t("hero_pill_sync_off");
  }
  if (heroStatusPill) {
    heroStatusPill.textContent =
      autoStatusEnabled === false
        ? t("hero_pill_status_manual")
        : t("hero_pill_status_auto");
  }
}

/* ---------- ADD INVOICE MODAL ---------- */

function openInvoiceModal() {
  const bd = document.getElementById("modal-backdrop");
  if (bd) bd.classList.remove("hidden");
}

function closeInvoiceModal() {
  const bd = document.getElementById("modal-backdrop");
  if (bd) bd.classList.add("hidden");
}

async function saveInvoiceFromModal() {
  const company = document.getElementById("inv-company").value.trim();
  const category = document.getElementById("inv-category").value.trim();
  const number = document.getElementById("inv-number").value.trim();
  const issue = document.getElementById("inv-issue").value;
  const due = document.getElementById("inv-due").value;
  const amount = parseFloat(document.getElementById("inv-amount").value);
  const currency =
    document.getElementById("inv-currency").value.trim() || "RON";
  const status = document.getElementById("inv-status").value;

  if (!company || !Number.isFinite(amount) || amount <= 0) {
    notifyUser(t("alert_fill_all_fields"), "error");
    return;
  }

  if (!auth.currentUser) return;

  const issueDate = issue ? new Date(issue) : null;
  const dueDate = due ? new Date(due) : null;
  const invoiceData = {
    company: company,
    category: category || null,
    number: number || null,
    issueDate: issueDate,
    dueDate: dueDate,
    amount: amount,
    currency: normalizeCurrencyCodeLocal(currency) || "RON",
    status: status,
    invoiceType: "subscription",
    recurring: true,
    source: "manual",
    spaceId: getAccountWorkspaceSpace(),
  };

  if (!isOnlineNow()) {
    const localId = "local_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    const localInvoice = Object.assign({}, serializeForOfflineCache(invoiceData), {
      id: localId,
      createdAt: new Date().toISOString(),
      offlinePending: true,
    });
    invoicesById.set(localId, localInvoice);
    invoices = Array.from(invoicesById.values());
    markInvoicesChanged();
    queueOfflineMutation({
      type: "addInvoice",
      localId: localId,
      data: serializeForOfflineCache(invoiceData),
    });
    saveOfflineCache();
    scheduleInvoiceUiRefresh();
    closeInvoiceModal();
    return;
  }

  try {
    await firestore
      .collection("users")
      .doc(auth.currentUser.uid)
      .collection("invoices")
      .add(Object.assign({}, invoiceData, {
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }));
    closeInvoiceModal();
  } catch (err) {
    console.error("saveInvoice", err);
  }
}

/* ---------- EMAIL SYNC ---------- */

function resetMailSyncState() {
  mailSyncPending = false;
  mailSyncErrorMessage = "";
  mailSyncNotice = "";
  mailAccounts = {};
  phoneSyncPending = false;
  phoneSyncErrorMessage = "";
  autoMailSyncRunning = false;
  autoPhoneSyncRunning = false;
}

function hasConnectedMailAccount() {
  return Object.values(mailAccounts || {}).some(
    (account) => account && account.connected
  );
}

function getLatestMailSyncDate() {
  return Object.values(mailAccounts || {})
    .map(function (account) {
      return account && account.lastSyncAt ? toDate(account.lastSyncAt) : null;
    })
    .filter(Boolean)
    .sort(function (a, b) {
      return b.getTime() - a.getTime();
    })[0] || null;
}

function getLatestPhoneSyncDate() {
  const lastInbound = toDate(currentUser && currentUser.phoneInboxLastInboundAt);
  const lastInvoice = toDate(currentUser && currentUser.phoneInboxLastInvoiceAt);
  if (lastInbound && lastInvoice) {
    return lastInbound.getTime() >= lastInvoice.getTime() ? lastInbound : lastInvoice;
  }
  return lastInbound || lastInvoice || null;
}

function hasPhoneInboxConnected() {
  const inboxNumber = getPhoneInboxNumberForUi();
  return !!(currentUser && currentUser.phoneVerified && inboxNumber);
}

function getLatestInboxSyncDate() {
  const latestMailSync = getLatestMailSyncDate();
  const latestPhoneSync = getLatestPhoneSyncDate();
  if (latestMailSync && latestPhoneSync) {
    return latestMailSync.getTime() >= latestPhoneSync.getTime()
      ? latestMailSync
      : latestPhoneSync;
  }
  return latestMailSync || latestPhoneSync || null;
}

function clearAutoMailSyncScheduler() {
  if (autoMailSyncTimer) {
    clearInterval(autoMailSyncTimer);
    autoMailSyncTimer = null;
  }
  autoMailSyncRunning = false;
  autoPhoneSyncRunning = false;
}

function ensureAutoMailSyncScheduler() {
  if (autoMailSyncTimer) return;
  autoMailSyncTimer = setInterval(function () {
    maybeRunAutoMailSync("interval").catch(function () {});
    maybeRunAutoPhoneSync("interval").catch(function () {});
  }, AUTO_MAIL_SYNC_CHECK_INTERVAL_MS);
}

function shouldRunAutoMailSync(options) {
  const opts = options || {};
  const force = !!opts.force;
  if (!navigator.onLine) return false;
  if (!auth.currentUser) return false;
  if (!hasConnectedMailAccount()) return false;
  if (mailSyncPending || autoMailSyncRunning) return false;

  const now = Date.now();
  const minGap = force ? 30 * 1000 : AUTO_MAIL_SYNC_MIN_GAP_MS;
  if (now - autoMailSyncLastRunAt < minGap) return false;
  if (force) return true;

  const latestSync = getLatestMailSyncDate();
  if (!latestSync) return true;
  return now - latestSync.getTime() >= AUTO_MAIL_SYNC_STALE_AFTER_MS;
}

async function maybeRunAutoMailSync(reason, options) {
  if (!shouldRunAutoMailSync(options)) return false;
  autoMailSyncRunning = true;
  autoMailSyncLastRunAt = Date.now();
  try {
    await syncMailNow({ silent: true });
    return true;
  } catch (err) {
    console.error("auto mail sync", reason || "unknown", err);
    return false;
  } finally {
    autoMailSyncRunning = false;
  }
}

function shouldRunAutoPhoneSync(options) {
  const opts = options || {};
  const force = !!opts.force;
  if (!navigator.onLine) return false;
  if (!auth.currentUser) return false;
  if (!hasPhoneInboxConnected()) return false;
  if (phoneSyncPending || autoPhoneSyncRunning || phoneVerifyBusy) return false;

  const now = Date.now();
  const minGap = force ? 30 * 1000 : AUTO_MAIL_SYNC_MIN_GAP_MS;
  if (now - autoPhoneSyncLastRunAt < minGap) return false;
  if (force) return true;

  const latestSync = getLatestPhoneSyncDate();
  if (!latestSync) return true;
  return now - latestSync.getTime() >= AUTO_MAIL_SYNC_STALE_AFTER_MS;
}

async function maybeRunAutoPhoneSync(reason, options) {
  if (!shouldRunAutoPhoneSync(options)) return false;
  autoPhoneSyncRunning = true;
  autoPhoneSyncLastRunAt = Date.now();
  try {
    await syncPhoneInboxNow({ silent: true });
    return true;
  } catch (err) {
    console.error("auto phone sync", reason || "unknown", err);
    return false;
  } finally {
    autoPhoneSyncRunning = false;
  }
}

function normalizeProviderName(value) {
  const provider = String(value || "").toLowerCase().trim();
  if (provider === "google" || provider === "gmail") return "gmail";
  if (
    provider === "outlook" ||
    provider === "microsoft" ||
    provider === "office365"
  ) {
    return "outlook";
  }
  return provider;
}

function getMailAccountEntries() {
  return Object.entries(mailAccounts || {})
    .map(function ([docId, data]) {
      const row = data || {};
      const provider = normalizeProviderName(row.provider || "");
      return {
        accountId: row.accountId || docId,
        provider: provider || "unknown",
        data: row,
      };
    })
    .sort(function (a, b) {
      const aConnected = !!(a.data && a.data.connected);
      const bConnected = !!(b.data && b.data.connected);
      if (aConnected !== bConnected) return bConnected ? 1 : -1;
      const aProvider = a.provider || "";
      const bProvider = b.provider || "";
      if (aProvider !== bProvider) return aProvider.localeCompare(bProvider);
      const aEmail = String((a.data && a.data.email) || "").toLowerCase();
      const bEmail = String((b.data && b.data.email) || "").toLowerCase();
      return aEmail.localeCompare(bEmail);
    });
}

function hasMailAccountSyncIssue(account) {
  if (!account || !account.connected) return false;
  const syncStatus = String(account.lastSyncStatus || account.status || "").toLowerCase();
  return syncStatus === "error";
}

function getMailProviderStatusLabel(account, providerAllowed) {
  const safeAccount = account || {};
  const connected = !!safeAccount.connected;
  const syncStatus = String(safeAccount.lastSyncStatus || safeAccount.status || "").toLowerCase();

  if (!providerAllowed && !connected) {
    return t("mail_sync_status_locked");
  }
  if (!connected && syncStatus === "pending") {
    return t("mail_sync_status_pending");
  }
  if (connected) {
    return t("mail_sync_status_connected");
  }
  if (syncStatus === "error") {
    return t("mail_sync_status_error");
  }
  return t("mail_sync_status_not_connected");
}

function hasConnectedMailAccountSyncIssue() {
  return Object.values(mailAccounts || {}).some(function (account) {
    return hasMailAccountSyncIssue(account);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function providerDisplayName(provider) {
  if (provider === "gmail") return "Gmail";
  if (provider === "outlook") return "Outlook";
  const raw = String(provider || "").trim();
  if (!raw) return t("mail_sync_connect_provider_unknown");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getActivePlan() {
  if (currentUser && currentUser.plan) {
    return String(currentUser.plan || "").toLowerCase();
  }
  return resolvePlan(currentUser);
}

function isMailProviderAllowed(provider) {
  if (!provider) return false;
  if (provider === "outlook") return getActivePlan() === "business";
  return true;
}

function formatSyncTime(value) {
  if (!value) return "";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function isValidEmailValue(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || "").trim());
}

function extractEmailDomain(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  if (!trimmed) return "";
  const parts = trimmed.split("@");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function detectProviderFromEmail(value) {
  const domain = extractEmailDomain(value);
  if (!domain) return "unknown";
  if (domain.endsWith("gmail.com") || domain.endsWith("googlemail.com")) {
    return "gmail";
  }
  if (
    domain.endsWith("outlook.com") ||
    domain.endsWith("hotmail.com") ||
    domain.endsWith("live.com") ||
    domain.endsWith("msn.com") ||
    domain.endsWith("office365.com") ||
    domain.endsWith("outlook.office.com")
  ) {
    return "outlook";
  }
  return "unknown";
}

async function callFunctionWithAuth(name, data) {
  if (!auth.currentUser) {
    const err = new Error("Sign in required.");
    err.code = "unauthenticated";
    throw err;
  }
  function normalizeCallableError(err) {
    const rawCode = err && err.code ? String(err.code) : "";
    let code = rawCode.includes("/") ? rawCode.split("/").pop() : rawCode;
    const message = err && err.message ? String(err.message) : "Request failed";
    const lowerMsg = message.toLowerCase();

    if (
      code === "401" ||
      lowerMsg.includes("status of 401") ||
      lowerMsg.includes("unauthenticated")
    ) {
      code = "unauthenticated";
    } else if (
      code === "403" ||
      lowerMsg.includes("status of 403") ||
      lowerMsg.includes("permission denied")
    ) {
      code = "permission-denied";
    }

    if (!code) {
      if (
        lowerMsg.includes("failed to fetch") ||
        lowerMsg.includes("network")
      ) {
        code = "network-request-failed";
      } else {
        code = "unknown";
      }
    }

    const out = new Error(message);
    out.code = String(code).toLowerCase().replace(/_/g, "-");
    return out;
  }

  async function invokeDirectCallable(payload, idToken) {
    const endpoint =
      "https://us-central1-" +
      firebaseConfig.projectId +
      ".cloudfunctions.net/" +
      encodeURIComponent(name);
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (idToken) {
      headers.Authorization = "Bearer " + idToken;
    }
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ data: payload || {} }),
      });
    } catch (networkErr) {
      throw normalizeCallableError(networkErr);
    }

    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      body = null;
    }

    if (response.ok && body && body.result !== undefined) {
      return body.result;
    }

    const callableError = body && body.error ? body.error : null;
    const statusCode =
      (callableError && callableError.status) ||
      (response && response.status ? String(response.status) : "");
    const message =
      (callableError && callableError.message) ||
      "Request failed";
    const err = new Error(message);
    err.code = statusCode;
    throw normalizeCallableError(err);
  }

  async function invoke(forceRefreshToken, allowDirectFallback) {
    if (!auth.currentUser) {
      const err = new Error("Sign in required.");
      err.code = "unauthenticated";
      throw err;
    }
    const payload = { ...(data || {}) };
    try {
      const token = await auth.currentUser.getIdToken(!!forceRefreshToken);
      if (token) payload.idToken = token;
    } catch (tokenErr) {
      const normalized = normalizeCallableError(tokenErr);
      if (normalized.code === "network-request-failed") throw normalized;
      const authErr = new Error("Sign in required.");
      authErr.code = "unauthenticated";
      throw authErr;
    }
    const callable = functions.httpsCallable(name);
    try {
      const result = await callable(payload);
      if (result && result.data !== undefined) return result.data;
      return result;
    } catch (callErr) {
      const normalized = normalizeCallableError(callErr);
      if (!allowDirectFallback || normalized.code !== "unauthenticated") {
        throw normalized;
      }
      return invokeDirectCallable(payload, payload.idToken || "");
    }
  }

  try {
    return await invoke(false, false);
  } catch (err) {
    let normalized = normalizeCallableError(err);
    if (normalized.code !== "unauthenticated") {
      throw normalized;
    }
    try {
      return await invoke(true, true);
    } catch (retryErr) {
      normalized = normalizeCallableError(retryErr);
      throw normalized;
    }
  }
}

async function detectProviderFromServer(email) {
  const result = await callFunctionWithAuth("detectMailProvider", {
    email: email,
  });
  return result && result.provider ? result.provider : "unknown";
}

async function requestMailOAuthLink(provider, loginHint) {
  if (!auth.currentUser) {
    const err = new Error("Sign in required.");
    err.code = "unauthenticated";
    throw err;
  }
  const token = await auth.currentUser.getIdToken(true);
  const endpoint =
    "https://us-central1-" +
    firebaseConfig.projectId +
    ".cloudfunctions.net/createMailOAuthLinkHttp";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      provider: provider,
      loginHint: loginHint || "",
      idToken: token,
    }),
  });
  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }
  if (!response.ok) {
    const code =
      body && body.error && body.error.status
        ? String(body.error.status)
        : String(response.status || "");
    const message =
      body && body.error && body.error.message
        ? String(body.error.message)
        : "Request failed";
    const err = new Error(message);
    err.code = code;
    throw err;
  }
  return body || {};
}

async function requestMailDisconnect(accountId) {
  if (!auth.currentUser) {
    const err = new Error("Sign in required.");
    err.code = "unauthenticated";
    throw err;
  }
  const token = await auth.currentUser.getIdToken(true);
  const endpoint =
    "https://us-central1-" +
    firebaseConfig.projectId +
    ".cloudfunctions.net/disconnectMailProviderHttp";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      accountId: accountId,
      deleteAccount: true,
      idToken: token,
    }),
  });
  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }
  if (!response.ok) {
    const code =
      body && body.error && body.error.status
        ? String(body.error.status)
        : String(response.status || "");
    const message =
      body && body.error && body.error.message
        ? String(body.error.message)
        : "Request failed";
    const err = new Error(message);
    err.code = code;
    throw err;
  }
  return body || {};
}

async function requestSyncMailNow(accountId) {
  if (!auth.currentUser) {
    const err = new Error("Sign in required.");
    err.code = "unauthenticated";
    throw err;
  }
  const token = await auth.currentUser.getIdToken(true);
  const endpoint =
    "https://us-central1-" +
    firebaseConfig.projectId +
    ".cloudfunctions.net/syncMailNowHttp";
  const payload = {
    idToken: token,
    autoStatusEnabled: autoStatusEnabled !== false,
  };
  if (accountId) payload.accountId = accountId;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(payload),
  });
  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }
  if (!response.ok) {
    const code =
      body && body.error && body.error.status
        ? String(body.error.status)
        : String(response.status || "");
    const message =
      body && body.error && body.error.message
        ? String(body.error.message)
        : "Request failed";
    const err = new Error(message);
    err.code = code;
    throw err;
  }
  return body || {};
}

async function requestSyncPhoneInboxNow(options) {
  const opts = options || {};
  const payload = {
    force: !!opts.force,
  };
  if (opts.maxMessages) payload.maxMessages = Number(opts.maxMessages) || undefined;
  if (opts.maxPages) payload.maxPages = Number(opts.maxPages) || undefined;
  if (opts.lookbackDays) payload.lookbackDays = Number(opts.lookbackDays) || undefined;
  const result = await callFunctionWithAuth("syncPhoneInboxNow", payload);
  return result || {};
}

function providerLabel(provider) {
  if (mailConnectDetecting) return t("mail_sync_connect_provider_detecting");
  if (provider === "gmail") return t("mail_sync_connect_provider_gmail");
  if (provider === "outlook") return t("mail_sync_connect_provider_outlook");
  if (provider && provider !== "unknown") return providerDisplayName(provider);
  return t("mail_sync_connect_provider_unknown");
}

function syncMailConnectModal() {
  const backdrop = document.getElementById("mail-connect-backdrop");
  if (!backdrop) return;
  backdrop.classList.toggle("hidden", !mailConnectOpen);

  setText("mail-connect-title", t("mail_sync_connect_title"));
  setText("mail-connect-desc", t("mail_sync_connect_desc"));
  setText("mail-connect-email-label", t("mail_sync_connect_email_label"));
  setPlaceholder(
    "mail-connect-email",
    t("mail_sync_connect_email_placeholder")
  );
  setText("mail-connect-provider-label", t("mail_sync_connect_provider_label"));
  setText("mail-connect-provider", providerLabel(mailConnectProvider));
  setText("mail-connect-cancel", t("mail_sync_connect_cancel"));
  setText("mail-connect-continue", t("mail_sync_connect_continue"));

  const input = document.getElementById("mail-connect-email");
  if (input && input.value !== mailConnectEmail) {
    input.value = mailConnectEmail;
  }

  const errorEl = document.getElementById("mail-connect-error");
  if (errorEl) {
    errorEl.textContent = mailConnectError ? t(mailConnectError) : "";
    errorEl.classList.toggle("hidden", !mailConnectError);
  }

  const btnContinue = document.getElementById("mail-connect-continue");
  if (btnContinue) {
    btnContinue.disabled = mailConnectDetecting;
  }
}

function openMailConnectModal() {
  mailConnectOpen = true;
  mailConnectEmail = (currentUser && currentUser.email) || "";
  mailConnectProvider = detectProviderFromEmail(mailConnectEmail);
  mailConnectError = "";
  mailConnectDetecting = false;
  syncMailConnectModal();
  const input = document.getElementById("mail-connect-email");
  if (input) input.focus();
}

function closeMailConnectModal() {
  mailConnectOpen = false;
  mailConnectError = "";
  mailConnectDetecting = false;
  syncMailConnectModal();
}

async function handleMailConnectSubmit() {
  if (!ensureOnline()) {
    mailConnectError = "offline_required";
    syncMailConnectModal();
    return;
  }
  if (!auth.currentUser) {
    mailConnectError = "mail_sync_error_auth";
    syncMailConnectModal();
    return;
  }

  const email = String(mailConnectEmail || "").trim().toLowerCase();
  if (!isValidEmailValue(email)) {
    mailConnectError = "mail_sync_connect_error_invalid";
    syncMailConnectModal();
    return;
  }

  mailConnectError = "";
  mailConnectDetecting = true;
  syncMailConnectModal();

  let provider = detectProviderFromEmail(email);
  if (provider === "unknown") {
    try {
      provider = await detectProviderFromServer(email);
    } catch (err) {
      provider = "unknown";
    }
  }

  mailConnectDetecting = false;
  mailConnectProvider = provider || "unknown";
  syncMailConnectModal();

  if (provider === "outlook" && getActivePlan() !== "business") {
    mailConnectError = "mail_sync_connect_error_outlook_plan";
    syncMailConnectModal();
    return;
  }

  if (!provider || provider === "unknown") {
    closeMailConnectModal();
    openSourcesHub();
    return;
  }

  const ok = await connectMailProvider(provider, email);
  if (ok) {
    closeMailConnectModal();
  }
}

function refreshMailSyncPanel() {
  const panel = document.getElementById("mail-sync-panel");
  const setupPanel = document.getElementById("invoice-setup-panel");
  const settingsProviderList = document.getElementById("settings-mail-provider-list");
  const settingsStatusEl = document.getElementById("settings-email-status");
  const settingsConnect = document.getElementById("settings-email-connect");
  const settingsSync = document.getElementById("settings-email-sync");
  if (!panel && !settingsProviderList) return;
  if (!currentUser) {
    if (panel) panel.classList.add("hidden");
    if (setupPanel) setupPanel.classList.add("hidden");
    if (settingsProviderList) settingsProviderList.innerHTML = "";
    if (settingsStatusEl) settingsStatusEl.textContent = "";
    return;
  }

  if (panel) panel.classList.remove("hidden");
  const title = document.getElementById("mail-sync-title");
  const desc = document.getElementById("mail-sync-desc");
  const statusEl = document.getElementById("mail-sync-status");
  const btnSync = document.getElementById("btn-sync");
  const btnConnect = document.getElementById("mail-sync-connect");

  if (title) title.textContent = t("mail_sync_panel_title");
  if (desc) {
    const baseDesc = t("mail_sync_panel_desc");
    const outlookHint =
      getActivePlan() === "business"
        ? ""
        : " " + t("mail_sync_outlook_business_hint");
    desc.textContent = baseDesc + outlookHint;
  }

  const online = navigator.onLine;
  const mailConnected = hasConnectedMailAccount();
  const phoneConnected = hasPhoneInboxConnected();
  const connected = mailConnected || phoneConnected;
  if (setupPanel) {
    setupPanel.classList.toggle("hidden", connected);
  }
  if (btnSync) {
    btnSync.textContent = t("sync_now");
    btnSync.disabled = !online || !connected || mailSyncPending || phoneSyncPending;
    btnSync.classList.toggle("hidden", !connected);
  }
  if (btnConnect) {
    btnConnect.textContent = t("mail_sync_connect");
    btnConnect.disabled = mailSyncPending;
  }
  if (settingsConnect) {
    settingsConnect.textContent = t("mail_sync_connect");
    settingsConnect.disabled = mailSyncPending || !online;
  }
  if (settingsSync) {
    settingsSync.textContent = t("sync_now");
    settingsSync.disabled = !online || !connected || mailSyncPending || phoneSyncPending;
  }

  const accountEntries = getMailAccountEntries();
  let providerListHtml = "";
  const providerList = document.getElementById("mail-provider-list");
  if (accountEntries.length) {
      providerListHtml = accountEntries
        .map(function (entry) {
          const provider = normalizeProviderName(entry.provider);
          const account = entry.data || {};
          const connected = !!account.connected;
          const canConnect = isMailProviderAllowed(provider);
          const providerStatus = getMailProviderStatusLabel(account, canConnect);
          const email = String(account.email || "");
          const providerName = providerDisplayName(provider);
          const badgeLetter = providerName.charAt(0).toUpperCase() || "?";
          const badgeClass =
            provider === "gmail"
              ? "gmail"
              : provider === "outlook"
                ? "outlook"
                : "generic";
          const lockClass = !canConnect && !connected ? " is-locked" : "";
          const disconnectButton =
            '<button type="button" class="ghost-btn small"' +
            (!online || mailSyncPending ? ' disabled="true"' : "") +
            ' data-online-only="true" data-disconnect-account="' +
            escapeHtml(entry.accountId) +
            '">' +
            escapeHtml(t("mail_sync_disconnect")) +
            "</button>";
          return (
            '<div class="mail-provider-card' +
            lockClass +
            '" data-account-id="' +
            escapeHtml(entry.accountId) +
            '" data-provider="' +
            escapeHtml(provider) +
            '">' +
            '<div class="mail-provider-left">' +
            '<div class="mail-provider-badge ' +
            badgeClass +
            '">' +
            escapeHtml(badgeLetter) +
            "</div>" +
            "<div>" +
            '<p class="mail-provider-name">' +
            escapeHtml(providerName) +
            "</p>" +
            '<p class="mail-provider-status">' +
            escapeHtml(providerStatus) +
            "</p>" +
            (email
              ? '<p class="mail-provider-email">' + escapeHtml(email) + "</p>"
              : "") +
            "</div>" +
            "</div>" +
            '<div class="mail-provider-actions">' +
            disconnectButton +
            "</div>" +
            "</div>"
          );
        })
        .join("");
  }
  if (providerList) {
    providerList.innerHTML = providerListHtml;
  }
  if (settingsProviderList) {
    settingsProviderList.innerHTML =
      providerListHtml ||
      '<p class="small muted">' + escapeHtml(t("mail_sync_panel_empty")) + "</p>";
  }

  let statusText = "";
  if (!connected) {
    statusText = mailSyncNotice || t("mail_sync_panel_empty");
  } else if (mailSyncErrorMessage) {
    statusText = t(mailSyncErrorMessage);
  } else if (mailConnected && hasConnectedMailAccountSyncIssue()) {
    statusText = t("mail_sync_panel_error");
  } else if (phoneSyncErrorMessage) {
    statusText = phoneSyncErrorMessage;
  } else if (mailSyncPending || phoneSyncPending) {
    statusText = t("mail_sync_panel_syncing");
  } else if (mailSyncNotice) {
    statusText = mailSyncNotice;
  } else {
    const latestSync = mailConnected
      ? getLatestMailSyncDate()
      : getLatestPhoneSyncDate();
    if (latestSync) {
      statusText = t("mail_sync_panel_last_sync").replace(
        "{{time}}",
        formatSyncTime(latestSync)
      );
    } else {
      statusText = t("mail_sync_panel_ready");
    }
  }
  if (statusEl) statusEl.textContent = statusText;
  if (settingsStatusEl) settingsStatusEl.textContent = statusText;
}

async function connectMailProvider(provider, loginHint) {
  if (!ensureOnline()) {
    mailConnectError = "offline_required";
    syncMailConnectModal();
    return false;
  }
  if (!auth.currentUser) {
    mailConnectError = "mail_sync_error_auth";
    syncMailConnectModal();
    return false;
  }
  if (!isMailProviderAllowed(provider)) {
    mailSyncErrorMessage = "";
    mailSyncNotice = t("mail_sync_status_locked");
    mailConnectError = "mail_sync_status_locked";
    refreshMailSyncPanel();
    syncMailConnectModal();
    return false;
  }
  mailSyncErrorMessage = "";
  mailSyncNotice = "";
  refreshMailSyncPanel();
  try {
    const result = await requestMailOAuthLink(provider, loginHint);
    const url = result && result.url ? result.url : "";
    if (url) {
      openWebsite(url);
      mailSyncNotice = t("mail_sync_notice_browser");
      refreshMailSyncPanel();
      return true;
    }
    mailSyncErrorMessage = "mail_sync_error_config";
    mailConnectError = "mail_sync_error_config";
  } catch (err) {
    console.error("connectMailProvider", err);
    const rawCode = err && err.code ? String(err.code) : "";
    const code = rawCode.includes("/") ? rawCode.split("/").pop() : rawCode;
    if (code === "permission-denied") {
      const msg = (err && err.message ? String(err.message) : "").toLowerCase();
      if (msg.includes("business plan")) {
        mailSyncErrorMessage = "mail_sync_status_locked";
        mailConnectError = "mail_sync_connect_error_outlook_plan";
      } else {
        mailSyncErrorMessage = "mail_sync_panel_error";
        mailConnectError = "mail_sync_panel_error";
      }
    } else if (code === "invalid-argument") {
      mailSyncErrorMessage = "mail_sync_panel_error";
      mailConnectError = "mail_sync_connect_error_unsupported";
    } else if (code === "failed-precondition") {
      mailSyncErrorMessage = "mail_sync_error_config";
      mailConnectError = "mail_sync_error_config";
    } else if (code === "unauthenticated") {
      mailSyncErrorMessage = "mail_sync_error_auth";
      mailConnectError = "mail_sync_error_auth";
    } else if (
      code === "network-request-failed" ||
      code === "unavailable" ||
      code === "deadline-exceeded"
    ) {
      mailSyncErrorMessage = "offline_required";
      mailConnectError = "offline_required";
    } else {
      mailSyncErrorMessage = "mail_sync_panel_error";
      mailConnectError = "mail_sync_panel_error";
    }
  }
  refreshMailSyncPanel();
  syncMailConnectModal();
  return false;
}

async function disconnectMailProvider(accountId) {
  if (!ensureOnline()) return;
  if (!auth.currentUser) return;
  if (!accountId) return;
  mailSyncErrorMessage = "";
  mailSyncNotice = "";
  refreshMailSyncPanel();
  try {
    await requestMailDisconnect(accountId);
  } catch (err) {
    console.error("disconnectMailProvider", err);
    mailSyncErrorMessage = "mail_sync_panel_error";
  }
  refreshMailSyncPanel();
}

async function syncMailNow(options) {
  const opts = options || {};
  const silent = !!opts.silent;
  if (!ensureOnline()) return false;
  if (!auth.currentUser) return false;
  if (!hasConnectedMailAccount()) {
    if (!silent) {
      mailSyncNotice = t("mail_sync_panel_empty");
      refreshMailSyncPanel();
    }
    return false;
  }
  mailSyncPending = true;
  mailSyncErrorMessage = "";
  if (!silent) {
    mailSyncNotice = "";
  }
  refreshMailSyncPanel();
  try {
    await requestSyncMailNow(opts.accountId);
    return true;
  } catch (err) {
    console.error("syncMailNow", err);
    if (!silent) {
      const codeRaw = String(err && err.code ? err.code : "");
      const code = codeRaw.includes("/") ? codeRaw.split("/").pop() : codeRaw;
      if (code === "unauthenticated" || code === "401") {
        mailSyncErrorMessage = "mail_sync_error_auth";
      } else {
        mailSyncErrorMessage = "mail_sync_panel_error";
      }
    }
    return false;
  } finally {
    mailSyncPending = false;
    refreshMailSyncPanel();
  }
}

async function syncPhoneInboxNow(options) {
  const opts = options || {};
  const silent = !!opts.silent;
  if (!ensureOnline()) return false;
  if (!auth.currentUser) return false;
  if (!hasPhoneInboxConnected()) {
    if (!silent) {
      notifyUser(t("settings_phone_status_unverified"), "info");
    }
    return false;
  }

  phoneSyncPending = true;
  phoneSyncErrorMessage = "";
  refreshMailSyncPanel();
  try {
    await withRequestTimeout(
      requestSyncPhoneInboxNow({
        force: !!opts.force,
        maxMessages: opts.maxMessages,
        maxPages: opts.maxPages,
        lookbackDays: opts.lookbackDays,
      }),
      Math.max(PHONE_FUNCTION_TIMEOUT_MS, 45 * 1000),
      "Phone inbox sync timeout."
    );
    phoneSyncErrorMessage = "";
    await refreshPhoneInboxInfo({ force: true });
    return true;
  } catch (err) {
    console.error("syncPhoneInboxNow", err);
    const message = String((err && err.message) || "").trim();
    phoneSyncErrorMessage = message || t("alert_sync_error");
    if (!silent) {
      notifyUser(phoneSyncErrorMessage, "error");
    }
    return false;
  } finally {
    phoneSyncPending = false;
    refreshMailSyncPanel();
  }
}

async function syncAllInboxesNow(options) {
  const opts = options || {};
  const silent = !!opts.silent;
  if (!ensureOnline()) return false;
  if (!auth.currentUser) return false;

  const shouldSyncMail = hasConnectedMailAccount();
  const shouldSyncPhone = hasPhoneInboxConnected();

  if (!shouldSyncMail && !shouldSyncPhone) {
    if (!silent) {
      notifyUser(t("mail_sync_panel_empty"), "info");
    }
    return false;
  }

  let mailOk = true;
  let phoneOk = true;
  if (shouldSyncMail) {
    mailOk = await syncMailNow({ silent: true, accountId: opts.accountId });
  }
  if (shouldSyncPhone) {
    phoneOk = await syncPhoneInboxNow({
      silent: true,
      force: !!opts.force,
      maxMessages: opts.maxMessages,
      maxPages: opts.maxPages,
      lookbackDays: opts.lookbackDays,
    });
  }

  await refreshPhoneInboxInfo({ force: true }).catch(function () {});
  try {
    await loadInvoices();
  } catch (_) {}

  const success = mailOk && phoneOk;
  if (!silent) {
    notifyUser(success ? t("alert_sync_done") : t("alert_sync_error"), success ? "success" : "error");
  }
  return success;
}

/* ---------- VERIFICATION UI ---------- */

function refreshVerificationUi() {
  const box = document.getElementById("totp-status");
  if (!box) return;
  if (!currentUser) {
    box.innerHTML = "";
    return;
  }

  const isOnline = navigator.onLine;
  const label = isOnline ? t("totp_on_label") : t("totp_off_label");
  const desc = isOnline ? t("totp_on_desc") : t("totp_off_desc");

  box.innerHTML =
    '<div class="pill ' +
    (isOnline ? "on" : "off") +
    '">' +
    label +
    "</div>" +
    '<p class="small muted" style="margin-top:6px;">' +
    desc +
    "</p>";
}

/* ---------- UPDATE UI ---------- */

function getUpdatePresentation() {
  let statusText = "";
  let showInstall = false;
  let installLabel = t("settings_updates_install");

  if (updateState.status === "checking") {
    statusText = t("settings_updates_checking");
  } else if (updateState.status === "available") {
    statusText = t("settings_updates_available");
    showInstall = true;
    installLabel = t("settings_updates_download");
  } else if (updateState.status === "downloading") {
    statusText = t("settings_updates_downloading");
    if (Number.isFinite(updateState.percent)) {
      statusText += " " + Math.max(0, Math.min(100, updateState.percent)) + "%";
    }
  } else if (updateState.status === "downloaded") {
    statusText = t("settings_updates_ready");
    showInstall = true;
    installLabel = t("settings_updates_install");
  } else if (updateState.status === "none") {
    statusText = t("settings_updates_none");
  } else if (updateState.status === "error") {
    statusText = t("settings_updates_error");
    if (updateState.message) {
      statusText += " " + updateState.message;
    }
  }

  return { statusText, showInstall, installLabel };
}

function formatUpdateBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return value.toFixed(decimals) + " " + units[unitIndex];
}

function formatUpdatePublishedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function openUpdatePrompt() {
  const backdrop = document.getElementById("update-prompt-backdrop");
  if (!backdrop) return;
  updatePromptOpen = true;
  backdrop.classList.remove("hidden");
  refreshUpdatePromptUi();
}

function closeUpdatePrompt() {
  const backdrop = document.getElementById("update-prompt-backdrop");
  if (!backdrop) return;
  updatePromptOpen = false;
  backdrop.classList.add("hidden");
}

function refreshUpdateUi() {
  const statusEl = document.getElementById("settings-update-status");
  const versionEl = document.getElementById("settings-update-version");
  const checkBtn = document.getElementById("settings-check-updates");
  const installBtn = document.getElementById("settings-install-update");
  const presentation = getUpdatePresentation();

  if (statusEl) {
    statusEl.textContent = presentation.statusText;
    statusEl.dataset.status = presentation.statusText;
  }
  if (installBtn) {
    if (presentation.showInstall) {
      installBtn.classList.remove("hidden");
      installBtn.textContent = presentation.installLabel;
    } else {
      installBtn.classList.add("hidden");
      installBtn.textContent = t("settings_updates_install");
    }
  }
  if (checkBtn) {
    checkBtn.disabled = updateState.status === "checking";
  }
  if (versionEl) {
    if (updateState.currentVersion) {
      versionEl.textContent =
        t("settings_updates_current") + ": " + updateState.currentVersion;
      versionEl.dataset.version = updateState.currentVersion;
    } else {
      versionEl.textContent = "";
      versionEl.dataset.version = "";
    }
  }
}

function refreshUpdatePromptUi() {
  const backdrop = document.getElementById("update-prompt-backdrop");
  if (!backdrop) return;

  setText("update-prompt-title", t("update_prompt_title"));
  setText("update-prompt-desc", t("update_prompt_desc"));
  setText("update-prompt-core-label", t("update_prompt_core"));
  setText("update-prompt-auto-label", t("update_prompt_auto"));
  setText("update-prompt-later", t("update_prompt_later"));

  const detailsToggle = document.getElementById("update-prompt-details-toggle");
  const details = document.getElementById("update-prompt-details");
  const statusEl = document.getElementById("update-prompt-status");
  const releaseEl = document.getElementById("update-prompt-release");
  const publishedEl = document.getElementById("update-prompt-published");
  const notesEl = document.getElementById("update-prompt-notes");
  const sizeEl = document.getElementById("update-prompt-size");
  const progressShell = document.getElementById("update-prompt-progress-shell");
  const progressBar = document.getElementById("update-prompt-progress-bar");
  const actionBtn = document.getElementById("update-prompt-action");
  const autoCheck = document.getElementById("update-prompt-auto-check");

  if (autoCheck) autoCheck.checked = !!updatePromptAutoInstall;

  if (details) {
    details.classList.toggle("hidden", !updatePromptDetailsOpen);
  }
  if (detailsToggle) {
    detailsToggle.textContent = updatePromptDetailsOpen
      ? t("update_prompt_details_hide")
      : t("update_prompt_details");
  }

  if (releaseEl) {
    releaseEl.textContent = updateState.version
      ? t("update_prompt_release") + ": " + updateState.version
      : "";
  }

  if (publishedEl) {
    const publishedAt = formatUpdatePublishedAt(updateState.releaseDate);
    publishedEl.textContent = publishedAt
      ? t("update_prompt_published") + ": " + publishedAt
      : "";
  }

  if (notesEl) {
    notesEl.textContent = updateState.notes || t("update_prompt_notes_missing");
  }

  if (sizeEl) {
    const formattedSize = formatUpdateBytes(updateState.bytes);
    sizeEl.textContent = formattedSize || t("update_prompt_size_unknown");
  }

  const presentation = getUpdatePresentation();
  if (statusEl) statusEl.textContent = presentation.statusText;

  if (progressShell) {
    progressShell.classList.toggle("hidden", updateState.status !== "downloading");
  }
  if (progressBar) {
    const pct = Number.isFinite(updateState.percent)
      ? Math.max(0, Math.min(100, Math.round(updateState.percent)))
      : 0;
    progressBar.style.width = pct + "%";
  }

  if (actionBtn) {
    let actionLabel = t("update_prompt_action_download");
    let actionDisabled = false;
    if (updateState.status === "available") {
      actionLabel = t("update_prompt_action_download");
    } else if (updateState.status === "downloading") {
      const pct = Number.isFinite(updateState.percent)
        ? Math.max(0, Math.min(100, Math.round(updateState.percent)))
        : 0;
      actionLabel = t("update_prompt_action_downloading") + " " + pct + "%";
      actionDisabled = true;
    } else if (updateState.status === "downloaded") {
      actionLabel = t("update_prompt_action_install");
    } else if (updateState.status === "checking") {
      actionLabel = t("update_prompt_action_checking");
      actionDisabled = true;
    } else if (updateState.status === "idle" || updateState.status === "none") {
      actionLabel = t("update_prompt_action_download");
      actionDisabled = true;
    }
    actionBtn.textContent = actionLabel;
    actionBtn.disabled = actionDisabled;
  }
}

function requestUpdateDownload() {
  const updater = window.DueFluxUpdater;
  if (!updater || typeof updater.downloadUpdate !== "function") return;
  updateState.status = "downloading";
  updateState.message = "";
  refreshUpdateUi();
  refreshUpdatePromptUi();
  updater.downloadUpdate().catch(function (err) {
    updateState.status = "error";
    updateState.message = err && err.message ? err.message : "";
    refreshUpdateUi();
    refreshUpdatePromptUi();
  });
}

function requestUpdateInstall() {
  const updater = window.DueFluxUpdater;
  if (!updater || typeof updater.installUpdate !== "function") return;
  updater.installUpdate();
}

function handleUpdaterStatus(payload) {
  if (!payload) return;
  if (payload.status) {
    updateState.status = payload.status;
    if (payload.status === "available") {
      updateState.percent = 0;
      updatePromptInstallTriggered = false;
    }
    if (payload.status !== "downloaded") {
      updatePromptInstallTriggered = false;
    }
  }
  if (payload.version) updateState.version = payload.version;
  if (typeof payload.notes === "string") updateState.notes = payload.notes;
  if (payload.releaseDate) updateState.releaseDate = payload.releaseDate;
  if (Number.isFinite(payload.bytes) && payload.bytes > 0) {
    updateState.bytes = payload.bytes;
  }
  if (typeof payload.message === "string") {
    updateState.message = payload.message;
  } else if (payload.status && payload.status !== "error") {
    updateState.message = "";
  }
  if (Number.isFinite(payload.percent)) updateState.percent = payload.percent;
  refreshUpdateUi();

  if (
    updateState.status === "available" ||
    updateState.status === "downloading" ||
    updateState.status === "downloaded"
  ) {
    openUpdatePrompt();
  }

  if (
    updateState.status === "downloaded" &&
    updatePromptAutoInstall &&
    !updatePromptInstallTriggered
  ) {
    updatePromptInstallTriggered = true;
    requestUpdateInstall();
    return;
  }

  refreshUpdatePromptUi();
}

function initUpdaterUi() {
  const updater = window.DueFluxUpdater;
  const versionGetter = window.DueFlux && window.DueFlux.getVersion;
  if (typeof versionGetter === "function") {
    versionGetter()
      .then(function (version) {
        updateState.currentVersion = version || "";
        refreshUpdateUi();
      })
      .catch(function () {});
  }

  if (updater && typeof updater.onStatus === "function") {
    updater.onStatus(handleUpdaterStatus);
  }

  if (updater && typeof updater.checkForUpdates === "function") {
    updater.checkForUpdates().catch(function () {});
  }

  const checkBtn = document.getElementById("settings-check-updates");
  const installBtn = document.getElementById("settings-install-update");

  if (checkBtn && updater && typeof updater.checkForUpdates === "function") {
    checkBtn.addEventListener("click", function () {
      updateState.status = "checking";
      updateState.message = "";
      refreshUpdateUi();
      refreshUpdatePromptUi();
      updater.checkForUpdates().catch(function (err) {
        updateState.status = "error";
        updateState.message = err && err.message ? err.message : "";
        refreshUpdateUi();
        refreshUpdatePromptUi();
      });
    });
  }

  if (installBtn && updater) {
    installBtn.addEventListener("click", function () {
      if (updateState.status === "available") {
        requestUpdateDownload();
        return;
      }
      if (updateState.status === "downloaded") {
        requestUpdateInstall();
      }
    });
  }

  refreshUpdateUi();
  refreshUpdatePromptUi();
}

function initUpdatePromptControls() {
  const backdrop = document.getElementById("update-prompt-backdrop");
  const closeBtn = document.getElementById("update-prompt-close");
  const laterBtn = document.getElementById("update-prompt-later");
  const detailsBtn = document.getElementById("update-prompt-details-toggle");
  const autoCheck = document.getElementById("update-prompt-auto-check");
  const actionBtn = document.getElementById("update-prompt-action");
  const updater = window.DueFluxUpdater;

  if (backdrop) {
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeUpdatePrompt();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", closeUpdatePrompt);
  }
  if (laterBtn) {
    laterBtn.addEventListener("click", closeUpdatePrompt);
  }
  if (detailsBtn) {
    detailsBtn.addEventListener("click", function () {
      updatePromptDetailsOpen = !updatePromptDetailsOpen;
      refreshUpdatePromptUi();
    });
  }
  if (autoCheck) {
    autoCheck.addEventListener("change", function (e) {
      updatePromptAutoInstall = !!e.target.checked;
    });
  }
  if (actionBtn) {
    actionBtn.addEventListener("click", function () {
      if (updateState.status === "available") {
        requestUpdateDownload();
        return;
      }
      if (updateState.status === "downloaded") {
        requestUpdateInstall();
        return;
      }
      if (
        updater &&
        typeof updater.checkForUpdates === "function" &&
        (updateState.status === "idle" ||
          updateState.status === "none" ||
          updateState.status === "error")
      ) {
        updateState.status = "checking";
        updateState.message = "";
        refreshUpdateUi();
        refreshUpdatePromptUi();
        updater.checkForUpdates().catch(function (err) {
          updateState.status = "error";
          updateState.message = err && err.message ? err.message : "";
          refreshUpdateUi();
          refreshUpdatePromptUi();
        });
      }
    });
  }
}


/* ---------- SETTINGS PANEL ---------- */

function openSettings(target) {
  const bd = document.getElementById("settings-backdrop");
  if (bd) bd.classList.remove("hidden");
  syncPhoneSettings();
  const sectionKey = typeof target === "string" ? target : "";
  if (sectionKey === "phone") {
    refreshPhoneInboxInfo({ force: true }).catch(function () {});
    const section =
      document.getElementById("settings-phone-section") ||
      document.getElementById("settings-phone-title");
    if (section && typeof section.scrollIntoView === "function") {
      setTimeout(function () {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
    const phoneInput = document.getElementById("settings-phone-input");
    if (phoneInput && typeof phoneInput.focus === "function") {
      setTimeout(function () {
        phoneInput.focus();
      }, 140);
    }
  }
}

function closeSettings() {
  const bd = document.getElementById("settings-backdrop");
  if (bd) bd.classList.add("hidden");
}

function syncSettingsThemeChips(currentMode) {
  const modes = ["dark", "light", "auto"];
  const ids = [
    "settings-theme-dark",
    "settings-theme-light",
    "settings-theme-auto",
  ];
  for (let i = 0; i < ids.length; i++) {
    const btn = document.getElementById(ids[i]);
    if (!btn) continue;
    btn.classList.remove("active");
  }
  const idx = modes.indexOf(currentMode);
  if (idx >= 0) {
    const btn = document.getElementById(ids[idx]);
    if (btn) btn.classList.add("active");
  }
}

/* ---------- LEGAL MODAL ---------- */

function openLegal(sectionKey) {
  const titleEl = document.getElementById("legal-title");
  const bodyEl = document.getElementById("legal-body");
  const bd = document.getElementById("legal-backdrop");
  if (!titleEl || !bodyEl || !bd) return;

  if (sectionKey === "gdpr") {
    titleEl.textContent = t("legal_gdpr_title");
    bodyEl.textContent = t("legal_gdpr_body");
  } else if (sectionKey === "terms") {
    titleEl.textContent = t("legal_terms_title");
    bodyEl.textContent = t("legal_terms_body");
  } else if (sectionKey === "privacy") {
    titleEl.textContent = t("legal_privacy_title");
    bodyEl.textContent = t("legal_privacy_body");
  } else {
    titleEl.textContent = "Legal";
    bodyEl.textContent = "";
  }

  const closeBtn = document.getElementById("legal-close-btn");
  if (closeBtn) closeBtn.textContent = t("legal_close_btn");

  bd.classList.remove("hidden");
}

function closeLegal() {
  const bd = document.getElementById("legal-backdrop");
  if (bd) bd.classList.add("hidden");
}

function refreshLegalModalTextsIfOpen() {
  const bd = document.getElementById("legal-backdrop");
  if (!bd || bd.classList.contains("hidden")) return;
  // just update Close button text
  const closeBtn = document.getElementById("legal-close-btn");
  if (closeBtn) closeBtn.textContent = t("legal_close_btn");
}

/* ---------- INIT ---------- */

window.addEventListener("load", function () {
  // theme
  initTheme();
  syncSettingsThemeChips(getThemeMode());

  const themeBtn = document.getElementById("theme-toggle");
  const themeBtnApp = document.getElementById("theme-toggle-app");
  const cycleTheme = function () {
    let mode = getThemeMode();
    const order = ["dark", "light", "auto"];
    let idx = order.indexOf(mode);
    if (idx === -1) idx = 0;
    idx = (idx + 1) % order.length;
    mode = order[idx];
    setThemeMode(mode, true);
  };
  if (themeBtn) themeBtn.addEventListener("click", cycleTheme);
  if (themeBtnApp) themeBtnApp.addEventListener("click", cycleTheme);

  // language
  const initialLang = loadLanguagePreference();
  setLanguage(initialLang, true);
  displayCurrency = loadDisplayCurrencyPreference();
  autoStatusEnabled = loadAutoStatusPreference();
  syncDisplayCurrencySelect();
  setAutoStatusEnabled(autoStatusEnabled, false);
  refreshExchangeRateStatus();

  // connectivity state
  setOnlineState(navigator.onLine);
  window.addEventListener("online", function () {
    setOnlineState(true);
    flushOfflineQueue().catch(function (err) {
      console.error("offline queue flush", err);
    });
    maybeRunAutoMailSync("online", { force: true }).catch(function () {});
    maybeRunAutoPhoneSync("online", { force: true }).catch(function () {});
    refreshExchangeRates({ force: true }).catch(function () {});
    refreshPhoneInboxInfo({ force: true }).catch(function () {});
  });
  window.addEventListener("offline", function () {
    setOnlineState(false);
  });

  auth.onAuthStateChanged(function (authUser) {
    if (forceLoginOnLaunch) {
      forceLoginOnLaunch = false;
      if (authUser) {
        if (!isOnlineNow() && loadOfflineCache(authUser.uid)) {
          startSession(authUser).catch(function (err) {
            console.error("startSession", err);
          });
          return;
        }
        auth
          .signOut()
          .catch(function (err) {
            console.error("force signOut", err);
          })
          .finally(function () {
            handleSignedOut();
          });
      } else {
        handleSignedOut();
      }
      return;
    }
    if (!authUser) {
      handleSignedOut();
      return;
    }
    authUser
      .reload()
      .catch(function (err) {
        console.error("auth reload", err);
      })
      .finally(function () {
        startSession(authUser).catch(function (err) {
          console.error("startSession", err);
        });
      });
  });

  const loginLangSelect = document.getElementById("lang-select");
  if (loginLangSelect) {
    loginLangSelect.addEventListener("change", function (e) {
      setLanguage(e.target.value, true);
    });
  }

  const settingsLangSelect = document.getElementById(
    "settings-language-select"
  );
  if (settingsLangSelect) {
    settingsLangSelect.addEventListener("change", function (e) {
      setLanguage(e.target.value, true);
    });
  }

  const settingsCurrencySelect = document.getElementById(
    "settings-display-currency-select"
  );
  if (settingsCurrencySelect) {
    settingsCurrencySelect.addEventListener("change", function (e) {
      setDisplayCurrency(e.target.value, true);
      refreshExchangeRates({ force: false }).catch(function () {});
    });
  }

  const autoStatusToggle = document.getElementById("settings-auto-status-toggle");
  if (autoStatusToggle) {
    autoStatusToggle.checked = autoStatusEnabled;
    autoStatusToggle.addEventListener("change", function (e) {
      setAutoStatusEnabled(!!e.target.checked, true);
    });
  }

  // show/hide password
  const loginToggle = document.getElementById("login-pass-toggle");
  if (loginToggle) {
    loginToggle.addEventListener("click", function () {
      const input = document.getElementById("login-password");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  }
  // login button
  const btnLogin = document.getElementById("btn-login");
  if (btnLogin) btnLogin.addEventListener("click", handleLogin);

  const signupLink = document.getElementById("login-signup-link");
  if (signupLink) {
    signupLink.addEventListener("click", function (e) {
      e.preventDefault();
      openWebsite(WEBSITE_SIGNUP);
    });
  }
  const forgotLink = document.getElementById("login-forgot-link");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      openWebsite(WEBSITE_RESET);
    });
  }

  // Enter key on login
  const loginCard = document.getElementById("login-card");
  if (loginCard) {
    loginCard.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        handleLogin();
      }
    });
  }

  // logout
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      logout(false);
    });
  }

  // invoice modal
  const btnAddInvoice = document.getElementById("btn-add-invoice");
  const modalClose = document.getElementById("modal-close");
  const modalCancel = document.getElementById("modal-cancel");
  const modalSave = document.getElementById("modal-save");
  const confirmBackdrop = document.getElementById("confirm-backdrop");
  const confirmClose = document.getElementById("confirm-close");
  const confirmCancel = document.getElementById("confirm-cancel");
  const confirmOk = document.getElementById("confirm-ok");
  if (btnAddInvoice) btnAddInvoice.addEventListener("click", openInvoiceModal);
  if (modalClose) modalClose.addEventListener("click", closeInvoiceModal);
  if (modalCancel) modalCancel.addEventListener("click", closeInvoiceModal);
  if (modalSave) modalSave.addEventListener("click", saveInvoiceFromModal);
  if (confirmBackdrop) {
    confirmBackdrop.addEventListener("click", function (e) {
      if (e.target === confirmBackdrop) closeConfirmDialog(false);
    });
  }
  if (confirmClose) confirmClose.addEventListener("click", function () {
    closeConfirmDialog(false);
  });
  if (confirmCancel) confirmCancel.addEventListener("click", function () {
    closeConfirmDialog(false);
  });
  if (confirmOk) confirmOk.addEventListener("click", function () {
    closeConfirmDialog(true);
  });

  // email sync
  const btnSync = document.getElementById("btn-sync");
  if (btnSync) btnSync.addEventListener("click", syncAllInboxesNow);
  const btnDeleteAll = document.getElementById("btn-delete-all-invoices");
  if (btnDeleteAll) {
    btnDeleteAll.addEventListener("click", deleteAllInvoices);
  }
  const monthPicker = document.getElementById("invoice-month-picker");
  if (monthPicker) {
    monthPicker.addEventListener("change", function (e) {
      const parsed = parseMonthInputValue(e && e.target ? e.target.value : "");
      if (parsed) {
        setInvoiceMonthCursor(parsed);
      } else {
        syncInvoiceMonthControls();
      }
    });
  }
  const monthPrev = document.getElementById("btn-month-prev");
  if (monthPrev) {
    monthPrev.addEventListener("click", function () {
      shiftInvoiceMonth(-1);
    });
  }
  const monthNext = document.getElementById("btn-month-next");
  if (monthNext) {
    monthNext.addEventListener("click", function () {
      shiftInvoiceMonth(1);
    });
  }
  const monthCurrent = document.getElementById("btn-month-current");
  if (monthCurrent) {
    monthCurrent.addEventListener("click", function () {
      setInvoiceMonthCursor(new Date());
    });
  }
  const invoiceSearch = document.getElementById("invoice-search");
  if (invoiceSearch) {
    invoiceSearch.addEventListener("input", function (e) {
      invoiceSearchQuery = String(e && e.target ? e.target.value : "");
      scheduleInvoiceUiRefresh();
      renderReportsPreview();
    });
  }
  const setupSettings = document.getElementById("setup-panel-settings");
  if (setupSettings) {
    setupSettings.addEventListener("click", function () {
      openSettings("phone");
    });
  }
  const reportsBtn = document.getElementById("btn-fast-reports");
  if (reportsBtn) reportsBtn.addEventListener("click", openReportsModal);
  const reportsBackdrop = document.getElementById("reports-backdrop");
  const reportsClose = document.getElementById("reports-close");
  const reportsCancel = document.getElementById("reports-cancel");
  const reportsScope = document.getElementById("reports-scope");
  if (reportsBackdrop) {
    reportsBackdrop.addEventListener("click", function (e) {
      if (e.target === reportsBackdrop) closeReportsModal();
    });
  }
  if (reportsClose) reportsClose.addEventListener("click", closeReportsModal);
  if (reportsCancel) reportsCancel.addEventListener("click", closeReportsModal);
  if (reportsScope) reportsScope.addEventListener("change", renderReportsPreview);
  Array.from(document.querySelectorAll("[data-report-field]")).forEach(function (input) {
    input.addEventListener("change", renderReportsPreview);
  });
  ["csv", "json", "html", "txt", "pdf"].forEach(function (format) {
    const btn = document.getElementById("reports-export-" + format);
    if (btn) {
      btn.addEventListener("click", function () {
        exportReport(format);
      });
    }
  });

  Array.from(document.querySelectorAll("[data-space]")).forEach(function (button) {
    button.addEventListener("click", function () {
      setActiveWorkspaceSpace(button.getAttribute("data-space"), true);
    });
  });
  setActiveWorkspaceSpace(activeWorkspaceSpace, false);

  const intelligenceWorkspace = document.querySelector(".df-workspace");
  if (intelligenceWorkspace) {
    intelligenceWorkspace.addEventListener("click", function (event) {
      const target = event.target.closest("[data-intelligence-invoice], [data-pulse-invoice]");
      if (!target) return;
      openInvoiceActionCenter(target.getAttribute("data-intelligence-invoice") || target.getAttribute("data-pulse-invoice"));
    });
    intelligenceWorkspace.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target.closest("[data-intelligence-invoice], [data-pulse-invoice]");
      if (!target) return;
      event.preventDefault();
      openInvoiceActionCenter(target.getAttribute("data-intelligence-invoice") || target.getAttribute("data-pulse-invoice"));
    });
  }

  const actionBackdrop = document.getElementById("df-action-backdrop");
  const actionClose = document.getElementById("df-action-close");
  const actionPaid = document.getElementById("df-action-paid");
  const actionPayment = document.getElementById("df-action-payment");
  const actionCancelSubscription = document.getElementById("df-action-cancel-subscription");
  const actionReminder = document.getElementById("df-action-reminder");
  const reminderSave = document.getElementById("df-reminder-save");
  if (actionBackdrop) actionBackdrop.addEventListener("click", function (event) { if (event.target === actionBackdrop) closeInvoiceActionCenter(); });
  if (actionClose) actionClose.addEventListener("click", closeInvoiceActionCenter);
  if (actionPaid) actionPaid.addEventListener("click", function () { confirmActiveInvoicePaid().catch(function (err) { console.error("confirm paid", err); }); });
  if (actionPayment) actionPayment.addEventListener("click", function () { openActiveInvoiceOfficialUrl("payment"); });
  if (actionCancelSubscription) actionCancelSubscription.addEventListener("click", function () { openActiveInvoiceOfficialUrl("cancel"); });
  if (actionReminder) actionReminder.addEventListener("click", function () {
    const editor = document.getElementById("df-reminder-editor");
    const input = document.getElementById("df-reminder-at");
    if (input && !input.value) {
      const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
      next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
      input.value = next.toISOString().slice(0, 16);
    }
    if (editor) editor.classList.toggle("hidden");
  });
  if (reminderSave) reminderSave.addEventListener("click", function () { saveActiveInvoiceReminder().catch(function (err) { console.error("save reminder", err); }); });

  const sourceHubOpen = document.getElementById("df-source-hub-open");
  const sourceHubBackdrop = document.getElementById("df-sources-backdrop");
  const sourceHubClose = document.getElementById("df-sources-close");
  const providerCatalog = document.getElementById("df-provider-catalog");
  const forwardingCopy = document.getElementById("df-forwarding-copy");
  if (sourceHubOpen) sourceHubOpen.addEventListener("click", openSourcesHub);
  if (sourceHubClose) sourceHubClose.addEventListener("click", closeSourcesHub);
  if (sourceHubBackdrop) sourceHubBackdrop.addEventListener("click", function (event) { if (event.target === sourceHubBackdrop) closeSourcesHub(); });
  if (forwardingCopy) forwardingCopy.addEventListener("click", copyUniversalForwardingAddress);
  if (providerCatalog) providerCatalog.addEventListener("click", function (event) {
    const button = event.target.closest("[data-provider-id]");
    if (!button || button.disabled) return;
    if (button.getAttribute("data-provider-mode") === "oauth") {
      closeSourcesHub();
      openMailConnectModal();
    } else {
      copyUniversalForwardingAddress();
    }
  });

  const vaultOpen = document.getElementById("df-privacy-vault-open");
  const vaultBackdrop = document.getElementById("df-vault-backdrop");
  const vaultClose = document.getElementById("df-vault-close");
  const vaultPreviews = document.getElementById("df-vault-previews");
  if (vaultOpen) vaultOpen.addEventListener("click", openPrivacyVault);
  if (vaultClose) vaultClose.addEventListener("click", closePrivacyVault);
  if (vaultBackdrop) vaultBackdrop.addEventListener("click", function (event) { if (event.target === vaultBackdrop) closePrivacyVault(); });
  if (vaultPreviews) vaultPreviews.addEventListener("change", function () {
    sensitivePreviewsHidden = !!vaultPreviews.checked;
    localStorage.setItem("df_sensitive_previews", sensitivePreviewsHidden ? "true" : "false");
    if (activeActionInvoiceId) renderInvoiceActionCenter();
  });

  const btnConnect = document.getElementById("mail-sync-connect");
  if (btnConnect) btnConnect.addEventListener("click", openMailConnectModal);
  const settingsEmailConnect = document.getElementById("settings-email-connect");
  if (settingsEmailConnect) {
    settingsEmailConnect.addEventListener("click", openMailConnectModal);
  }
  const settingsEmailSync = document.getElementById("settings-email-sync");
  if (settingsEmailSync) {
    settingsEmailSync.addEventListener("click", syncAllInboxesNow);
  }
  const settingsSourceHub = document.getElementById("settings-email-source-hub");
  if (settingsSourceHub) settingsSourceHub.addEventListener("click", function () {
    closeSettings();
    openSourcesHub();
  });
  const settingsPrivacyVault = document.getElementById("settings-privacy-vault");
  if (settingsPrivacyVault) settingsPrivacyVault.addEventListener("click", function () {
    closeSettings();
    openPrivacyVault();
  });

  const phoneInboxManage = document.getElementById("phone-inbox-manage");
  if (phoneInboxManage) {
    phoneInboxManage.addEventListener("click", function () {
      openSettings("phone");
    });
  }
  const phoneInboxCopy = document.getElementById("phone-inbox-copy");
  if (phoneInboxCopy) {
    phoneInboxCopy.addEventListener("click", function () {
      copyPhoneInboxNumber();
    });
  }

  const mailConnectBackdrop = document.getElementById("mail-connect-backdrop");
  const mailConnectClose = document.getElementById("mail-connect-close");
  const mailConnectCancel = document.getElementById("mail-connect-cancel");
  const mailConnectContinue = document.getElementById("mail-connect-continue");
  const mailConnectInput = document.getElementById("mail-connect-email");

  if (mailConnectBackdrop) {
    mailConnectBackdrop.addEventListener("click", function (e) {
      if (e.target === mailConnectBackdrop) closeMailConnectModal();
    });
  }
  if (mailConnectClose) mailConnectClose.addEventListener("click", closeMailConnectModal);
  if (mailConnectCancel) mailConnectCancel.addEventListener("click", closeMailConnectModal);
  if (mailConnectContinue) {
    mailConnectContinue.addEventListener("click", handleMailConnectSubmit);
  }
  if (mailConnectInput) {
    mailConnectInput.addEventListener("input", function (e) {
      mailConnectEmail = String(e.target.value || "");
      mailConnectProvider = detectProviderFromEmail(mailConnectEmail);
      mailConnectError = "";
      syncMailConnectModal();
    });
    mailConnectInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        handleMailConnectSubmit();
      }
    });
  }

  const mailProviderList = document.getElementById("mail-provider-list");
  if (mailProviderList) {
    mailProviderList.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-disconnect-account]");
      if (!btn) return;
      const accountId = btn.getAttribute("data-disconnect-account");
      if (!accountId) return;
      disconnectMailProvider(accountId);
    });
  }
  const settingsMailProviderList = document.getElementById("settings-mail-provider-list");
  if (settingsMailProviderList) {
    settingsMailProviderList.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-disconnect-account]");
      if (!btn) return;
      const accountId = btn.getAttribute("data-disconnect-account");
      if (!accountId) return;
      disconnectMailProvider(accountId);
    });
  }

  // account modal
  const btnSwitchAcc = document.getElementById("btn-switch-account");
  const accBackdrop = document.getElementById("account-modal-backdrop");
  const accClose = document.getElementById("account-close");
  const accAdd = document.getElementById("account-add");

  if (btnSwitchAcc && accBackdrop) {
    btnSwitchAcc.addEventListener("click", function () {
      renderAccountList();
      accBackdrop.classList.remove("hidden");
    });
  }
  if (accClose && accBackdrop) {
    accClose.addEventListener("click", function () {
      accBackdrop.classList.add("hidden");
    });
  }
  if (accAdd && accBackdrop) {
    accAdd.addEventListener("click", function () {
      accBackdrop.classList.add("hidden");
      logout(false);
    });
  }

  // profile modal
  const profileTrigger = document.getElementById("profile-trigger");
  const profileBackdrop = document.getElementById("profile-backdrop");
  const profileClose = document.getElementById("profile-close");
  const profileSave = document.getElementById("profile-save");
  const profileManageLink = document.getElementById("profile-manage-link");
  const profilePasswordLink = document.getElementById("profile-password-link");

  if (profileTrigger) profileTrigger.addEventListener("click", openProfileModal);
  if (profileClose) profileClose.addEventListener("click", closeProfileModal);
  if (profileBackdrop) {
    profileBackdrop.addEventListener("click", function (e) {
      if (e.target === profileBackdrop) closeProfileModal();
    });
  }
  if (profileSave) profileSave.addEventListener("click", saveProfileDetails);
  if (profileManageLink) {
    profileManageLink.addEventListener("click", function (e) {
      e.preventDefault();
      openWebsite(WEBSITE_PRICING);
    });
  }
  if (profilePasswordLink) {
    profilePasswordLink.addEventListener("click", function (e) {
      e.preventDefault();
      openWebsite(WEBSITE_ACCOUNT);
    });
  }

  // settings
  const btnSettings = document.getElementById("btn-settings");
  const settingsClose = document.getElementById("settings-close");
  const settingsBackdrop = document.getElementById("settings-backdrop");
  if (btnSettings) btnSettings.addEventListener("click", openSettings);
  if (settingsClose) settingsClose.addEventListener("click", closeSettings);
  if (settingsBackdrop) {
    settingsBackdrop.addEventListener("click", function (e) {
      if (e.target === settingsBackdrop) closeSettings();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    const bd = document.getElementById("settings-backdrop");
    if (bd && !bd.classList.contains("hidden")) closeSettings();
    closeInvoiceActionCenter();
    closeSourcesHub();
    closePrivacyVault();
  });
  const phoneSave = document.getElementById("settings-phone-save");
  const phoneSendCode = document.getElementById("settings-phone-send-code");
  const phoneVerify = document.getElementById("settings-phone-verify");
  const phoneCodeInput = document.getElementById("settings-phone-code");
  const phoneInput = document.getElementById("settings-phone-input");
  const phoneInboxCopySettings = document.getElementById("settings-phone-inbox-copy");
  if (phoneSave) phoneSave.addEventListener("click", savePhoneFromSettings);
  if (phoneInboxCopySettings) {
    phoneInboxCopySettings.addEventListener("click", function () {
      copyPhoneInboxNumber();
    });
  }
  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      phoneVerifyLastError = "";
      phoneVerifyCodeRequestedAt = 0;
      syncPhoneSettings();
    });
  }
  if (phoneSendCode) {
    phoneSendCode.addEventListener("click", requestPhoneVerificationCodeFromSettings);
  }
  if (phoneVerify) {
    phoneVerify.addEventListener("click", verifyPhoneCodeFromSettings);
  }
  if (phoneCodeInput) {
    phoneCodeInput.addEventListener("input", function (e) {
      const normalized = normalizePhoneCodeInput(e.target.value);
      if (e.target.value !== normalized) {
        e.target.value = normalized;
      }
      syncPhoneSettings();
    });
    phoneCodeInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        verifyPhoneCodeFromSettings();
      }
    });
  }

  const chipDark = document.getElementById("settings-theme-dark");
  const chipLight = document.getElementById("settings-theme-light");
  const chipAuto = document.getElementById("settings-theme-auto");
  if (chipDark) {
    chipDark.addEventListener("click", function () {
      setThemeMode("dark", true);
    });
  }
  if (chipLight) {
    chipLight.addEventListener("click", function () {
      setThemeMode("light", true);
    });
  }
  if (chipAuto) {
    chipAuto.addEventListener("click", function () {
      setThemeMode("auto", true);
    });
  }

  const fsBtn = document.getElementById("settings-fullscreen-btn");
  function updateFsBtnText() {
    if (!fsBtn) return;
    fsBtn.textContent = document.fullscreenElement
      ? t("settings_fullscreen_btn_exit")
      : t("settings_fullscreen_btn_enter");
  }
  if (fsBtn) {
    fsBtn.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    });
  }
  document.addEventListener("fullscreenchange", updateFsBtnText);
  updateFsBtnText();

  const stSwitchAcc = document.getElementById("settings-switch-account");
  const stLogout = document.getElementById("settings-logout");
  if (stSwitchAcc) {
    stSwitchAcc.addEventListener("click", function () {
      closeSettings();
      if (accBackdrop) {
        renderAccountList();
        accBackdrop.classList.remove("hidden");
      }
    });
  }
  if (stLogout) {
    stLogout.addEventListener("click", function () {
      closeSettings();
      logout(false);
    });
  }

  // legal link handlers
  const linkGdpr = document.getElementById("settings-link-gdpr");
  const linkTerms = document.getElementById("settings-link-terms");
  const linkPrivacy = document.getElementById("settings-link-privacy");
  if (linkGdpr) {
    linkGdpr.addEventListener("click", function () {
      closeSettings();
      openLegal("gdpr");
    });
  }
  if (linkTerms) {
    linkTerms.addEventListener("click", function () {
      closeSettings();
      openLegal("terms");
    });
  }
  if (linkPrivacy) {
    linkPrivacy.addEventListener("click", function () {
      closeSettings();
      openLegal("privacy");
    });
  }

  initUpdatePromptControls();
  initUpdaterUi();

  const legalX = document.getElementById("legal-x");
  const legalCloseBtn = document.getElementById("legal-close-btn");
  if (legalX) legalX.addEventListener("click", closeLegal);
  if (legalCloseBtn) legalCloseBtn.addEventListener("click", closeLegal);

  // splash
  splashStartedAt = Date.now();
  runSplashSequence();
  hideSplashShowLogin();
});

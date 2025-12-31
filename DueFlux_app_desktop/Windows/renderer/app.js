const WEBSITE_BASE = "https://dueflux.app";
const WEBSITE_SIGNUP = WEBSITE_BASE + "/signup";
const WEBSITE_ACCOUNT = WEBSITE_BASE + "/account";
const WEBSITE_PRICING = WEBSITE_BASE + "/pricing";

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

let currentUser = null;
let currentLang = "en";
let planFromClaims = null;
let profileUnsub = null;
let invoicesUnsub = null;
let mailSyncPending = false;
let mailSyncErrorMessage = "";
let mailSyncCopiedUntil = 0;
let updateState = {
  status: "idle",
  version: "",
  message: "",
  percent: 0,
  currentVersion: "",
};
const SPLASH_MIN_MS = 7200;
let splashStartedAt = Date.now();
let splashTransitioned = false;
let splashTransitionTimer = null;
let forceLoginOnLaunch = true;

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
  sync_mail: "Sync mail",
  sync_panel_title: "Invoice inbox",
  sync_panel_desc: "Forward invoices to your personal DueFlux address.",
  sync_panel_copy: "Copy address",
  sync_panel_copied: "Address copied.",
  sync_panel_pending: "Generating your inbox...",
  sync_panel_ready: "Ready. Forward invoices to this address.",
  sync_panel_empty: "Click Sync mail to generate your invoice inbox.",
  sync_panel_error: "Could not create inbox. Try again.",
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
  sync_mail: "Sync mail",
  sync_panel_title: "Szamla postalada",
  sync_panel_desc: "Ird at a szamlakat a szemelyes DueFlux cimre.",
  sync_panel_copy: "Cim masolasa",
  sync_panel_copied: "Cim masolva.",
  sync_panel_pending: "Postalada letrehozasa...",
  sync_panel_ready: "Kesz. Ird at a szamlakat erre a cimre.",
  sync_panel_empty: "Nyomd meg az E-mail szinkron gombot a postalada generalasahoz.",
  sync_panel_error: "Nem sikerult letrehozni a postaladat. Probald ujra.",
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
  sync_mail: "Sync mail",
  sync_panel_title: "Inbox fatture",
  sync_panel_desc: "Inoltra le fatture al tuo indirizzo personale DueFlux.",
  sync_panel_copy: "Copia indirizzo",
  sync_panel_copied: "Indirizzo copiato.",
  sync_panel_pending: "Creazione inbox...",
  sync_panel_ready: "Pronto. Inoltra le fatture a questo indirizzo.",
  sync_panel_empty: "Premi Sincronizza email per creare la tua inbox fatture.",
  sync_panel_error: "Impossibile creare l'inbox. Riprova.",
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
  sync_mail: "Sync mail",
  sync_panel_title: "Fatura gelen kutusu",
  sync_panel_desc: "Faturalari kisisel DueFlux adresine yonlendir.",
  sync_panel_copy: "Adresi kopyala",
  sync_panel_copied: "Adres kopyalandi.",
  sync_panel_pending: "Gelen kutusu olusturuluyor...",
  sync_panel_ready: "Hazir. Faturalari bu adrese yonlendir.",
  sync_panel_empty: "Fatura gelen kutusu icin E-posta senkron'a bas.",
  sync_panel_error: "Gelen kutusu olusturulamadi. Tekrar dene.",
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

/* ---------- CONNECTIVITY ---------- */

function setOnlineState(isOnline) {
  const banner = document.getElementById("offline-banner");
  const text = document.getElementById("offline-text");
  if (banner) {
    if (isOnline) {
      banner.classList.add("hidden");
    } else {
      if (text) text.textContent = t("offline_required");
      banner.classList.remove("hidden");
    }
  }
  const gated = document.querySelectorAll("[data-online-only]");
  gated.forEach(function (el) {
    if (!el) return;
    if (isOnline) {
      el.classList.remove("is-disabled");
      el.removeAttribute("disabled");
    } else {
      el.classList.add("is-disabled");
      el.setAttribute("disabled", "true");
    }
  });
  refreshVerificationUi();
}

function ensureOnline() {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  setOnlineState(online);
  if (!online) {
    alert(t("offline_required"));
  }
  return online;
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

/* ---------- LANGUAGE HANDLING ---------- */

function loadLanguagePreference() {
  const saved = localStorage.getItem("df_lang");
  if (saved) return saved;
  return "en";
}

function setLanguage(lang, save) {
  currentLang = lang;
  document.documentElement.lang = lang;
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
    renderInvoiceTable();
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
  const signupLink = document.getElementById("login-signup-link");
  if (signupLink) signupLink.setAttribute("href", WEBSITE_SIGNUP);
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
}

function applyLanguageForAppTexts() {
  setText("splash-subtitle", t("splash_subtitle"));
  setText("app-tagline", t("app_tagline"));
  setText("btn-switch-account", t("settings_switch_account"));
  setText("btn-logout", t("settings_logout"));

  setText("kpi-title", t("overview_title"));
  setText("kpi-label-total", t("kpi_total"));
  setText("kpi-label-unpaid", t("kpi_unpaid"));
  setText("kpi-label-overdue", t("kpi_overdue"));

  setText("security-title", t("security_title"));
  setText("security-subtitle", t("security_subtitle"));

  setText("invoices-title", t("invoices_title"));
  setText("btn-sync", t("sync_mail"));
  setText("btn-add-invoice", t("add_invoice"));
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

  setText("account-modal-title", t("modal_account_title"));
  setText("account-add", t("modal_account_add"));

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

async function ensureUserDoc(authUser) {
  if (!authUser) return;
  const plan = planFromClaims || "basic";
  try {
    await firestore
      .collection("users")
      .doc(authUser.uid)
      .set(
        {
          email: authUser.email || "",
          displayName: authUser.displayName || "",
          plan: plan,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
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
    plan: plan,
    emailVerified: !!authUser.emailVerified,
    displayName: profile.displayName || authUser.displayName || "",
    mailboxId: profile.mailboxId || profile.mailbox_id || "",
    mailSyncAddress: profile.mailSyncAddress || profile.mail_sync_address || "",
    mailSyncEnabled:
      profile.mailSyncEnabled === undefined
        ? !!profile.mailSyncAddress
        : !!profile.mailSyncEnabled,
  };

  if (profile.lang) {
    setLanguage(profile.lang, false);
  }
  if (profile.themeMode) {
    setThemeMode(profile.themeMode, false);
  }

  if (currentUser.email && currentUser.company) {
    saveCompanyName(currentUser.email, currentUser.company);
  }

  applyProfileToHeader(currentUser);
  upsertAccountFromUser(currentUser);
  syncProfileForm();
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
    },
    function (err) {
      console.error("profile snapshot", err);
    }
  );
}

function normalizeInvoiceDoc(doc) {
  const data = doc && doc.data ? doc.data() : {};
  return Object.assign({ id: doc.id }, data);
}

function subscribeInvoices(authUser) {
  if (!authUser) return;
  if (invoicesUnsub) invoicesUnsub();
  invoices = [];
  const ref = firestore
    .collection("users")
    .doc(authUser.uid)
    .collection("invoices")
    .orderBy("createdAt", "desc")
    .limit(50);
  invoicesUnsub = ref.onSnapshot(
    function (snapshot) {
      invoices = snapshot.docs.map(normalizeInvoiceDoc);
      renderInvoiceTable();
      updateKpis();
    },
    function (err) {
      console.error("invoice snapshot", err);
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
  await loadPlanClaims(authUser);
  await ensureUserDoc(authUser);
  currentUser = {
    uid: authUser.uid,
    email: authUser.email || "",
    plan: planFromClaims || "basic",
    emailVerified: !!authUser.emailVerified,
    displayName: authUser.displayName || "",
  };
  resetMailSyncState();
  refreshMailSyncPanel();
  applyProfileToHeader(currentUser);
  refreshVerificationUi();
  subscribeProfile(authUser);
  subscribeInvoices(authUser);
  hideSplashShowLogin();
  setLoginMessage("", false);
}

function handleSignedOut() {
  clearSubscriptions();
  currentUser = null;
  invoices = [];
  resetMailSyncState();
  renderInvoiceTable();
  updateKpis();
  hideSplashShowLogin();
  refreshVerificationUi();
  refreshMailSyncPanel();
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
  alert(t("profile_plan_readonly"));
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

function syncProfileForm() {
  const first = document.getElementById("profile-first");
  const last = document.getElementById("profile-last");
  const company = document.getElementById("profile-company");
  if (first && currentUser) first.value = currentUser.firstName || "";
  if (last && currentUser) last.value = currentUser.lastName || "";
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
    window.open(url, "_blank");
  } catch (e) {
    console.error("openWebsite", e);
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

  if (!ensureOnline()) return;
  if (!auth.currentUser) return;

  try {
    const displayName = [first, last].filter(Boolean).join(" ");
    await firestore
      .collection("users")
      .doc(auth.currentUser.uid)
      .set(
        {
          firstName: first,
          lastName: last,
          company: company,
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
      if (displayName) currentUser.displayName = displayName;
    }
    if (currentUser && currentUser.email) {
      saveCompanyName(currentUser.email, company);
    }

    applyProfileToHeader(currentUser);
    upsertAccountFromUser(currentUser);
    syncProfileForm();
    alert(t("alert_profile_saved"));
  } catch (err) {
    console.error("saveProfileDetails", err);
    alert(t("alert_profile_error"));
  }
}

/* ---------- INVOICES ---------- */

let invoices = [];

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function formatInvoiceDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : "-";
}

function normalizeAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function loadInvoices() {
  renderInvoiceTable();
  updateKpis();
}

function renderInvoiceTable() {
  const tbody = document.getElementById("tbl-invoices");
  if (!tbody) return;
  tbody.innerHTML = "";

  invoices.forEach(function (inv) {
    const tr = document.createElement("tr");
    const statusLabel = t("status_" + (inv.status || "unpaid"));
    const amount = normalizeAmount(inv.amount);
    const issueDate = formatInvoiceDate(inv.issueDate);
    const dueDate = formatInvoiceDate(inv.dueDate);
    const currency = inv.currency || "RON";

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
      amount.toFixed(2) +
      " " +
      currency +
      "</td>" +
      '<td><span class="status-badge status-' +
      inv.status +
      '">' +
      statusLabel +
      "</span></td>" +
      '<td>' +
      '<button class="text-btn" data-id="' +
      inv.id +
      '" data-status="paid">' +
      t("table_actions_paid") +
      "</button>" +
      '<button class="text-btn" data-id="' +
      inv.id +
      '" data-status="overdue">' +
      t("table_actions_overdue") +
      "</button>" +
      "</td>";

    tbody.appendChild(tr);
  });

  tbody.onclick = async function (e) {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const status = btn.getAttribute("data-status");
    try {
      if (!auth.currentUser) return;
      await firestore
        .collection("users")
        .doc(auth.currentUser.uid)
        .collection("invoices")
        .doc(id)
        .set({ status: status }, { merge: true });
    } catch (err) {
      console.error("update status", err);
    }
  };
}

function updateKpis() {
  const total = invoices.reduce(function (s, inv) {
    return s + normalizeAmount(inv.amount);
  }, 0);
  const unpaid = invoices.filter(function (i) {
    return i.status === "unpaid";
  }).length;
  const overdue = invoices.filter(function (i) {
    return i.status === "overdue";
  }).length;

  const kTotal = document.getElementById("kpi-total");
  const kUnpaid = document.getElementById("kpi-unpaid");
  const kOverdue = document.getElementById("kpi-overdue");

  const currency = invoices.length && invoices[0].currency ? invoices[0].currency : "RON";
  if (kTotal) kTotal.textContent = total.toFixed(2) + " " + currency;
  if (kUnpaid) kUnpaid.textContent = unpaid;
  if (kOverdue) kOverdue.textContent = overdue;
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

  if (!company || !category || !number || !issue || !due || !amount) {
    alert(t("alert_fill_all_fields"));
    return;
  }

  if (!ensureOnline()) return;

  try {
    if (!auth.currentUser) return;
    const issueDate = issue ? new Date(issue) : null;
    const dueDate = due ? new Date(due) : null;
    await firestore
      .collection("users")
      .doc(auth.currentUser.uid)
      .collection("invoices")
      .add({
        company: company,
        category: category || null,
        number: number || null,
        issueDate: issueDate,
        dueDate: dueDate,
        amount: amount,
        currency: currency,
        status: status,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    closeInvoiceModal();
  } catch (err) {
    console.error("saveInvoice", err);
  }
}

/* ---------- SYNC MAIL ---------- */

function resetMailSyncState() {
  mailSyncPending = false;
  mailSyncErrorMessage = "";
  mailSyncCopiedUntil = 0;
}

function refreshMailSyncPanel() {
  const panel = document.getElementById("mail-sync-panel");
  if (!panel) return;
  if (!currentUser) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  const title = document.getElementById("mail-sync-title");
  const desc = document.getElementById("mail-sync-desc");
  const copyBtn = document.getElementById("mail-sync-copy");
  const addressEl = document.getElementById("mail-sync-address");
  const statusEl = document.getElementById("mail-sync-status");

  if (title) title.textContent = t("sync_panel_title");
  if (desc) desc.textContent = t("sync_panel_desc");

  const address = (currentUser.mailSyncAddress || "").trim();
  if (addressEl) addressEl.textContent = address || "—";
  if (address) {
    mailSyncPending = false;
    mailSyncErrorMessage = "";
  }

  const isCopied = mailSyncCopiedUntil && Date.now() < mailSyncCopiedUntil;
  if (copyBtn) {
    copyBtn.textContent = isCopied ? t("sync_panel_copied") : t("sync_panel_copy");
    copyBtn.disabled = !address || mailSyncPending;
  }

  let statusText = "";
  if (mailSyncErrorMessage) statusText = t("sync_panel_error");
  else if (mailSyncPending) statusText = t("sync_panel_pending");
  else if (address) statusText = t("sync_panel_ready");
  else statusText = t("sync_panel_empty");
  if (statusEl) statusEl.textContent = statusText;
}

async function copyMailSyncAddress() {
  const address =
    currentUser && currentUser.mailSyncAddress
      ? String(currentUser.mailSyncAddress).trim()
      : "";
  if (!address) return;

  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(address);
      copied = true;
    } catch (err) {
      copied = false;
    }
  }

  if (!copied) {
    const temp = document.createElement("textarea");
    temp.value = address;
    temp.setAttribute("readonly", "");
    temp.style.position = "absolute";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    try {
      copied = document.execCommand("copy");
    } catch (err) {
      copied = false;
    }
    document.body.removeChild(temp);
  }

  if (copied) {
    mailSyncCopiedUntil = Date.now() + 2000;
    refreshMailSyncPanel();
    setTimeout(function () {
      if (Date.now() > mailSyncCopiedUntil) refreshMailSyncPanel();
    }, 2100);
  }
}

async function syncMail() {
  if (!navigator.onLine) {
    setOnlineState(false);
    mailSyncPending = false;
    mailSyncErrorMessage = "offline";
    refreshMailSyncPanel();
    alert(t("offline_required"));
    return;
  }
  if (!auth.currentUser) return;
  mailSyncPending = true;
  mailSyncErrorMessage = "";
  refreshMailSyncPanel();
  try {
    await firestore
      .collection("users")
      .doc(auth.currentUser.uid)
      .collection("sync_requests")
      .add({
        type: "mail",
        status: "requested",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    alert(t("alert_sync_done"));
  } catch (err) {
    console.error("syncMail", err);
    mailSyncPending = false;
    mailSyncErrorMessage = "error";
    refreshMailSyncPanel();
    alert(t("alert_sync_error"));
  }
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

function refreshUpdateUi() {
  const statusEl = document.getElementById("settings-update-status");
  const versionEl = document.getElementById("settings-update-version");
  const checkBtn = document.getElementById("settings-check-updates");
  const installBtn = document.getElementById("settings-install-update");

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
      statusText += " " + updateState.percent + "%";
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

  if (statusEl) {
    statusEl.textContent = statusText;
    statusEl.dataset.status = statusText;
  }
  if (installBtn) {
    if (showInstall) {
      installBtn.classList.remove("hidden");
      installBtn.textContent = installLabel;
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

function handleUpdaterStatus(payload) {
  if (!payload) return;
  if (payload.status) updateState.status = payload.status;
  if (payload.version) updateState.version = payload.version;
  if (payload.message) updateState.message = payload.message;
  if (Number.isFinite(payload.percent)) updateState.percent = payload.percent;
  refreshUpdateUi();
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
      updater.checkForUpdates().catch(function (err) {
        updateState.status = "error";
        updateState.message = err && err.message ? err.message : "";
        refreshUpdateUi();
      });
    });
  }

  if (installBtn && updater) {
    installBtn.addEventListener("click", function () {
      if (updateState.status === "available") {
        if (typeof updater.downloadUpdate === "function") {
          updater.downloadUpdate().catch(function (err) {
            updateState.status = "error";
            updateState.message = err && err.message ? err.message : "";
            refreshUpdateUi();
          });
        }
        return;
      }
      if (updateState.status === "downloaded") {
        if (typeof updater.installUpdate === "function") {
          updater.installUpdate();
        }
      }
    });
  }
}


/* ---------- SETTINGS PANEL ---------- */

function openSettings() {
  const bd = document.getElementById("settings-backdrop");
  if (bd) bd.classList.remove("hidden");
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

  // connectivity state
  setOnlineState(navigator.onLine);
  window.addEventListener("online", function () {
    setOnlineState(true);
  });
  window.addEventListener("offline", function () {
    setOnlineState(false);
  });

  auth.onAuthStateChanged(function (authUser) {
    if (forceLoginOnLaunch) {
      forceLoginOnLaunch = false;
      if (authUser) {
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
      window.open(WEBSITE_SIGNUP, "_blank");
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
  if (btnAddInvoice) btnAddInvoice.addEventListener("click", openInvoiceModal);
  if (modalClose) modalClose.addEventListener("click", closeInvoiceModal);
  if (modalCancel) modalCancel.addEventListener("click", closeInvoiceModal);
  if (modalSave) modalSave.addEventListener("click", saveInvoiceFromModal);

  // sync mail
  const btnSync = document.getElementById("btn-sync");
  if (btnSync) btnSync.addEventListener("click", syncMail);
  const btnCopy = document.getElementById("mail-sync-copy");
  if (btnCopy) btnCopy.addEventListener("click", copyMailSyncAddress);

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
  if (btnSettings) btnSettings.addEventListener("click", openSettings);
  if (settingsClose) settingsClose.addEventListener("click", closeSettings);

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

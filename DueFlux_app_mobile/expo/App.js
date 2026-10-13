import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TrustPanel from './TrustPanel';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, listAll, ref } from "firebase/storage";
const Intelligence = require("./productIntelligence");
const OfflineQueue = require("./offlineQueue");
const ProtectedStorage = require("./protectedStorage");
const RecordVersion = require('./recordVersion');
const NativeNotifications = require('./nativeNotifications');
const featureLocales = require("./featureLocales");

const LOGO = require("./assets/logo-dueflux.png");
const SPLASH_DURATION_MS = 2800;
const SIGNUP_URL = "https://dueflux.com/signup.html";
const ACCOUNT_URL = "https://dueflux.com/account.html";
const PRIVACY_URL = "https://dueflux.com/privacy.html";
const TERMS_URL = "https://dueflux.com/terms.html";
const OFFLINE_CACHE_PREFIX = "df_mobile_cache_";
const OFFLINE_QUEUE_PREFIX = "df_mobile_queue_";
const MOBILE_LANGUAGE_KEY = "df_mobile_language";
const MOBILE_PLAN_KEY = "df_mobile_account_plan";
const MOBILE_PRIVACY_KEY = "df_mobile_sensitive_previews";
const REPORT_FIELDS = ["company", "category", "number", "issueDate", "dueDate", "amount", "status", "evidence", "cadence", "space", "risk"];

const firebaseConfig = {
  apiKey: "AIzaSyDPCDXynl6_SPbCrpsf0pmKsTVXqFPy_Sg",
  authDomain: "dueflux-product.firebaseapp.com",
  projectId: "dueflux-product",
  storageBucket: "dueflux-product.firebasestorage.app",
  messagingSenderId: "71833659340",
  appId: "1:71833659340:web:bf197cb41403034da51f69",
};

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = (() => {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ProtectedStorage.authStorage),
    });
  } catch (error) {
    // Fast Refresh can reuse an already initialized Auth instance.
    if (error.code === "auth/already-initialized") return getAuth(firebaseApp);
    throw error;
  }
})();
const firestore = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp, "us-central1");
const storage = getStorage(firebaseApp);
const legacyStorage = getStorage(firebaseApp, "gs://dueflux-product.appspot.com");

const LANG_OPTIONS = [
  { code: "ro", label: "Română" },
  { code: "hu", label: "Magyar" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
  { code: "tr", label: "Türkçe" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
  { code: "ja", label: "日本語" },
];

const LOCALE_MAP = {
  ro: "ro-RO",
  hu: "hu-HU",
  de: "de-DE",
  fr: "fr-FR",
  en: "en-US",
  it: "it-IT",
  tr: "tr-TR",
  zh: "zh-CN",
  ar: "ar-SA",
  ru: "ru-RU",
  es: "es-ES",
  ja: "ja-JP",
};

const translations = {
  en: {
    app_title: "DueFlux",
    app_subtitle: "Unified invoices for home & business.",
    login_title: "DueFlux",
    login_subtitle: "Unified invoices for home & business.",
    login_hint: "Use the same account as the desktop/web app.",
    login_email: "Email",
    login_password: "Password",
    login_button: "Sign in",
    login_signup_cta: "Don't have an account? Create it on the DueFlux website.",
    login_signup_link: "Create account on website",
    login_error_missing: "Enter email and password.",
    login_error_generic: "Could not sign in.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "Show",
    login_hide_password: "Hide",
    settings_title: "Settings",
    settings_appearance: "Appearance",
    settings_theme_note: "Theme saves to your account.",
    settings_account: "Account",
    settings_switch_account: "Switch account",
    switch_short: "Switch",
    settings_logout: "Log out",
    settings_legal: "Legal",
    settings_privacy: "Privacy Policy",
    settings_terms: "Terms of Service",
    settings_language: "Language",
    settings_theme_dark: "Dark",
    settings_theme_light: "Light",
    settings_theme_auto: "Auto",
    profile_title: "My profile",
    profile_subtitle: "Account details and plan",
    profile_plan_label: "Plan",
    profile_identity: "Identity",
    profile_first_name: "First name",
    profile_last_name: "Last name",
    profile_company: "Company name",
    profile_save: "Save changes",
    profile_open_website: "Open website",
    profile_saving: "Saving...",
    profile_save_success: "Profile updated.",
    profile_save_error: "Could not save profile.",
    overview_title: "Overview",
    overview_total: "Total this month",
    overview_unpaid: "Unpaid",
    overview_overdue: "Overdue",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_code_label: "Cod de 6 cifre",
    modal_totp_password_label: "Parola",
    modal_totp_confirm: "Confirm",
    modal_totp_cancel: "Cancel",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint:
      "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "Disable",
    modal_totp_disable_cancel: "Cancel",
    alert_totp_code: "Enter the 6-digit code.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "Enter your password to continue.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "Verify",
    mfa_totp_cancel: "Back",
    status_on: "ON",
    status_off: "OFF",
    invoices_title: "Invoices",
    invoices_sync: "Sync mail",
    sync_panel_title: "Invoice inbox",
    sync_panel_desc: "Forward invoices to your personal DueFlux address.",
    sync_panel_copy: "Copy address",
    sync_panel_copied: "Address copied.",
    sync_panel_pending: "Generating your inbox...",
    sync_panel_ready: "Ready. Forward invoices to this address.",
    sync_panel_empty: "Press Sync mail to generate your invoice inbox.",
    sync_panel_error: "Could not create inbox. Try again.",
    invoices_add: "+ Add invoice",
    invoices_empty: "No invoices yet.",
    invoices_sync_requested: "Sync requested.",
    invoices_sync_failed: "Could not start sync.",
    invoice_modal_title: "Add invoice",
    invoice_company: "Company",
    invoice_category: "Category",
    invoice_category_default: "General",
    invoice_number: "Number",
    invoice_number_fallback: "-",
    invoice_issue_date: "Issue date (YYYY-MM-DD)",
    invoice_due_date: "Due date (YYYY-MM-DD)",
    invoice_amount: "Amount",
    invoice_currency: "Currency",
    invoice_status: "Status",
    invoice_status_unpaid: "Unpaid",
    invoice_status_paid: "Paid",
    invoice_status_overdue: "Overdue",
    invoice_due_prefix: "Due",
    invoice_save: "Save",
    invoice_cancel: "Cancel",
    invoice_save_error: "Could not save invoice.",
    invoice_save_success: "Invoice saved.",
    invoice_unknown_company: "Unknown",
    user_fallback: "User",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  ro: {
    app_title: "DueFlux",
    app_subtitle: "Facturi unificate pentru acasă și afaceri.",
    login_title: "DueFlux",
    login_subtitle: "Facturi unificate pentru acasă și afaceri.",
    login_hint: "Folosește același cont ca în aplicația desktop/web.",
    login_email: "Email",
    login_password: "Parolă",
    login_button: "Autentificare",
    login_signup_cta: "Nu ai cont? Creează-l pe site-ul DueFlux.",
    login_signup_link: "Creează cont pe site",
    login_error_missing: "Introdu email și parola.",
    login_error_generic: "Nu te poți autentifica.",
    login_error_unverified: "Email neverificat. Verifica pe site-ul DueFlux.",
    login_show_password: "Arată",
    login_hide_password: "Ascunde",
    settings_title: "Setări",
    settings_appearance: "Aspect",
    settings_theme_note: "Tema se salvează în contul tău.",
    settings_account: "Cont",
    settings_switch_account: "Schimbă contul",
    switch_short: "Schimbă",
    settings_logout: "Deconectare",
    settings_legal: "Legal",
    settings_privacy: "Politica de confidențialitate",
    settings_terms: "Termeni de utilizare",
    settings_language: "Limbă",
    settings_theme_dark: "Întunecat",
    settings_theme_light: "Luminos",
    settings_theme_auto: "Auto",
    profile_title: "Profilul meu",
    profile_subtitle: "Detalii cont și plan",
    profile_plan_label: "Plan",
    profile_identity: "Identitate",
    profile_first_name: "Prenume",
    profile_last_name: "Nume",
    profile_company: "Companie",
    profile_save: "Salvează modificările",
    profile_open_website: "Deschide site-ul",
    profile_saving: "Se salvează...",
    profile_save_success: "Profil actualizat.",
    profile_save_error: "Nu se poate salva profilul.",
    overview_title: "Prezentare generală",
    overview_total: "Total luna aceasta",
    overview_unpaid: "Neplătite",
    overview_overdue: "Depășite",
    totp_cta_enable: "Activeaza 2FA pe email",
    totp_cta_disable: "Dezactiveaza 2FA pe email",
    modal_totp_title: "Activeaza 2FA pe email",
    modal_totp_hint:
      "Ti-am trimis un cod de 6 cifre pe email. Introdu codul pentru activare.",
    modal_totp_secret_label: "Cheie secreta",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "Confirma",
    modal_totp_cancel: "Anuleaza",
    modal_totp_disable_title: "Dezactiveaza 2FA pe email",
    modal_totp_disable_hint:
      "Ti-am trimis un cod de 6 cifre pe email. Introdu codul pentru dezactivare.",
    modal_totp_disable_confirm: "Dezactiveaza",
    modal_totp_disable_cancel: "Anuleaza",
    alert_totp_code: "Introdu codul de 6 cifre.",
    alert_totp_invalid: "Cod de verificare invalid.",
    alert_totp_disable_password: "Introdu codul de 6 cifre.",
    alert_totp_disable_error: "Nu putem dezactiva 2FA pe email. Verifica codul.",
    alert_totp_setup_error: "Nu putem trimite codul de verificare.",
    alert_totp_password_required: "Introdu parola pentru a continua.",
    mfa_totp_title: "Verificare pe email",
    mfa_totp_hint: "Introdu codul de 6 cifre trimis pe email.",
    mfa_totp_confirm: "Verifica",
    mfa_totp_cancel: "Inapoi",
    status_on: "ACTIV",
    status_off: "INACTIV",
    invoices_title: "Facturi",
    invoices_sync: "Sincronizează email",
    sync_panel_title: "Inbox facturi",
    sync_panel_desc: "Redirectioneaza facturile catre adresa ta personala DueFlux.",
    sync_panel_copy: "Copiaza adresa",
    sync_panel_copied: "Adresa a fost copiata.",
    sync_panel_pending: "Se genereaza inboxul...",
    sync_panel_ready: "Gata. Redirectioneaza facturile la aceasta adresa.",
    sync_panel_empty: "Apasa Sincronizeaza email pentru a genera inboxul de facturi.",
    sync_panel_error: "Nu am putut crea inboxul. Incearca din nou.",
    invoices_add: "+ Adaugă factură",
    invoices_empty: "Nu există facturi.",
    invoices_sync_requested: "Sincronizare cerută.",
    invoices_sync_failed: "Nu se poate porni sincronizarea.",
    invoice_modal_title: "Adaugă factură",
    invoice_company: "Companie",
    invoice_category: "Categorie",
    invoice_category_default: "Generală",
    invoice_number: "Număr",
    invoice_number_fallback: "-",
    invoice_issue_date: "Data emiterii (YYYY-MM-DD)",
    invoice_due_date: "Data scadentă (YYYY-MM-DD)",
    invoice_amount: "Sumă",
    invoice_currency: "Monedă",
    invoice_status: "Stare",
    invoice_status_unpaid: "Neplătită",
    invoice_status_paid: "Plătită",
    invoice_status_overdue: "Depășită",
    invoice_due_prefix: "Scadentă",
    invoice_save: "Salvează",
    invoice_cancel: "Renunță",
    invoice_save_error: "Nu se poate salva factura.",
    invoice_save_success: "Factura a fost salvată.",
    invoice_unknown_company: "Necunoscut",
    user_fallback: "Utilizator",
    security_title: "Verificare email",
    security_subtitle: "Verificarea emailului se face pe site-ul DueFlux.",
    security_status: "Stare verificare",
    totp_on_label: "EMAIL VERIFICAT",
    totp_off_label: "EMAIL NEVERIFICAT",
  },
  hu: {
    app_title: "DueFlux",
    app_subtitle: "Egyesített számlák otthonra és üzletre.",
    login_title: "DueFlux",
    login_subtitle: "Egyesített számlák otthonra és üzletre.",
    login_hint: "Használd ugyanazt a fiókot, mint az asztali/web alkalmazásban.",
    login_email: "E-mail",
    login_password: "Jelszó",
    login_button: "Bejelentkezés",
    login_signup_cta: "Nincs fiókod? Hozd létre a DueFlux weboldalon.",
    login_signup_link: "Fiók létrehozása a weboldalon",
    login_error_missing: "Add meg az e-mailt és jelszót.",
    login_error_generic: "Nem sikerült bejelentkezni.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "Mutat",
    login_hide_password: "Elrejt",
    settings_title: "Beállítások",
    settings_appearance: "Megjelenés",
    settings_theme_note: "A téma a fiókodhoz mentődik.",
    settings_account: "Fiók",
    settings_switch_account: "Fiók váltása",
    switch_short: "Váltás",
    settings_logout: "Kijelentkezés",
    settings_legal: "Jogi",
    settings_privacy: "Adatvédelmi irányelvek",
    settings_terms: "Szolgáltatási feltételek",
    settings_language: "Nyelv",
    settings_theme_dark: "Sötét",
    settings_theme_light: "Világos",
    settings_theme_auto: "Auto",
    profile_title: "Profilom",
    profile_subtitle: "Fiók adatai és csomag",
    profile_plan_label: "Csomag",
    profile_identity: "Azonosítás",
    profile_first_name: "Keresztnév",
    profile_last_name: "Vezetéknév",
    profile_company: "Cégnév",
    profile_save: "Módosítások mentése",
    profile_open_website: "Weboldal megnyitása",
    profile_saving: "Mentés...",
    profile_save_success: "Profil frissítve.",
    profile_save_error: "Nem sikerült menteni.",
    overview_title: "Áttekintés",
    overview_total: "Összesen ebben a hónapban",
    overview_unpaid: "Fizetetlen",
    overview_overdue: "Lejárt",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "Titkos kulcs",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "Megerősites",
    modal_totp_cancel: "Megse",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "Kikapcsolas",
    modal_totp_disable_cancel: "Megse",
    alert_totp_code: "Add meg a 6 jegyu kodot.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "Add meg a jelszavad a folytatashoz.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "Ellenorzes",
    mfa_totp_cancel: "Vissza",
    status_on: "BE",
    status_off: "KI",
    invoices_title: "Számlák",
    invoices_sync: "E-mail szinkron",
    sync_panel_title: "Szamla postalada",
    sync_panel_desc: "Ird at a szamlakat a szemelyes DueFlux cimre.",
    sync_panel_copy: "Cim masolasa",
    sync_panel_copied: "Cim masolva.",
    sync_panel_pending: "Postalada letrehozasa...",
    sync_panel_ready: "Kesz. Ird at a szamlakat erre a cimre.",
    sync_panel_empty: "Nyomd meg az E-mail szinkron gombot a postalada generalasahoz.",
    sync_panel_error: "Nem sikerult letrehozni a postaladat. Probald ujra.",
    invoices_add: "+ Számla hozzáadása",
    invoices_empty: "Nincs számla.",
    invoices_sync_requested: "Szinkron kérve.",
    invoices_sync_failed: "Nem sikerült elindítani a szinkront.",
    invoice_modal_title: "Számla hozzáadása",
    invoice_company: "Cég",
    invoice_category: "Kategória",
    invoice_category_default: "Általános",
    invoice_number: "Szám",
    invoice_number_fallback: "-",
    invoice_issue_date: "Kibocsátás dátuma (YYYY-MM-DD)",
    invoice_due_date: "Fizetési határidő (YYYY-MM-DD)",
    invoice_amount: "Összeg",
    invoice_currency: "Pénznem",
    invoice_status: "Állapot",
    invoice_status_unpaid: "Fizetetlen",
    invoice_status_paid: "Fizetett",
    invoice_status_overdue: "Lejárt",
    invoice_due_prefix: "Határidő",
    invoice_save: "Mentés",
    invoice_cancel: "Mégse",
    invoice_save_error: "Nem sikerült menteni a számlát.",
    invoice_save_success: "Számla mentve.",
    invoice_unknown_company: "Ismeretlen",
    user_fallback: "Felhasználó",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  fr: {
    app_title: "DueFlux",
    app_subtitle: "Factures unifiées pour la maison et l'entreprise.",
    login_title: "DueFlux",
    login_subtitle: "Factures unifiées pour la maison et l'entreprise.",
    login_hint: "Utilisez le même compte que l'app desktop/web.",
    login_email: "E-mail",
    login_password: "Mot de passe",
    login_button: "Se connecter",
    login_signup_cta: "Pas de compte ? Créez-le sur le site DueFlux.",
    login_signup_link: "Créer un compte sur le site",
    login_error_missing: "Entrez l'email et le mot de passe.",
    login_error_generic: "Connexion impossible.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "Afficher",
    login_hide_password: "Masquer",
    settings_title: "Paramètres",
    settings_appearance: "Apparence",
    settings_theme_note: "Le thème est enregistré dans votre compte.",
    settings_account: "Compte",
    settings_switch_account: "Changer de compte",
    switch_short: "Changer",
    settings_logout: "Déconnexion",
    settings_legal: "Légal",
    settings_privacy: "Politique de confidentialité",
    settings_terms: "Conditions d'utilisation",
    settings_language: "Langue",
    settings_theme_dark: "Sombre",
    settings_theme_light: "Clair",
    settings_theme_auto: "Auto",
    profile_title: "Mon profil",
    profile_subtitle: "Détails du compte et plan",
    profile_plan_label: "Plan",
    profile_identity: "Identité",
    profile_first_name: "Prénom",
    profile_last_name: "Nom",
    profile_company: "Société",
    profile_save: "Enregistrer les modifications",
    profile_open_website: "Ouvrir le site",
    profile_saving: "Enregistrement...",
    profile_save_success: "Profil mis à jour.",
    profile_save_error: "Impossible d'enregistrer le profil.",
    overview_title: "Aperçu",
    overview_total: "Total ce mois-ci",
    overview_unpaid: "Impayées",
    overview_overdue: "En retard",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "Clé secrète",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "Confirmer",
    modal_totp_cancel: "Annuler",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "Désactiver",
    modal_totp_disable_cancel: "Annuler",
    alert_totp_code: "Saisissez le code à 6 chiffres.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "Saisissez votre mot de passe pour continuer.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "Vérifier",
    mfa_totp_cancel: "Retour",
    status_on: "ACTIF",
    status_off: "INACTIF",
    invoices_title: "Factures",
    invoices_sync: "Synchroniser l'email",
    sync_panel_title: "Boite de factures",
    sync_panel_desc: "Transferez vos factures vers votre adresse DueFlux personnelle.",
    sync_panel_copy: "Copier l'adresse",
    sync_panel_copied: "Adresse copiee.",
    sync_panel_pending: "Creation de la boite...",
    sync_panel_ready: "Pret. Transferez les factures vers cette adresse.",
    sync_panel_empty: "Appuyez sur Synchroniser l'email pour generer votre boite.",
    sync_panel_error: "Impossible de creer la boite. Reessayez.",
    invoices_add: "+ Ajouter une facture",
    invoices_empty: "Aucune facture.",
    invoices_sync_requested: "Synchronisation demandée.",
    invoices_sync_failed: "Impossible de démarrer la synchronisation.",
    invoice_modal_title: "Ajouter une facture",
    invoice_company: "Société",
    invoice_category: "Catégorie",
    invoice_category_default: "Général",
    invoice_number: "Numéro",
    invoice_number_fallback: "-",
    invoice_issue_date: "Date d'émission (YYYY-MM-DD)",
    invoice_due_date: "Date d'échéance (YYYY-MM-DD)",
    invoice_amount: "Montant",
    invoice_currency: "Devise",
    invoice_status: "Statut",
    invoice_status_unpaid: "Impayée",
    invoice_status_paid: "Payée",
    invoice_status_overdue: "En retard",
    invoice_due_prefix: "Échéance",
    invoice_save: "Enregistrer",
    invoice_cancel: "Annuler",
    invoice_save_error: "Impossible d'enregistrer la facture.",
    invoice_save_success: "Facture enregistrée.",
    invoice_unknown_company: "Inconnu",
    user_fallback: "Utilisateur",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  de: {
    app_title: "DueFlux",
    app_subtitle: "Vereinte Rechnungen für Zuhause und Unternehmen.",
    login_title: "DueFlux",
    login_subtitle: "Vereinte Rechnungen für Zuhause und Unternehmen.",
    login_hint: "Nutze dasselbe Konto wie in der Desktop/Web-App.",
    login_email: "E-Mail",
    login_password: "Passwort",
    login_button: "Anmelden",
    login_signup_cta: "Noch kein Konto? Erstelle es auf der DueFlux-Website.",
    login_signup_link: "Konto auf der Website erstellen",
    login_error_missing: "E-Mail und Passwort eingeben.",
    login_error_generic: "Anmeldung fehlgeschlagen.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "Anzeigen",
    login_hide_password: "Verbergen",
    settings_title: "Einstellungen",
    settings_appearance: "Erscheinungsbild",
    settings_theme_note: "Das Design wird in deinem Konto gespeichert.",
    settings_account: "Konto",
    settings_switch_account: "Konto wechseln",
    switch_short: "Wechseln",
    settings_logout: "Abmelden",
    settings_legal: "Rechtliches",
    settings_privacy: "Datenschutz",
    settings_terms: "Nutzungsbedingungen",
    settings_language: "Sprache",
    settings_theme_dark: "Dunkel",
    settings_theme_light: "Hell",
    settings_theme_auto: "Auto",
    profile_title: "Mein Profil",
    profile_subtitle: "Kontodetails und Plan",
    profile_plan_label: "Plan",
    profile_identity: "Identität",
    profile_first_name: "Vorname",
    profile_last_name: "Nachname",
    profile_company: "Firmenname",
    profile_save: "Änderungen speichern",
    profile_open_website: "Website öffnen",
    profile_saving: "Speichern...",
    profile_save_success: "Profil aktualisiert.",
    profile_save_error: "Profil konnte nicht gespeichert werden.",
    overview_title: "Übersicht",
    overview_total: "Gesamt in diesem Monat",
    overview_unpaid: "Offen",
    overview_overdue: "Überfällig",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "Geheimer Schlüssel",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "Bestätigen",
    modal_totp_cancel: "Abbrechen",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "Deaktivieren",
    modal_totp_disable_cancel: "Abbrechen",
    alert_totp_code: "Bitte den 6-stelligen Code eingeben.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "Passwort eingeben, um fortzufahren.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "Prüfen",
    mfa_totp_cancel: "Zurück",
    status_on: "AN",
    status_off: "AUS",
    invoices_title: "Rechnungen",
    invoices_sync: "E-Mail synchronisieren",
    sync_panel_title: "Rechnungs-Postfach",
    sync_panel_desc: "Leite Rechnungen an deine persoenliche DueFlux-Adresse weiter.",
    sync_panel_copy: "Adresse kopieren",
    sync_panel_copied: "Adresse kopiert.",
    sync_panel_pending: "Postfach wird erstellt...",
    sync_panel_ready: "Bereit. Leite Rechnungen an diese Adresse weiter.",
    sync_panel_empty: "Klicke auf E-Mail-Sync, um dein Postfach zu erstellen.",
    sync_panel_error: "Postfach konnte nicht erstellt werden. Bitte erneut versuchen.",
    invoices_add: "+ Rechnung hinzufügen",
    invoices_empty: "Keine Rechnungen.",
    invoices_sync_requested: "Synchronisierung angefordert.",
    invoices_sync_failed: "Synchronisierung konnte nicht gestartet werden.",
    invoice_modal_title: "Rechnung hinzufügen",
    invoice_company: "Firma",
    invoice_category: "Kategorie",
    invoice_category_default: "Allgemein",
    invoice_number: "Nummer",
    invoice_number_fallback: "-",
    invoice_issue_date: "Ausstellungsdatum (YYYY-MM-DD)",
    invoice_due_date: "Fälligkeitsdatum (YYYY-MM-DD)",
    invoice_amount: "Betrag",
    invoice_currency: "Währung",
    invoice_status: "Status",
    invoice_status_unpaid: "Offen",
    invoice_status_paid: "Bezahlt",
    invoice_status_overdue: "Überfällig",
    invoice_due_prefix: "Fällig",
    invoice_save: "Speichern",
    invoice_cancel: "Abbrechen",
    invoice_save_error: "Rechnung konnte nicht gespeichert werden.",
    invoice_save_success: "Rechnung gespeichert.",
    invoice_unknown_company: "Unbekannt",
    user_fallback: "Benutzer",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  es: {
    app_title: "DueFlux",
    app_subtitle: "Facturas unificadas para hogar y negocio.",
    login_title: "DueFlux",
    login_subtitle: "Facturas unificadas para hogar y negocio.",
    login_hint: "Usa la misma cuenta que en la app de escritorio/web.",
    login_email: "Correo",
    login_password: "Contraseña",
    login_button: "Iniciar sesión",
    login_signup_cta: "¿No tienes cuenta? Créala en el sitio de DueFlux.",
    login_signup_link: "Crear cuenta en el sitio",
    login_error_missing: "Ingresa correo y contraseña.",
    login_error_generic: "No se pudo iniciar sesión.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "Mostrar",
    login_hide_password: "Ocultar",
    settings_title: "Ajustes",
    settings_appearance: "Apariencia",
    settings_theme_note: "El tema se guarda en tu cuenta.",
    settings_account: "Cuenta",
    settings_switch_account: "Cambiar cuenta",
    switch_short: "Cambiar",
    settings_logout: "Cerrar sesión",
    settings_legal: "Legal",
    settings_privacy: "Política de privacidad",
    settings_terms: "Términos de servicio",
    settings_language: "Idioma",
    settings_theme_dark: "Oscuro",
    settings_theme_light: "Claro",
    settings_theme_auto: "Auto",
    profile_title: "Mi perfil",
    profile_subtitle: "Detalles de cuenta y plan",
    profile_plan_label: "Plan",
    profile_identity: "Identidad",
    profile_first_name: "Nombre",
    profile_last_name: "Apellido",
    profile_company: "Empresa",
    profile_save: "Guardar cambios",
    profile_open_website: "Abrir sitio",
    profile_saving: "Guardando...",
    profile_save_success: "Perfil actualizado.",
    profile_save_error: "No se pudo guardar el perfil.",
    overview_title: "Resumen",
    overview_total: "Total este mes",
    overview_unpaid: "Impagas",
    overview_overdue: "Vencidas",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "Clave secreta",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "Confirmar",
    modal_totp_cancel: "Cancelar",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "Desactivar",
    modal_totp_disable_cancel: "Cancelar",
    alert_totp_code: "Introduce el código de 6 dígitos.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "Introduce tu contraseña para continuar.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "Verificar",
    mfa_totp_cancel: "Atrás",
    status_on: "ACTIVO",
    status_off: "INACTIVO",
    invoices_title: "Facturas",
    invoices_sync: "Sincronizar correo",
    sync_panel_title: "Buzon de facturas",
    sync_panel_desc: "Reenvia las facturas a tu direccion personal DueFlux.",
    sync_panel_copy: "Copiar direccion",
    sync_panel_copied: "Direccion copiada.",
    sync_panel_pending: "Creando tu buzon...",
    sync_panel_ready: "Listo. Reenvia las facturas a esta direccion.",
    sync_panel_empty: "Pulsa Sincronizar correo para generar tu buzon de facturas.",
    sync_panel_error: "No se pudo crear el buzon. Intenta otra vez.",
    invoices_add: "+ Agregar factura",
    invoices_empty: "Sin facturas.",
    invoices_sync_requested: "Sincronización solicitada.",
    invoices_sync_failed: "No se pudo iniciar la sincronización.",
    invoice_modal_title: "Agregar factura",
    invoice_company: "Empresa",
    invoice_category: "Categoría",
    invoice_category_default: "General",
    invoice_number: "Número",
    invoice_number_fallback: "-",
    invoice_issue_date: "Fecha de emisión (YYYY-MM-DD)",
    invoice_due_date: "Fecha de vencimiento (YYYY-MM-DD)",
    invoice_amount: "Importe",
    invoice_currency: "Moneda",
    invoice_status: "Estado",
    invoice_status_unpaid: "Impaga",
    invoice_status_paid: "Pagada",
    invoice_status_overdue: "Vencida",
    invoice_due_prefix: "Vence",
    invoice_save: "Guardar",
    invoice_cancel: "Cancelar",
    invoice_save_error: "No se pudo guardar la factura.",
    invoice_save_success: "Factura guardada.",
    invoice_unknown_company: "Desconocido",
    user_fallback: "Usuario",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  it: {
    app_title: "DueFlux",
    app_subtitle: "Fatture unificate per casa e business.",
    login_title: "DueFlux",
    login_subtitle: "Fatture unificate per casa e business.",
    login_hint: "Usa lo stesso account dell'app desktop/web.",
    login_email: "Email",
    login_password: "Password",
    login_button: "Accedi",
    login_signup_cta: "Non hai un account? Crealo sul sito DueFlux.",
    login_signup_link: "Crea account sul sito",
    login_error_missing: "Inserisci email e password.",
    login_error_generic: "Accesso non riuscito.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "Mostra",
    login_hide_password: "Nascondi",
    settings_title: "Impostazioni",
    settings_appearance: "Aspetto",
    settings_theme_note: "Il tema viene salvato nel tuo account.",
    settings_account: "Account",
    settings_switch_account: "Cambia account",
    switch_short: "Cambia",
    settings_logout: "Esci",
    settings_legal: "Legale",
    settings_privacy: "Privacy",
    settings_terms: "Termini di servizio",
    settings_language: "Lingua",
    settings_theme_dark: "Scuro",
    settings_theme_light: "Chiaro",
    settings_theme_auto: "Auto",
    profile_title: "Il mio profilo",
    profile_subtitle: "Dettagli account e piano",
    profile_plan_label: "Piano",
    profile_identity: "Identità",
    profile_first_name: "Nome",
    profile_last_name: "Cognome",
    profile_company: "Azienda",
    profile_save: "Salva modifiche",
    profile_open_website: "Apri sito",
    profile_saving: "Salvataggio...",
    profile_save_success: "Profilo aggiornato.",
    profile_save_error: "Impossibile salvare il profilo.",
    overview_title: "Panoramica",
    overview_total: "Totale questo mese",
    overview_unpaid: "Non pagate",
    overview_overdue: "Scadute",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "Chiave segreta",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "Conferma",
    modal_totp_cancel: "Annulla",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "Disattiva",
    modal_totp_disable_cancel: "Annulla",
    alert_totp_code: "Inserisci il codice a 6 cifre.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "Inserisci la password per continuare.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "Verifica",
    mfa_totp_cancel: "Indietro",
    status_on: "ATTIVO",
    status_off: "SPENTO",
    invoices_title: "Fatture",
    invoices_sync: "Sincronizza email",
    sync_panel_title: "Inbox fatture",
    sync_panel_desc: "Inoltra le fatture al tuo indirizzo personale DueFlux.",
    sync_panel_copy: "Copia indirizzo",
    sync_panel_copied: "Indirizzo copiato.",
    sync_panel_pending: "Creazione inbox...",
    sync_panel_ready: "Pronto. Inoltra le fatture a questo indirizzo.",
    sync_panel_empty: "Premi Sincronizza email per creare la tua inbox fatture.",
    sync_panel_error: "Impossibile creare l'inbox. Riprova.",
    invoices_add: "+ Aggiungi fattura",
    invoices_empty: "Nessuna fattura.",
    invoices_sync_requested: "Sincronizzazione richiesta.",
    invoices_sync_failed: "Impossibile avviare la sincronizzazione.",
    invoice_modal_title: "Aggiungi fattura",
    invoice_company: "Azienda",
    invoice_category: "Categoria",
    invoice_category_default: "Generale",
    invoice_number: "Numero",
    invoice_number_fallback: "-",
    invoice_issue_date: "Data emissione (YYYY-MM-DD)",
    invoice_due_date: "Data scadenza (YYYY-MM-DD)",
    invoice_amount: "Importo",
    invoice_currency: "Valuta",
    invoice_status: "Stato",
    invoice_status_unpaid: "Non pagata",
    invoice_status_paid: "Pagata",
    invoice_status_overdue: "Scaduta",
    invoice_due_prefix: "Scadenza",
    invoice_save: "Salva",
    invoice_cancel: "Annulla",
    invoice_save_error: "Impossibile salvare la fattura.",
    invoice_save_success: "Fattura salvata.",
    invoice_unknown_company: "Sconosciuto",
    user_fallback: "Utente",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  tr: {
    app_title: "DueFlux",
    app_subtitle: "Ev ve iş için birleştirilmiş faturalar.",
    login_title: "DueFlux",
    login_subtitle: "Ev ve iş için birleştirilmiş faturalar.",
    login_hint: "Masaüstü/web uygulamasıyla aynı hesabı kullan.",
    login_email: "E-posta",
    login_password: "Şifre",
    login_button: "Giriş yap",
    login_signup_cta: "Hesabınız yok mu? DueFlux sitesinden oluşturun.",
    login_signup_link: "Siteden hesap oluştur",
    login_error_missing: "E-posta ve şifre girin.",
    login_error_generic: "Giriş yapılamadı.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "Göster",
    login_hide_password: "Gizle",
    settings_title: "Ayarlar",
    settings_appearance: "Görünüm",
    settings_theme_note: "Tema hesabınıza kaydedilir.",
    settings_account: "Hesap",
    settings_switch_account: "Hesap değiştir",
    switch_short: "Değiştir",
    settings_logout: "Çıkış yap",
    settings_legal: "Yasal",
    settings_privacy: "Gizlilik Politikası",
    settings_terms: "Hizmet Şartları",
    settings_language: "Dil",
    settings_theme_dark: "Koyu",
    settings_theme_light: "Açık",
    settings_theme_auto: "Otomatik",
    profile_title: "Profilim",
    profile_subtitle: "Hesap bilgileri ve plan",
    profile_plan_label: "Plan",
    profile_identity: "Kimlik",
    profile_first_name: "Ad",
    profile_last_name: "Soyad",
    profile_company: "Şirket adı",
    profile_save: "Değişiklikleri kaydet",
    profile_open_website: "Siteyi aç",
    profile_saving: "Kaydediliyor...",
    profile_save_success: "Profil güncellendi.",
    profile_save_error: "Profil kaydedilemedi.",
    overview_title: "Genel bakış",
    overview_total: "Bu ay toplam",
    overview_unpaid: "Ödenmemiş",
    overview_overdue: "Gecikmiş",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "Gizli anahtar",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "Onayla",
    modal_totp_cancel: "İptal",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "Devre dışı bırak",
    modal_totp_disable_cancel: "İptal",
    alert_totp_code: "6 haneli kodu gir.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "Devam etmek için parolanı gir.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "Doğrula",
    mfa_totp_cancel: "Geri",
    status_on: "AÇIK",
    status_off: "KAPALI",
    invoices_title: "Faturalar",
    invoices_sync: "E-posta senkron",
    sync_panel_title: "Fatura gelen kutusu",
    sync_panel_desc: "Faturalari kisisel DueFlux adresine yonlendir.",
    sync_panel_copy: "Adresi kopyala",
    sync_panel_copied: "Adres kopyalandi.",
    sync_panel_pending: "Gelen kutusu olusturuluyor...",
    sync_panel_ready: "Hazir. Faturalari bu adrese yonlendir.",
    sync_panel_empty: "Fatura gelen kutusu icin E-posta senkron'a bas.",
    sync_panel_error: "Gelen kutusu olusturulamadi. Tekrar dene.",
    invoices_add: "+ Fatura ekle",
    invoices_empty: "Fatura yok.",
    invoices_sync_requested: "Senkronizasyon istendi.",
    invoices_sync_failed: "Senkronizasyon başlatılamadı.",
    invoice_modal_title: "Fatura ekle",
    invoice_company: "Şirket",
    invoice_category: "Kategori",
    invoice_category_default: "Genel",
    invoice_number: "Numara",
    invoice_number_fallback: "-",
    invoice_issue_date: "Düzenlenme tarihi (YYYY-MM-DD)",
    invoice_due_date: "Son tarih (YYYY-MM-DD)",
    invoice_amount: "Tutar",
    invoice_currency: "Para birimi",
    invoice_status: "Durum",
    invoice_status_unpaid: "Ödenmemiş",
    invoice_status_paid: "Ödendi",
    invoice_status_overdue: "Gecikmiş",
    invoice_due_prefix: "Son tarih",
    invoice_save: "Kaydet",
    invoice_cancel: "İptal",
    invoice_save_error: "Fatura kaydedilemedi.",
    invoice_save_success: "Fatura kaydedildi.",
    invoice_unknown_company: "Bilinmiyor",
    user_fallback: "Kullanıcı",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  ar: {
    app_title: "DueFlux",
    app_subtitle: "فواتير موحدة للمنزل والعمل.",
    login_title: "DueFlux",
    login_subtitle: "فواتير موحدة للمنزل والعمل.",
    login_hint: "استخدم نفس الحساب الموجود في تطبيق سطح المكتب/الويب.",
    login_email: "البريد الإلكتروني",
    login_password: "كلمة المرور",
    login_button: "تسجيل الدخول",
    login_signup_cta: "ليس لديك حساب؟ أنشئه على موقع DueFlux.",
    login_signup_link: "إنشاء حساب على الموقع",
    login_error_missing: "أدخل البريد الإلكتروني وكلمة المرور.",
    login_error_generic: "تعذر تسجيل الدخول.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "إظهار",
    login_hide_password: "إخفاء",
    settings_title: "الإعدادات",
    settings_appearance: "المظهر",
    settings_theme_note: "يتم حفظ المظهر في حسابك.",
    settings_account: "الحساب",
    settings_switch_account: "تبديل الحساب",
    switch_short: "تبديل",
    settings_logout: "تسجيل الخروج",
    settings_legal: "قانوني",
    settings_privacy: "سياسة الخصوصية",
    settings_terms: "شروط الخدمة",
    settings_language: "اللغة",
    settings_theme_dark: "داكن",
    settings_theme_light: "فاتح",
    settings_theme_auto: "تلقائي",
    profile_title: "ملفي",
    profile_subtitle: "تفاصيل الحساب والخطة",
    profile_plan_label: "الخطة",
    profile_identity: "الهوية",
    profile_first_name: "الاسم الأول",
    profile_last_name: "اسم العائلة",
    profile_company: "اسم الشركة",
    profile_save: "حفظ التغييرات",
    profile_open_website: "فتح الموقع",
    profile_saving: "جارٍ الحفظ...",
    profile_save_success: "تم تحديث الملف.",
    profile_save_error: "تعذر حفظ الملف.",
    overview_title: "نظرة عامة",
    overview_total: "إجمالي هذا الشهر",
    overview_unpaid: "غير مدفوع",
    overview_overdue: "متأخر",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "المفتاح السري",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "تأكيد",
    modal_totp_cancel: "إلغاء",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "إيقاف",
    modal_totp_disable_cancel: "إلغاء",
    alert_totp_code: "أدخل رمز الـ 6 أرقام.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "أدخل كلمة المرور للمتابعة.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "تحقق",
    mfa_totp_cancel: "رجوع",
    status_on: "تشغيل",
    status_off: "إيقاف",
    invoices_title: "الفواتير",
    invoices_sync: "مزامنة البريد",
    sync_panel_title: "صندوق الفواتير",
    sync_panel_desc: "قم بإعادة توجيه الفواتير إلى عنوان DueFlux الخاص بك.",
    sync_panel_copy: "نسخ العنوان",
    sync_panel_copied: "تم نسخ العنوان.",
    sync_panel_pending: "جارٍ إنشاء الصندوق...",
    sync_panel_ready: "جاهز. قم بإعادة توجيه الفواتير إلى هذا العنوان.",
    sync_panel_empty: "اضغط مزامنة البريد لإنشاء صندوق الفواتير.",
    sync_panel_error: "تعذر إنشاء الصندوق. حاول مرة أخرى.",
    invoices_add: "+ إضافة فاتورة",
    invoices_empty: "لا توجد فواتير.",
    invoices_sync_requested: "تم طلب المزامنة.",
    invoices_sync_failed: "تعذر بدء المزامنة.",
    invoice_modal_title: "إضافة فاتورة",
    invoice_company: "الشركة",
    invoice_category: "الفئة",
    invoice_category_default: "عام",
    invoice_number: "الرقم",
    invoice_number_fallback: "-",
    invoice_issue_date: "تاريخ الإصدار (YYYY-MM-DD)",
    invoice_due_date: "تاريخ الاستحقاق (YYYY-MM-DD)",
    invoice_amount: "المبلغ",
    invoice_currency: "العملة",
    invoice_status: "الحالة",
    invoice_status_unpaid: "غير مدفوع",
    invoice_status_paid: "مدفوع",
    invoice_status_overdue: "متأخر",
    invoice_due_prefix: "الاستحقاق",
    invoice_save: "حفظ",
    invoice_cancel: "إلغاء",
    invoice_save_error: "تعذر حفظ الفاتورة.",
    invoice_save_success: "تم حفظ الفاتورة.",
    invoice_unknown_company: "غير معروف",
    user_fallback: "مستخدم",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  ru: {
    app_title: "DueFlux",
    app_subtitle: "Единые счета для дома и бизнеса.",
    login_title: "DueFlux",
    login_subtitle: "Единые счета для дома и бизнеса.",
    login_hint: "Используйте тот же аккаунт, что и в настольном/веб‑приложении.",
    login_email: "Эл. почта",
    login_password: "Пароль",
    login_button: "Войти",
    login_signup_cta: "Нет аккаунта? Создайте его на сайте DueFlux.",
    login_signup_link: "Создать аккаунт на сайте",
    login_error_missing: "Введите email и пароль.",
    login_error_generic: "Не удалось войти.",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "Показать",
    login_hide_password: "Скрыть",
    settings_title: "Настройки",
    settings_appearance: "Внешний вид",
    settings_theme_note: "Тема сохраняется в вашем аккаунте.",
    settings_account: "Аккаунт",
    settings_switch_account: "Сменить аккаунт",
    switch_short: "Сменить",
    settings_logout: "Выйти",
    settings_legal: "Юридическая информация",
    settings_privacy: "Политика конфиденциальности",
    settings_terms: "Условия использования",
    settings_language: "Язык",
    settings_theme_dark: "Темная",
    settings_theme_light: "Светлая",
    settings_theme_auto: "Авто",
    profile_title: "Мой профиль",
    profile_subtitle: "Данные аккаунта и тариф",
    profile_plan_label: "Тариф",
    profile_identity: "Личные данные",
    profile_first_name: "Имя",
    profile_last_name: "Фамилия",
    profile_company: "Название компании",
    profile_save: "Сохранить изменения",
    profile_open_website: "Открыть сайт",
    profile_saving: "Сохранение...",
    profile_save_success: "Профиль обновлен.",
    profile_save_error: "Не удалось сохранить профиль.",
    overview_title: "Обзор",
    overview_total: "Итого за месяц",
    overview_unpaid: "Не оплачено",
    overview_overdue: "Просрочено",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "Секретный ключ",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "Подтвердить",
    modal_totp_cancel: "Отмена",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "Выключить",
    modal_totp_disable_cancel: "Отмена",
    alert_totp_code: "Введите 6-значный код.",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "Введите пароль, чтобы продолжить.",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "Проверить",
    mfa_totp_cancel: "Назад",
    status_on: "ВКЛ",
    status_off: "ВЫКЛ",
    invoices_title: "Счета",
    invoices_sync: "Синхрон. почту",
    sync_panel_title: "Почтовый ящик счетов",
    sync_panel_desc: "Пересылайте счета на ваш личный адрес DueFlux.",
    sync_panel_copy: "Копировать адрес",
    sync_panel_copied: "Адрес скопирован.",
    sync_panel_pending: "Создаем почтовый ящик...",
    sync_panel_ready: "Готово. Пересылайте счета на этот адрес.",
    sync_panel_empty: "Нажмите «Синхрон. почту», чтобы создать ящик для счетов.",
    sync_panel_error: "Не удалось создать ящик. Попробуйте еще раз.",
    invoices_add: "+ Добавить счет",
    invoices_empty: "Счетов нет.",
    invoices_sync_requested: "Синхронизация запрошена.",
    invoices_sync_failed: "Не удалось запустить синхронизацию.",
    invoice_modal_title: "Добавить счет",
    invoice_company: "Компания",
    invoice_category: "Категория",
    invoice_category_default: "Общее",
    invoice_number: "Номер",
    invoice_number_fallback: "-",
    invoice_issue_date: "Дата выставления (YYYY-MM-DD)",
    invoice_due_date: "Срок оплаты (YYYY-MM-DD)",
    invoice_amount: "Сумма",
    invoice_currency: "Валюта",
    invoice_status: "Статус",
    invoice_status_unpaid: "Не оплачено",
    invoice_status_paid: "Оплачено",
    invoice_status_overdue: "Просрочено",
    invoice_due_prefix: "Срок",
    invoice_save: "Сохранить",
    invoice_cancel: "Отмена",
    invoice_save_error: "Не удалось сохранить счет.",
    invoice_save_success: "Счет сохранен.",
    invoice_unknown_company: "Неизвестно",
    user_fallback: "Пользователь",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  zh: {
    app_title: "DueFlux",
    app_subtitle: "为家庭与企业统一管理发票。",
    login_title: "DueFlux",
    login_subtitle: "为家庭与企业统一管理发票。",
    login_hint: "使用与桌面/网页应用相同的账号。",
    login_email: "邮箱",
    login_password: "密码",
    login_button: "登录",
    login_signup_cta: "还没有账号？请在 DueFlux 网站创建。",
    login_signup_link: "在网站创建账号",
    login_error_missing: "请输入邮箱和密码。",
    login_error_generic: "无法登录。",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "显示",
    login_hide_password: "隐藏",
    settings_title: "设置",
    settings_appearance: "外观",
    settings_theme_note: "主题会保存到你的账户。",
    settings_account: "账户",
    settings_switch_account: "切换账户",
    switch_short: "切换",
    settings_logout: "退出登录",
    settings_legal: "法律",
    settings_privacy: "隐私政策",
    settings_terms: "服务条款",
    settings_language: "语言",
    settings_theme_dark: "深色",
    settings_theme_light: "浅色",
    settings_theme_auto: "自动",
    profile_title: "我的资料",
    profile_subtitle: "账户信息与套餐",
    profile_plan_label: "套餐",
    profile_identity: "身份信息",
    profile_first_name: "名",
    profile_last_name: "姓",
    profile_company: "公司名称",
    profile_save: "保存更改",
    profile_open_website: "打开网站",
    profile_saving: "保存中...",
    profile_save_success: "资料已更新。",
    profile_save_error: "无法保存资料。",
    overview_title: "概览",
    overview_total: "本月合计",
    overview_unpaid: "未支付",
    overview_overdue: "逾期",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "密钥",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "确认",
    modal_totp_cancel: "取消",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "关闭",
    modal_totp_disable_cancel: "取消",
    alert_totp_code: "请输入 6 位代码。",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "请输入密码以继续。",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "验证",
    mfa_totp_cancel: "返回",
    status_on: "开启",
    status_off: "关闭",
    invoices_title: "发票",
    invoices_sync: "同步邮件",
    sync_panel_title: "发票收件箱",
    sync_panel_desc: "将发票转发到你的 DueFlux 专属邮箱地址。",
    sync_panel_copy: "复制地址",
    sync_panel_copied: "地址已复制。",
    sync_panel_pending: "正在生成收件箱...",
    sync_panel_ready: "已就绪。将发票转发到此地址。",
    sync_panel_empty: "点击“同步邮件”生成发票收件箱。",
    sync_panel_error: "无法创建收件箱，请重试。",
    invoices_add: "+ 添加发票",
    invoices_empty: "暂无发票。",
    invoices_sync_requested: "已请求同步。",
    invoices_sync_failed: "无法开始同步。",
    invoice_modal_title: "添加发票",
    invoice_company: "公司",
    invoice_category: "类别",
    invoice_category_default: "通用",
    invoice_number: "编号",
    invoice_number_fallback: "-",
    invoice_issue_date: "开票日期 (YYYY-MM-DD)",
    invoice_due_date: "到期日期 (YYYY-MM-DD)",
    invoice_amount: "金额",
    invoice_currency: "货币",
    invoice_status: "状态",
    invoice_status_unpaid: "未支付",
    invoice_status_paid: "已支付",
    invoice_status_overdue: "逾期",
    invoice_due_prefix: "到期",
    invoice_save: "保存",
    invoice_cancel: "取消",
    invoice_save_error: "无法保存发票。",
    invoice_save_success: "发票已保存。",
    invoice_unknown_company: "未知",
    user_fallback: "用户",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
  ja: {
    app_title: "DueFlux",
    app_subtitle: "家庭とビジネスの請求書を統合。",
    login_title: "DueFlux",
    login_subtitle: "家庭とビジネスの請求書を統合。",
    login_hint: "デスクトップ/ウェブアプリと同じアカウントを使用してください。",
    login_email: "メール",
    login_password: "パスワード",
    login_button: "ログイン",
    login_signup_cta: "アカウントがありませんか？DueFluxサイトで作成してください。",
    login_signup_link: "サイトでアカウント作成",
    login_error_missing: "メールとパスワードを入力してください。",
    login_error_generic: "ログインできませんでした。",
    login_error_unverified: "Email not verified. Verify your email on the DueFlux website.",
    login_show_password: "表示",
    login_hide_password: "非表示",
    settings_title: "設定",
    settings_appearance: "外観",
    settings_theme_note: "テーマはアカウントに保存されます。",
    settings_account: "アカウント",
    settings_switch_account: "アカウント切替",
    switch_short: "切替",
    settings_logout: "ログアウト",
    settings_legal: "法的事項",
    settings_privacy: "プライバシーポリシー",
    settings_terms: "利用規約",
    settings_language: "言語",
    settings_theme_dark: "ダーク",
    settings_theme_light: "ライト",
    settings_theme_auto: "自動",
    profile_title: "プロフィール",
    profile_subtitle: "アカウント情報とプラン",
    profile_plan_label: "プラン",
    profile_identity: "個人情報",
    profile_first_name: "名",
    profile_last_name: "姓",
    profile_company: "会社名",
    profile_save: "変更を保存",
    profile_open_website: "サイトを開く",
    profile_saving: "保存中...",
    profile_save_success: "プロフィールを更新しました。",
    profile_save_error: "プロフィールを保存できませんでした。",
    overview_title: "概要",
    overview_total: "今月の合計",
    overview_unpaid: "未払い",
    overview_overdue: "延滞",
    totp_cta_enable: "Enable email 2FA",
    totp_cta_disable: "Disable email 2FA",
    modal_totp_title: "Enable email 2FA",
    modal_totp_hint:
      "We sent a 6-digit code to your email. Enter it to enable 2-step verification.",
    modal_totp_secret_label: "秘密鍵",
    modal_totp_code_label: "6-digit code",
    modal_totp_password_label: "Password",
    modal_totp_confirm: "確認",
    modal_totp_cancel: "キャンセル",
    modal_totp_disable_title: "Disable email 2FA",
    modal_totp_disable_hint: "We sent a 6-digit code to your email. Enter it to disable email 2FA.",
    modal_totp_disable_confirm: "無効化",
    modal_totp_disable_cancel: "キャンセル",
    alert_totp_code: "6桁のコードを入力してください。",
    alert_totp_invalid: "Invalid verification code.",
    alert_totp_disable_password: "Enter the 6-digit code.",
    alert_totp_disable_error: "Cannot disable email 2FA. Check the code.",
    alert_totp_setup_error: "Cannot send verification code.",
    alert_totp_password_required: "続行するにはパスワードを入力してください。",
    mfa_totp_title: "Email verification",
    mfa_totp_hint: "Enter the 6-digit code we sent to your email.",
    mfa_totp_confirm: "確認",
    mfa_totp_cancel: "戻る",
    status_on: "オン",
    status_off: "オフ",
    invoices_title: "請求書",
    invoices_sync: "メール同期",
    sync_panel_title: "請求書受信箱",
    sync_panel_desc: "請求書をあなた専用のDueFluxアドレスへ転送してください。",
    sync_panel_copy: "アドレスをコピー",
    sync_panel_copied: "アドレスをコピーしました。",
    sync_panel_pending: "受信箱を作成しています...",
    sync_panel_ready: "準備完了。このアドレスに転送してください。",
    sync_panel_empty: "「メール同期」を押して請求書受信箱を作成します。",
    sync_panel_error: "受信箱を作成できませんでした。もう一度お試しください。",
    invoices_add: "+ 請求書を追加",
    invoices_empty: "請求書がありません。",
    invoices_sync_requested: "同期を要求しました。",
    invoices_sync_failed: "同期を開始できませんでした。",
    invoice_modal_title: "請求書を追加",
    invoice_company: "会社",
    invoice_category: "カテゴリ",
    invoice_category_default: "一般",
    invoice_number: "番号",
    invoice_number_fallback: "-",
    invoice_issue_date: "発行日 (YYYY-MM-DD)",
    invoice_due_date: "支払期日 (YYYY-MM-DD)",
    invoice_amount: "金額",
    invoice_currency: "通貨",
    invoice_status: "状態",
    invoice_status_unpaid: "未払い",
    invoice_status_paid: "支払済み",
    invoice_status_overdue: "延滞",
    invoice_due_prefix: "期日",
    invoice_save: "保存",
    invoice_cancel: "キャンセル",
    invoice_save_error: "請求書を保存できませんでした。",
    invoice_save_success: "請求書を保存しました。",
    invoice_unknown_company: "不明",
    user_fallback: "ユーザー",
    security_title: "Email verification",
    security_subtitle: "Email verification is managed on the DueFlux website.",
    security_status: "Verification status",
    totp_on_label: "EMAIL VERIFIED",
    totp_off_label: "EMAIL NOT VERIFIED",
  },
};

const mobileFeatureTranslations = {
  en: {
    offline_badge: "Offline cache",
    offline_notice: "Offline mode. You can view cached invoices and queue local changes.",
    offline_required: "Internet connection required for this action.",
    offline_saved: "Saved locally. It will sync when internet returns.",
    offline_synced: "Offline changes synced.",
    setup_title: "Connect invoice sources",
    setup_desc: "Start with email or phone. After setup, manage sources from Settings.",
    setup_open_settings: "Open settings",
    phone_title: "Phone inbox",
    phone_desc: "Verify your phone, then forward invoice SMS/WhatsApp messages to DueFlux.",
    phone_number: "Phone number",
    phone_code: "6-digit code",
    phone_save: "Save",
    phone_send_code: "Send code",
    phone_verify: "Verify",
    phone_verified: "Phone verified.",
    phone_pending: "Verification pending.",
    phone_empty: "No phone configured.",
    phone_inbox_number: "DueFlux inbox number",
    phone_inbox_missing: "Not configured",
    phone_sync_now: "Sync phone inbox",
    phone_sms_sent: "Code sent. Delivery depends on Twilio/SMS carrier settings.",
    phone_sms_error: "Could not send SMS. Check Twilio live/A2P/geo settings.",
    reports_button: "Reports",
    reports_title: "Reports",
    reports_desc: "Choose fields and export invoice reports.",
    reports_csv: "CSV",
    reports_json: "JSON",
    reports_html: "HTML",
    reports_txt: "TXT",
    reports_exported: "Report ready.",
    reports_empty: "No invoices for report.",
    report_company: "Company",
    report_category: "Category",
    report_number: "Number",
    report_issueDate: "Issue date",
    report_dueDate: "Due date",
    report_amount: "Amount",
    report_status: "Status",
    sync_now: "Sync now",
    mail_settings_title: "Email sync",
    mail_settings_desc: "Manage connected inboxes from Settings.",
  },
  ro: {
    offline_badge: "Cache offline",
    offline_notice: "Mod offline. Poti vedea facturile salvate local si poti pune modificari in coada.",
    offline_required: "Ai nevoie de internet pentru aceasta actiune.",
    offline_saved: "Salvat local. Se va sincroniza cand revine internetul.",
    offline_synced: "Modificarile offline au fost sincronizate.",
    setup_title: "Conecteaza sursele de facturi",
    setup_desc: "Incepe cu email sau telefon. Dupa configurare, administrezi sursele din Setari.",
    setup_open_settings: "Deschide setarile",
    phone_title: "Inbox telefon",
    phone_desc: "Verifica telefonul, apoi redirectioneaza SMS/WhatsApp cu facturi catre DueFlux.",
    phone_number: "Numar telefon",
    phone_code: "Cod de 6 cifre",
    phone_save: "Salveaza",
    phone_send_code: "Trimite cod",
    phone_verify: "Verifica",
    phone_verified: "Telefon verificat.",
    phone_pending: "Verificare in asteptare.",
    phone_empty: "Telefon neconfigurat.",
    phone_inbox_number: "Numar inbox DueFlux",
    phone_inbox_missing: "Neconfigurat",
    phone_sync_now: "Sincronizeaza inbox telefon",
    phone_sms_sent: "Cod trimis. Livrarea depinde de setarile Twilio/operator.",
    phone_sms_error: "Nu am putut trimite SMS. Verifica Twilio live/A2P/geo settings.",
    reports_button: "Rapoarte",
    reports_title: "Reports",
    reports_desc: "Alege campurile si exporta rapoarte de facturi.",
    reports_csv: "CSV",
    reports_json: "JSON",
    reports_html: "HTML",
    reports_txt: "TXT",
    reports_exported: "Raport pregatit.",
    reports_empty: "Nu exista facturi pentru raport.",
    report_company: "Companie",
    report_category: "Categorie",
    report_number: "Numar",
    report_issueDate: "Data emiterii",
    report_dueDate: "Data scadentei",
    report_amount: "Suma",
    report_status: "Stare",
    sync_now: "Sincronizeaza acum",
    mail_settings_title: "Sincronizare email",
    mail_settings_desc: "Administreaza inboxurile conectate din Setari.",
  },
};

Object.keys(mobileFeatureTranslations).forEach((code) => {
  translations[code] = {
    ...(translations[code] || {}),
    ...mobileFeatureTranslations[code],
  };
});

const mobileIntelligenceI18n = {
  en: {
    space_all: "All", space_home: "Home", space_business: "Business",
    pulse_title: "DueFlux Pulse", pulse_attention: "Needs attention", pulse_due: "Due soon", pulse_guard: "Guard alerts", pulse_verified: "Evidence verified",
    twin_title: "Upcoming subscription timeline", guard_title: "Evidence and anomaly protection",
    action_title: "Invoice action center", evidence_title: "Why DueFlux trusts this invoice",
    action_paid: "Mark or confirm paid", action_payment: "Open official payment page", action_cancel: "Stop subscription", action_reminder: "Schedule reminder",
    reminder_placeholder: "YYYY-MM-DD HH:mm", reminder_save: "Save reminder", reminder_saved: "Reminder scheduled.",
    action_unavailable: "No verified official page is available for this provider.", action_paid_success: "Payment status confirmed.",
    inbox_mesh: "Inbox Mesh", inbox_mesh_desc: "Gmail and Outlook use direct sync. All other providers use your private forwarding inbox.",
    forwarding_address: "Universal forwarding address", forwarding_copy: "Copy address", forwarding_ready: "Address copied.",
    privacy_vault: "Privacy Vault", privacy_desc: "Sensitive evidence remains hidden until you open the invoice.", privacy_hidden: "Sensitive preview hidden",
    evidence_confidence: "Evidence confidence", evidence_source: "Source evidence", guard_clear: "No anomalies detected.", timeline_empty: "No predicted renewals yet.",
    report_evidence: "Evidence confidence", report_cadence: "Cadence", report_space: "Workspace", report_risk: "Guard alerts",
  },
  ro: {
    space_all: "Toate", space_home: "Acasă", space_business: "Afaceri",
    pulse_title: "DueFlux Pulse", pulse_attention: "Necesită atenție", pulse_due: "Scadente în curând", pulse_guard: "Alerte Guard", pulse_verified: "Dovezi verificate",
    twin_title: "Cronologia abonamentelor viitoare", guard_title: "Protecție pentru dovezi și anomalii",
    action_title: "Centrul de acțiuni al facturii", evidence_title: "De ce DueFlux are încredere în această factură",
    action_paid: "Marchează sau confirmă plata", action_payment: "Deschide pagina oficială de plată", action_cancel: "Oprește abonamentul", action_reminder: "Programează reminder",
    reminder_placeholder: "AAAA-LL-ZZ OO:mm", reminder_save: "Salvează reminderul", reminder_saved: "Reminder programat.",
    action_unavailable: "Nu există o pagină oficială verificată pentru acest furnizor.", action_paid_success: "Starea plății a fost confirmată.",
    inbox_mesh: "Inbox universal", inbox_mesh_desc: "Gmail și Outlook folosesc sincronizare directă. Ceilalți furnizori folosesc inboxul privat de redirecționare.",
    forwarding_address: "Adresă universală de redirecționare", forwarding_copy: "Copiază adresa", forwarding_ready: "Adresa a fost copiată.",
    privacy_vault: "Seif de confidențialitate", privacy_desc: "Dovezile sensibile rămân ascunse până deschizi factura.", privacy_hidden: "Previzualizare sensibilă ascunsă",
    evidence_confidence: "Încredere dovezi", evidence_source: "Dovada sursei", guard_clear: "Nu au fost detectate anomalii.", timeline_empty: "Nu există încă reînnoiri estimate.",
    report_evidence: "Încredere dovezi", report_cadence: "Frecvență", report_space: "Spațiu", report_risk: "Alerte Guard",
  },
};

const mobileCoreKeys = ["space_all", "space_home", "space_business", "pulse_title", "pulse_attention", "pulse_due", "pulse_guard", "pulse_verified", "action_title", "action_paid", "action_payment", "action_cancel", "action_reminder", "inbox_mesh", "privacy_vault"];
const mobileCorePacks = {
  hu: ["Mind", "Otthon", "Üzlet", "DueFlux Pulse", "Figyelmet igényel", "Hamarosan esedékes", "Guard riasztások", "Ellenőrzött bizonyíték", "Számla műveleti központ", "Fizetés megerősítése", "Hivatalos fizetési oldal", "Előfizetés leállítása", "Emlékeztető ütemezése", "Univerzális postaláda", "Adatvédelmi trezor"],
  de: ["Alle", "Privat", "Geschäftlich", "DueFlux Pulse", "Prüfen", "Bald fällig", "Guard-Warnungen", "Belege verifiziert", "Rechnungs-Aktionscenter", "Zahlung bestätigen", "Offizielle Zahlungsseite", "Abonnement beenden", "Erinnerung planen", "Universeller Posteingang", "Datentresor"],
  fr: ["Tout", "Maison", "Entreprise", "DueFlux Pulse", "À vérifier", "Bientôt dû", "Alertes Guard", "Preuves vérifiées", "Centre d'actions", "Confirmer le paiement", "Page de paiement officielle", "Arrêter l'abonnement", "Planifier un rappel", "Boîte universelle", "Coffre de confidentialité"],
  it: ["Tutte", "Casa", "Azienda", "DueFlux Pulse", "Da controllare", "In scadenza", "Avvisi Guard", "Prove verificate", "Centro azioni fattura", "Conferma pagamento", "Pagina ufficiale di pagamento", "Interrompi abbonamento", "Programma promemoria", "Posta universale", "Cassaforte privacy"],
  tr: ["Tümü", "Ev", "İş", "DueFlux Pulse", "Dikkat gerekli", "Yakında vadesi dolacak", "Guard uyarıları", "Kanıt doğrulandı", "Fatura işlem merkezi", "Ödemeyi onayla", "Resmi ödeme sayfası", "Aboneliği durdur", "Hatırlatıcı planla", "Evrensel gelen kutusu", "Gizlilik kasası"],
  es: ["Todas", "Hogar", "Empresa", "DueFlux Pulse", "Requiere atención", "Vence pronto", "Alertas Guard", "Evidencia verificada", "Centro de acciones", "Confirmar pago", "Página oficial de pago", "Cancelar suscripción", "Programar recordatorio", "Bandeja universal", "Bóveda de privacidad"],
  ru: ["Все", "Дом", "Бизнес", "DueFlux Pulse", "Требует внимания", "Скоро срок", "Оповещения Guard", "Доказательства проверены", "Центр действий", "Подтвердить оплату", "Официальная оплата", "Остановить подписку", "Запланировать напоминание", "Универсальная почта", "Хранилище конфиденциальности"],
  zh: ["全部", "家庭", "企业", "DueFlux Pulse", "需要关注", "即将到期", "Guard 警报", "证据已验证", "发票操作中心", "确认付款", "官方付款页面", "停止订阅", "设置提醒", "通用收件箱", "隐私保险库"],
  ja: ["すべて", "家庭", "ビジネス", "DueFlux Pulse", "要確認", "まもなく期限", "Guard アラート", "証拠確認済み", "請求書アクションセンター", "支払いを確認", "公式支払いページ", "サブスクリプションを停止", "リマインダーを設定", "ユニバーサル受信箱", "プライバシー保管庫"],
  ar: ["الكل", "المنزل", "الأعمال", "DueFlux Pulse", "يحتاج إلى انتباه", "يستحق قريبًا", "تنبيهات Guard", "أدلة موثقة", "مركز إجراءات الفاتورة", "تأكيد الدفع", "صفحة الدفع الرسمية", "إيقاف الاشتراك", "جدولة تذكير", "صندوق وارد موحد", "خزنة الخصوصية"],
};
Object.keys(mobileCorePacks).forEach((code) => {
  mobileIntelligenceI18n[code] = Object.fromEntries(mobileCoreKeys.map((key, index) => [key, mobileCorePacks[code][index]]));
});
Object.keys(translations).forEach((code) => {
  translations[code] = {
    ...translations.en,
    ...translations[code],
    ...mobileIntelligenceI18n.en,
    ...(mobileIntelligenceI18n[code] || {}),
  };
});

const THEMES = {
  dark: {
    mode: "dark",
    background: ["#060b16", "#040913"],
    cardGradient: [
      "rgba(53, 164, 255, 0.16)",
      "rgba(91, 108, 255, 0.14)",
      "rgba(9, 16, 31, 0.96)",
    ],
    glowTop: "rgba(53, 164, 255, 0.34)",
    glowRight: "rgba(91, 108, 255, 0.3)",
    text: "#eaf2ff",
    textMuted: "#97a9c8",
    textSoft: "#c8daf9",
    textInverse: "#ffffff",
    border: "rgba(122, 154, 198, 0.28)",
    borderStrong: "rgba(122, 154, 198, 0.44)",
    borderLight: "rgba(122, 154, 198, 0.2)",
    surface: "rgba(10, 18, 35, 0.97)",
    surfaceCard: "rgba(13, 24, 45, 0.92)",
    surfaceCardAlt: "rgba(15, 27, 50, 0.84)",
    surfaceHeader: "rgba(11, 20, 39, 0.9)",
    surfaceSoft: "rgba(53, 164, 255, 0.08)",
    inputBg: "rgba(9, 18, 35, 0.74)",
    inputBorder: "rgba(122, 154, 198, 0.36)",
    rowBg: "rgba(10, 20, 40, 0.6)",
    overlay: "rgba(5, 11, 22, 0.72)",
    accent: "#35a4ff",
    accentStrong: "#5b6cff",
    accentGradient: ["#35a4ff", "#4c57ff"],
    accentGradientAlt: ["#35a4ff", "#5b6cff"],
    accentSoft: "rgba(53, 164, 255, 0.16)",
    accentBorder: "rgba(53, 164, 255, 0.52)",
    danger: "#fda4af",
    dangerBorder: "rgba(244, 63, 94, 0.36)",
    dangerSoft: "rgba(244, 63, 94, 0.12)",
    warning: "#f59e0b",
    warningBorder: "rgba(245, 158, 11, 0.34)",
    warningSoft: "rgba(245, 158, 11, 0.18)",
    success: "#22c55e",
    successBorder: "rgba(34, 197, 94, 0.34)",
    successSoft: "rgba(34, 197, 94, 0.16)",
    link: "#35a4ff",
    placeholder: "#6f87ad",
    shadow: "#0f172a",
    statusBar: "light",
  },
  light: {
    mode: "light",
    background: ["#f8fbff", "#e9f1ff"],
    cardGradient: [
      "rgba(29, 124, 255, 0.12)",
      "rgba(76, 87, 255, 0.08)",
      "rgba(255, 255, 255, 0.96)",
    ],
    glowTop: "rgba(29, 124, 255, 0.2)",
    glowRight: "rgba(76, 87, 255, 0.14)",
    text: "#0c1a33",
    textMuted: "#5c6e8b",
    textSoft: "#44577a",
    textInverse: "#ffffff",
    border: "rgba(92, 110, 139, 0.24)",
    borderStrong: "rgba(92, 110, 139, 0.38)",
    borderLight: "rgba(92, 110, 139, 0.2)",
    surface: "rgba(255, 255, 255, 0.98)",
    surfaceCard: "rgba(255, 255, 255, 0.96)",
    surfaceCardAlt: "rgba(245, 249, 255, 0.94)",
    surfaceHeader: "rgba(255, 255, 255, 0.92)",
    surfaceSoft: "rgba(29, 124, 255, 0.08)",
    inputBg: "rgba(255, 255, 255, 0.94)",
    inputBorder: "rgba(92, 110, 139, 0.34)",
    rowBg: "rgba(235, 243, 255, 0.9)",
    overlay: "rgba(15, 23, 42, 0.35)",
    accent: "#1d7cff",
    accentStrong: "#4c57ff",
    accentGradient: ["#1d7cff", "#4c57ff"],
    accentGradientAlt: ["#1d7cff", "#4c57ff"],
    accentSoft: "rgba(29, 124, 255, 0.14)",
    accentBorder: "rgba(29, 124, 255, 0.44)",
    danger: "#dc2626",
    dangerBorder: "rgba(220, 38, 38, 0.35)",
    dangerSoft: "rgba(220, 38, 38, 0.12)",
    warning: "#d97706",
    warningBorder: "rgba(217, 119, 6, 0.34)",
    warningSoft: "rgba(217, 119, 6, 0.16)",
    success: "#16a34a",
    successBorder: "rgba(22, 163, 74, 0.35)",
    successSoft: "rgba(22, 163, 74, 0.18)",
    link: "#1d7cff",
    placeholder: "#92a3bf",
    shadow: "#94a3b8",
    statusBar: "dark",
  },
};

function planLabel(plan) {
  const value = String(plan || "basic").toUpperCase();
  return value === "BUSINESS" ? "BUSINESS" : "BASIC";
}

function createStyles(theme, density = 'comfortable') {
  return StyleSheet.create({
  app: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loginScroll: {
    flexGrow: 1,
    padding: 20,
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  appScroll: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 36,
  },
  logoWrapBase: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceHeader,
    shadowColor: theme.shadow,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoWrapBig: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },
  logoWrapSmall: {
    width: 40,
    height: 40,
  },
  logoWrapTiny: {
    width: 32,
    height: 32,
  },
  logoWrapTinyCompact: {
    width: 28,
    height: 28,
  },
  logoMarkBig: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  logoMarkSmall: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  logoMarkTiny: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  logoMarkTinyCompact: {
    width: 14,
    height: 14,
  },
  splashContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  splashPanel: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceCard,
    paddingVertical: 30,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: theme.shadow,
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  splashTitle: {
    color: theme.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: 4,
  },
  splashSubtitle: {
    marginTop: 8,
    color: theme.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  splashLoaderRow: {
    marginTop: 18,
    width: "100%",
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceHeader,
    overflow: "hidden",
  },
  splashLoaderBar: {
    width: "42%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.accent,
  },
  splashStatus: {
    marginTop: 12,
    color: theme.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 30,
    overflow: "hidden",
    shadowColor: theme.shadow,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  loginCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  loginGlowTop: {
    position: "absolute",
    left: -80,
    top: -90,
    width: 200,
    height: 200,
    borderRadius: 120,
    backgroundColor: theme.glowTop,
    opacity: 0.7,
  },
  loginGlowRight: {
    position: "absolute",
    right: -60,
    top: 80,
    width: 180,
    height: 180,
    borderRadius: 100,
    backgroundColor: theme.glowRight,
    opacity: 0.75,
  },
  loginContent: {
    position: "relative",
    zIndex: 2,
  },
  loginHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  loginTitle: {
    color: theme.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  loginSubtitle: {
    color: theme.textMuted,
    marginTop: 3,
    fontSize: 13,
  },
  loginToolbar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  loginHint: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surfaceSoft,
    padding: 11,
    marginRight: 10,
  },
  loginHintText: {
    color: theme.textMuted,
    fontSize: 12,
  },
  languageButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceHeader,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  languageButtonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "600",
  },
  fieldLabel: {
    color: theme.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    backgroundColor: theme.inputBg,
    color: theme.text,
    marginBottom: 12,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  passwordToggle: {
    height: 48,
    minWidth: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    backgroundColor: theme.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  passwordToggleText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "600",
  },
  loginMessage: {
    marginTop: 12,
    fontSize: 12,
    color: theme.danger,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.dangerBorder,
    backgroundColor: theme.dangerSoft,
  },
  loginButtonWrap: {
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },
  loginButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: theme.textInverse,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.4,
  },
  loginSignup: {
    marginTop: 16,
  },
  loginSignupText: {
    color: theme.textMuted,
    fontSize: 12,
  },
  loginSignupLink: {
    color: theme.link,
    fontSize: 12,
    marginTop: 6,
  },
  appHeader: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceHeader,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  appHeaderCompact: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  appHeaderGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  appHeaderGlow: {
    position: "absolute",
    right: -40,
    top: -50,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: theme.glowRight,
    opacity: 0.45,
  },
  appHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  appHeaderTopCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  appHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  appHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
    alignSelf: "flex-start",
  },
  appHeaderActionsCompact: {
    marginTop: 10,
  },
  appBrand: {
    marginLeft: 10,
    flexShrink: 1,
  },
  appBrandCompact: {
    marginLeft: 8,
  },
  appTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  appTitle: {
    color: theme.text,
    fontSize: 16,
    letterSpacing: 0.6,
    fontWeight: "600",
  },
  appTitleCompact: {
    fontSize: 14,
  },
  statusDotWrap: {
    width: 12,
    height: 12,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.accent,
  },
  statusPulse: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  appSubtitle: {
    color: theme.textMuted,
    fontSize: 11,
    flexWrap: "wrap",
  },
  appSubtitleCompact: {
    fontSize: 10,
  },
  appHeaderBottom: {
    marginTop: 14,
  },
  userPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.surfaceHeader,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  userPillCompact: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  userName: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  planBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: theme.accentSoft,
  },
  planBadgeText: {
    color: theme.accent,
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  iconButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceHeader,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginTop: 6,
  },
  iconButtonCompact: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  iconButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButtonIcon: {
    marginRight: 6,
    fontSize: 12,
    color: theme.accent,
  },
  iconButtonIconCompact: {
    fontSize: 10,
  },
  iconButtonFirst: {
    marginLeft: 0,
  },
  iconButtonText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "600",
  },
  iconButtonTextCompact: {
    fontSize: 10,
  },
  card: {
    backgroundColor: theme.surfaceCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 16,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    shadowColor: theme.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  mutedText: {
    color: theme.textMuted,
  },
  smallText: {
    fontSize: 12,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  kpiItem: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceCardAlt,
    padding: 12,
    marginBottom: 10,
  },
  kpiLabel: {
    color: theme.textMuted,
    fontSize: 11,
  },
  kpiValue: {
    marginTop: 4,
    color: theme.text,
    fontSize: 16,
    fontWeight: "600",
  },
  totpRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  totpActions: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  totpHint: {
    marginTop: 6,
  },
  pillOn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: theme.successSoft,
    marginRight: 8,
  },
  pillOff: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: theme.dangerSoft,
    marginRight: 8,
  },
  pillText: {
    fontSize: 11,
    color: theme.text,
    fontWeight: "700",
  },
  deviceSyncPanel: {
    flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12,
    padding: 14, marginVertical: 16, borderRadius: 14,
    backgroundColor: theme.surfaceSoft, borderWidth: 1, borderColor: theme.border,
  },
  invoiceFilters: { gap: 8, paddingVertical: 12 },
  filterChip: {
    minHeight: 44, paddingHorizontal: 14, justifyContent: "center",
    borderRadius: 22, borderWidth: 1, borderColor: theme.border,
  },
  filterChipActive: { backgroundColor: theme.surface, borderColor: theme.accent },
  invoiceEmpty: { padding: 24, gap: 16, alignItems: "center", borderRadius: 16, backgroundColor: theme.surface },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  invoiceActions: {
    flexDirection: "row",
  },
  mailSyncPanel: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surfaceCardAlt,
  },
  mailSyncHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  mailSyncInfo: {
    flex: 1,
    paddingRight: 10,
  },
  mailSyncTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
  },
  mailSyncDesc: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  mailSyncStatus: {
    marginTop: 8,
  },
  mailProviders: {
    marginTop: 10,
  },
  mailProviderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surfaceSoft,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  mailProviderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  mailProviderBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  mailProviderBadgeGmail: {
    backgroundColor: "rgba(234, 88, 12, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(253, 186, 116, 0.35)",
  },
  mailProviderBadgeOutlook: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.35)",
  },
  mailProviderBadgeGeneric: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(165, 180, 252, 0.35)",
  },
  mailProviderBadgeText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "700",
  },
  mailProviderName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
  },
  mailProviderStatus: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  mailProviderEmail: {
    color: theme.text,
    fontSize: 11,
    marginTop: 2,
  },
  mailProviderActions: {
    marginLeft: 6,
  },
  mailConnectProviderRow: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mailConnectProviderValue: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "600",
  },
  ghostButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceHeader,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    opacity: 0.9,
  },
  ghostButtonDanger: {
    borderColor: theme.dangerBorder,
    backgroundColor: theme.dangerSoft,
  },
  ghostButtonText: {
    color: theme.text,
    fontSize: 11,
  },
  ghostButtonTextDanger: {
    color: theme.danger,
  },
  primarySmall: {
    borderRadius: 999,
    overflow: "hidden",
  },
  primarySmallInner: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  primarySmallText: {
    color: theme.textInverse,
    fontSize: 11,
    fontWeight: "600",
  },
  loadingBlock: {
    marginTop: 10,
  },
  invoiceRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.rowBg,
    padding: density === 'compact' ? 10 : 16,
    marginBottom: 10,
  },
  invoiceRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceCompany: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
  },
  invoiceMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  invoiceMetaText: {
    color: theme.textMuted,
    fontSize: 11,
    marginRight: 10,
  },
  invoiceAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  invoiceAmount: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
  },
  invoiceDue: {
    color: theme.textMuted,
    fontSize: 11,
  },
  invoiceRowFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPaid: {
    backgroundColor: theme.successSoft,
    borderColor: theme.successBorder,
  },
  statusUnpaid: {
    backgroundColor: theme.warningSoft,
    borderColor: theme.warningBorder,
  },
  statusOverdue: {
    backgroundColor: theme.dangerSoft,
    borderColor: theme.dangerBorder,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusTextPaid: {
    color: theme.success,
  },
  statusTextUnpaid: {
    color: theme.warning,
  },
  statusTextOverdue: {
    color: theme.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalPanel: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 16,
  },
  settingsPanel: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "88%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 16,
  },
  settingsScroll: {
    width: "100%",
  },
  settingsScrollContent: {
    paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "700",
  },
  modalClose: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  modalCloseText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "700",
  },
  modalSection: {
    marginTop: 12,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 6,
  },
  chipActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accentBorder,
  },
  chipText: {
    color: theme.textMuted,
    fontSize: 11,
  },
  chipTextActive: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: "600",
  },
  settingsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  ghostButtonWide: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surfaceHeader,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  linkButton: {
    marginTop: 8,
  },
  linkButtonText: {
    color: theme.link,
    fontSize: 12,
    fontWeight: "600",
  },
  profilePlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  profilePlanLabel: {
    color: theme.textMuted,
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: theme.accentStrong,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: theme.textInverse,
    fontWeight: "700",
    fontSize: 13,
  },
  dangerButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.dangerBorder,
    backgroundColor: theme.dangerSoft,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  dangerButtonText: {
    color: theme.danger,
    fontWeight: "700",
    fontSize: 13,
  },
  qrWrap: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  qrCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  secretBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surfaceSoft,
    padding: 12,
  },
  secretLabel: {
    color: theme.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  secretValue: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  modalScroll: {
    maxHeight: 420,
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  statusChipActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accentBorder,
  },
  statusChipText: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  statusChipTextActive: {
    color: theme.accent,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  modalFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  errorText: {
    marginTop: 6,
    color: theme.danger,
    fontSize: 12,
  },
  languagePanel: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 16,
  },
  languageScroll: {
    maxHeight: 360,
  },
  languageScrollContent: {
    paddingBottom: 4,
  },
  languageOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surfaceHeader,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  languageOptionActive: {
    borderColor: theme.accentBorder,
    backgroundColor: theme.accentSoft,
  },
  languageOptionText: {
    color: theme.textSoft,
    fontSize: 12,
  },
  languageOptionTextActive: {
    color: theme.accent,
    fontWeight: "700",
  },
  });
}

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

Object.keys(mailSyncI18n).forEach((lang) => {
  translations[lang] = { ...translations[lang], ...mailSyncI18n[lang] };
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

Object.keys(mailSyncPlanI18n).forEach((lang) => {
  translations[lang] = { ...translations[lang], ...mailSyncPlanI18n[lang] };
});

const invoiceDeleteI18n = {
  en: {
    table_actions_delete: "Delete",
    delete_invalid_invoices: "Delete invalid",
    invoice_delete_confirm: "Delete this invoice?",
    invoice_delete_error: "Could not delete invoice.",
    invoice_delete_invalid_confirm:
      "Delete {{count}} invalid invoice(s) with missing data?",
    invoice_delete_invalid_done: "Deleted {{count}} invalid invoice(s).",
    invoice_delete_invalid_none: "No invalid invoices found.",
    invoice_delete_invalid_partial:
      "Deleted {{deleted}} invoice(s). Failed: {{failed}}.",
  },
  ro: {
    table_actions_delete: "Șterge",
    delete_invalid_invoices: "Șterge nule",
    invoice_delete_confirm: "Ștergi această factură?",
    invoice_delete_error: "Factura nu a putut fi ștearsă.",
    invoice_delete_invalid_confirm:
      "Ștergi {{count}} facturi invalide cu date lipsă?",
    invoice_delete_invalid_done: "Au fost șterse {{count}} facturi invalide.",
    invoice_delete_invalid_none: "Nu există facturi invalide.",
    invoice_delete_invalid_partial:
      "Au fost șterse {{deleted}} facturi. Eșuate: {{failed}}.",
  },
};

Object.keys(invoiceDeleteI18n).forEach((lang) => {
  translations[lang] = { ...translations[lang], ...invoiceDeleteI18n[lang] };
});

Object.keys(translations).forEach((lang) => {
  const currentPack = translations[lang] || {};
  const englishPack = translations.en || {};
  Object.keys(featureLocales[lang] || {}).forEach((key) => {
    if (!currentPack[key] || currentPack[key] === englishPack[key]) {
      currentPack[key] = featureLocales[lang][key];
    }
  });
  translations[lang] = currentPack;
});

const translationsBase = translations.en || {};
Object.keys(translations).forEach((lang) => {
  translations[lang] = { ...translationsBase, ...(translations[lang] || {}) };
});

function resolveDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDate(value, locale) {
  const date = resolveDate(value);
  if (!date) return "-";
  return date.toLocaleDateString(locale || "en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatAmount(amount, currency) {
  const num = Number(amount);
  const safe = Number.isFinite(num) ? num : 0;
  const unit = currency || "RON";
  return `${safe.toFixed(2)} ${unit}`;
}

function hasTextValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isMeaningfulInvoiceData(invoice) {
  if (!invoice || typeof invoice !== "object") return false;
  const amount = Number(invoice.amount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const hasCompany = hasTextValue(invoice.company);
  const hasNumber = hasTextValue(invoice.number);
  const hasIssueDate = !!resolveDate(invoice.issueDate);
  const hasDueDate = !!resolveDate(invoice.dueDate);
  if (hasAmount) return true;
  if (hasNumber && (hasCompany || hasIssueDate || hasDueDate)) return true;
  if (hasCompany && (hasIssueDate || hasDueDate)) return true;
  return false;
}

const SUBSCRIPTION_PROVIDER_HINTS = [
  "netflix",
  "spotify",
  "youtube premium",
  "google one",
  "icloud",
  "prime video",
  "amazon prime",
  "yoxo",
  "orange",
  "vodafone",
  "telekom",
  "digi",
  "enel",
  "eon",
  "engie",
  "adobe",
  "microsoft 365",
  "office 365",
  "dropbox",
  "notion",
  "canva",
  "openai",
  "chatgpt plus",
];

const SUBSCRIPTION_RECURRING_HINTS = [
  "subscription",
  "recurring",
  "monthly",
  "annual",
  "yearly",
  "renewal",
  "membership",
  "abonament",
  "recurent",
  "lunar",
  "anual",
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
  "shipping",
  "wizzair",
  "ryanair",
  "airbnb",
];

function normalizeInvoiceStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status === "paid") return "paid";
  if (status === "overdue") return "overdue";
  return "unpaid";
}

function isPastDueDate(value) {
  const dueDate = resolveDate(value);
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

function getInvoiceEffectiveStatus(invoice) {
  const status = normalizeInvoiceStatus(invoice && invoice.status);
  if (status === "paid") return "paid";
  if (isPastDueDate(invoice && invoice.dueDate)) return "overdue";
  if (status === "overdue" && !resolveDate(invoice && invoice.dueDate)) return "overdue";
  return "unpaid";
}

function invoiceLooksLikeSubscription(invoice) {
  if (invoice?.duplicateOf) return false;
  if (!invoice || typeof invoice !== "object") return false;
  if (invoice.recurring === true) return true;
  if (String(invoice.invoiceType || "").toLowerCase() === "subscription") return true;

  const category = String(invoice.category || "").toLowerCase();
  if (
    category.includes("subscription") ||
    category.includes("abonament") ||
    category.includes("membership") ||
    category.includes("utility") ||
    category.includes("telecom") ||
    category.includes("saas")
  ) {
    return true;
  }

  const haystack = [
    String(invoice.company || ""),
    String(invoice.subject || ""),
    String(invoice.from || ""),
    String(invoice.emailPreview || ""),
    String(invoice.sourceAccountEmail || ""),
  ]
    .join(" ")
    .toLowerCase();

  if (!haystack) return false;
  const hasProviderHint = SUBSCRIPTION_PROVIDER_HINTS.some((hint) =>
    haystack.includes(hint)
  );
  const hasRecurringHint = SUBSCRIPTION_RECURRING_HINTS.some((hint) =>
    haystack.includes(hint)
  );
  const hasNonSubscriptionHint = NON_SUBSCRIPTION_HINTS.some((hint) =>
    haystack.includes(hint)
  );

  if (hasNonSubscriptionHint && !hasProviderHint && !hasRecurringHint) {
    return false;
  }
  return hasProviderHint || hasRecurringHint;
}

function normalizeInvoiceDoc(docSnap) {
  const data = docSnap.data() || {};
  const issueDate = resolveDate(
    data.issueDate || data.issue_date || data.issueAt || data.issuedAt
  );
  const dueDate = resolveDate(data.dueDate || data.due_date || data.dueAt);
  const amountValue =
    typeof data.amount === "number" ? data.amount : parseFloat(data.amount);
  const amount = Number.isFinite(amountValue) ? amountValue : 0;
  const status = String(data.status || "unpaid").toLowerCase();

  return {
    ...data,
    id: docSnap.id,
    company: data.company || data.vendor || "",
    category: data.category || "",
    number: data.number || data.invoiceNumber || "",
    issueDate,
    dueDate,
    updatedAt: resolveDate(data.updatedAt),
    amount,
    currency: data.currency || "RON",
    status,
    recurring: data.recurring === true,
    invoiceType: data.invoiceType || "",
    subject: data.subject || "",
    from: data.from || "",
    emailPreview: data.emailPreview || data.preview || "",
    sourceAccountEmail: data.sourceAccountEmail || "",
  };
}

function normalizeProviderName(value) {
  const provider = String(value || "").toLowerCase().trim();
  if (provider === "google" || provider === "gmail") return "gmail";
  if (provider === "outlook" || provider === "microsoft" || provider === "office365") {
    return "outlook";
  }
  return provider;
}

function providerDisplayName(provider, t) {
  if (provider === "gmail") return t("mail_sync_connect_provider_gmail");
  if (provider === "outlook") return t("mail_sync_connect_provider_outlook");
  const raw = String(provider || "").trim();
  if (!raw || raw === "unknown") return t("mail_sync_connect_provider_unknown");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getMailAccountEntries(mailAccounts) {
  return Object.entries(mailAccounts || {})
    .map(([docId, data]) => {
      const row = data || {};
      const provider = normalizeProviderName(row.provider || "");
      return {
        accountId: row.accountId || docId,
        provider: provider || "unknown",
        data: row,
      };
    })
    .sort((a, b) => {
      const aConnected = !!(a.data && a.data.connected);
      const bConnected = !!(b.data && b.data.connected);
      if (aConnected !== bConnected) return bConnected ? 1 : -1;

      const aProvider = String(a.provider || "");
      const bProvider = String(b.provider || "");
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

function getMailProviderStatusLabel(account, providerAllowed, t) {
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

function offlineCacheKey(uid) {
  return `${OFFLINE_CACHE_PREFIX}${uid || ""}`;
}

function offlineQueueKey(uid) {
  return `${OFFLINE_QUEUE_PREFIX}${uid || ""}`;
}

function serializeForCache(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeForCache);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeForCache(item)])
    );
  }
  return value;
}

async function loadOfflineCache(uid) {
  if (!uid) return null;
  try {
    const raw = await ProtectedStorage.getItem(offlineCacheKey(uid));
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (Array.isArray(cache.invoices)) {
      cache.invoices = cache.invoices.map((invoice) => normalizeInvoiceDoc({
        id: invoice.id, data: () => invoice,
      }));
    }
    return cache;
  } catch (_) {
    return null;
  }
}

async function saveOfflineCache(uid, payload) {
  if (!uid) return;
  try {
    await ProtectedStorage.setItem(
      offlineCacheKey(uid),
      JSON.stringify({
        savedAt: new Date().toISOString(),
        ...serializeForCache(payload),
      })
    );
  } catch (_) {
    // cache is best-effort
  }
}

async function getOfflineQueue(uid) {
  if (!uid) return [];
  try {
    const raw = await ProtectedStorage.getItem(offlineQueueKey(uid));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) throw new Error("Invalid offline queue");
    return parsed;
  } catch (_) {
    throw new Error("Offline changes could not be read on this device.");
  }
}

async function setOfflineQueue(uid, queue) {
  if (!uid) return;
  try {
    await ProtectedStorage.setItem(offlineQueueKey(uid), JSON.stringify(queue || []));
  } catch (_) {
    throw new Error("Offline changes could not be saved on this device.");
  }
}

const offlineQueueEngine = OfflineQueue.create({
  read: getOfflineQueue, write: setOfflineQueue,
  apply: async (uid, mutation) => {
    if (ProtectedStorage.isLocked()) throw new Error('Vault locked');
    if (auth.currentUser?.uid !== uid) throw new Error("Account changed");
    await httpsCallable(functions, "applyOfflineMutation")({ mutation });
  },
});

function normalizePhoneInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const plus = raw.startsWith("+") ? "+" : "";
  return plus + raw.replace(/\D/g, "");
}

function isValidPhone(value) {
  const normalized = normalizePhoneInput(value);
  const digits = normalized.replace(/\D/g, "");
  return normalized.startsWith("+") && digits.length >= 8 && digits.length <= 15;
}

function maskPhone(value) {
  const normalized = normalizePhoneInput(value);
  const digits = normalized.replace(/\D/g, "");
  if (digits.length <= 4) return normalized;
  return `+${digits.slice(0, 3)}${"*".repeat(Math.max(0, digits.length - 5))}${digits.slice(-2)}`;
}

function normalizeAccountPlan(plan) {
  return String(plan || "").toLowerCase() === "business" ? "business" : "basic";
}

function workspaceSpaceForPlan(plan) {
  return normalizeAccountPlan(plan) === "business" ? "business" : "home";
}

function reportFieldLabel(field, t) {
  return t(`report_${field}`);
}

function escapeReportText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function reportFieldValue(invoice, field, locale, t, allInvoices) {
  if (field === "issueDate") return formatDate(invoice.issueDate, locale);
  if (field === "dueDate") return formatDate(invoice.dueDate, locale);
  if (field === "amount") return formatAmount(invoice.amount, invoice.currency);
  if (field === "status") return t(`invoice_status_${getInvoiceEffectiveStatus(invoice)}`);
  if (field === "space") return t(`space_${invoice?.spaceId || "home"}`);
  if (field === "evidence" || field === "cadence" || field === "risk") {
    const enriched = Intelligence.enrichInvoice(invoice, allInvoices || []);
    if (field === "evidence") return `${enriched.intelligence.evidence.confidence}%`;
    if (field === "cadence") return t("cadence_" + (enriched.intelligence.recurrence.cadence || "unknown"));
    if (field === "risk") return enriched.intelligence.risk.flags.map((flag) => t("risk_" + flag.code)).join(", ") || "-";
  }
  return invoice?.[field] ? String(invoice[field]) : "-";
}

function buildReportRows(invoices, fields, locale, t) {
  return invoices
    .filter(invoiceLooksLikeSubscription)
    .filter(isMeaningfulInvoiceData)
    .map((invoice) =>
      Object.fromEntries(
        fields.map((field) => [
          reportFieldLabel(field, t),
          reportFieldValue(invoice, field, locale, t, invoices),
        ])
      )
    );
}

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState("basic");
  const [lang, setLang] = useState("en");
  const [themeMode, setThemeMode] = useState("dark");
  const [density, setDensity] = useState('comfortable');
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [invoicesReady, setInvoicesReady] = useState(false);
  const [vaultLocked, setVaultLocked] = useState(ProtectedStorage.isLocked());
  const [vaultOpening, setVaultOpening] = useState(false);
  const [vaultError, setVaultError] = useState(false);
  const [trustVisible, setTrustVisible] = useState(false);
  const [trustMode, setTrustMode] = useState('sync');
  const [trustInvoiceId, setTrustInvoiceId] = useState('');
  const [trustGeneration, setTrustGeneration] = useState(0);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [pendingChanges, setPendingChanges] = useState(0);
  const [deviceSyncPhase, setDeviceSyncPhase] = useState("ready");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [mailAccounts, setMailAccounts] = useState({});
  const [mailSyncNotice, setMailSyncNotice] = useState("");
  const [mailConnectVisible, setMailConnectVisible] = useState(false);
  const [mailConnectEmail, setMailConnectEmail] = useState("");
  const [mailConnectProvider, setMailConnectProvider] = useState("unknown");
  const [mailConnectError, setMailConnectError] = useState("");
  const [mailConnectBusy, setMailConnectBusy] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceMessage, setInvoiceMessage] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const [profileFirst, setProfileFirst] = useState("");
  const [profileLast, setProfileLast] = useState("");
  const [profileCompany, setProfileCompany] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [invoiceCompany, setInvoiceCompany] = useState("");
  const [invoiceCategory, setInvoiceCategory] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceIssueDate, setInvoiceIssueDate] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState("RON");
  const [invoiceStatus, setInvoiceStatus] = useState("unpaid");
  const [isOnline, setIsOnline] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportFields, setReportFields] = useState(REPORT_FIELDS);
  const [reportBusy, setReportBusy] = useState(false);
  const [actionInvoice, setActionInvoice] = useState(null);
  const [forwardingAddress, setForwardingAddress] = useState("");
  const [sourceHubVisible, setSourceHubVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [sensitivePreviewsHidden, setSensitivePreviewsHidden] = useState(true);
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneInboxNumber, setPhoneInboxNumber] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneSyncing, setPhoneSyncing] = useState(false);
  const cacheStateRef = useRef({
    invoices: [],
    mailAccounts: {},
    companyName: "",
    phone: "",
    phoneVerified: false,
    phoneInboxNumber: "",
  });

  const loadingTimeoutRef = useRef(null);
  const localActivityRef = useRef(Date.now());
  const authUidRef = useRef(null);
  const syncPausedRef = useRef(false);
  syncPausedRef.current = trustVisible && trustMode === 'sync';
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(0.98)).current;
  const statusPulse = useRef(new Animated.Value(0)).current;

  const { width } = useWindowDimensions();
  const systemScheme = useColorScheme();
  const resolvedMode =
    themeMode === "auto" ? (systemScheme === "light" ? "light" : "dark") : themeMode;
  const theme = THEMES[resolvedMode] || THEMES.dark;
  const styles = useMemo(() => createStyles(theme, density), [theme, density]);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem('df_density').then(value => { if (active && value === 'compact') setDensity(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const changeDensity = useCallback(async value => {
    if (!['comfortable', 'compact'].includes(value)) return;
    await AsyncStorage.setItem('df_density', value); setDensity(value);
  }, []);
  const compactHeader = width < 520;

  const emailVerified = !!user?.emailVerified;
  const dict = translations[lang] || translations.en;
  const t = useCallback(
    (key) => dict[key] || translations.en[key] || key,
    [dict]
  );
  const callTrustControl = useCallback(async payload => {
    if (!isOnline || ProtectedStorage.isLocked() || !user?.uid || auth.currentUser?.uid !== user.uid) throw new Error('Unavailable');
    const result = await httpsCallable(functions, 'appControl')(payload);
    if (ProtectedStorage.isLocked() || auth.currentUser?.uid !== user.uid) throw new Error('Account changed');
    return result.data || {};
  }, [isOnline, user?.uid]);
  const refreshTrustInvoice = useCallback(async id => {
    const uid = auth.currentUser?.uid;
    if (!uid || ProtectedStorage.isLocked()) return;
    const document = await getDocFromServer(doc(firestore, 'users', uid, 'invoices', id));
    const queue = await getOfflineQueue(uid);
    if (ProtectedStorage.isLocked() || auth.currentUser?.uid !== uid) return;
    setInvoices(current => {
      const next = current.filter(invoice => invoice.id !== id);
      if (document.exists()) next.push(normalizeInvoiceDoc(document));
      return OfflineQueue.projectInvoices(next, queue).map(invoice => normalizeInvoiceDoc({ id: invoice.id, data: () => invoice }));
    });
  }, []);
  useEffect(() => {
    if (!user?.uid || vaultLocked) return undefined;
    return NativeNotifications.listen(user.uid, callTrustControl, () => {
      setTrustMode('reminders'); setTrustInvoiceId(''); setTrustGeneration(previous => previous + 1); setTrustVisible(true);
    });
  }, [callTrustControl, user?.uid, vaultLocked]);
  useEffect(() => ProtectedStorage.subscribe((locked) => {
    setVaultLocked(locked);
    if (locked) { setInvoices([]); setMailAccounts({}); setActionInvoice(null); setSettingsVisible(false); setTrustVisible(false); }
  }), []);
  useEffect(() => {
    const timer = globalThis.setInterval(() => {
      if (!ProtectedStorage.isLocked() && Date.now() - localActivityRef.current > 300000) ProtectedStorage.lock();
    }, 15000);
    return () => globalThis.clearInterval(timer);
  }, []);
  const accountLabel = plan === "business"
    ? companyName || displayName || user?.email || t("user_fallback")
    : displayName || user?.email || t("user_fallback");
  const locale = LOCALE_MAP[lang] || "en-US";
  const planIsBusiness = plan === "business";
  const planWorkspaceSpace = workspaceSpaceForPlan(plan);
  const isMailProviderAllowed = useCallback(
    (provider) => normalizeProviderName(provider) !== "outlook" || planIsBusiness,
    [planIsBusiness]
  );
  const mailAccountsList = useMemo(
    () => getMailAccountEntries(mailAccounts),
    [mailAccounts]
  );
  const mailConnected = mailAccountsList.some(
    ({ data }) => data && data.connected
  );
  const phoneConnected = !!(phoneVerified || phoneInboxNumber);
  const needsInvoiceSourceSetup = !mailConnected && !phoneConnected;
  const mailHasSyncIssue = mailAccountsList.some(({ data }) =>
    hasMailAccountSyncIssue(data)
  );
  const mailLatestSync = mailAccountsList
    .map(({ data }) => resolveDate(data.lastSyncAt))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const mailSyncCanSync = (mailConnected || phoneConnected) && !syncing && !phoneSyncing;
  const mailSyncStatusText = !mailConnected
    ? t("mail_sync_panel_empty")
    : syncing
      ? t("mail_sync_panel_syncing")
      : mailHasSyncIssue
        ? t("mail_sync_panel_error")
      : mailSyncNotice
        ? mailSyncNotice
        : mailLatestSync
          ? t("mail_sync_panel_last_sync").replace(
              "{{time}}",
              mailLatestSync.toLocaleString(locale)
            )
          : t("mail_sync_panel_ready");
  const workspaceInvoices = useMemo(
    () => invoices.map((invoice) => ({ ...invoice, spaceId: planWorkspaceSpace })),
    [invoices, planWorkspaceSpace]
  );
  const visibleInvoices = useMemo(
    () => workspaceInvoices.filter((invoice) => OfflineQueue.matchesInvoice(invoice, invoiceSearch) &&
      (invoiceFilter === "all" || getInvoiceEffectiveStatus(invoice) === invoiceFilter)),
    [workspaceInvoices, invoiceSearch, invoiceFilter]
  );
  const intelligencePulse = useMemo(
    () => Intelligence.computePulse(workspaceInvoices),
    [workspaceInvoices]
  );
  const selectedIntelligence = useMemo(
    () => actionInvoice ? Intelligence.enrichInvoice(actionInvoice, invoices) : null,
    [actionInvoice, invoices]
  );
  useEffect(() => {
    cacheStateRef.current = {
      invoices,
      mailAccounts,
      companyName,
      phone,
      phoneVerified,
      phoneInboxNumber,
    };
  }, [companyName, invoices, mailAccounts, phone, phoneInboxNumber, phoneVerified]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.multiGet([MOBILE_LANGUAGE_KEY, MOBILE_PLAN_KEY, MOBILE_PRIVACY_KEY]).then((entries) => {
      if (!active) return;
      const values = Object.fromEntries(entries || []);
      if (values[MOBILE_LANGUAGE_KEY] && translations[values[MOBILE_LANGUAGE_KEY]]) {
        setLang(values[MOBILE_LANGUAGE_KEY]);
      }

      if (values[MOBILE_PRIVACY_KEY] === "false") setSensitivePreviewsHidden(false);
    });
    return () => { active = false; };
  }, []);



  const mailConnectProviderLabel = mailConnectBusy
    ? t("mail_sync_connect_provider_detecting")
    : providerDisplayName(mailConnectProvider, t);
  const languageLabel =
    LANG_OPTIONS.find((item) => item.code === lang)?.label || t("settings_language");
  const pulseScale = statusPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const pulseOpacity = statusPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  const kpis = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const totals = {};
    let unpaid = 0;
    let overdue = 0;

    invoices.forEach((inv) => {
      if (!isMeaningfulInvoiceData(inv)) return;
      if (!invoiceLooksLikeSubscription(inv)) return;
      if (inv.issueDate) {
        const d = inv.issueDate;
        if (d.getMonth() === month && d.getFullYear() === year) {
          const currency = inv.currency || "RON";
          totals[currency] = (totals[currency] || 0) + (Number(inv.amount) || 0);
        }
      }
      const effectiveStatus = getInvoiceEffectiveStatus(inv);
      if (effectiveStatus === "unpaid") unpaid += 1;
      if (effectiveStatus === "overdue") overdue += 1;
    });

    return {
      totals: Object.keys(totals).length ? totals : { RON: 0 },
      unpaid,
      overdue,
    };
  }, [invoices]);

  const syncCloud = useCallback(async (authUser) => {
    try {
      await listAll(ref(storage, `users/${authUser.uid}`));
      return;
    } catch (_) {
      // fall back to legacy bucket if needed
    }
    try {
      await listAll(ref(legacyStorage, `users/${authUser.uid}`));
    } catch (_) {
      // ignore storage sync failures
    }
  }, []);

  const loadProfile = useCallback(
    async (authUser) => {
      let claimedPlan = "";
      try {
        const tokenResult = await authUser.getIdTokenResult();
        if (tokenResult?.claims?.plan) {
          claimedPlan = normalizeAccountPlan(tokenResult.claims.plan);
        }
      } catch (_) {
        // ignore claims errors
      }
      let profilePlan = "";
      try {
        const profileSnapshot = await getDoc(doc(firestore, "users", authUser.uid));
        profilePlan = profileSnapshot.exists()
          ? normalizeAccountPlan(profileSnapshot.data()?.plan)
          : "";
      } catch (_) {
        // The cached plan remains available when Firestore is temporarily unavailable.
      }
      const cachedPlan = await ProtectedStorage.getItem(`${MOBILE_PLAN_KEY}_${authUser.uid}`).catch(() => null);
      const planValue = claimedPlan || profilePlan || normalizeAccountPlan(cachedPlan);
      if (auth.currentUser?.uid !== authUser.uid) return;
      setPlan(planValue);
      await ProtectedStorage.setItem(`${MOBILE_PLAN_KEY}_${authUser.uid}`, planValue).catch(() => {});
      try {
        await setDoc(
          doc(firestore, "users", authUser.uid),
          {
            email: authUser.email || "",
            displayName: authUser.displayName || "",
            updatedAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (_) {
        // ignore profile sync failures
      }
      void syncCloud(authUser);
    },
    [syncCloud]
  );

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!mounted) return;
      setAuthReady(true);
      setLoading(false);
      clearLoadingTimeout();
      if (authUidRef.current !== (authUser?.uid || null)) {
        authUidRef.current = authUser?.uid || null;
        setInvoices([]);
        setInvoicesReady(false);
        setMailAccounts({});
        setPlan("basic");
        setCompanyName("");
        setPhone("");
        setPhoneVerified(false);
        setPhoneInboxNumber("");
        setProfileFirst("");
        setProfileLast("");
        setProfileCompany("");
        cacheStateRef.current = { invoices: [], mailAccounts: {}, companyName: "", phone: "", phoneVerified: false, phoneInboxNumber: "" };
        setInvoiceSearch("");
        setInvoiceFilter("all");
        setPendingChanges(0);
        setDeviceSyncPhase("ready");
        setPhoneCode("");
        setPhoneStatus("");
        setActionInvoice(null);
        setForwardingAddress("");
        setSyncMessage("");
        setSettingsVisible(false);
        setInvoiceVisible(false);
        setProfileVisible(false);
        setSourceHubVisible(false);
        setPrivacyVisible(false);
        setMailConnectVisible(false);
        setReportVisible(false);
        setTrustVisible(false);
      }
      setError("");
      setUser(authUser || null);
      if (authUser) {
        setDisplayName(authUser.displayName || authUser.email || "User");
        void loadProfile(authUser);
      } else {
        setDisplayName("");
        setCompanyName("");
        setPlan("basic");
        setInvoices([]);
        setInvoicesReady(false);
        setProfileFirst("");
        setProfileLast("");
        setProfileCompany("");
        setProfileMessage("");
        setMailAccounts({});
        setMailSyncNotice("");
        setSyncMessage("");
        setThemeMode("dark");
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isOnline, loadProfile, t]);

  useEffect(() => {
    const splashTimer = globalThis.setTimeout(() => {
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => setSplashDone(true));
    }, SPLASH_DURATION_MS);
    return () => globalThis.clearTimeout(splashTimer);
  }, [splashOpacity, splashScale]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(statusPulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [statusPulse]);

  useEffect(() => {
    let mounted = true;
    const update = (state) => { if (mounted) setIsOnline(state.isConnected !== false && state.isInternetReachable !== false); };
    const unsubscribe = NetInfo.addEventListener(update);
    NetInfo.fetch().then(update).catch(() => {});
    return () => { mounted = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user?.uid || vaultLocked) return undefined;
    let active = true;
    let receivedProfile = false;
    void loadOfflineCache(user.uid).then((cache) => {
      if (!active || receivedProfile || auth.currentUser?.uid !== user.uid || !cache?.profile) return;
      setCompanyName(cache.profile.companyName || "");
      setPhone(cache.profile.phone || "");
      setPhoneVerified(!!cache.profile.phoneVerified);
      setPhoneInboxNumber(cache.profile.phoneInboxNumber || "");
    });
    const userRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active || auth.currentUser?.uid !== user.uid) return;
        if (!snapshot.exists()) return;
        receivedProfile = true;
        const data = snapshot.data() || {};
        if (data.displayName) setDisplayName(data.displayName);
        if (data.company || data.companyName) {
          setCompanyName(data.company || data.companyName);
        }
        if (data.plan) {
          const nextPlan = normalizeAccountPlan(data.plan);
          setPlan(nextPlan);
          void ProtectedStorage.setItem(`${MOBILE_PLAN_KEY}_${user.uid}`, nextPlan).catch(() => {});
        }
        if (data.lang) {
          setLang((prev) => (data.lang && data.lang !== prev ? data.lang : prev));
        }
        if (data.themeMode) {
          setThemeMode((prev) =>
            data.themeMode && data.themeMode !== prev ? data.themeMode : prev
          );
        }
        if (data.firstName || data.lastName) {
          setProfileFirst(data.firstName || "");
          setProfileLast(data.lastName || "");
        }
        if (data.company || data.companyName) {
          setProfileCompany(data.company || data.companyName);
        }
        setPhone(normalizePhoneInput(data.phone || data.phoneNumber || ""));
        setPhoneVerified(!!data.phoneVerified);
        setPhoneInboxNumber(normalizePhoneInput(data.phoneInboxNumber || data.phone_inbox_number || ""));
        const cached = cacheStateRef.current;
        void saveOfflineCache(user.uid, {
          profile: {
            companyName: data.company || data.companyName || "",
            phone: normalizePhoneInput(data.phone || data.phoneNumber || ""),
            phoneVerified: !!data.phoneVerified,
            phoneInboxNumber: normalizePhoneInput(data.phoneInboxNumber || data.phone_inbox_number || ""),
          },
          invoices: cached.invoices,
          mailAccounts: cached.mailAccounts,
        });
      },
      () => {
        // ignore listener errors
      }
    );
    return () => { active = false; unsubscribe(); };
  }, [user?.uid, vaultLocked]);

  useEffect(() => {
    if (!user?.uid || vaultLocked) return undefined;
    const ref = collection(firestore, "users", user.uid, "mail_accounts");
    let active = true;
    let receivedSnapshot = false;
    void loadOfflineCache(user.uid).then((cache) => {
      if (active && !receivedSnapshot && auth.currentUser?.uid === user.uid && cache?.mailAccounts) setMailAccounts(cache.mailAccounts);
    });
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!active || auth.currentUser?.uid !== user.uid) return;
        receivedSnapshot = true;
        const next = {};
        snapshot.forEach((docSnap) => {
          next[docSnap.id] = {
            accountId: docSnap.id,
            ...(docSnap.data() || {}),
          };
        });
        setMailAccounts(next);
        const cached = cacheStateRef.current;
        void saveOfflineCache(user.uid, {
          invoices: cached.invoices,
          mailAccounts: next,
          profile: {
            companyName: cached.companyName,
            phone: cached.phone,
            phoneVerified: cached.phoneVerified,
            phoneInboxNumber: cached.phoneInboxNumber,
          },
        });
      },
      () => {
        void loadOfflineCache(user.uid).then((cache) => {
          if (active && auth.currentUser?.uid === user.uid && cache?.mailAccounts) setMailAccounts(cache.mailAccounts);
        });
      }
    );
    return () => { active = false; unsubscribe(); };
  }, [user?.uid, vaultLocked]);

  useEffect(() => {
    if (!user?.uid || vaultLocked) return undefined;
    let active = true;
    let receivedSnapshot = false;
    let snapshotVersion = 0;
    void loadOfflineCache(user.uid).then(async (cache) => {
      if (!active || receivedSnapshot || auth.currentUser?.uid !== user.uid) return;
      const queue = await getOfflineQueue(user.uid);
      if (!active || receivedSnapshot || auth.currentUser?.uid !== user.uid) return;
      if (Array.isArray(cache?.invoices) || queue.length) {
        setInvoices(OfflineQueue.projectInvoices(cache?.invoices || [], queue)
          .map((invoice) => normalizeInvoiceDoc({ id: invoice.id, data: () => invoice })));
        setInvoicesReady(true);
      }
    }).catch(() => { if (active) setDeviceSyncPhase("error"); });
    const invRef = collection(firestore, "users", user.uid, "invoices");
    const invQuery = query(invRef);
    const unsubscribe = onSnapshot(
      invQuery,
      async (snapshot) => {
        if (!active || auth.currentUser?.uid !== user.uid) return;
        receivedSnapshot = true;
        const version = ++snapshotVersion;
        let queue;
        try { queue = await getOfflineQueue(user.uid); }
        catch (_) { if (active) { setDeviceSyncPhase("error"); setInvoicesReady(true); } return; }
        if (!active || version !== snapshotVersion || auth.currentUser?.uid !== user.uid) return;
        const next = OfflineQueue.projectInvoices(snapshot.docs
          .map(normalizeInvoiceDoc)
          .filter(invoiceLooksLikeSubscription)
          .filter(isMeaningfulInvoiceData), queue)
          .map((invoice) => normalizeInvoiceDoc({ id: invoice.id, data: () => invoice }));
        next.sort((a, b) => {
          const aDate = a.issueDate || a.dueDate || null;
          const bDate = b.issueDate || b.dueDate || null;
          const aTime = aDate ? aDate.getTime() : 0;
          const bTime = bDate ? bDate.getTime() : 0;
          return bTime - aTime;
        });
        setInvoices(next);
        setInvoicesReady(true);
        const cached = cacheStateRef.current;
        void saveOfflineCache(user.uid, {
          invoices: next,
          mailAccounts: cached.mailAccounts,
          profile: {
            companyName: cached.companyName,
            phone: cached.phone,
            phoneVerified: cached.phoneVerified,
            phoneInboxNumber: cached.phoneInboxNumber,
          },
        });
      },
      () => {
        void loadOfflineCache(user.uid).then(async (cache) => {
          if (!active || auth.currentUser?.uid !== user.uid) return;
          const queue = await getOfflineQueue(user.uid);
          if (!active || auth.currentUser?.uid !== user.uid) return;
          setInvoices(OfflineQueue.projectInvoices(cache?.invoices || [], queue)
            .map((invoice) => normalizeInvoiceDoc({ id: invoice.id, data: () => invoice })));
          setInvoicesReady(true);
        }).catch(() => { if (active) { setDeviceSyncPhase("error"); setInvoicesReady(true); } });
      }
    );
    return () => { active = false; unsubscribe(); };
  }, [user?.uid, vaultLocked]);

  const syncActiveRef = useRef({ uid: user?.uid, online: isOnline });
  syncActiveRef.current = { uid: user?.uid, online: isOnline };
  const drainOfflineQueue = useCallback(async (uid, manual = false) => {
    const active = () => syncActiveRef.current.uid === uid && syncActiveRef.current.online && !ProtectedStorage.isLocked() && (manual || !syncPausedRef.current);
    try {
      const queue = await getOfflineQueue(uid);
      if (active()) setDeviceSyncPhase(queue.length ? "syncing" : "ready");
      let remaining;
      do { remaining = await offlineQueueEngine.flush(uid, active); } while (remaining && active());
      if (syncActiveRef.current.uid === uid) setDeviceSyncPhase("ready");
      return remaining;
    } catch (err) {
      if (syncActiveRef.current.uid === uid) setDeviceSyncPhase(String(err.code || "").endsWith("aborted") ? "conflict" : "error");
      throw err;
    }
  }, []);
  useEffect(() => {
    if (!user?.uid) return undefined;
    let active = true;
    const unsubscribe = offlineQueueEngine.subscribe((uid, count) => {
      if (active && uid === user.uid && auth.currentUser?.uid === uid) setPendingChanges(count);
    });
    void getOfflineQueue(user.uid).then((queue) => { if (active) setPendingChanges(queue.length); })
      .catch(() => { if (active) setDeviceSyncPhase("error"); });
    return () => { active = false; unsubscribe(); };
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid || !isOnline || vaultLocked) return;
    const uid = user.uid;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled && syncActiveRef.current.uid === uid && syncActiveRef.current.online) return drainOfflineQueue(uid);
    })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [drainOfflineQueue, isOnline, user?.uid, vaultLocked]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const current = syncActiveRef.current;
      if (state === 'background') ProtectedStorage.lock();
      else if (state === 'active' && current.uid && current.online && !ProtectedStorage.isLocked()) void drainOfflineQueue(current.uid).catch(() => {});
    });
    return () => subscription.remove();
  }, [drainOfflineQueue]);

  const showSplash = !authReady || !splashDone;
  const showLogin = !user;

  function clearLoadingTimeout() {
    if (loadingTimeoutRef.current) {
      globalThis.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }

  function resetInvoiceForm() {
    setInvoiceCompany("");
    setInvoiceCategory("");
    setInvoiceNumber("");
    setInvoiceIssueDate("");
    setInvoiceDueDate("");
    setInvoiceAmount("");
    setInvoiceCurrency("RON");
    setInvoiceStatus("unpaid");
    setInvoiceMessage("");
    setInvoiceError("");
  }

  function openInvoiceModal() {
    resetInvoiceForm();
    setInvoiceVisible(true);
  }

  function closeInvoiceModal() {
    setInvoiceVisible(false);
  }

  function openSettings() {
    setSettingsVisible(true);
  }
  function openTrustControl(mode, invoice) {
    setTrustMode(mode); setTrustInvoiceId(invoice?.id || ''); setTrustGeneration(previous => previous + 1);
    setSettingsVisible(false); setActionInvoice(null); setTrustVisible(true);
  }

  function closeSettings() {
    setSettingsVisible(false);
  }

  function openProfile() {
    setProfileMessage("");
    setProfileVisible(true);
  }

  function closeProfile() {
    setProfileVisible(false);
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (_) {
      // ignore sign out failures
    }
    setSettingsVisible(false);
    setProfileVisible(false);
  }

  function parseDateInput(value) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  async function handleSaveInvoice() {
    if (!user || savingInvoice) return;
    setInvoiceError("");
    setInvoiceMessage("");
    if (!invoiceCompany.trim()) {
      setInvoiceError(t("invoice_save_error"));
      return;
    }
    const amountValue = RecordVersion.parseAmount(invoiceAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setInvoiceError(t("invoice_save_error"));
      return;
    }
    const issueDate = parseDateInput(invoiceIssueDate);
    const dueDate = parseDateInput(invoiceDueDate);
    const invoicePayload = {
      company: invoiceCompany.trim(),
      category: invoiceCategory.trim() || null,
      number: invoiceNumber.trim() || null,
      issueDate: issueDate || null,
      dueDate: dueDate || null,
      amount: amountValue,
      currency: invoiceCurrency.trim() || "RON",
      status: invoiceStatus,
      recurring: true,
      invoiceType: "subscription",
      source: "manual",
      spaceId: planWorkspaceSpace,
    };
    if (!isOnline) {
      try {
        setSavingInvoice(true);
        const localId = `local_${OfflineQueue.newId()}`;
        const localInvoice = {
          id: localId,
          ...invoicePayload,
          createdAt: new Date(),
        };
        const nextInvoices = [localInvoice, ...invoices];
        await offlineQueueEngine.edit(user.uid, (queue) => [
          ...queue,
          { type: "addInvoice", localId, data: serializeForCache(invoicePayload) },
        ]);
        if (auth.currentUser?.uid !== user.uid) return;
        setInvoices(nextInvoices);
        await saveOfflineCache(user.uid, {
          invoices: nextInvoices,
          mailAccounts,
          profile: { companyName, phone, phoneVerified, phoneInboxNumber },
        });
        setInvoiceMessage(t("offline_saved"));
        closeInvoiceModal();
      } catch (_) { setInvoiceError(t("sync_storage_error")); }
      finally { setSavingInvoice(false); }
      return;
    }
    try {
      setSavingInvoice(true);
      await addDoc(collection(firestore, "users", user.uid, "invoices"), {
        ...invoicePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setInvoiceMessage(t("invoice_save_success"));
      closeInvoiceModal();
    } catch (_) {
      setInvoiceError(t("invoice_save_error"));
    } finally {
      setSavingInvoice(false);
    }
  }

  async function deleteInvoiceById(invoiceId) {
    if (!user?.uid || !invoiceId) return false;
    try {
      const queued = await getOfflineQueue(user.uid);
      if (auth.currentUser?.uid !== user.uid) return false;
      if (!isOnline || queued.some(item => (item.id || item.localId) === invoiceId)) {
        const nextInvoices = invoices.filter((invoice) => invoice.id !== invoiceId);
        await offlineQueueEngine.edit(user.uid, (queue) => {
          const pending = queue.some((item) => !item.dispatched && item.type === "addInvoice" && item.localId === invoiceId);
          const remaining = queue.filter((item) => !(!item.dispatched && item.type === "addInvoice" && item.localId === invoiceId));
        if (!pending) remaining.push({ type: "deleteInvoice", id: invoiceId, baseSnapshot: RecordVersion.snapshot(invoices.find(invoice => invoice.id === invoiceId) || {}) });
          return remaining;
        });
        if (auth.currentUser?.uid !== user.uid) return false;
        setInvoices(nextInvoices);
        if (isOnline) void drainOfflineQueue(user.uid).catch(() => {});
        await saveOfflineCache(user.uid, {
          invoices: nextInvoices,
          mailAccounts,
          profile: { companyName, phone, phoneVerified, phoneInboxNumber },
        });
        setSyncMessage(t("offline_saved"));
        return true;
      }
      try {
        await deleteDoc(doc(firestore, "users", user.uid, "invoices", invoiceId));
        return true;
      } catch (_) {
        return false;
      }
    } catch (_) { setSyncMessage(t("sync_storage_error")); return false; }
  }

  function handleDeleteInvoice(invoice) {
    if (!invoice?.id) return;
    Alert.alert(t("table_actions_delete"), t("invoice_delete_confirm"), [
      { text: t("invoice_cancel"), style: "cancel" },
      {
        text: t("table_actions_delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            const ok = await deleteInvoiceById(invoice.id);
            if (!ok) setSyncMessage(t("invoice_delete_error"));
          })();
        },
      },
    ]);
  }

  async function patchInvoiceFromAction(invoice, patch) {
    if (!user?.uid || !invoice?.id) return false;
    try {
      const queued = await getOfflineQueue(user.uid);
      if (auth.currentUser?.uid !== user.uid) return false;
      if (!isOnline || queued.some(item => (item.id || item.localId) === invoice.id)) {
        const next = invoices.map((item) => item.id === invoice.id ? { ...item, ...patch } : item);
        await offlineQueueEngine.edit(user.uid, (queue) => {
          const pending = queue.find((item) => !item.dispatched && item.type === "addInvoice" && item.localId === invoice.id);
          if (pending) pending.data = { ...pending.data, ...serializeForCache(patch) };
        else queue.push({ type: "updateInvoice", id: invoice.id, data: serializeForCache(patch), baseUpdatedAt: serializeForCache(invoice.updatedAt), baseSnapshot: RecordVersion.snapshot(invoice) });
          return queue;
        });
        if (auth.currentUser?.uid !== user.uid) return false;
        setInvoices(next);
        await saveOfflineCache(user.uid, { invoices: next, mailAccounts, profile: { companyName, phone, phoneVerified, phoneInboxNumber } });
        if (isOnline) void drainOfflineQueue(user.uid).catch(() => {});
        return true;
      }
      await updateDoc(doc(firestore, "users", user.uid, "invoices", invoice.id), { ...patch, updatedAt: serverTimestamp() });
      return true;
    } catch (_) { setSyncMessage(t("invoice_save_error")); return false; }
  }

  async function handleActionPaid() {
    if (!actionInvoice) return;
    const saved = await patchInvoiceFromAction(actionInvoice, {
      status: "paid",
      paymentSource: "manual_confirmation",
      paidAt: new Date().toISOString(),
    });
    if (!saved) return;
    setSyncMessage(t("action_paid_success"));
    setActionInvoice(null);
  }

  function handleOfficialAction(kind) {
    if (!actionInvoice) return;
    const actions = Intelligence.officialActions(actionInvoice);
    const url = kind === "cancel" ? actions.cancellationUrl : actions.paymentUrl;
    if (!url) {
      setSyncMessage(t("action_unavailable"));
      return;
    }
    openExternal(url);
  }

  async function openSourceHub() {
    setSourceHubVisible(true);
    if (forwardingAddress || !isOnline || !user?.uid) return;
    try {
      const result = await httpsCallable(functions, "getMailSyncInfo")({});
      setForwardingAddress(String(result?.data?.address || ""));
    } catch (_) {
      setForwardingAddress("");
    }
  }

  function openSourceHubFromSettings() {
    closeSettings();
    void openSourceHub();
  }

  function openPrivacyFromSettings() {
    closeSettings();
    setPrivacyVisible(true);
  }

  async function shareForwardingAddress() {
    if (!forwardingAddress) return;
    await Share.share({ message: forwardingAddress }).catch(() => {});
    setSyncMessage(t("forwarding_ready"));
  }

  async function handleSyncNow() {
    if (!user) return;
    if (!mailConnected && !phoneConnected) {
      setMailSyncNotice(t("mail_sync_panel_empty"));
      return;
    }
    setSyncMessage("");
    setMailSyncNotice("");
    try {
      setSyncing(true);
      if (mailConnected) await requestMailSyncNow();
      if (phoneConnected) await httpsCallable(functions, "syncPhoneInboxNow")({ force: true });
    } catch (err) {
      const rawCode = String(err?.code || "");
      const code = rawCode.includes("/") ? rawCode.split("/").pop() : rawCode;
      if (code === "unauthenticated" || code === "401") {
        setSyncMessage(t("mail_sync_error_auth"));
      } else {
        setSyncMessage(t("mail_sync_panel_error"));
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleSavePhone() {
    if (!user?.uid) return;
    const normalized = normalizePhoneInput(phone);
    if (!isValidPhone(normalized)) {
      setPhoneStatus(t("phone_empty"));
      return;
    }
    if (!isOnline) {
      setPhoneStatus(t("offline_notice"));
      return;
    }
    try {
      setPhoneBusy(true);
      await setDoc(
        doc(firestore, "users", user.uid),
        {
          phone: normalized,
          phoneVerified: false,
          phoneUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setPhone(normalized);
      setPhoneVerified(false);
      setPhoneStatus(t("phone_pending"));
    } catch (_) {
      setPhoneStatus(t("phone_sms_error"));
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleRequestPhoneCode() {
    const normalized = normalizePhoneInput(phone);
    if (!isValidPhone(normalized)) {
      setPhoneStatus(t("phone_empty"));
      return;
    }
    if (!isOnline) {
      setPhoneStatus(t("offline_notice"));
      return;
    }
    try {
      setPhoneBusy(true);
      await httpsCallable(functions, "requestPhoneVerificationCode")({
        phone: normalized,
      });
      setPhone(normalized);
      setPhoneVerified(false);
      setPhoneStatus(t("phone_sms_sent"));
    } catch (_) {
      setPhoneStatus(t("phone_sms_error"));
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleVerifyPhoneCode() {
    const normalized = normalizePhoneInput(phone);
    const code = String(phoneCode || "").replace(/\D/g, "").slice(0, 6);
    if (!isValidPhone(normalized) || code.length !== 6) {
      setPhoneStatus(t("phone_pending"));
      return;
    }
    if (!isOnline) {
      setPhoneStatus(t("offline_notice"));
      return;
    }
    try {
      setPhoneBusy(true);
      const result = await httpsCallable(functions, "verifyPhoneVerificationCode")({
        phone: normalized,
        code,
      });
      const data = result?.data || {};
      setPhone(normalizePhoneInput(data.phone || normalized));
      setPhoneVerified(true);
      if (data.inboxNumber) setPhoneInboxNumber(normalizePhoneInput(data.inboxNumber));
      setPhoneCode("");
      setPhoneStatus(t("phone_verified"));
    } catch (_) {
      setPhoneStatus(t("phone_sms_error"));
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleSyncPhoneInbox() {
    if (!user?.uid || !phoneConnected) return;
    if (!isOnline) {
      setPhoneStatus(t("offline_notice"));
      return;
    }
    try {
      setPhoneSyncing(true);
      await httpsCallable(functions, "syncPhoneInboxNow")({ force: true });
      setPhoneStatus(t("invoices_sync_requested"));
    } catch (_) {
      setPhoneStatus(t("invoices_sync_failed"));
    } finally {
      setPhoneSyncing(false);
    }
  }

  async function handleExportReport(format) {
    if (reportBusy) return;
    setReportBusy(true);
    try {
    const fields = reportFields.length ? reportFields : REPORT_FIELDS;
    const rows = buildReportRows(workspaceInvoices, fields, locale, t);
    if (!rows.length) {
      setSyncMessage(t("reports_empty"));
      return;
    }
    const fileBase = `${FileSystem.cacheDirectory}dueflux-report-${Date.now()}`;
    let uri = `${fileBase}.${format}`;
    let content = "";
    if ((format === "pdf" || format === "html") && isOnline && rows.length <= 1000) {
      try {
        const response = await httpsCallable(functions, "createReport")({ report: {
          title: t("reports_title"), language: lang, format,
          columns: fields.map((field) => ({ key: field, label: reportFieldLabel(field, t) })),
          rows: rows.map((row) => fields.map((field) => String(row[reportFieldLabel(field, t)] ?? ""))),
        } });
        await FileSystem.writeAsStringAsync(uri, response.data.base64, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: response.data.mimeType });
        setSyncMessage(t("reports_exported"));
        return;
      } catch (error) {
        if (!["functions/failed-precondition", "functions/not-found", "functions/unavailable"].includes(error.code)) throw error;
      }
    }
    const reportHeaders = fields.map((field) => `<th>${escapeReportText(reportFieldLabel(field, t))}</th>`).join("");
    const reportBody = rows
      .map((row) => `<tr>${fields.map((field) => `<td>${escapeReportText(row[reportFieldLabel(field, t)])}</td>`).join("")}</tr>`)
      .join("");
    const reportHtml = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:24px;color:#10264a}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #dbe5f3;text-align:left}th{background:#eff6ff}</style></head><body><h1>DueFlux Report</h1><table><thead><tr>${reportHeaders}</tr></thead><tbody>${reportBody}</tbody></table></body></html>`;
    if (format === "pdf") {
      const result = await Print.printToFileAsync({ html: reportHtml });
      if (result?.uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: "application/pdf" });
      setSyncMessage(t("reports_exported"));
      return;
    }
    if (format === "json") {
      content = JSON.stringify(rows, null, 2);
    } else if (format === "html") {
      content = reportHtml;
    } else if (format === "txt") {
      content = rows.map((row) => Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(" | ")).join("\n");
    } else {
      uri = `${fileBase}.csv`;
      const headers = fields.map((field) => reportFieldLabel(field, t));
      const csvEscape = (value) => {
        const raw = String(value ?? "");
        const safe = /^[\s\uFEFF]*[=+@-]/.test(raw) ? "'" + raw : raw;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      content = [
        headers.map(csvEscape).join(","),
        ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
      ].join("\n");
    }
    await FileSystem.writeAsStringAsync(uri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
    setSyncMessage(t("reports_exported"));
    } catch (_) {
      setSyncMessage(t("reports_failed"));
    } finally { setReportBusy(false); }
  }

  const isValidEmailValue = (value) =>
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || "").trim());

  const guessProvider = (value) => {
    const email = String(value || "").trim().toLowerCase();
    const domain = email.includes("@") ? email.split("@").pop() : "";
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
  };

  async function detectProvider(email) {
    const result = await httpsCallable(functions, "detectMailProvider")({
      email,
    });
    return result?.data?.provider || "unknown";
  }

  async function requestMailOAuthLink(provider, loginHint) {
    if (!auth.currentUser) {
      const err = new Error("Sign in required.");
      err.code = "unauthenticated";
      throw err;
    }
    const token = await auth.currentUser.getIdToken(true);
    const endpoint =
      `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/createMailOAuthLinkHttp`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        provider,
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
      const code = body?.error?.status
        ? String(body.error.status)
        : String(response.status || "");
      const message = body?.error?.message
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
      `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/disconnectMailProviderHttp`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        accountId,
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
      const code = body?.error?.status
        ? String(body.error.status)
        : String(response.status || "");
      const message = body?.error?.message
        ? String(body.error.message)
        : "Request failed";
      const err = new Error(message);
      err.code = code;
      throw err;
    }
    return body || {};
  }

  async function requestMailSyncNow(accountId) {
    if (!auth.currentUser) {
      const err = new Error("Sign in required.");
      err.code = "unauthenticated";
      throw err;
    }
    const token = await auth.currentUser.getIdToken(true);
    const endpoint =
      `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/syncMailNowHttp`;
    const payload = { idToken: token };
    if (accountId) payload.accountId = accountId;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
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
      const code = body?.error?.status
        ? String(body.error.status)
        : String(response.status || "");
      const message = body?.error?.message
        ? String(body.error.message)
        : "Request failed";
      const err = new Error(message);
      err.code = code;
      throw err;
    }
    return body || {};
  }

  function handleMailConnectEmailChange(value) {
    setMailConnectEmail(value);
    setMailConnectProvider(guessProvider(value));
    if (mailConnectError) setMailConnectError("");
  }

  function openMailConnectModal() {
    const defaultEmail = user?.email || "";
    setMailConnectEmail(defaultEmail);
    setMailConnectProvider(guessProvider(defaultEmail));
    setMailConnectError("");
    setMailConnectVisible(true);
  }

  async function handleConnectEmail() {
    if (!user || mailConnectBusy) return;
    const email = String(mailConnectEmail || "").trim().toLowerCase();
    if (!isValidEmailValue(email)) {
      setMailConnectError(t("mail_sync_connect_error_invalid"));
      return;
    }

    setMailConnectError("");
    setMailConnectBusy(true);
    let provider = normalizeProviderName(guessProvider(email));
    if (provider === "unknown") {
      try {
        provider = normalizeProviderName(await detectProvider(email));
      } catch (_) {
        provider = "unknown";
      }
    }

    setMailConnectProvider(provider || "unknown");
    if (!isMailProviderAllowed(provider)) {
      setMailConnectError(t("mail_sync_connect_error_outlook_plan"));
      setMailConnectBusy(false);
      return;
    }
    if (!provider || provider === "unknown") {
      setMailConnectBusy(false);
      setMailConnectVisible(false);
      await openSourceHub();
      return;
    }

    setSyncMessage("");
    setMailSyncNotice("");
    try {
      const result = await requestMailOAuthLink(provider, email);
      const url = result?.url;
      if (url) {
        setMailSyncNotice(t("mail_sync_notice_browser"));
        setMailConnectVisible(false);
        openExternal(url);
      } else {
        setSyncMessage(t("mail_sync_error_config"));
      }
    } catch (err) {
      const rawCode = String(err?.code || "");
      const code = rawCode.includes("/") ? rawCode.split("/").pop() : rawCode;
      if (code === "permission-denied") {
        setMailSyncNotice(t("mail_sync_status_locked"));
      } else if (code === "invalid-argument") {
        setMailConnectError(t("mail_sync_connect_error_unsupported"));
      } else if (code === "failed-precondition") {
        setSyncMessage(t("mail_sync_error_config"));
      } else if (code === "unauthenticated") {
        setSyncMessage(t("mail_sync_error_auth"));
        setMailConnectError(t("mail_sync_error_auth"));
      } else if (
        code === "network-request-failed" ||
        code === "unavailable" ||
        code === "deadline-exceeded"
      ) {
        setSyncMessage(t("offline_required"));
        setMailConnectError(t("offline_required"));
      } else {
        setSyncMessage(t("mail_sync_panel_error"));
      }
    } finally {
      setMailConnectBusy(false);
    }
  }

  async function handleDisconnectProvider(accountId) {
    if (!user) return;
    if (!accountId) return;
    setSyncMessage("");
    setMailSyncNotice("");
    try {
      await requestMailDisconnect(accountId);
    } catch (_) {
      setSyncMessage(t("mail_sync_panel_error"));
    }
  }

  async function handleSaveProfile() {
    if (!user) return;
    const firstName = profileFirst.trim();
    const lastName = profileLast.trim();
    const nextDisplayName = [firstName, lastName].filter(Boolean).join(" ");
    const profilePatch = {
      firstName,
      lastName,
      displayName: nextDisplayName || displayName,
      updatedAt: serverTimestamp(),
    };
    if (planIsBusiness) profilePatch.company = profileCompany.trim();
    setProfileMessage(t("profile_saving"));
    try {
      await setDoc(
        doc(firestore, "users", user.uid),
        profilePatch,
        { merge: true }
      );
      if (auth.currentUser && nextDisplayName) {
        try {
          await updateProfile(auth.currentUser, { displayName: nextDisplayName });
        } catch (_) {
          // ignore auth profile update failure
        }
      }
      setProfileMessage(t("profile_save_success"));
    } catch (_) {
      setProfileMessage(t("profile_save_error"));
    }
  }

  async function handleSignIn() {
    setError("");
    if (!email.trim() || !password) {
      setError(t("login_error_missing"));
      return;
    }
    try {
      setLoading(true);
      clearLoadingTimeout();
      loadingTimeoutRef.current = globalThis.setTimeout(() => {
        setLoading(false);
      }, 12000);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (_err) {
      setError(t("login_error_generic"));
      setLoading(false);
      clearLoadingTimeout();
    }
  }

  function openExternal(url) {
    Linking.openURL(url).catch(() => Alert.alert("DueFlux", t("link_open_error")));
  }

  function openSignup() {
    openExternal(SIGNUP_URL);
  }

  function openLanguagePicker() {
    setLanguageVisible(true);
  }

  function closeLanguagePicker() {
    setLanguageVisible(false);
  }

  async function handleLanguageSelect(nextLang) {
    setLang(nextLang);
    setLanguageVisible(false);
    await AsyncStorage.setItem(MOBILE_LANGUAGE_KEY, nextLang).catch(() => {});
    if (!user?.uid) return;
    try {
      await setDoc(
        doc(firestore, "users", user.uid),
        { lang: nextLang, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (_) {
      // ignore language save failures
    }
  }

  async function toggleSensitivePreviews() {
    const next = !sensitivePreviewsHidden;
    setSensitivePreviewsHidden(next);
    await AsyncStorage.setItem(MOBILE_PRIVACY_KEY, next ? "true" : "false").catch(() => {});
  }

  async function handleThemeSelect(nextMode) {
    setThemeMode(nextMode);
    if (!user?.uid) return;
    try {
      await setDoc(
        doc(firestore, "users", user.uid),
        { themeMode: nextMode, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (_) {
      // ignore theme save failures
    }
  }

  function statusStyles(status) {
    if (status === "paid") return [styles.statusBadge, styles.statusPaid];
    if (status === "overdue") return [styles.statusBadge, styles.statusOverdue];
    return [styles.statusBadge, styles.statusUnpaid];
  }

  function statusTextStyles(status) {
    if (status === "paid") return [styles.statusText, styles.statusTextPaid];
    if (status === "overdue")
      return [styles.statusText, styles.statusTextOverdue];
    return [styles.statusText, styles.statusTextUnpaid];
  }

  function invoiceStatusLabel(status) {
    if (status === "paid") return t("invoice_status_paid");
    if (status === "overdue") return t("invoice_status_overdue");
    return t("invoice_status_unpaid");
  }

  if (vaultLocked) {
    return (
      <SafeAreaView onTouchStart={() => { localActivityRef.current = Date.now(); }} style={[styles.safe, { direction: lang === 'ar' ? 'rtl' : 'ltr' }]}>
        <View style={[styles.card, { margin: 24, gap: 16 }]}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{t('vault_title')}</Text>
          {vaultError ? <Text accessibilityLiveRegion="polite" style={styles.mutedText}>{t('vault_error')}</Text> : null}
          <TouchableOpacity accessibilityRole="button" style={styles.ghostButton} disabled={vaultOpening}
            onPress={async () => {
              setVaultOpening(true); setVaultError(false);
              try { await ProtectedStorage.open(t('vault_unlock')); }
              catch (_) { setVaultError(true); }
              finally { setVaultOpening(false); }
            }}>
            <Text style={styles.ghostButtonText}>{t('vault_unlock')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showSplash) {
    return (
      <LinearGradient colors={theme.background} style={styles.app}>
        <StatusBar style={theme.statusBar} />
        <SafeAreaView onTouchStart={() => { localActivityRef.current = Date.now(); }} style={[styles.safe, { direction: lang === "ar" ? "rtl" : "ltr" }]}>
          <View style={styles.splashContainer}>
            <Animated.View style={{ opacity: splashOpacity, transform: [{ scale: splashScale }] }}>
              <View style={styles.splashPanel}>
                <View style={[styles.logoWrapBase, styles.logoWrapBig]}>
                  <Image source={LOGO} style={styles.logoMarkBig} />
                </View>
                <Text style={styles.splashTitle}>{t("app_title")}</Text>
                <Text style={styles.splashSubtitle}>{t("app_subtitle")}</Text>
                <View style={styles.splashLoaderRow}>
                  <View style={styles.splashLoaderBar} />
                </View>
                <Text style={styles.splashStatus}>{t("sync_panel_pending")}</Text>
              </View>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (showLogin) {
    return (
      <LinearGradient colors={theme.background} style={styles.app}>
        <StatusBar style={theme.statusBar} />
        <SafeAreaView onTouchStart={() => { localActivityRef.current = Date.now(); }} style={[styles.safe, { direction: lang === "ar" ? "rtl" : "ltr" }]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <ScrollView
                contentContainerStyle={styles.loginScroll}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.loginCard}>
                  <LinearGradient
                    colors={theme.cardGradient}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loginCardGradient}
                  />
                  <View style={styles.loginGlowTop} pointerEvents="none" />
                  <View style={styles.loginGlowRight} pointerEvents="none" />
                  <View style={styles.loginContent}>
                    <View style={styles.loginHeader}>
                      <View style={[styles.logoWrapBase, styles.logoWrapSmall]}>
                        <Image source={LOGO} style={styles.logoMarkSmall} />
                      </View>
                      <View>
                        <Text style={styles.loginTitle}>{t("login_title")}</Text>
                        <Text style={styles.loginSubtitle}>
                          {t("login_subtitle")}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.loginToolbar}>
                      <View style={styles.loginHint}>
                        <Text style={styles.loginHintText}>
                          {t("login_hint")}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.languageButton}
                        onPress={openLanguagePicker}
                      >
                        <Text style={styles.languageButtonText}>
                          {languageLabel}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.fieldLabel}>{t("login_email")}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="you@mail.com"
                      placeholderTextColor={theme.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      value={email}
                      onChangeText={setEmail}
                    />

                    <Text style={styles.fieldLabel}>{t("login_password")}</Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="*******"
                        placeholderTextColor={theme.placeholder}
                        secureTextEntry={!passwordVisible}
                        textContentType="password"
                        value={password}
                        onChangeText={setPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleSignIn}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => setPasswordVisible((prev) => !prev)}
                      >
                        <Text style={styles.passwordToggleText}>
                          {passwordVisible
                            ? t("login_hide_password")
                            : t("login_show_password")}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {error ? <Text style={styles.loginMessage}>{error}</Text> : null}

                    <TouchableOpacity
                      style={styles.loginButtonWrap}
                      onPress={handleSignIn}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={theme.accentGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.loginButton}
                      >
                        {loading ? (
                          <ActivityIndicator color={theme.textInverse} />
                        ) : (
                          <Text style={styles.loginButtonText}>
                            {t("login_button")}
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.loginSignup}>
                      <Text style={styles.loginSignupText}>
                        {t("login_signup_cta")}
                      </Text>
                      <TouchableOpacity onPress={openSignup}>
                        <Text style={styles.loginSignupLink}>
                          {t("login_signup_link")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
          <Modal
            transparent
            visible={languageVisible}
            animationType="fade"
            onRequestClose={closeLanguagePicker}
          >
            <Pressable style={styles.modalBackdrop} onPress={closeLanguagePicker}>
              <TouchableWithoutFeedback>
                <View style={styles.languagePanel}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t("settings_language")}</Text>
                    <TouchableOpacity
                      style={styles.modalClose}
                      onPress={closeLanguagePicker}
                    >
                      <Text style={styles.modalCloseText}>X</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    style={styles.languageScroll}
                    contentContainerStyle={styles.languageScrollContent}
                  >
                    {LANG_OPTIONS.map((option) => {
                      const active = option.code === lang;
                      return (
                        <TouchableOpacity
                          key={option.code}
                          style={[
                            styles.languageOption,
                            active ? styles.languageOptionActive : null,
                          ]}
                          onPress={() => handleLanguageSelect(option.code)}
                        >
                          <Text
                            style={[
                              styles.languageOptionText,
                              active ? styles.languageOptionTextActive : null,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </Pressable>
          </Modal>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.background} style={styles.app}>
      <StatusBar style={theme.statusBar} />
      <SafeAreaView onTouchStart={() => { localActivityRef.current = Date.now(); }} style={[styles.safe, { direction: lang === "ar" ? "rtl" : "ltr" }]}>
        <ScrollView contentContainerStyle={styles.appScroll}>
          <View style={[styles.appHeader, compactHeader && styles.appHeaderCompact]}>
            <LinearGradient
              colors={theme.cardGradient}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.appHeaderGradient}
              pointerEvents="none"
            />
            <View style={styles.appHeaderGlow} pointerEvents="none" />
            <View
              style={[
                styles.appHeaderTop,
                compactHeader && styles.appHeaderTopCompact,
              ]}
            >
              <View style={styles.appHeaderLeft}>
                <View
                  style={[
                    styles.logoWrapBase,
                    styles.logoWrapTiny,
                    compactHeader && styles.logoWrapTinyCompact,
                  ]}
                >
                  <Image
                    source={LOGO}
                    style={[styles.logoMarkTiny, compactHeader && styles.logoMarkTinyCompact]}
                  />
                </View>
                <View style={[styles.appBrand, compactHeader && styles.appBrandCompact]}>
                  <View style={styles.appTitleRow}>
                    <Text style={[styles.appTitle, compactHeader && styles.appTitleCompact]}>
                      {t("app_title")}
                    </Text>
                    <View style={styles.statusDotWrap}>
                      <Animated.View
                        style={[
                          styles.statusPulse,
                          { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                        ]}
                      />
                      <View style={styles.statusDot} />
                    </View>
                  </View>
                  <Text
                    style={[styles.appSubtitle, compactHeader && styles.appSubtitleCompact]}
                  >
                    {t("app_subtitle")}
                  </Text>
                </View>
              </View>
            </View>
            <View
              style={[
                styles.appHeaderActions,
                compactHeader && styles.appHeaderActionsCompact,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  styles.iconButtonFirst,
                  compactHeader && styles.iconButtonCompact,
                ]}
                onPress={handleSignOut}
              >
                <View style={styles.iconButtonContent}>
                  <Text
                    style={[
                      styles.iconButtonIcon,
                      compactHeader && styles.iconButtonIconCompact,
                    ]}
                  >
                    ⟲
                  </Text>
                  <Text
                    style={[
                      styles.iconButtonText,
                      compactHeader && styles.iconButtonTextCompact,
                    ]}
                  >
                    {t("switch_short")}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, compactHeader && styles.iconButtonCompact]}
                onPress={openSettings}
              >
                <View style={styles.iconButtonContent}>
                  <Text
                    style={[
                      styles.iconButtonIcon,
                      compactHeader && styles.iconButtonIconCompact,
                    ]}
                  >
                    ⚙
                  </Text>
                  <Text
                    style={[
                      styles.iconButtonText,
                      compactHeader && styles.iconButtonTextCompact,
                    ]}
                  >
                    {t("settings_title")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.appHeaderBottom}>
              <TouchableOpacity
                style={[styles.userPill, compactHeader && styles.userPillCompact]}
                onPress={openProfile}
              >
                <Text style={styles.userName}>{accountLabel}</Text>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{planLabel(plan)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {!isOnline ? (
            <View style={styles.card}>
              <View style={styles.totpRow}>
                <View style={styles.pillOff}>
                  <Text style={styles.pillText}>{t("offline_badge")}</Text>
                </View>
                <Text style={[styles.mutedText, styles.smallText]}>
                  {t("offline_notice")}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.invoiceHeader}>
              <View>
                <Text style={styles.cardTitle}>{t("pulse_title")}</Text>
                <Text style={[styles.mutedText, styles.smallText]}>{t("privacy_desc")}</Text>
              </View>
              <View style={styles.modalFooterRow}>
                <TouchableOpacity style={styles.ghostButton} onPress={openSourceHub}>
                  <Text style={styles.ghostButtonText}>{t("inbox_mesh")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostButton} onPress={() => setPrivacyVisible(true)}>
                  <Text style={styles.ghostButtonText}>{t("privacy_vault")}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.chipRow}>
              <View style={[styles.chip, styles.chipActive]}>
                <Text style={[styles.chipText, styles.chipTextActive]}>
                  {t(`space_${planWorkspaceSpace}`)}
                </Text>
              </View>
              <Text style={[styles.mutedText, styles.smallText, { flex: 1 }]}>
                {t(planIsBusiness ? "profile_plan_business_desc" : "profile_plan_basic_desc")}
              </Text>
            </View>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>{t("pulse_attention")}</Text>
                <Text style={styles.kpiValue}>{intelligencePulse.attention.length}</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>{t("pulse_due")}</Text>
                <Text style={styles.kpiValue}>{intelligencePulse.upcoming.length}</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>{t("pulse_guard")}</Text>
                <Text style={styles.kpiValue}>{intelligencePulse.guarded}</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>{t("pulse_verified")}</Text>
                <Text style={styles.kpiValue}>{intelligencePulse.verified}</Text>
              </View>
            </View>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t("twin_title")}</Text>
            {intelligencePulse.renewals.slice(0, 3).map((invoice) => (
              <TouchableOpacity key={`renewal-${invoice.id}`} style={styles.mailProviderRow} onPress={() => setActionInvoice(invoice)}>
                <View style={styles.mailProviderLeft}>
                  <View style={[styles.mailProviderBadge, styles.mailProviderBadgeGeneric]}>
                    <Text style={styles.mailProviderBadgeText}>↻</Text>
                  </View>
                  <View>
                    <Text style={styles.mailProviderName}>{invoice.company || t("invoice_unknown_company")}</Text>
                    <Text style={styles.mailProviderStatus}>
                      {invoice.intelligence.recurrence.nextExpectedAt?.toLocaleDateString(locale)} · {t("cadence_" + invoice.intelligence.recurrence.cadence)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ghostButtonText}>›</Text>
              </TouchableOpacity>
            ))}
            {!intelligencePulse.renewals.length ? (
              <Text style={[styles.mutedText, styles.smallText]}>{t("timeline_empty")}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("overview_title")}</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>{t("overview_total")}</Text>
                <Text style={styles.kpiValue}>
                  {Object.entries(kpis.totals).map(([currency, amount]) => formatAmount(amount, currency)).join(" · ")}
                </Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>{t("overview_unpaid")}</Text>
                <Text style={styles.kpiValue}>{kpis.unpaid}</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>{t("overview_overdue")}</Text>
                <Text style={styles.kpiValue}>{kpis.overdue}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("security_title")}</Text>
            <Text style={[styles.mutedText, styles.smallText]}>
              {t("security_subtitle")}
            </Text>
            <View style={styles.totpRow}>
              <View style={emailVerified ? styles.pillOn : styles.pillOff}>
                <Text style={styles.pillText}>
                  {emailVerified ? t("totp_on_label") : t("totp_off_label")}
                </Text>
              </View>
              <Text style={[styles.mutedText, styles.smallText]}>
                {t("security_status")}
              </Text>
            </View>
            {!emailVerified ? (
              <View style={styles.totpActions}>
                <TouchableOpacity
                  style={styles.ghostButton}
                  onPress={() => openExternal(ACCOUNT_URL)}
                >
                  <Text style={styles.ghostButtonText}>
                    {t("profile_open_website")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.invoiceHeader}>
              <Text style={styles.cardTitle}>{t("invoices_title")}</Text>
              <View style={styles.invoiceActions}>
                <TouchableOpacity
                  style={styles.ghostButton}
                  onPress={() => setReportVisible(true)}
                >
                  <Text style={styles.ghostButtonText}>{t("reports_button")}</Text>
                </TouchableOpacity>
                {mailConnected || phoneConnected ? (
                  <TouchableOpacity
                    style={[
                      styles.ghostButton,
                      !mailSyncCanSync || syncing || phoneSyncing ? styles.buttonDisabled : null,
                    ]}
                    onPress={handleSyncNow}
                    disabled={!mailSyncCanSync || syncing || phoneSyncing}
                  >
                    {syncing || phoneSyncing ? (
                      <ActivityIndicator color={theme.text} size="small" />
                    ) : (
                      <Text style={styles.ghostButtonText}>{t("sync_now")}</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.primarySmall} onPress={openInvoiceModal}>
                  <LinearGradient
                    colors={theme.accentGradientAlt}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primarySmallInner}
                  >
                    <Text style={styles.primarySmallText}>
                      {t("invoices_add")}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.deviceSyncPanel}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sectionTitle}>{t("sync_device_title")}</Text>
                <Text accessibilityLiveRegion="polite" style={[styles.mutedText, styles.smallText]}>
                  {deviceSyncPhase === "syncing" ? t("sync_uploading") : deviceSyncPhase === "conflict" ? t("sync_conflict") :
                    deviceSyncPhase === "error" ? t("sync_problem") : pendingChanges ?
                      t("sync_pending").replace("{{count}}", String(pendingChanges)) : t("sync_ready")}
                </Text>
              </View>
              {pendingChanges || deviceSyncPhase === "error" ? (
                <TouchableOpacity accessibilityRole="button" style={[styles.ghostButton, !isOnline || deviceSyncPhase === "syncing" ? styles.buttonDisabled : null]}
                  disabled={!isOnline || deviceSyncPhase === "syncing"}
                  onPress={() => { void drainOfflineQueue(user.uid).catch(() => {}); }}>
                  <Text style={styles.ghostButtonText}>{t("sync_retry")}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity accessibilityRole="button" style={styles.ghostButton} onPress={() => openTrustControl('sync')}>
                <Text style={styles.ghostButtonText}>{t('sync_center')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} value={invoiceSearch} onChangeText={setInvoiceSearch}
              placeholder={t("invoice_search_placeholder")} placeholderTextColor={theme.textMuted}
              accessibilityLabel={t("invoice_search_label")} autoCorrect={false} returnKeyType="search" />
            <TouchableOpacity accessibilityRole="button" style={styles.ghostButton} onPress={() => openTrustControl('search')}>
              <Text style={styles.ghostButtonText}>{t('invoice_search_label')}</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.invoiceFilters}>
              {["all", "unpaid", "overdue", "paid"].map((status) => (
                <TouchableOpacity key={status} accessibilityRole="button" accessibilityState={{ selected: invoiceFilter === status }}
                  onPress={() => setInvoiceFilter(status)} style={[styles.filterChip, invoiceFilter === status ? styles.filterChipActive : null]}>
                  <Text style={styles.ghostButtonText}>{status === "all" ? t("filter_all") : invoiceStatusLabel(status)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {needsInvoiceSourceSetup ? (
            <View style={styles.mailSyncPanel}>
              <View style={styles.mailSyncHeader}>
                <View style={styles.mailSyncInfo}>
                  <Text style={styles.mailSyncTitle}>
                    {t("setup_title")}
                  </Text>
                    <Text style={styles.mailSyncDesc}>{t("setup_desc")}</Text>
                </View>
                <TouchableOpacity
                  style={styles.primarySmall}
                  onPress={openMailConnectModal}
                >
                  <LinearGradient
                    colors={theme.accentGradientAlt}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primarySmallInner}
                  >
                    <Text style={styles.primarySmallText}>
                      {t("mail_sync_connect")}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.mailProviders}>
                  {mailAccountsList.map(({ accountId, provider, data }) => {
                    const providerAllowed = isMailProviderAllowed(provider);
                    const statusText = getMailProviderStatusLabel(
                      data,
                      providerAllowed,
                      t
                    );
                    const email = data?.email || "";
                    const providerName = providerDisplayName(provider, t);
                    const badgeLetter = (providerName || "?").charAt(0).toUpperCase();
                    const badgeStyle =
                      provider === "gmail"
                        ? styles.mailProviderBadgeGmail
                        : provider === "outlook"
                          ? styles.mailProviderBadgeOutlook
                          : styles.mailProviderBadgeGeneric;
                    return (
                      <View key={accountId} style={styles.mailProviderRow}>
                      <View style={styles.mailProviderLeft}>
                        <View style={[styles.mailProviderBadge, badgeStyle]}>
                          <Text style={styles.mailProviderBadgeText}>
                            {badgeLetter}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.mailProviderName}>
                            {providerName}
                          </Text>
                          <Text style={styles.mailProviderStatus}>{statusText}</Text>
                          {email ? (
                            <Text style={styles.mailProviderEmail}>{email}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.mailProviderActions}>
                          <TouchableOpacity
                            style={styles.ghostButton}
                            onPress={() => handleDisconnectProvider(accountId)}
                          >
                            <Text style={styles.ghostButtonText}>
                              {t("mail_sync_disconnect")}
                            </Text>
                          </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.mutedText, styles.smallText, styles.mailSyncStatus]}>
                {mailSyncStatusText}
              </Text>

              <View style={[styles.mailProviderRow, { marginTop: 12 }]}>
                <View style={styles.mailProviderLeft}>
                  <View style={[styles.mailProviderBadge, styles.mailProviderBadgeGeneric]}>
                    <Text style={styles.mailProviderBadgeText}>P</Text>
                  </View>
                  <View>
                    <Text style={styles.mailProviderName}>{t("phone_title")}</Text>
                    <Text style={styles.mailProviderStatus}>{t("phone_desc")}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.ghostButton} onPress={openSettings}>
                  <Text style={styles.ghostButtonText}>{t("setup_open_settings")}</Text>
                </TouchableOpacity>
              </View>
            </View>
            ) : null}

            {syncMessage ? (
              <Text style={[styles.mutedText, styles.smallText]}>
                {syncMessage}
              </Text>
            ) : null}

            {!invoicesReady ? (
              <ActivityIndicator color={theme.accent} style={styles.loadingBlock} />
            ) : visibleInvoices.length ? (
              visibleInvoices.map((invoice) => {
                const effectiveStatus = getInvoiceEffectiveStatus(invoice);
                return (
                  <View key={invoice.id} style={styles.invoiceRow}>
                    <View style={styles.invoiceRowHeader}>
                      <Text style={styles.invoiceCompany}>
                        {invoice.company || t("invoice_unknown_company")}
                      </Text>
                      <View style={statusStyles(effectiveStatus)}>
                        <Text style={statusTextStyles(effectiveStatus)}>
                          {invoiceStatusLabel(effectiveStatus)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.invoiceMeta}>
                      <Text style={styles.invoiceMetaText}>
                        {invoice.category || t("invoice_category_default")}
                      </Text>
                      <Text style={styles.invoiceMetaText}>
                        #{invoice.number || t("invoice_number_fallback")}
                      </Text>
                      <Text style={styles.invoiceMetaText}>
                        {formatDate(invoice.issueDate, locale)}
                      </Text>
                    </View>
                    <View style={styles.invoiceAmounts}>
                      <Text style={styles.invoiceAmount}>
                        {formatAmount(invoice.amount, invoice.currency)}
                      </Text>
                      <Text style={styles.invoiceDue}>
                        {t("invoice_due_prefix")} {formatDate(invoice.dueDate, locale)}
                      </Text>
                    </View>
                    <View style={styles.invoiceRowFooter}>
                      <TouchableOpacity
                        style={styles.ghostButton}
                        onPress={() => setActionInvoice(invoice)}
                      >
                        <Text style={styles.ghostButtonText}>{t("action_title")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.ghostButton, styles.ghostButtonDanger]}
                        onPress={() => handleDeleteInvoice(invoice)}
                      >
                        <Text style={[styles.ghostButtonText, styles.ghostButtonTextDanger]}>
                          {t("table_actions_delete")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.invoiceEmpty}>
                <Text style={styles.mutedText}>{invoiceSearch.trim() || invoiceFilter !== "all" ? t("search_empty") : t("invoices_empty")}</Text>
                {invoiceSearch.trim() || invoiceFilter !== "all" ? (
                  <TouchableOpacity accessibilityRole="button" style={styles.ghostButton}
                    onPress={() => { setInvoiceSearch(""); setInvoiceFilter("all"); }}>
                    <Text style={styles.ghostButtonText}>{t("search_clear")}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>

        <TrustPanel key={`${user.uid}:${trustMode}:${trustGeneration}`} mode={trustMode} uid={user.uid} visible={trustVisible} setDensity={changeDensity}
          invoiceId={trustInvoiceId} invoices={workspaceInvoices} t={t} styles={styles} close={() => setTrustVisible(false)}
          call={callTrustControl} queue={() => getOfflineQueue(user.uid)} edit={transform => offlineQueueEngine.edit(user.uid, transform)}
          sync={() => drainOfflineQueue(user.uid, true)} refreshInvoice={refreshTrustInvoice} openInvoice={invoice => setActionInvoice(invoice)} />

        <Modal
          transparent
          visible={!!actionInvoice}
          animationType="slide"
          onRequestClose={() => setActionInvoice(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setActionInvoice(null)}>
            <TouchableWithoutFeedback>
              <View style={styles.modalPanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("action_title")}</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setActionInvoice(null)}>
                    <Text style={styles.modalCloseText}>X</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={styles.cardTitle}>{actionInvoice?.company || t("invoice_unknown_company")}</Text>
                  <Text style={[styles.mutedText, styles.smallText]}>
                    {formatAmount(actionInvoice?.amount, actionInvoice?.currency)} · {t(`invoice_status_${getInvoiceEffectiveStatus(actionInvoice || {})}`)}
                  </Text>
                  <View style={styles.chipRow}>
                    <View style={[styles.chip, styles.chipActive]}>
                      <Text style={[styles.chipText, styles.chipTextActive]}>
                        {t(`space_${planWorkspaceSpace}`)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t("evidence_title")}</Text>
                  <View style={styles.mailProviderRow}>
                    <View style={styles.mailProviderLeft}>
                      <View style={[styles.mailProviderBadge, styles.mailProviderBadgeGeneric]}><Text style={styles.mailProviderBadgeText}>✓</Text></View>
                      <View>
                        <Text style={styles.mailProviderName}>{t("evidence_confidence")}</Text>
                        <Text style={styles.mailProviderStatus}>{selectedIntelligence?.intelligence.evidence.confidence || 0}%</Text>
                      </View>
                    </View>
                  </View>
                  {(selectedIntelligence?.intelligence.evidence.items || []).map((item, index) => (
                    <View key={`${item.type}-${index}`} style={styles.mailProviderRow}>
                      <View style={styles.mailProviderLeft}>
                        <View style={[styles.mailProviderBadge, styles.mailProviderBadgeGeneric]}><Text style={styles.mailProviderBadgeText}>{item.verified ? "✓" : "!"}</Text></View>
                        <View>
                          <Text style={styles.mailProviderName}>{t("evidence_source")}</Text>
                          <Text style={styles.mailProviderStatus}>{sensitivePreviewsHidden ? t("privacy_hidden") : item.label}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.primaryButton} onPress={handleActionPaid}>
                    <Text style={styles.primaryButtonText}>{t("action_paid")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ghostButtonWide} onPress={() => handleOfficialAction("payment")}>
                    <Text style={styles.ghostButtonText}>{t("action_payment")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ghostButtonWide, styles.ghostButtonDanger]} onPress={() => handleOfficialAction("cancel")}>
                    <Text style={[styles.ghostButtonText, styles.ghostButtonTextDanger]}>{t("action_cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ghostButtonWide} onPress={() => openTrustControl('reminders', actionInvoice)}>
                    <Text style={styles.ghostButtonText}>{t("action_reminder")}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>

        <Modal
          transparent
          visible={sourceHubVisible}
          animationType="fade"
          onRequestClose={() => setSourceHubVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSourceHubVisible(false)}>
            <TouchableWithoutFeedback>
              <View style={styles.modalPanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("inbox_mesh")}</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setSourceHubVisible(false)}><Text style={styles.modalCloseText}>X</Text></TouchableOpacity>
                </View>
                <Text style={[styles.mutedText, styles.smallText]}>{t("inbox_mesh_desc")}</Text>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  {Intelligence.providerCatalog(plan).map((provider) => (
                    <TouchableOpacity
                      key={provider.id}
                      style={[styles.mailProviderRow, !provider.available && styles.buttonDisabled]}
                      disabled={!provider.available}
                      onPress={() => {
                        if (provider.mode === "oauth") {
                          setSourceHubVisible(false);
                          openMailConnectModal();
                        } else {
                          shareForwardingAddress();
                        }
                      }}
                    >
                      <View style={styles.mailProviderLeft}>
                        <View style={[styles.mailProviderBadge, styles.mailProviderBadgeGeneric]}><Text style={styles.mailProviderBadgeText}>{provider.name.charAt(0)}</Text></View>
                        <View>
                          <Text style={styles.mailProviderName}>{provider.name}</Text>
                          <Text style={styles.mailProviderStatus}>{provider.mode === "oauth" ? "OAuth" : t("forwarding_address")}</Text>
                        </View>
                      </View>
                      <Text style={styles.ghostButtonText}>›</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t("forwarding_address")}</Text>
                  <Text selectable style={[styles.mutedText, styles.smallText]}>{forwardingAddress || "-"}</Text>
                  <TouchableOpacity style={styles.ghostButtonWide} onPress={shareForwardingAddress} disabled={!forwardingAddress}>
                    <Text style={styles.ghostButtonText}>{t("forwarding_copy")}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>

        <Modal
          transparent
          visible={privacyVisible}
          animationType="fade"
          onRequestClose={() => setPrivacyVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setPrivacyVisible(false)}>
            <TouchableWithoutFeedback>
              <View style={styles.modalPanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("privacy_vault")}</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setPrivacyVisible(false)}><Text style={styles.modalCloseText}>X</Text></TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={[styles.mutedText, styles.smallText]}>{t("privacy_desc")}</Text>
                  {["cloud", "offline", "control"].map((item) => (
                    <View key={item} style={styles.mailProviderRow}>
                      <View style={styles.mailProviderLeft}>
                        <View style={[styles.mailProviderBadge, styles.mailProviderBadgeGeneric]}><Text style={styles.mailProviderBadgeText}>✓</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mailProviderName}>{t(`vault_${item}_title`)}</Text>
                          <Text style={styles.mailProviderStatus}>{t(`vault_${item}_desc`)}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.ghostButtonWide} onPress={toggleSensitivePreviews}>
                    <Text style={styles.ghostButtonText}>{sensitivePreviewsHidden ? `✓ ${t("vault_previews")}` : t("vault_previews")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={styles.ghostButtonWide} onPress={() => ProtectedStorage.lock()}>
                    <Text style={styles.ghostButtonText}>{t('vault_lock_now')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>

        <Modal
          transparent
          visible={settingsVisible}
          animationType="fade"
          onRequestClose={closeSettings}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeSettings}>
            <TouchableWithoutFeedback>
              <View style={styles.settingsPanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("settings_title")}</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={closeSettings}>
                    <Text style={styles.modalCloseText}>X</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.settingsScroll}
                  contentContainerStyle={styles.settingsScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>{t("settings_appearance")}</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, themeMode === "dark" && styles.chipActive]}
                      onPress={() => handleThemeSelect("dark")}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          themeMode === "dark" && styles.chipTextActive,
                        ]}
                      >
                        {t("settings_theme_dark")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, themeMode === "light" && styles.chipActive]}
                      onPress={() => handleThemeSelect("light")}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          themeMode === "light" && styles.chipTextActive,
                        ]}
                      >
                        {t("settings_theme_light")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, themeMode === "auto" && styles.chipActive]}
                      onPress={() => handleThemeSelect("auto")}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          themeMode === "auto" && styles.chipTextActive,
                        ]}
                      >
                        {t("settings_theme_auto")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.mutedText, styles.smallText]}>
                    {t("settings_theme_note")}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>{t("settings_language")}</Text>
                  <TouchableOpacity
                    style={styles.languageButton}
                    onPress={openLanguagePicker}
                  >
                    <Text style={styles.languageButtonText}>{languageLabel}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>{t("mail_settings_title")}</Text>
                  <Text style={[styles.mutedText, styles.smallText]}>
                    {t("mail_settings_desc")}
                  </Text>
                  <TouchableOpacity style={styles.ghostButtonWide} onPress={openSourceHubFromSettings}>
                    <Text style={styles.ghostButtonText}>{t("inbox_mesh")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ghostButtonWide} onPress={openPrivacyFromSettings}>
                    <Text style={styles.ghostButtonText}>{t("privacy_vault")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={styles.ghostButtonWide} onPress={() => openTrustControl('collaboration')}>
                    <Text style={styles.ghostButtonText}>{t('collaboration')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={styles.ghostButtonWide} onPress={() => openTrustControl('reminders')}>
                    <Text style={styles.ghostButtonText}>{t('action_reminder')}</Text>
                  </TouchableOpacity>
                  {mailAccountsList.length ? (
                    mailAccountsList.map(({ accountId, provider, data }) => (
                      <View key={accountId} style={styles.mailProviderRow}>
                        <View style={styles.mailProviderLeft}>
                          <View style={[styles.mailProviderBadge, styles.mailProviderBadgeGeneric]}>
                            <Text style={styles.mailProviderBadgeText}>
                              {providerDisplayName(provider, t).charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.mailProviderName}>
                              {providerDisplayName(provider, t)}
                            </Text>
                            <Text style={styles.mailProviderStatus}>
                              {data?.email || t("mail_sync_status_not_connected")}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.ghostButton}
                          onPress={() => handleDisconnectProvider(accountId)}
                        >
                          <Text style={styles.ghostButtonText}>
                            {t("mail_sync_disconnect")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.mutedText, styles.smallText]}>
                      {t("mail_sync_panel_empty")}
                    </Text>
                  )}
                  <TouchableOpacity style={styles.primarySmall} onPress={openMailConnectModal}>
                    <LinearGradient
                      colors={theme.accentGradientAlt}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primarySmallInner}
                    >
                      <Text style={styles.primarySmallText}>
                        {t("mail_sync_connect")}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>{t("phone_title")}</Text>
                  <Text style={[styles.mutedText, styles.smallText]}>
                    {t("phone_desc")}
                  </Text>
                  <Text style={styles.fieldLabel}>{t("phone_inbox_number")}</Text>
                  <Text style={styles.mailProviderEmail}>
                    {phoneInboxNumber || t("phone_inbox_missing")}
                  </Text>
                  <Text style={styles.fieldLabel}>{t("phone_number")}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+40 7xx xxx xxx"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                  <View style={styles.modalFooterRow}>
                    <TouchableOpacity
                      style={[styles.ghostButton, phoneBusy ? styles.buttonDisabled : null]}
                      onPress={handleSavePhone}
                      disabled={phoneBusy}
                    >
                      <Text style={styles.ghostButtonText}>{t("phone_save")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ghostButton, phoneBusy ? styles.buttonDisabled : null]}
                      onPress={handleRequestPhoneCode}
                      disabled={phoneBusy}
                    >
                      <Text style={styles.ghostButtonText}>{t("phone_send_code")}</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={t("phone_code")}
                    placeholderTextColor={theme.placeholder}
                    keyboardType="number-pad"
                    value={phoneCode}
                    onChangeText={(value) => setPhoneCode(value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <TouchableOpacity
                    style={[styles.primarySmall, phoneBusy ? styles.buttonDisabled : null]}
                    onPress={handleVerifyPhoneCode}
                    disabled={phoneBusy}
                  >
                    <LinearGradient
                      colors={theme.accentGradientAlt}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primarySmallInner}
                    >
                      <Text style={styles.primarySmallText}>{t("phone_verify")}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {phoneConnected ? (
                    <TouchableOpacity
                      style={styles.ghostButton}
                      onPress={handleSyncPhoneInbox}
                      disabled={phoneSyncing}
                    >
                      <Text style={styles.ghostButtonText}>{t("phone_sync_now")}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text style={[styles.mutedText, styles.smallText]}>
                    {phoneStatus || (phoneConnected ? `${t("phone_verified")} ${maskPhone(phone)}` : t("phone_empty"))}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>{t("security_title")}</Text>
                  <Text style={[styles.mutedText, styles.smallText]}>
                    {t("security_subtitle")}
                  </Text>
                  <View style={styles.totpRow}>
                    <View style={emailVerified ? styles.pillOn : styles.pillOff}>
                      <Text style={styles.pillText}>
                        {emailVerified ? t("totp_on_label") : t("totp_off_label")}
                      </Text>
                    </View>
                    <Text style={[styles.mutedText, styles.smallText]}>
                      {t("security_status")}
                    </Text>
                  </View>
                  {!emailVerified ? (
                    <View style={styles.totpActions}>
                      <TouchableOpacity
                        style={styles.ghostButton}
                        onPress={() => openExternal(ACCOUNT_URL)}
                      >
                        <Text style={styles.ghostButtonText}>
                          {t("profile_open_website")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>{t("settings_account")}</Text>
                  <View style={styles.settingsRow}>
                    <TouchableOpacity
                      style={styles.ghostButtonWide}
                      onPress={handleSignOut}
                    >
                      <Text style={styles.ghostButtonText}>
                        {t("settings_switch_account")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>{t("settings_legal")}</Text>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => openExternal(PRIVACY_URL)}
                  >
                    <Text style={styles.linkButtonText}>
                      {t("settings_privacy")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => openExternal(TERMS_URL)}
                  >
                    <Text style={styles.linkButtonText}>
                      {t("settings_terms")}
                    </Text>
                  </TouchableOpacity>
                </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>

        <Modal
          transparent
          visible={profileVisible}
          animationType="fade"
          onRequestClose={closeProfile}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeProfile}>
            <TouchableWithoutFeedback>
              <View style={styles.modalPanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("profile_title")}</Text>
                  <TouchableOpacity style={styles.modalClose} onPress={closeProfile}>
                    <Text style={styles.modalCloseText}>X</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.mutedText, styles.smallText]}>
                  {t("profile_subtitle")}
                </Text>
                <View style={styles.profilePlanRow}>
                  <Text style={styles.profilePlanLabel}>
                    {t("profile_plan_label")}
                  </Text>
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{planLabel(plan)}</Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>{t("profile_identity")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("profile_first_name")}
                  placeholderTextColor={theme.placeholder}
                  value={profileFirst}
                  onChangeText={setProfileFirst}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("profile_last_name")}
                  placeholderTextColor={theme.placeholder}
                  value={profileLast}
                  onChangeText={setProfileLast}
                />
                {planIsBusiness ? (
                  <TextInput
                    style={styles.input}
                    placeholder={t("profile_company")}
                    placeholderTextColor={theme.placeholder}
                    value={profileCompany}
                    onChangeText={setProfileCompany}
                  />
                ) : null}

                {profileMessage ? (
                  <Text style={[styles.mutedText, styles.smallText]}>
                    {profileMessage}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.primaryButtonText}>
                    {t("profile_save")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => openExternal(ACCOUNT_URL)}
                >
                  <Text style={styles.linkButtonText}>
                    {t("profile_open_website")}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>

        <Modal
          transparent
          visible={mailConnectVisible}
          animationType="fade"
          onRequestClose={() => setMailConnectVisible(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setMailConnectVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalPanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {t("mail_sync_connect_title")}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setMailConnectVisible(false)}
                  >
                    <Text style={styles.modalCloseText}>X</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.mutedText, styles.smallText]}>
                  {t("mail_sync_connect_desc")}
                </Text>
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                  {t("mail_sync_connect_email_label")}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("mail_sync_connect_email_placeholder")}
                  placeholderTextColor={theme.placeholder}
                  value={mailConnectEmail}
                  onChangeText={handleMailConnectEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View style={styles.mailConnectProviderRow}>
                  <Text style={[styles.mutedText, styles.smallText]}>
                    {t("mail_sync_connect_provider_label")}
                  </Text>
                  <Text style={styles.mailConnectProviderValue}>
                    {mailConnectProviderLabel}
                  </Text>
                </View>
                {mailConnectError ? (
                  <Text style={styles.errorText}>{mailConnectError}</Text>
                ) : null}
                <View style={styles.modalFooterRow}>
                  <TouchableOpacity
                    style={styles.ghostButton}
                    onPress={() => setMailConnectVisible(false)}
                  >
                    <Text style={styles.ghostButtonText}>
                      {t("mail_sync_connect_cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primarySmall,
                      mailConnectBusy ? styles.buttonDisabled : null,
                    ]}
                    onPress={handleConnectEmail}
                    disabled={mailConnectBusy}
                  >
                    <LinearGradient
                      colors={theme.accentGradientAlt}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.primarySmallInner,
                        mailConnectBusy ? styles.buttonDisabled : null,
                      ]}
                    >
                      <Text style={styles.primarySmallText}>
                        {mailConnectBusy
                          ? t("mail_sync_connect_provider_detecting")
                          : t("mail_sync_connect_continue")}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>

        <Modal
          transparent
          visible={reportVisible}
          animationType="fade"
          onRequestClose={() => setReportVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setReportVisible(false)}>
            <TouchableWithoutFeedback>
              <View style={styles.modalPanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("reports_title")}</Text>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setReportVisible(false)}
                  >
                    <Text style={styles.modalCloseText}>X</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.mutedText, styles.smallText]}>
                  {t("reports_desc")}
                </Text>
                <View style={styles.chipRow}>
                  {REPORT_FIELDS.map((field) => {
                    const active = reportFields.includes(field);
                    return (
                      <TouchableOpacity
                        key={field}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() =>
                          setReportFields((prev) =>
                            prev.includes(field)
                              ? prev.filter((item) => item !== field)
                              : [...prev, field]
                          )
                        }
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {reportFieldLabel(field, t)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.modalFooterRow}>
                  {["csv", "json", "html", "txt", "pdf"].map((format) => (
                    <TouchableOpacity
                      key={format}
                      disabled={reportBusy}
                      style={styles.ghostButton}
                      onPress={() => handleExportReport(format)}
                    >
                      <Text style={styles.ghostButtonText}>
                        {t(`reports_${format}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>

        <Modal
          transparent
          visible={invoiceVisible}
          animationType="slide"
          onRequestClose={closeInvoiceModal}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeInvoiceModal}>
            <TouchableWithoutFeedback>
              <View style={styles.modalPanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("invoice_modal_title")}</Text>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={closeInvoiceModal}
                  >
                    <Text style={styles.modalCloseText}>X</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                >
                  <TextInput
                    style={styles.input}
                    placeholder={t("invoice_company")}
                    placeholderTextColor={theme.placeholder}
                    value={invoiceCompany}
                    onChangeText={setInvoiceCompany}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("invoice_category")}
                    placeholderTextColor={theme.placeholder}
                    value={invoiceCategory}
                    onChangeText={setInvoiceCategory}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("invoice_number")}
                    placeholderTextColor={theme.placeholder}
                    value={invoiceNumber}
                    onChangeText={setInvoiceNumber}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("invoice_issue_date")}
                    placeholderTextColor={theme.placeholder}
                    value={invoiceIssueDate}
                    onChangeText={setInvoiceIssueDate}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("invoice_due_date")}
                    placeholderTextColor={theme.placeholder}
                    value={invoiceDueDate}
                    onChangeText={setInvoiceDueDate}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("invoice_amount")}
                    placeholderTextColor={theme.placeholder}
                    keyboardType="numeric"
                    value={invoiceAmount}
                    onChangeText={setInvoiceAmount}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("invoice_currency")}
                    placeholderTextColor={theme.placeholder}
                    value={invoiceCurrency}
                    onChangeText={setInvoiceCurrency}
                  />

                  <Text style={styles.sectionTitle}>{t("invoice_status")}</Text>
                  <View style={styles.statusRow}>
                    <TouchableOpacity
                      style={[
                        styles.statusChip,
                        invoiceStatus === "unpaid" && styles.statusChipActive,
                      ]}
                      onPress={() => setInvoiceStatus("unpaid")}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          invoiceStatus === "unpaid" && styles.statusChipTextActive,
                        ]}
                      >
                        {t("invoice_status_unpaid")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusChip,
                        invoiceStatus === "paid" && styles.statusChipActive,
                      ]}
                      onPress={() => setInvoiceStatus("paid")}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          invoiceStatus === "paid" && styles.statusChipTextActive,
                        ]}
                      >
                        {t("invoice_status_paid")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusChip,
                        invoiceStatus === "overdue" && styles.statusChipActive,
                      ]}
                      onPress={() => setInvoiceStatus("overdue")}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          invoiceStatus === "overdue" && styles.statusChipTextActive,
                        ]}
                      >
                        {t("invoice_status_overdue")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {invoiceError ? (
                    <Text style={styles.loginMessage}>{invoiceError}</Text>
                  ) : null}
                  {invoiceMessage ? (
                    <Text style={[styles.mutedText, styles.smallText]}>
                      {invoiceMessage}
                    </Text>
                  ) : null}

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.ghostButtonWide}
                      onPress={closeInvoiceModal}
                    >
                      <Text style={styles.ghostButtonText}>
                        {t("invoice_cancel")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={handleSaveInvoice}
                      disabled={savingInvoice}
                    >
                      {savingInvoice ? (
                        <ActivityIndicator color={theme.textInverse} />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          {t("invoice_save")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>

        <Modal
          transparent
          visible={languageVisible}
          animationType="fade"
          onRequestClose={closeLanguagePicker}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeLanguagePicker}>
            <TouchableWithoutFeedback>
              <View style={styles.languagePanel}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("settings_language")}</Text>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={closeLanguagePicker}
                  >
                    <Text style={styles.modalCloseText}>X</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.languageScroll}
                  contentContainerStyle={styles.languageScrollContent}
                >
                  {LANG_OPTIONS.map((option) => {
                    const active = option.code === lang;
                    return (
                      <TouchableOpacity
                        key={option.code}
                        style={[
                          styles.languageOption,
                          active ? styles.languageOptionActive : null,
                        ]}
                        onPress={() => handleLanguageSelect(option.code)}
                      >
                        <Text
                          style={[
                            styles.languageOptionText,
                            active ? styles.languageOptionTextActive : null,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

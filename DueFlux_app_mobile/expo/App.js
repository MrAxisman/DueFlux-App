import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import * as Clipboard from "expo-clipboard";
import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getStorage, listAll, ref } from "firebase/storage";

const LOGO = require("./assets/logo-dueflux.png");
const SPLASH_DURATION_MS = 2800;
const SIGNUP_URL = "https://dueflux.com/signup.html";
const ACCOUNT_URL = "https://dueflux.com/account.html";
const PRIVACY_URL = "https://dueflux.com/privacy.html";
const TERMS_URL = "https://dueflux.com/terms.html";

const firebaseConfig = {
  apiKey: "AIzaSyDPCDXynl6_SPbCrpsf0pmKsTVXqFPy_Sg",
  authDomain: "dueflux-product.firebaseapp.com",
  projectId: "dueflux-product",
  storageBucket: "dueflux-product.firebasestorage.app",
  messagingSenderId: "71833659340",
  appId: "1:71833659340:web:bf197cb41403034da51f69",
};

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
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

const THEMES = {
  dark: {
    mode: "dark",
    background: ["#0b1120", "#020617"],
    cardGradient: [
      "rgba(56, 189, 248, 0.14)",
      "rgba(79, 70, 229, 0.12)",
      "rgba(6, 10, 22, 0.94)",
    ],
    glowTop: "rgba(56, 189, 248, 0.35)",
    glowRight: "rgba(79, 70, 229, 0.28)",
    text: "#e5e7eb",
    textMuted: "#9ca3af",
    textSoft: "#cbd5f5",
    textInverse: "#ffffff",
    border: "rgba(148, 163, 184, 0.4)",
    borderStrong: "rgba(148, 163, 184, 0.6)",
    borderLight: "rgba(148, 163, 184, 0.25)",
    surface: "rgba(2, 6, 23, 0.98)",
    surfaceCard: "#020617",
    surfaceCardAlt: "rgba(15, 23, 42, 0.85)",
    surfaceHeader: "rgba(15, 23, 42, 0.92)",
    surfaceSoft: "rgba(148, 163, 184, 0.08)",
    inputBg: "rgba(255, 255, 255, 0.02)",
    inputBorder: "rgba(148, 163, 184, 0.45)",
    rowBg: "rgba(11, 18, 36, 0.6)",
    overlay: "rgba(15, 23, 42, 0.7)",
    accent: "#38bdf8",
    accentStrong: "#4f46e5",
    accentGradient: ["#38bdf8", "#6366f1"],
    accentGradientAlt: ["#38bdf8", "#4f46e5"],
    accentSoft: "rgba(56, 189, 248, 0.15)",
    accentBorder: "rgba(56, 189, 248, 0.6)",
    danger: "#fca5a5",
    dangerBorder: "rgba(248, 113, 113, 0.35)",
    dangerSoft: "rgba(248, 113, 113, 0.12)",
    warning: "#fbbf24",
    warningBorder: "rgba(234, 179, 8, 0.35)",
    warningSoft: "rgba(234, 179, 8, 0.18)",
    success: "#4ade80",
    successBorder: "rgba(34, 197, 94, 0.35)",
    successSoft: "rgba(34, 197, 94, 0.16)",
    link: "#38bdf8",
    placeholder: "#6b7280",
    shadow: "#0f172a",
    statusBar: "light",
  },
  light: {
    mode: "light",
    background: ["#f8fafc", "#e2e8f0"],
    cardGradient: [
      "rgba(37, 99, 235, 0.12)",
      "rgba(14, 165, 233, 0.08)",
      "rgba(248, 250, 252, 0.96)",
    ],
    glowTop: "rgba(37, 99, 235, 0.2)",
    glowRight: "rgba(56, 189, 248, 0.18)",
    text: "#0f172a",
    textMuted: "#475569",
    textSoft: "#334155",
    textInverse: "#ffffff",
    border: "rgba(148, 163, 184, 0.35)",
    borderStrong: "rgba(100, 116, 139, 0.5)",
    borderLight: "rgba(148, 163, 184, 0.25)",
    surface: "rgba(255, 255, 255, 0.98)",
    surfaceCard: "rgba(255, 255, 255, 0.96)",
    surfaceCardAlt: "rgba(248, 250, 252, 0.92)",
    surfaceHeader: "rgba(255, 255, 255, 0.95)",
    surfaceSoft: "rgba(148, 163, 184, 0.2)",
    inputBg: "rgba(248, 250, 252, 0.95)",
    inputBorder: "rgba(100, 116, 139, 0.45)",
    rowBg: "rgba(226, 232, 240, 0.9)",
    overlay: "rgba(15, 23, 42, 0.35)",
    accent: "#2563eb",
    accentStrong: "#1d4ed8",
    accentGradient: ["#2563eb", "#60a5fa"],
    accentGradientAlt: ["#1d4ed8", "#38bdf8"],
    accentSoft: "rgba(37, 99, 235, 0.15)",
    accentBorder: "rgba(37, 99, 235, 0.5)",
    danger: "#b91c1c",
    dangerBorder: "rgba(220, 38, 38, 0.35)",
    dangerSoft: "rgba(220, 38, 38, 0.12)",
    warning: "#b45309",
    warningBorder: "rgba(217, 119, 6, 0.35)",
    warningSoft: "rgba(217, 119, 6, 0.18)",
    success: "#15803d",
    successBorder: "rgba(22, 163, 74, 0.35)",
    successSoft: "rgba(22, 163, 74, 0.18)",
    link: "#2563eb",
    placeholder: "#94a3b8",
    shadow: "#94a3b8",
    statusBar: "dark",
  },
};

function planLabel(plan) {
  const value = String(plan || "basic").toUpperCase();
  return value === "BUSINESS" ? "BUSINESS" : "BASIC";
}

function createStyles(theme) {
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
  loginCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 28,
    overflow: "hidden",
    shadowColor: theme.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
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
    marginBottom: 14,
  },
  loginTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700",
  },
  loginSubtitle: {
    color: theme.textMuted,
    marginTop: 2,
    fontSize: 12,
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
    padding: 10,
    marginRight: 10,
  },
  loginHintText: {
    color: theme.textMuted,
    fontSize: 11,
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
    height: 46,
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
    height: 46,
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
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: theme.textInverse,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
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
  mailSyncAddressRow: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surfaceSoft,
  },
  mailSyncAddress: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "600",
  },
  mailSyncStatus: {
    marginTop: 8,
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
    padding: 12,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 16,
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
  dangerButton: {
    borderRadius: 999,
    backgroundColor: theme.danger,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  dangerButtonText: {
    color: theme.textInverse,
    fontWeight: "700",
    fontSize: 13,
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
    id: docSnap.id,
    company: data.company || data.vendor || "",
    category: data.category || "",
    number: data.number || data.invoiceNumber || "",
    issueDate,
    dueDate,
    amount,
    currency: data.currency || "RON",
    status,
  };
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
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [invoicesReady, setInvoicesReady] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [mailSyncAddress, setMailSyncAddress] = useState("");
  const [mailSyncStatus, setMailSyncStatus] = useState("idle");
  const [mailSyncCopied, setMailSyncCopied] = useState(false);
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

  const loadingTimeoutRef = useRef(null);
  const copyTimeoutRef = useRef(null);
  const forceLoginRef = useRef(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(0.98)).current;
  const statusPulse = useRef(new Animated.Value(0)).current;

  const { width } = useWindowDimensions();
  const systemScheme = useColorScheme();
  const resolvedMode =
    themeMode === "auto" ? (systemScheme === "light" ? "light" : "dark") : themeMode;
  const theme = THEMES[resolvedMode] || THEMES.dark;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const compactHeader = width < 520;

  const emailVerified = !!user?.emailVerified;
  const dict = translations[lang] || translations.en;
  const t = (key) => dict[key] || translations.en[key] || key;
  const accountLabel = companyName || displayName || user?.email || t("user_fallback");
  const locale = LOCALE_MAP[lang] || "en-US";
  const mailSyncStatusText =
    mailSyncStatus === "error"
      ? t("sync_panel_error")
      : mailSyncStatus === "pending"
        ? t("sync_panel_pending")
        : mailSyncAddress
          ? t("sync_panel_ready")
          : t("sync_panel_empty");
  const mailSyncCopyLabel = mailSyncCopied
    ? t("sync_panel_copied")
    : t("sync_panel_copy");
  const mailSyncCanCopy = !!mailSyncAddress && mailSyncStatus !== "pending";
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
    let total = 0;
    let unpaid = 0;
    let overdue = 0;
    let currency = "RON";

    invoices.forEach((inv) => {
      if (inv.currency) currency = inv.currency;
      if (inv.issueDate) {
        const d = inv.issueDate;
        if (d.getMonth() === month && d.getFullYear() === year) {
          total += Number(inv.amount) || 0;
        }
      }
      if (inv.status === "unpaid") unpaid += 1;
      if (inv.status === "overdue") overdue += 1;
    });

    return {
      total,
      unpaid,
      overdue,
      currency,
    };
  }, [invoices]);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!mounted) return;
      setAuthReady(true);
      setLoading(false);
      clearLoadingTimeout();
      if (forceLoginRef.current) {
        forceLoginRef.current = false;
        setError("");
        if (authUser) {
          signOut(auth).catch(() => {});
        }
        setUser(null);
        setDisplayName("");
        setCompanyName("");
        setPlan("basic");
        setInvoices([]);
        setInvoicesReady(false);
        setProfileFirst("");
        setProfileLast("");
        setProfileCompany("");
        setProfileMessage("");
        setMailSyncAddress("");
        setMailSyncStatus("idle");
        setMailSyncCopied(false);
        setSyncMessage("");
        setThemeMode("dark");
        return;
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
        setMailSyncAddress("");
        setMailSyncStatus("idle");
        setMailSyncCopied(false);
        setSyncMessage("");
        setThemeMode("dark");
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
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
    return () => clearTimeout(splashTimer);
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
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const userRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() || {};
        if (data.displayName) setDisplayName(data.displayName);
        if (data.company || data.companyName) {
          setCompanyName(data.company || data.companyName);
        }
        if (data.plan) {
          setPlan(String(data.plan || "basic").toLowerCase());
        }
        if (data.lang) {
          setLang((prev) => (data.lang && data.lang !== prev ? data.lang : prev));
        }
        if (data.themeMode) {
          setThemeMode((prev) =>
            data.themeMode && data.themeMode !== prev ? data.themeMode : prev
          );
        }
        const nextMailSyncAddress =
          data.mailSyncAddress || data.mail_sync_address || "";
        setMailSyncAddress(nextMailSyncAddress);
        setMailSyncCopied(false);
        if (nextMailSyncAddress) {
          setSyncMessage("");
        }
        setMailSyncStatus((prev) => {
          if (nextMailSyncAddress) return "ready";
          if (prev === "pending" || prev === "error") return prev;
          return "idle";
        });
        if (data.firstName || data.lastName) {
          setProfileFirst(data.firstName || "");
          setProfileLast(data.lastName || "");
        }
        if (data.company || data.companyName) {
          setProfileCompany(data.company || data.companyName);
        }
      },
      () => {
        // ignore listener errors
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    setInvoicesReady(false);
    const invRef = collection(firestore, "users", user.uid, "invoices");
    const invQuery = query(invRef, limit(50));
    const unsubscribe = onSnapshot(
      invQuery,
      (snapshot) => {
        const next = snapshot.docs.map(normalizeInvoiceDoc);
        next.sort((a, b) => {
          const aTime = a.issueDate ? a.issueDate.getTime() : 0;
          const bTime = b.issueDate ? b.issueDate.getTime() : 0;
          return bTime - aTime;
        });
        setInvoices(next);
        setInvoicesReady(true);
      },
      () => setInvoicesReady(true)
    );
    return () => unsubscribe();
  }, [user?.uid]);

  const showSplash = !authReady || !splashDone;
  const showLogin = !user;

  function clearLoadingTimeout() {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }

  async function loadProfile(authUser) {
    let planValue = "basic";
    try {
      const tokenResult = await authUser.getIdTokenResult();
      if (tokenResult?.claims?.plan) {
        planValue = String(tokenResult.claims.plan).toLowerCase();
      }
    } catch (_) {
      // ignore claims errors
    }
    setPlan(planValue);
    try {
      await setDoc(
        doc(firestore, "users", authUser.uid),
        {
          email: authUser.email || "",
          displayName: authUser.displayName || "",
          plan: planValue,
          updatedAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (_) {
      // ignore profile sync failures
    }
    void syncCloud(authUser);
  }

  async function syncCloud(authUser) {
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
    if (!user) return;
    setInvoiceError("");
    setInvoiceMessage("");
    if (!invoiceCompany.trim()) {
      setInvoiceError(t("invoice_save_error"));
      return;
    }
    const amountValue = Number(invoiceAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setInvoiceError(t("invoice_save_error"));
      return;
    }
    const issueDate = parseDateInput(invoiceIssueDate);
    const dueDate = parseDateInput(invoiceDueDate);
    try {
      setSavingInvoice(true);
      const categoryValue = invoiceCategory.trim();
      const numberValue = invoiceNumber.trim();
      await addDoc(collection(firestore, "users", user.uid, "invoices"), {
        company: invoiceCompany.trim(),
        category: categoryValue || null,
        number: numberValue || null,
        issueDate: issueDate || null,
        dueDate: dueDate || null,
        amount: amountValue,
        currency: invoiceCurrency.trim() || "RON",
        status: invoiceStatus,
        createdAt: serverTimestamp(),
      });
      setInvoiceMessage(t("invoice_save_success"));
      closeInvoiceModal();
    } catch (_) {
      setInvoiceError(t("invoice_save_error"));
    } finally {
      setSavingInvoice(false);
    }
  }

  async function handleSyncMail() {
    if (!user) return;
    setSyncMessage("");
    setMailSyncStatus("pending");
    try {
      setSyncing(true);
      await addDoc(collection(firestore, "users", user.uid, "sync_requests"), {
        type: "mail",
        status: "requested",
        createdAt: serverTimestamp(),
      });
    } catch (_) {
      setMailSyncStatus("error");
      setSyncMessage(t("invoices_sync_failed"));
    } finally {
      setSyncing(false);
    }
  }

  async function handleCopyMailSync() {
    if (!mailSyncCanCopy) return;
    try {
      await Clipboard.setStringAsync(mailSyncAddress);
      setMailSyncCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setMailSyncCopied(false);
      }, 2000);
    } catch (_) {
      // ignore copy failures
    }
  }

  async function handleSaveProfile() {
    if (!user) return;
    const firstName = profileFirst.trim();
    const lastName = profileLast.trim();
    const company = profileCompany.trim();
    const nextDisplayName = [firstName, lastName].filter(Boolean).join(" ");
    setProfileMessage(t("profile_saving"));
    try {
      await setDoc(
        doc(firestore, "users", user.uid),
        {
          firstName,
          lastName,
          company,
          displayName: nextDisplayName || displayName,
          updatedAt: serverTimestamp(),
        },
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
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 12000);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(t("login_error_generic"));
      setLoading(false);
      clearLoadingTimeout();
    }
  }

  function openExternal(url) {
    Linking.openURL(url).catch(() => {});
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

  if (showSplash) {
    return (
      <LinearGradient colors={theme.background} style={styles.app}>
        <StatusBar style={theme.statusBar} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.splashContainer}>
            <Animated.View
              style={{ opacity: splashOpacity, transform: [{ scale: splashScale }] }}
            >
              <View style={[styles.logoWrapBase, styles.logoWrapBig]}>
                <Image source={LOGO} style={styles.logoMarkBig} />
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
        <SafeAreaView style={styles.safe}>
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
      <SafeAreaView style={styles.safe}>
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("overview_title")}</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>{t("overview_total")}</Text>
                <Text style={styles.kpiValue}>
                  {formatAmount(kpis.total, kpis.currency)}
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
                  style={[
                    styles.ghostButton,
                    syncing ? styles.buttonDisabled : null,
                  ]}
                  onPress={handleSyncMail}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator color={theme.text} size="small" />
                  ) : (
                    <Text style={styles.ghostButtonText}>
                      {t("invoices_sync")}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primarySmall}
                  onPress={openInvoiceModal}
                >
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

            <View style={styles.mailSyncPanel}>
              <View style={styles.mailSyncHeader}>
                <View style={styles.mailSyncInfo}>
                  <Text style={styles.mailSyncTitle}>{t("sync_panel_title")}</Text>
                  <Text style={styles.mailSyncDesc}>{t("sync_panel_desc")}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.ghostButton,
                    !mailSyncCanCopy && styles.buttonDisabled,
                  ]}
                  onPress={handleCopyMailSync}
                  disabled={!mailSyncCanCopy}
                >
                  <Text style={styles.ghostButtonText}>{mailSyncCopyLabel}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mailSyncAddressRow}>
                <Text style={styles.mailSyncAddress}>
                  {mailSyncAddress || "—"}
                </Text>
              </View>
              <Text style={[styles.mutedText, styles.smallText, styles.mailSyncStatus]}>
                {mailSyncStatusText}
              </Text>
            </View>

            {syncMessage ? (
              <Text style={[styles.mutedText, styles.smallText]}>
                {syncMessage}
              </Text>
            ) : null}

            {!invoicesReady ? (
              <ActivityIndicator color={theme.accent} style={styles.loadingBlock} />
            ) : invoices.length ? (
              invoices.map((invoice) => (
                <View key={invoice.id} style={styles.invoiceRow}>
                  <View style={styles.invoiceRowHeader}>
                    <Text style={styles.invoiceCompany}>
                      {invoice.company || t("invoice_unknown_company")}
                    </Text>
                    <View style={statusStyles(invoice.status)}>
                      <Text style={statusTextStyles(invoice.status)}>
                        {invoiceStatusLabel(invoice.status)}
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
                </View>
              ))
            ) : (
              <Text style={[styles.mutedText, styles.smallText]}>
                {t("invoices_empty")}
              </Text>
            )}
          </View>
        </ScrollView>
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
                <TextInput
                  style={styles.input}
                  placeholder={t("profile_company")}
                  placeholderTextColor={theme.placeholder}
                  value={profileCompany}
                  onChangeText={setProfileCompany}
                />

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

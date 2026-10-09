import type { CitizenStage, FraudType } from "@cyberpulse/shared/enums";
import type { Lang, ScamVerdict } from "./scamRules";
import type { CallerReason, CheckLevel, LinkReason, UpiReason } from "./verifyChecks";
import { SAFETY_LOCALES, safetyLocale } from "./locales";

// FEAT-17 copy (FR-30). English is the source; `hi` is typed against it, so a
// missing Hindi string fails typecheck. Hindi copy needs a native-speaker
// review before release (phase-9.md exit criteria) — machine translation alone
// is not accepted for safety instructions.
//
// Neither language may use the prohibited terms (CLAUDE.md §Terminology);
// scripts/evaluation/no_hardcode_check.sh scans for the Hindi equivalents too.

export type { Lang } from "./scamRules";

/** CLAUDE.md fixed strings — rendered exactly, in English, whatever the language. */
export const REPORT_NOTICE =
  "This prototype does not send your report to police or banks. To report, call 1930 or use cybercrime.gov.in.";
export const STATUS_NOTE = "You will see status updates here. Investigation details are shared only with police and banks.";
export const MULE_LINE = "Never let anyone use your bank account. Money passed through it makes you part of the fraud chain.";
export const HELPLINE_LABEL = "National Cybercrime Helpline 1930";

export function langFrom(value: string | string[] | undefined): Lang {
  return safetyLocale(value);
}

/** Language lives in the query string (RULE-frontend: URL state), not in client state. */
export function withLang(path: string, lang: Lang): string {
  if (lang === "en") return path;
  return `${path}${path.includes("?") ? "&" : "?"}lang=${encodeURIComponent(lang)}`;
}

const en = {
  shell: {
    brand: "Scam Shield",
    brandSub: "by CyberPulse AI",
    skip: "Skip to content",
    nav: {
      home: "Home",
      check: "Is this a scam?",
      verify: "Verify before you pay",
      report: "I already paid",
      status: "Track my report",
    },
    language: "Language",
    reportNotice: REPORT_NOTICE,
    alreadyPaid: "Already paid?",
    call1930: "Call 1930",
    helpline: HELPLINE_LABEL,
  },
  home: {
    title: "Is someone asking you for money right now?",
    lede: "Check before you pay. If you already paid, act within the first hour.",
    cards: {
      check: { title: "Is this a scam?", body: "Answer four quick questions about what is happening." },
      verify: { title: "Verify before you pay", body: "Check a link, a caller's number or a UPI ID." },
      report: { title: "I already paid", body: "What to do in the first hour." },
      status: { title: "Track my report", body: "See the progress of a report you filed here." },
    },
    mule: MULE_LINE,
  },
  check: {
    title: "Is this a scam?",
    lede: "Pick what is happening, then tick everything that matches.",
    scenarioLegend: "What is happening?",
    questionsLegend: "Tick what matches",
    verdict: {
      STOP: "Stop. This matches a known scam pattern.",
      CAUTION: "Be careful. One red flag matches.",
      NONE: "No red flags from these questions.",
    } satisfies Record<ScamVerdict, string>,
    noneNext: "Still verify the link, caller or UPI ID before you pay.",
    flagCount: (matched: number, total: number) => `${matched} of ${total} red flags match`,
    whyHeading: "Why these are warning signs",
    stepsHeading: "Do this now",
    sourcesHeading: "Based on",
    verifyLink: "Verify a link, number or UPI ID",
    mule: MULE_LINE,
  },
  verify: {
    title: "Verify before you pay",
    lede: "Three quick checks against formats the RBI and SEBI require.",
    privacy: "These checks run on your device. Nothing you type is sent or stored.",
    examples: "Try an example:",
    link: { label: "Link from an SMS or chat", hint: "Paste the whole link.", button: "Check link" },
    caller: { label: "Number that called you", hint: "Include +91 if it was shown.", button: "Check number" },
    upi: { label: "UPI ID you were asked to pay for an investment", hint: "It looks like name@bank.", button: "Check UPI ID" },
    level: {
      PASS: "Matches the real format",
      CAUTION: "Be careful",
      WARNING: "Warning sign",
    } satisfies Record<CheckLevel, string>,
    linkReason: {
      BANK_DOMAIN:
        "Ends in .bank.in, the domain reserved for Indian banks. Still, never enter an OTP or PIN on a link someone sent you.",
      BANK_DOMAIN_HTTP: "A bank domain, but the connection is not secure (no https). Type the address yourself instead.",
      SHORTENER: "A shortened link hides where it goes. Do not open it from an SMS or chat.",
      IP_ADDRESS: "The link is a bare number address. Banks never send links like this.",
      HOMOGRAPH: "The address uses look-alike characters that imitate another site.",
      LOOKALIKE: "Uses a bank-like name but does not end in .bank.in. Treat it as a fake site.",
      OTHER_DOMAIN: "Not a bank domain. If the message claims to be from your bank, do not open it.",
      INVALID: "This is not a web address that can be checked.",
    } satisfies Record<LinkReason, string>,
    callerReason: {
      SERVICE_SERIES: "The 1600 series is reserved for service and transaction calls from banks and regulated financial firms.",
      PROMOTIONAL: "The 140 series is for promotional calls. Never share account details on one.",
      MOBILE:
        "An ordinary mobile number. Banks call from the 1600 series, and police, CBI or RBI never ask for money on any call.",
      INTERNATIONAL: "An international number. Indian banks and agencies do not call from abroad about your account.",
      UNRECOGNISED: "This number format is not recognised. Do not act on the call; call back on a number you find yourself.",
    } satisfies Record<CallerReason, string>,
    upiReason: {
      VALIDATED_BROKER: "A validated SEBI handle for a stockbroker. Confirm the firm's name on SEBI Check before paying.",
      VALIDATED_FUND: "A validated SEBI handle for a mutual fund. Confirm the fund's name on SEBI Check before paying.",
      VALIDATED: "A validated SEBI handle. Confirm the firm's name on SEBI Check before paying.",
      NOT_VALIDATED:
        "Not a validated handle. SEBI-registered brokers and funds collect money on IDs like name.brk@validhdfc. Do not send investment money here.",
      INVALID: "This is not a valid UPI ID.",
    } satisfies Record<UpiReason, string>,
    reportHeading: "Report or confirm",
    chakshu: "Report a suspicious call or SMS on Chakshu (Sanchar Saathi)",
    sebiCheck: "Check a broker or fund on SEBI Check",
    sachet: "Report an unregistered firm on RBI Sachet",
  },
  report: {
    title: "I already paid",
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
    stepNames: ["Act now", "Short report", "Save your code"],
    callHeading: "Call the National Cybercrime Helpline",
    callWhy: "The first hour matters most. Money reported quickly can often be put on hold before it is withdrawn.",
    checklistHeading: "Then, in your bank app and phone",
    checklist: [
      "Block your card or UPI in your bank app",
      "Note the transaction reference (UTR) of every transfer",
      "Take screenshots. Do not delete the chat.",
      "File a complaint on cybercrime.gov.in",
    ],
    continue: "Continue to the short report",
    formIntro: "Three questions. This form does not ask for your name, phone, Aadhaar or account number.",
    fraudType: {
      label: "What kind of fraud was it?",
      hint: "For a digital arrest or courier call, choose how you paid, usually UPI fraud.",
      placeholder: "Choose one",
    },
    fraudTypes: {
      UPI_FRAUD: "UPI fraud",
      INVESTMENT_SCAM: "Investment scam",
      PHISHING: "Phishing link or message",
      JOB_SCAM: "Job or task scam",
      QR_FRAUD: "QR code fraud",
      CARD_FRAUD: "Card fraud",
    } satisfies Record<FraudType, string>,
    amount: { label: "Amount lost, in rupees", hint: "Whole rupees, without commas." },
    city: { label: "Your city", hint: "Only the cities in this prototype's synthetic data are listed.", placeholder: "Choose your city" },
    submit: "Submit report",
    submitting: "Submitting…",
    back: "Back",
    errors: {
      fraudType: "Choose the kind of fraud.",
      amount: "Enter an amount from ₹1 to ₹10,00,00,000 in whole rupees.",
      city: "Choose your city.",
      rateLimited: "Too many reports from this connection. Wait a minute, then retry.",
      generic: "The report could not be submitted. Retry.",
      cities: "The city list could not be loaded. Reload the page.",
    },
    done: {
      heading: "Report received",
      idLabel: "Complaint ID",
      codeLabel: "Tracking code",
      saveWarning: "Save this code now. It is shown only once and cannot be recovered.",
      copy: "Copy code",
      copied: "Copied",
      copyFailed: "Select the code and copy it by hand.",
      track: "Track this report",
      stillCall: "This prototype does not forward your report. If you have not called 1930 yet, call now.",
    },
  },
  status: {
    title: "Track my report",
    lede: "Enter the complaint ID and tracking code you saved.",
    idLabel: "Complaint ID",
    idHint: "It looks like C-12345.",
    codeLabel: "Tracking code",
    codeHint: "16 letters and digits. Dashes are optional.",
    useLast: "Use the report you just filed",
    submit: "Check status",
    submitting: "Checking…",
    notFound: "No report matches this complaint ID and tracking code. Check both and retry.",
    invalid: "Check the format of the complaint ID and the tracking code.",
    generic: "The status could not be loaded. Retry.",
    progress: "Progress",
    updated: "Last updated",
    stages: {
      RECEIVED: "Received",
      UNDER_REVIEW: "Under review",
    ALERT_SENT: "Internal alert queued for prototype review",
      RESOLVED: "Resolved",
    } satisfies Record<CitizenStage, string>,
    done: "done",
    current: "current stage",
    note: STATUS_NOTE,
  },
};

type Copy = typeof en;

const hi: Copy = {
  shell: {
    brand: "स्कैम शील्ड",
    brandSub: "CyberPulse AI की ओर से",
    skip: "सामग्री पर जाएँ",
    nav: {
      home: "होम",
      check: "क्या यह स्कैम है?",
      verify: "भुगतान से पहले जाँचें",
      report: "मैं पैसे भेज चुका/चुकी हूँ",
      status: "मेरी रिपोर्ट ट्रैक करें",
    },
    language: "भाषा",
    reportNotice:
      "यह प्रोटोटाइप आपकी रिपोर्ट पुलिस या बैंक को नहीं भेजता। रिपोर्ट करने के लिए 1930 पर कॉल करें या cybercrime.gov.in का उपयोग करें।",
    alreadyPaid: "पैसे भेज चुके हैं?",
    call1930: "1930 पर कॉल करें",
    helpline: "राष्ट्रीय साइबर क्राइम हेल्पलाइन 1930",
  },
  home: {
    title: "क्या अभी कोई आपसे पैसे माँग रहा है?",
    lede: "भुगतान से पहले जाँचें। अगर पैसे भेज चुके हैं, तो पहले एक घंटे में कदम उठाएँ।",
    cards: {
      check: { title: "क्या यह स्कैम है?", body: "जो हो रहा है उसके बारे में चार छोटे सवालों के जवाब दें।" },
      verify: { title: "भुगतान से पहले जाँचें", body: "कोई लिंक, कॉल करने वाले का नंबर या UPI ID जाँचें।" },
      report: { title: "मैं पैसे भेज चुका/चुकी हूँ", body: "पहले एक घंटे में क्या करें।" },
      status: { title: "मेरी रिपोर्ट ट्रैक करें", body: "यहाँ दर्ज की गई रिपोर्ट की प्रगति देखें।" },
    },
    mule: "कभी भी किसी को अपना बैंक खाता इस्तेमाल न करने दें। उससे गुज़रा पैसा आपको धोखाधड़ी की कड़ी का हिस्सा बना देता है।",
  },
  check: {
    title: "क्या यह स्कैम है?",
    lede: "चुनें कि क्या हो रहा है, फिर जो भी मेल खाए उसे टिक करें।",
    scenarioLegend: "क्या हो रहा है?",
    questionsLegend: "जो मेल खाए उसे टिक करें",
    verdict: {
      STOP: "रुकें। यह एक जाने-पहचाने स्कैम जैसा है।",
      CAUTION: "सावधान रहें। एक चेतावनी संकेत मिलता है।",
      NONE: "इन सवालों से कोई चेतावनी संकेत नहीं मिला।",
    },
    noneNext: "फिर भी भुगतान से पहले लिंक, कॉल करने वाले का नंबर या UPI ID जाँच लें।",
    flagCount: (matched: number, total: number) => `${total} में से ${matched} चेतावनी संकेत मिलते हैं`,
    whyHeading: "ये चेतावनी संकेत क्यों हैं",
    stepsHeading: "अभी यह करें",
    sourcesHeading: "आधार",
    verifyLink: "लिंक, नंबर या UPI ID जाँचें",
    mule: "कभी भी किसी को अपना बैंक खाता इस्तेमाल न करने दें। उससे गुज़रा पैसा आपको धोखाधड़ी की कड़ी का हिस्सा बना देता है।",
  },
  verify: {
    title: "भुगतान से पहले जाँचें",
    lede: "RBI और SEBI के तय प्रारूपों से तीन छोटी जाँच।",
    privacy: "ये जाँच आपके डिवाइस पर होती हैं। आप जो भी टाइप करते हैं, वह न भेजा जाता है न सहेजा जाता है।",
    examples: "उदाहरण आज़माएँ:",
    link: { label: "SMS या चैट से आया लिंक", hint: "पूरा लिंक पेस्ट करें।", button: "लिंक जाँचें" },
    caller: { label: "आपको कॉल करने वाला नंबर", hint: "अगर +91 दिखा था, तो उसे भी लिखें।", button: "नंबर जाँचें" },
    upi: {
      label: "निवेश के लिए जिस UPI ID पर भुगतान करने को कहा गया",
      hint: "यह name@bank जैसी दिखती है।",
      button: "UPI ID जाँचें",
    },
    level: {
      PASS: "असली प्रारूप से मेल खाता है",
      CAUTION: "सावधान रहें",
      WARNING: "चेतावनी संकेत",
    },
    linkReason: {
      BANK_DOMAIN:
        "यह .bank.in पर खत्म होता है, जो भारतीय बैंकों के लिए आरक्षित डोमेन है। फिर भी किसी के भेजे लिंक पर OTP या PIN कभी न डालें।",
      BANK_DOMAIN_HTTP: "बैंक का डोमेन है, पर कनेक्शन सुरक्षित नहीं है (https नहीं)। पता खुद टाइप करें।",
      SHORTENER: "छोटा किया गया लिंक असली पता छिपाता है। SMS या चैट से आया ऐसा लिंक न खोलें।",
      IP_ADDRESS: "यह लिंक सिर्फ़ नंबर वाला पता है। बैंक ऐसे लिंक कभी नहीं भेजते।",
      HOMOGRAPH: "इस पते में ऐसे अक्षर हैं जो किसी दूसरी साइट की नकल करते हैं।",
      LOOKALIKE: "बैंक जैसा नाम है पर .bank.in पर खत्म नहीं होता। इसे नकली साइट मानें।",
      OTHER_DOMAIN: "यह बैंक का डोमेन नहीं है। अगर मैसेज बैंक के नाम से है, तो इसे न खोलें।",
      INVALID: "यह ऐसा वेब पता नहीं है जिसे जाँचा जा सके।",
    },
    callerReason: {
      SERVICE_SERIES: "1600 सीरीज़ बैंकों और विनियमित वित्तीय कंपनियों की सर्विस और लेन-देन कॉल के लिए आरक्षित है।",
      PROMOTIONAL: "140 सीरीज़ प्रचार कॉल के लिए है। ऐसी कॉल पर खाते की जानकारी कभी न दें।",
      MOBILE: "यह सामान्य मोबाइल नंबर है। बैंक 1600 सीरीज़ से कॉल करते हैं, और पुलिस, CBI या RBI किसी भी कॉल पर पैसे नहीं माँगते।",
      INTERNATIONAL: "यह विदेशी नंबर है। भारतीय बैंक और एजेंसियाँ आपके खाते के बारे में विदेश से कॉल नहीं करतीं।",
      UNRECOGNISED: "इस नंबर का प्रारूप पहचाना नहीं गया। कॉल पर कुछ न करें; खुद ढूँढे गए नंबर पर वापस कॉल करें।",
    },
    upiReason: {
      VALIDATED_BROKER: "यह स्टॉकब्रोकर का SEBI सत्यापित हैंडल है। भुगतान से पहले SEBI Check पर फ़र्म का नाम पक्का करें।",
      VALIDATED_FUND: "यह म्यूचुअल फ़ंड का SEBI सत्यापित हैंडल है। भुगतान से पहले SEBI Check पर फ़ंड का नाम पक्का करें।",
      VALIDATED: "यह SEBI सत्यापित हैंडल है। भुगतान से पहले SEBI Check पर फ़र्म का नाम पक्का करें।",
      NOT_VALIDATED:
        "यह सत्यापित हैंडल नहीं है। SEBI में पंजीकृत ब्रोकर और फ़ंड name.brk@validhdfc जैसी ID पर पैसे लेते हैं। यहाँ निवेश का पैसा न भेजें।",
      INVALID: "यह सही UPI ID नहीं है।",
    },
    reportHeading: "शिकायत करें या पुष्टि करें",
    chakshu: "संदिग्ध कॉल या SMS की शिकायत चक्षु (संचार साथी) पर करें",
    sebiCheck: "SEBI Check पर ब्रोकर या फ़ंड जाँचें",
    sachet: "अपंजीकृत कंपनी की शिकायत RBI सचेत पर करें",
  },
  report: {
    title: "मैं पैसे भेज चुका/चुकी हूँ",
    stepOf: (step: number, total: number) => `चरण ${step} / ${total}`,
    stepNames: ["अभी कदम उठाएँ", "छोटी रिपोर्ट", "अपना कोड सहेजें"],
    callHeading: "राष्ट्रीय साइबर क्राइम हेल्पलाइन पर कॉल करें",
    callWhy: "पहला घंटा सबसे अहम है। जल्दी रिपोर्ट किया गया पैसा अक्सर निकाले जाने से पहले रोका जा सकता है।",
    checklistHeading: "फिर, अपने बैंक ऐप और फ़ोन में",
    checklist: [
      "अपने बैंक ऐप में कार्ड या UPI ब्लॉक करें",
      "हर ट्रांसफ़र का ट्रांज़ैक्शन रेफ़रेंस (UTR) नोट करें",
      "स्क्रीनशॉट लें। चैट डिलीट न करें।",
      "cybercrime.gov.in पर शिकायत दर्ज करें",
    ],
    continue: "छोटी रिपोर्ट पर आगे बढ़ें",
    formIntro: "तीन सवाल। यह फ़ॉर्म आपका नाम, फ़ोन, आधार या खाता नंबर नहीं माँगता।",
    fraudType: {
      label: "यह किस तरह की धोखाधड़ी थी?",
      hint: "डिजिटल अरेस्ट या कूरियर कॉल के लिए वह चुनें जिससे भुगतान किया, आमतौर पर UPI धोखाधड़ी।",
      placeholder: "एक चुनें",
    },
    fraudTypes: {
      UPI_FRAUD: "UPI धोखाधड़ी",
      INVESTMENT_SCAM: "निवेश स्कैम",
      PHISHING: "फ़िशिंग लिंक या मैसेज",
      JOB_SCAM: "नौकरी या टास्क स्कैम",
      QR_FRAUD: "QR कोड धोखाधड़ी",
      CARD_FRAUD: "कार्ड धोखाधड़ी",
    },
    amount: { label: "गँवाई गई राशि, रुपये में", hint: "पूरे रुपये, बिना कॉमा के।" },
    city: {
      label: "आपका शहर",
      hint: "सिर्फ़ इस प्रोटोटाइप के सिंथेटिक डेटा वाले शहर दिखाए गए हैं।",
      placeholder: "अपना शहर चुनें",
    },
    submit: "रिपोर्ट भेजें",
    submitting: "भेजी जा रही है…",
    back: "पीछे",
    errors: {
      fraudType: "धोखाधड़ी का प्रकार चुनें।",
      amount: "₹1 से ₹10,00,00,000 तक की राशि पूरे रुपये में डालें।",
      city: "अपना शहर चुनें।",
      rateLimited: "इस कनेक्शन से बहुत सारी रिपोर्ट आई हैं। एक मिनट रुककर फिर कोशिश करें।",
      generic: "रिपोर्ट नहीं भेजी जा सकी। फिर कोशिश करें।",
      cities: "शहरों की सूची लोड नहीं हो सकी। पेज दोबारा लोड करें।",
    },
    done: {
      heading: "रिपोर्ट मिल गई",
      idLabel: "शिकायत ID",
      codeLabel: "ट्रैकिंग कोड",
      saveWarning: "यह कोड अभी सहेज लें। यह सिर्फ़ एक बार दिखता है और दोबारा नहीं मिल सकता।",
      copy: "कोड कॉपी करें",
      copied: "कॉपी हो गया",
      copyFailed: "कोड चुनकर खुद कॉपी करें।",
      track: "इस रिपोर्ट को ट्रैक करें",
      stillCall: "यह प्रोटोटाइप आपकी रिपोर्ट आगे नहीं भेजता। अगर अभी तक 1930 पर कॉल नहीं किया है, तो अभी करें।",
    },
  },
  status: {
    title: "मेरी रिपोर्ट ट्रैक करें",
    lede: "सहेजी गई शिकायत ID और ट्रैकिंग कोड डालें।",
    idLabel: "शिकायत ID",
    idHint: "यह C-12345 जैसी दिखती है।",
    codeLabel: "ट्रैकिंग कोड",
    codeHint: "16 अक्षर और अंक। डैश लगाना ज़रूरी नहीं।",
    useLast: "अभी दर्ज की गई रिपोर्ट इस्तेमाल करें",
    submit: "स्थिति देखें",
    submitting: "जाँच हो रही है…",
    notFound: "इस शिकायत ID और ट्रैकिंग कोड से कोई रिपोर्ट नहीं मिली। दोनों जाँचकर फिर कोशिश करें।",
    invalid: "शिकायत ID और ट्रैकिंग कोड का प्रारूप जाँचें।",
    generic: "स्थिति लोड नहीं हो सकी। फिर कोशिश करें।",
    progress: "प्रगति",
    updated: "आखिरी अपडेट",
    stages: {
      RECEIVED: "मिल गई",
      UNDER_REVIEW: "जाँच जारी",
      ALERT_SENT: "प्रोटोटाइप समीक्षा के लिए आंतरिक अलर्ट कतारबद्ध",
      RESOLVED: "सुलझ गई",
    },
    done: "पूरा",
    current: "मौजूदा चरण",
    note: "आपको यहाँ स्थिति की जानकारी मिलेगी। जाँच का ब्योरा सिर्फ़ पुलिस और बैंक के साथ साझा होता है।",
  },
};

export const COPY: Readonly<Record<Lang, Copy>> = Object.fromEntries(
  SAFETY_LOCALES.map(({ code }) => [code, code === "hi" ? hi : en]),
) as Record<Lang, Copy>;

/** Reviewed English is the safe fallback while other locales are translated. */
export function copyFor(lang: Lang): Copy {
  return lang === "hi" ? hi : en;
}

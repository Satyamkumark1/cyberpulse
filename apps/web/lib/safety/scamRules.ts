// FEAT-17 Scam Check (FR-26). Fixed rules, no model: a person deciding whether
// to hang up needs reasons, not a probability. Every question names the public
// advisory it comes from, so the content can be checked and kept current.
// Review this file whenever an advisory changes (phase-9.md §7).

import type { SafetyLocale } from "./locales";

export type Lang = SafetyLocale;
export type Text = Readonly<Record<"en" | "hi", string> & Partial<Record<Lang, string>>>;

export const ADVISORY_SOURCES = {
  NITI_DIGITAL_ARREST: "NITI Aayog, Digital Arrest: The Modern Day Cyber Scam (2025)",
  I4C_CYBER_DOST: "I4C Cyber Dost advisories",
  RBI_BEAWARE: "RBI, BE(A)WARE booklet on financial frauds",
  RBI_BANK_IN: "RBI, bank.in domain for Indian banks (2025)",
  RBI_1600: "RBI, 1600xx numbers for bank service calls (2025)",
  SEBI_VALID_UPI: "SEBI, validated UPI handles for investors (2025)",
} as const;
export type AdvisorySource = keyof typeof ADVISORY_SOURCES;

export interface ScamQuestion {
  text: Text;
  reason: Text;
  source: AdvisorySource;
}

export const SCENARIO_IDS = ["DIGITAL_ARREST", "COURIER", "JOB", "INVESTMENT", "QR_UPI", "KYC"] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export interface ScamScenario {
  name: Text;
  questions: readonly ScamQuestion[];
  steps: readonly Text[];
}

const CALL_1930_IF_PAID: Text = {
  en: "If you already paid, call 1930 now.",
  hi: "अगर पैसे भेज चुके हैं, तो अभी 1930 पर कॉल करें।",
};

export const SCENARIOS: Readonly<Record<ScenarioId, ScamScenario>> = {
  DIGITAL_ARREST: {
    name: { en: "Digital arrest call", hi: "डिजिटल अरेस्ट कॉल" },
    questions: [
      {
        text: {
          en: "The caller says they are from police, CBI, ED, customs or RBI",
          hi: "कॉल करने वाला खुद को पुलिस, CBI, ED, कस्टम या RBI से बताता है",
        },
        reason: {
          en: "Real agencies do not open or settle cases over a phone or video call.",
          hi: "असली जाँच एजेंसियाँ फ़ोन या वीडियो कॉल पर केस नहीं खोलतीं और न ही निपटाती हैं।",
        },
        source: "NITI_DIGITAL_ARREST",
      },
      {
        text: {
          en: "They say a case, parcel or bank account in your name is linked to a crime",
          hi: "वे कहते हैं कि आपके नाम का कोई केस, पार्सल या बैंक खाता किसी अपराध से जुड़ा है",
        },
        reason: {
          en: "Creating fear is how this scam starts. It is not how an investigation works.",
          hi: "डर पैदा करना इस ठगी की शुरुआत है। असली जाँच ऐसे नहीं होती।",
        },
        source: "I4C_CYBER_DOST",
      },
      {
        text: {
          en: "They tell you to stay on a video call and not tell your family",
          hi: "वे आपसे वीडियो कॉल पर बने रहने और परिवार को न बताने को कहते हैं",
        },
        reason: {
          en: "Keeping you alone and on camera is the core of this scam. There is no such thing as a digital arrest.",
          hi: "आपको अकेला और कैमरे के सामने रखना इस ठगी का मुख्य तरीका है। डिजिटल अरेस्ट जैसी कोई चीज़ नहीं होती।",
        },
        source: "NITI_DIGITAL_ARREST",
      },
      {
        text: {
          en: "They ask you to move money to a 'safe' or 'verification' account",
          hi: "वे पैसे किसी 'सुरक्षित' या 'वेरिफ़िकेशन' खाते में भेजने को कहते हैं",
        },
        reason: {
          en: "No agency in India asks you to transfer money to prove your innocence. This transfer is the theft.",
          hi: "भारत में कोई भी एजेंसी बेगुनाही साबित करने के लिए पैसे ट्रांसफ़र नहीं करवाती। यही ट्रांसफ़र असली चोरी है।",
        },
        source: "I4C_CYBER_DOST",
      },
    ],
    steps: [
      { en: "Hang up. You are not under arrest.", hi: "कॉल काट दें। आप गिरफ़्तार नहीं हैं।" },
      { en: "Tell a family member now.", hi: "अभी परिवार के किसी सदस्य को बताएँ।" },
      { en: "Report the number on Chakshu (Sanchar Saathi).", hi: "नंबर की शिकायत चक्षु (संचार साथी) पर करें।" },
      CALL_1930_IF_PAID,
    ],
  },

  COURIER: {
    name: { en: "Courier or customs call", hi: "कूरियर या कस्टम कॉल" },
    questions: [
      {
        text: {
          en: "A caller says a parcel in your name has drugs, fake passports or cash",
          hi: "कॉल करने वाला कहता है कि आपके नाम के पार्सल में ड्रग्स, नकली पासपोर्ट या नकदी है",
        },
        reason: {
          en: "Courier companies do not call you about seized parcels.",
          hi: "कूरियर कंपनियाँ ज़ब्त पार्सल के बारे में आपको कॉल नहीं करतीं।",
        },
        source: "I4C_CYBER_DOST",
      },
      {
        text: {
          en: "Your call is 'transferred' to a police or narcotics officer",
          hi: "आपकी कॉल किसी पुलिस या नारकोटिक्स अधिकारी को 'ट्रांसफ़र' की जाती है",
        },
        reason: {
          en: "The transfer is staged. Both callers work together.",
          hi: "यह ट्रांसफ़र एक नाटक है। दोनों कॉल करने वाले साथ मिलकर काम करते हैं।",
        },
        source: "NITI_DIGITAL_ARREST",
      },
      {
        text: {
          en: "You are asked to pay a fee or fine to clear your name",
          hi: "नाम साफ़ करने के लिए फ़ीस या जुर्माना भरने को कहा जाता है",
        },
        reason: {
          en: "A fine is never collected by UPI into a personal account.",
          hi: "जुर्माना कभी भी UPI से किसी निजी खाते में नहीं लिया जाता।",
        },
        source: "RBI_BEAWARE",
      },
      {
        text: {
          en: "They ask you to install an app or share your screen",
          hi: "वे कोई ऐप इंस्टॉल करने या स्क्रीन शेयर करने को कहते हैं",
        },
        reason: {
          en: "Screen-sharing and remote-access apps let them read your OTPs and control your phone.",
          hi: "स्क्रीन शेयर और रिमोट-एक्सेस ऐप से वे आपके OTP पढ़ सकते हैं और आपका फ़ोन चला सकते हैं।",
        },
        source: "RBI_BEAWARE",
      },
    ],
    steps: [
      { en: "Hang up and do not install anything.", hi: "कॉल काटें और कुछ भी इंस्टॉल न करें।" },
      {
        en: "Check with the courier company using the number on its own website.",
        hi: "कूरियर कंपनी से उसकी अपनी वेबसाइट पर दिए नंबर पर बात करें।",
      },
      CALL_1930_IF_PAID,
    ],
  },

  JOB: {
    name: { en: "Job or task offer", hi: "नौकरी या टास्क का ऑफ़र" },
    questions: [
      {
        text: {
          en: "You are paid to like videos, rate hotels or write reviews",
          hi: "आपको वीडियो लाइक करने, होटल रेट करने या रिव्यू लिखने के पैसे दिए जाते हैं",
        },
        reason: {
          en: "Easy paid tasks are the hook. The first small payments are real on purpose.",
          hi: "आसान काम के पैसे बस चारा हैं। शुरुआती छोटे भुगतान जानबूझकर असली होते हैं।",
        },
        source: "I4C_CYBER_DOST",
      },
      {
        text: {
          en: "You were added to a Telegram or WhatsApp group where members show their earnings",
          hi: "आपको किसी टेलीग्राम या व्हाट्सऐप ग्रुप में जोड़ा गया है जहाँ सदस्य अपनी कमाई दिखाते हैं",
        },
        reason: {
          en: "Most members and their earnings screenshots are fake.",
          hi: "ज़्यादातर सदस्य और उनकी कमाई के स्क्रीनशॉट नकली होते हैं।",
        },
        source: "I4C_CYBER_DOST",
      },
      {
        text: {
          en: "You are now asked to deposit money to unlock bigger earnings",
          hi: "अब बड़ी कमाई 'अनलॉक' करने के लिए पैसे जमा करने को कहा जा रहा है",
        },
        reason: {
          en: "This is where the money is taken. Deposits in these schemes do not come back.",
          hi: "यहीं पर पैसा लिया जाता है। ऐसी योजनाओं में जमा पैसा वापस नहीं आता।",
        },
        source: "I4C_CYBER_DOST",
      },
      {
        text: {
          en: "Someone offers to pay you for the use of your bank account",
          hi: "कोई आपके बैंक खाते के इस्तेमाल के बदले पैसे देने की पेशकश करता है",
        },
        reason: {
          en: "That makes your account a mule account. It can be frozen and you can face legal action.",
          hi: "इससे आपका खाता म्यूल खाता बन जाता है। खाता फ़्रीज़ हो सकता है और आप पर कानूनी कार्रवाई हो सकती है।",
        },
        source: "I4C_CYBER_DOST",
      },
    ],
    steps: [
      { en: "Stop depositing. Do not pay any 'withdrawal fee'.", hi: "पैसे जमा करना बंद करें। कोई 'निकासी फ़ीस' न भरें।" },
      { en: "Leave the group and block the contact.", hi: "ग्रुप छोड़ें और संपर्क को ब्लॉक करें।" },
      CALL_1930_IF_PAID,
    ],
  },

  INVESTMENT: {
    name: { en: "Investment tip or trading app", hi: "निवेश टिप या ट्रेडिंग ऐप" },
    questions: [
      {
        text: { en: "You are promised fixed high returns", hi: "आपसे तय और ऊँचे रिटर्न का वादा किया गया है" },
        reason: {
          en: "No real investment can promise a fixed high return.",
          hi: "कोई भी असली निवेश तय और ऊँचे रिटर्न का वादा नहीं कर सकता।",
        },
        source: "I4C_CYBER_DOST",
      },
      {
        text: {
          en: "You joined a WhatsApp or Telegram 'tips' group that shows big profits",
          hi: "आप किसी व्हाट्सऐप या टेलीग्राम 'टिप्स' ग्रुप से जुड़े हैं जो बड़ा मुनाफ़ा दिखाता है",
        },
        reason: {
          en: "Profit screenshots in these groups are easy to fake.",
          hi: "इन ग्रुप में मुनाफ़े के स्क्रीनशॉट आसानी से नकली बनाए जाते हैं।",
        },
        source: "I4C_CYBER_DOST",
      },
      {
        text: {
          en: "The UPI ID for payment does not end in @valid followed by a bank name",
          hi: "भुगतान वाली UPI ID के अंत में @valid और बैंक का नाम नहीं है",
        },
        reason: {
          en: "SEBI-registered brokers and mutual funds collect money on @valid handles, such as name.brk@validhdfc.",
          hi: "SEBI में पंजीकृत ब्रोकर और म्यूचुअल फ़ंड @valid हैंडल पर पैसे लेते हैं, जैसे name.brk@validhdfc।",
        },
        source: "SEBI_VALID_UPI",
      },
      {
        text: {
          en: "You cannot withdraw unless you first pay a 'tax' or 'fee'",
          hi: "पहले 'टैक्स' या 'फ़ीस' भरे बिना आप पैसे नहीं निकाल सकते",
        },
        reason: {
          en: "The balance shown in the app is not real. Paying more only adds to the loss.",
          hi: "ऐप में दिखने वाला बैलेंस असली नहीं है। और पैसे भरने से नुकसान ही बढ़ेगा।",
        },
        source: "I4C_CYBER_DOST",
      },
    ],
    steps: [
      { en: "Stop paying into the app.", hi: "ऐप में पैसे भरना बंद करें।" },
      { en: "Check the firm on SEBI Check before any payment.", hi: "किसी भी भुगतान से पहले फ़र्म को SEBI Check पर जाँचें।" },
      CALL_1930_IF_PAID,
    ],
  },

  QR_UPI: {
    name: { en: "QR code or UPI request", hi: "QR कोड या UPI रिक्वेस्ट" },
    questions: [
      {
        text: { en: "Someone sends a QR code so you can 'receive' money", hi: "कोई आपको पैसे 'पाने' के लिए QR कोड भेजता है" },
        reason: {
          en: "Scanning a QR code only ever sends money. You never scan to receive.",
          hi: "QR कोड स्कैन करने से पैसा हमेशा जाता है। पैसे पाने के लिए कभी स्कैन नहीं करना पड़ता।",
        },
        source: "RBI_BEAWARE",
      },
      {
        text: { en: "You are asked to enter your UPI PIN to receive a payment", hi: "पैसे पाने के लिए आपसे UPI PIN डालने को कहा जाता है" },
        reason: {
          en: "A UPI PIN is needed only to pay. Receiving money never needs it.",
          hi: "UPI PIN सिर्फ़ भुगतान करने के लिए चाहिए। पैसे पाने के लिए कभी नहीं।",
        },
        source: "RBI_BEAWARE",
      },
      {
        text: {
          en: "A buyer on a selling site wants to pay you an 'advance' first",
          hi: "किसी सेलिंग साइट पर खरीदार पहले 'एडवांस' भेजना चाहता है",
        },
        reason: {
          en: "This is a common setup on resale sites to get you to scan a code or approve a request.",
          hi: "रीसेल साइट पर यह आम तरीका है, ताकि आप कोड स्कैन करें या रिक्वेस्ट मंज़ूर करें।",
        },
        source: "I4C_CYBER_DOST",
      },
      {
        text: {
          en: "You get a 'collect request' and are told to approve it",
          hi: "आपको 'कलेक्ट रिक्वेस्ट' आती है और उसे मंज़ूर करने को कहा जाता है",
        },
        reason: {
          en: "Approving a collect request sends money out of your account.",
          hi: "कलेक्ट रिक्वेस्ट मंज़ूर करने से पैसा आपके खाते से जाता है।",
        },
        source: "RBI_BEAWARE",
      },
    ],
    steps: [
      { en: "Do not scan or approve anything.", hi: "कुछ भी स्कैन या मंज़ूर न करें।" },
      { en: "Ask the buyer to pay directly to your UPI ID.", hi: "खरीदार से सीधे आपकी UPI ID पर पैसे भेजने को कहें।" },
      {
        en: "If money has left your account, call 1930 now.",
        hi: "अगर पैसा खाते से जा चुका है, तो अभी 1930 पर कॉल करें।",
      },
    ],
  },

  KYC: {
    name: { en: "KYC or bank update message", hi: "KYC या बैंक अपडेट का मैसेज" },
    questions: [
      {
        text: {
          en: "A message says your account will be blocked today unless you update KYC",
          hi: "मैसेज में लिखा है कि KYC अपडेट न करने पर आज ही खाता बंद हो जाएगा",
        },
        reason: {
          en: "Banks do not block accounts through SMS deadlines. The urgency is there to pressure you.",
          hi: "बैंक SMS की समय-सीमा देकर खाते बंद नहीं करते। जल्दबाज़ी आप पर दबाव डालने के लिए है।",
        },
        source: "RBI_BEAWARE",
      },
      {
        text: { en: "The link does not end in .bank.in", hi: "लिंक के अंत में .bank.in नहीं है" },
        reason: {
          en: "Indian bank websites are moving to the .bank.in domain, which only banks can register.",
          hi: "भारतीय बैंकों की वेबसाइटें .bank.in डोमेन पर आ रही हैं, जिसे सिर्फ़ बैंक ही रजिस्टर कर सकते हैं।",
        },
        source: "RBI_BANK_IN",
      },
      {
        text: { en: "You are asked for an OTP, PIN, CVV or card number", hi: "आपसे OTP, PIN, CVV या कार्ड नंबर माँगा जाता है" },
        reason: {
          en: "Your bank never asks for these on a call, SMS or link.",
          hi: "आपका बैंक इन्हें कभी कॉल, SMS या लिंक से नहीं माँगता।",
        },
        source: "RBI_BEAWARE",
      },
      {
        text: {
          en: "The 'bank' is calling you from a number that does not start with 1600",
          hi: "'बैंक' आपको ऐसे नंबर से कॉल कर रहा है जो 1600 से शुरू नहीं होता",
        },
        reason: {
          en: "Banks make service and transaction calls from 1600xx numbers.",
          hi: "बैंक सर्विस और लेन-देन से जुड़ी कॉल 1600xx नंबरों से करते हैं।",
        },
        source: "RBI_1600",
      },
    ],
    steps: [
      { en: "Do not open the link.", hi: "लिंक न खोलें।" },
      { en: "Call your bank on the number printed on your card.", hi: "अपने कार्ड पर छपे नंबर पर बैंक को कॉल करें।" },
      {
        en: "If you shared an OTP or money left your account, call 1930 now.",
        hi: "अगर OTP बता दिया है या पैसा खाते से गया है, तो अभी 1930 पर कॉल करें।",
      },
    ],
  },
};

export type ScamVerdict = "NONE" | "CAUTION" | "STOP";

/** AC-017-02. Two matched flags is a known pattern; one is a warning sign. */
export function evaluateAnswers(matchedCount: number): ScamVerdict {
  if (matchedCount >= 2) return "STOP";
  if (matchedCount === 1) return "CAUTION";
  return "NONE";
}

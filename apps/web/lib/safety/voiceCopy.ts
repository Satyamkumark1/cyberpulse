import type { SafetyLocale } from "./locales";

// Scam Shield chat interface text for all 28 safety locales.
//
// UNREVIEWED: every language except English is machine-drafted and has not had
// the native-speaker review phase-9.md requires before release (see copy.ts).
// Mitigation until then: the safety notice is always shown in English as well,
// and the helpline keeps its fixed English label (HELPLINE_LABEL in copy.ts).
// Must not use the CLAUDE.md §Terminology prohibited words in any language.

export type VoiceCopy = {
  open: string; launcherTitle: string; launcherHint: string; dialogLabel: string; subtitle: string;
  notice: string; welcome: string; emptyTitle: string; emptyBody: string;
  starters: readonly [readonly [string, string], readonly [string, string], readonly [string, string], readonly [string, string]];
  whereToGo: string; next: { REPORT: string; STATUS: string; VERIFY: string; CHECK: string };
  refSanchar: string; refBank: string; urgent: string; copy: string; copied: string; readAloud: string;
  thinking: string; transcribing: string; placeholder: string; listening: string; typeLabel: string;
  speak: string; stop: string; send: string; disclaimer: string; close: string; mute: string; unmute: string;
  unavailable: string; micUnsupported: string; micDenied: string; transcribeFailed: string; noVoice: string;
  /** Present only where replies come in another language (voiceAgent.ts replyLanguage). */
  note?: string;
};

const en: VoiceCopy = {
  open: "Open Scam Shield voice assistant", launcherTitle: "Talk to Scam Shield", launcherHint: "Voice or type what happened",
  dialogLabel: "Scam Shield AI assistant", subtitle: "Safety assistant",
  notice: "Never share an OTP, PIN, password, CVV, or full bank details.",
  welcome: "Hello. Tell me what is happening, or ask me to check, verify, report, or track something. Never share an OTP, PIN, password, or CVV.",
  emptyTitle: "What happened?", emptyBody: "Tell me in your own words, or ask me to check, verify, report, or track something.",
  starters: [["Someone is asking", "for my OTP"], ["I already sent money", "to a caller"], ["Is this link or number", "safe to use?"], ["Track my report", "with my complaint ID"]],
  whereToGo: "Where to go", next: { REPORT: "Open urgent report steps", STATUS: "Track my report", VERIFY: "Open verification", CHECK: "Check for scam signs" },
  refSanchar: "Report a fraud call", refBank: "Your bank's app or card helpline", urgent: "Urgent",
  copy: "Copy reply", copied: "Copied", readAloud: "Read reply aloud", thinking: "Thinking", transcribing: "Transcribing your voice",
  placeholder: "Message Scam Shield", listening: "Listening…", typeLabel: "Type your message", speak: "Speak your message",
  stop: "Stop recording", send: "Send message", disclaimer: "AI can make mistakes. Confirm important actions yourself.",
  close: "Close assistant", mute: "Mute spoken responses", unmute: "Enable spoken responses",
  unavailable: "The assistant is unavailable.", micUnsupported: "Voice recording is not supported here. Type your message instead.",
  micDenied: "Microphone access was not allowed. You can type your message instead.", transcribeFailed: "I could not understand the recording.",
  noVoice: "Spoken replies are not available for this language on this device.",
};

const hi: VoiceCopy = {
  open: "Scam Shield वॉइस सहायक खोलें", launcherTitle: "Scam Shield से बात करें", launcherHint: "बोलकर या लिखकर बताएं क्या हुआ",
  dialogLabel: "Scam Shield AI सहायक", subtitle: "सुरक्षा सहायक",
  notice: "OTP, PIN, पासवर्ड, CVV या पूरी बैंक जानकारी कभी साझा न करें।",
  welcome: "नमस्ते। बताइए क्या हो रहा है, या मुझसे जाँचने, सत्यापित करने, रिपोर्ट करने या ट्रैक करने को कहें। OTP, PIN, पासवर्ड या CVV कभी साझा न करें।",
  emptyTitle: "क्या हुआ?", emptyBody: "अपने शब्दों में बताइए, या मुझसे जाँचने, सत्यापित करने, रिपोर्ट करने या ट्रैक करने को कहें।",
  starters: [["कोई मुझसे", "OTP माँग रहा है"], ["मैंने एक कॉलर को", "पैसे भेज दिए"], ["क्या यह लिंक या नंबर", "सुरक्षित है?"], ["मेरी रिपोर्ट ट्रैक करें", "शिकायत ID से"]],
  whereToGo: "कहाँ जाएं", next: { REPORT: "तुरंत रिपोर्ट के कदम खोलें", STATUS: "मेरी रिपोर्ट ट्रैक करें", VERIFY: "सत्यापन खोलें", CHECK: "स्कैम के संकेत जाँचें" },
  refSanchar: "धोखाधड़ी कॉल की रिपोर्ट करें", refBank: "आपके बैंक का ऐप या कार्ड हेल्पलाइन", urgent: "तुरंत",
  copy: "जवाब कॉपी करें", copied: "कॉपी हो गया", readAloud: "जवाब पढ़कर सुनाएं", thinking: "सोच रहा है", transcribing: "आपकी आवाज़ लिखी जा रही है",
  placeholder: "Scam Shield को संदेश लिखें", listening: "सुन रहा है…", typeLabel: "अपना संदेश लिखें", speak: "अपना संदेश बोलें",
  stop: "रिकॉर्डिंग रोकें", send: "संदेश भेजें", disclaimer: "AI गलती कर सकता है। ज़रूरी कदम खुद पुष्टि करें।",
  close: "सहायक बंद करें", mute: "बोले गए जवाब बंद करें", unmute: "बोले गए जवाब चालू करें",
  unavailable: "सहायक अभी उपलब्ध नहीं है।", micUnsupported: "यहाँ आवाज़ रिकॉर्डिंग संभव नहीं है। कृपया लिखकर भेजें।",
  micDenied: "माइक्रोफ़ोन की अनुमति नहीं मिली। आप लिखकर संदेश भेज सकते हैं।", transcribeFailed: "रिकॉर्डिंग समझ नहीं आई।",
  noVoice: "इस डिवाइस पर इस भाषा में बोलकर जवाब उपलब्ध नहीं है।",
};

const bn: VoiceCopy = {
  open: "Scam Shield ভয়েস সহকারী খুলুন", launcherTitle: "Scam Shield-এর সঙ্গে কথা বলুন", launcherHint: "বলে বা লিখে জানান কী হয়েছে",
  dialogLabel: "Scam Shield AI সহকারী", subtitle: "নিরাপত্তা সহকারী",
  notice: "OTP, PIN, পাসওয়ার্ড, CVV বা সম্পূর্ণ ব্যাংক তথ্য কখনও শেয়ার করবেন না।",
  welcome: "নমস্কার। কী ঘটছে বলুন, অথবা আমাকে যাচাই, রিপোর্ট বা ট্র্যাক করতে বলুন। OTP, PIN, পাসওয়ার্ড বা CVV কখনও শেয়ার করবেন না।",
  emptyTitle: "কী হয়েছে?", emptyBody: "নিজের ভাষায় বলুন, অথবা আমাকে যাচাই, রিপোর্ট বা ট্র্যাক করতে বলুন।",
  starters: [["কেউ আমার কাছে", "OTP চাইছে"], ["আমি একজন কলারকে", "টাকা পাঠিয়ে দিয়েছি"], ["এই লিংক বা নম্বর", "কি নিরাপদ?"], ["আমার রিপোর্ট ট্র্যাক করুন", "অভিযোগ ID দিয়ে"]],
  whereToGo: "কোথায় যাবেন", next: { REPORT: "জরুরি রিপোর্টের ধাপ খুলুন", STATUS: "আমার রিপোর্ট ট্র্যাক করুন", VERIFY: "যাচাই খুলুন", CHECK: "স্ক্যামের লক্ষণ দেখুন" },
  refSanchar: "প্রতারণামূলক কল রিপোর্ট করুন", refBank: "আপনার ব্যাংকের অ্যাপ বা কার্ড হেল্পলাইন", urgent: "জরুরি",
  copy: "উত্তর কপি করুন", copied: "কপি হয়েছে", readAloud: "উত্তর পড়ে শোনান", thinking: "ভাবছে", transcribing: "আপনার কণ্ঠস্বর লেখা হচ্ছে",
  placeholder: "Scam Shield-কে বার্তা লিখুন", listening: "শুনছে…", typeLabel: "আপনার বার্তা লিখুন", speak: "আপনার বার্তা বলুন",
  stop: "রেকর্ডিং বন্ধ করুন", send: "বার্তা পাঠান", disclaimer: "AI ভুল করতে পারে। গুরুত্বপূর্ণ পদক্ষেপ নিজে নিশ্চিত করুন।",
  close: "সহকারী বন্ধ করুন", mute: "কথ্য উত্তর বন্ধ করুন", unmute: "কথ্য উত্তর চালু করুন",
  unavailable: "সহকারী এখন উপলব্ধ নয়।", micUnsupported: "এখানে ভয়েস রেকর্ডিং সমর্থিত নয়। লিখে পাঠান।",
  micDenied: "মাইক্রোফোনের অনুমতি দেওয়া হয়নি। আপনি লিখে পাঠাতে পারেন।", transcribeFailed: "রেকর্ডিংটি বুঝতে পারিনি।",
  noVoice: "এই ডিভাইসে এই ভাষায় কথ্য উত্তর উপলব্ধ নয়।",
};

const mr: VoiceCopy = {
  open: "Scam Shield व्हॉइस सहाय्यक उघडा", launcherTitle: "Scam Shield शी बोला", launcherHint: "बोलून किंवा लिहून सांगा काय झाले",
  dialogLabel: "Scam Shield AI सहाय्यक", subtitle: "सुरक्षा सहाय्यक",
  notice: "OTP, PIN, पासवर्ड, CVV किंवा संपूर्ण बँक तपशील कधीही शेअर करू नका.",
  welcome: "नमस्कार. काय घडत आहे ते सांगा, किंवा तपासणी, पडताळणी, तक्रार किंवा ट्रॅक करण्यास सांगा. OTP, PIN, पासवर्ड किंवा CVV कधीही शेअर करू नका.",
  emptyTitle: "काय झाले?", emptyBody: "तुमच्या शब्दांत सांगा, किंवा तपासणी, पडताळणी, तक्रार किंवा ट्रॅक करण्यास सांगा.",
  starters: [["कोणीतरी माझा", "OTP मागत आहे"], ["मी एका कॉलरला", "पैसे पाठवले"], ["ही लिंक किंवा नंबर", "सुरक्षित आहे का?"], ["माझी तक्रार ट्रॅक करा", "तक्रार ID ने"]],
  whereToGo: "कुठे जावे", next: { REPORT: "तातडीच्या तक्रारीचे टप्पे उघडा", STATUS: "माझी तक्रार ट्रॅक करा", VERIFY: "पडताळणी उघडा", CHECK: "स्कॅमची लक्षणे तपासा" },
  refSanchar: "फसवणुकीच्या कॉलची तक्रार करा", refBank: "तुमच्या बँकेचे ॲप किंवा कार्ड हेल्पलाइन", urgent: "तातडीचे",
  copy: "उत्तर कॉपी करा", copied: "कॉपी झाले", readAloud: "उत्तर वाचून दाखवा", thinking: "विचार करत आहे", transcribing: "तुमचा आवाज लिहिला जात आहे",
  placeholder: "Scam Shield ला संदेश लिहा", listening: "ऐकत आहे…", typeLabel: "तुमचा संदेश लिहा", speak: "तुमचा संदेश बोला",
  stop: "रेकॉर्डिंग थांबवा", send: "संदेश पाठवा", disclaimer: "AI चुका करू शकते. महत्त्वाच्या कृती स्वतः खात्री करा.",
  close: "सहाय्यक बंद करा", mute: "बोललेली उत्तरे बंद करा", unmute: "बोललेली उत्तरे सुरू करा",
  unavailable: "सहाय्यक सध्या उपलब्ध नाही.", micUnsupported: "येथे आवाज रेकॉर्डिंग शक्य नाही. संदेश लिहा.",
  micDenied: "मायक्रोफोनची परवानगी मिळाली नाही. तुम्ही संदेश लिहू शकता.", transcribeFailed: "रेकॉर्डिंग समजले नाही.",
  noVoice: "या डिव्हाइसवर या भाषेत बोललेली उत्तरे उपलब्ध नाहीत.",
};

const gu: VoiceCopy = {
  open: "Scam Shield વૉઇસ સહાયક ખોલો", launcherTitle: "Scam Shield સાથે વાત કરો", launcherHint: "બોલીને અથવા લખીને જણાવો શું થયું",
  dialogLabel: "Scam Shield AI સહાયક", subtitle: "સુરક્ષા સહાયક",
  notice: "OTP, PIN, પાસવર્ડ, CVV અથવા સંપૂર્ણ બેંક વિગતો ક્યારેય શેર ન કરો.",
  welcome: "નમસ્તે. શું થઈ રહ્યું છે તે જણાવો, અથવા મને તપાસવા, ચકાસવા, ફરિયાદ કરવા કે ટ્રેક કરવા કહો. OTP, PIN, પાસવર્ડ અથવા CVV ક્યારેય શેર ન કરો.",
  emptyTitle: "શું થયું?", emptyBody: "તમારા શબ્દોમાં જણાવો, અથવા મને તપાસવા, ચકાસવા, ફરિયાદ કરવા કે ટ્રેક કરવા કહો.",
  starters: [["કોઈ મારો", "OTP માગે છે"], ["મેં એક કૉલરને", "પૈસા મોકલી દીધા"], ["શું આ લિંક કે નંબર", "સુરક્ષિત છે?"], ["મારી ફરિયાદ ટ્રેક કરો", "ફરિયાદ ID વડે"]],
  whereToGo: "ક્યાં જવું", next: { REPORT: "તાત્કાલિક ફરિયાદનાં પગલાં ખોલો", STATUS: "મારી ફરિયાદ ટ્રેક કરો", VERIFY: "ચકાસણી ખોલો", CHECK: "સ્કેમના સંકેતો તપાસો" },
  refSanchar: "છેતરપિંડીવાળા કૉલની ફરિયાદ કરો", refBank: "તમારી બેંકની ઍપ અથવા કાર્ડ હેલ્પલાઇન", urgent: "તાત્કાલિક",
  copy: "જવાબ કૉપિ કરો", copied: "કૉપિ થયું", readAloud: "જવાબ વાંચી સંભળાવો", thinking: "વિચારે છે", transcribing: "તમારો અવાજ લખાઈ રહ્યો છે",
  placeholder: "Scam Shield ને સંદેશ લખો", listening: "સાંભળે છે…", typeLabel: "તમારો સંદેશ લખો", speak: "તમારો સંદેશ બોલો",
  stop: "રેકોર્ડિંગ બંધ કરો", send: "સંદેશ મોકલો", disclaimer: "AI ભૂલ કરી શકે છે. મહત્વનાં પગલાં જાતે ખાતરી કરો.",
  close: "સહાયક બંધ કરો", mute: "બોલાયેલા જવાબ બંધ કરો", unmute: "બોલાયેલા જવાબ ચાલુ કરો",
  unavailable: "સહાયક હાલમાં ઉપલબ્ધ નથી.", micUnsupported: "અહીં અવાજ રેકોર્ડિંગ શક્ય નથી. સંદેશ લખો.",
  micDenied: "માઇક્રોફોનની પરવાનગી મળી નથી. તમે સંદેશ લખી શકો છો.", transcribeFailed: "રેકોર્ડિંગ સમજાયું નહીં.",
  noVoice: "આ ઉપકરણ પર આ ભાષામાં બોલાયેલા જવાબ ઉપલબ્ધ નથી.",
};

const ta: VoiceCopy = {
  open: "Scam Shield குரல் உதவியாளரைத் திறக்கவும்", launcherTitle: "Scam Shield உடன் பேசுங்கள்", launcherHint: "என்ன நடந்தது என்று பேசுங்கள் அல்லது எழுதுங்கள்",
  dialogLabel: "Scam Shield AI உதவியாளர்", subtitle: "பாதுகாப்பு உதவியாளர்",
  notice: "OTP, PIN, கடவுச்சொல், CVV அல்லது முழு வங்கி விவரங்களை ஒருபோதும் பகிர வேண்டாம்.",
  welcome: "வணக்கம். என்ன நடக்கிறது என்று சொல்லுங்கள், அல்லது சரிபார்க்க, புகார் செய்ய அல்லது கண்காணிக்கச் சொல்லுங்கள். OTP, PIN, கடவுச்சொல் அல்லது CVV ஒருபோதும் பகிர வேண்டாம்.",
  emptyTitle: "என்ன நடந்தது?", emptyBody: "உங்கள் சொந்த வார்த்தைகளில் சொல்லுங்கள், அல்லது சரிபார்க்க, புகார் செய்ய அல்லது கண்காணிக்கச் சொல்லுங்கள்.",
  starters: [["யாரோ என்னிடம்", "OTP கேட்கிறார்கள்"], ["நான் ஒரு அழைப்பாளருக்கு", "பணம் அனுப்பிவிட்டேன்"], ["இந்த இணைப்பு அல்லது எண்", "பாதுகாப்பானதா?"], ["என் புகாரைக் கண்காணி", "புகார் ID மூலம்"]],
  whereToGo: "எங்கு செல்வது", next: { REPORT: "அவசர புகார் படிகளைத் திறக்கவும்", STATUS: "என் புகாரைக் கண்காணி", VERIFY: "சரிபார்ப்பைத் திறக்கவும்", CHECK: "மோசடி அறிகுறிகளைச் சரிபார்க்கவும்" },
  refSanchar: "மோசடி அழைப்பைப் புகாரளிக்கவும்", refBank: "உங்கள் வங்கியின் செயலி அல்லது அட்டை உதவி எண்", urgent: "அவசரம்",
  copy: "பதிலை நகலெடு", copied: "நகலெடுக்கப்பட்டது", readAloud: "பதிலை வாசித்துக் காட்டு", thinking: "யோசிக்கிறது", transcribing: "உங்கள் குரல் எழுத்தாக்கப்படுகிறது",
  placeholder: "Scam Shield க்குச் செய்தி எழுதுங்கள்", listening: "கேட்கிறது…", typeLabel: "உங்கள் செய்தியை எழுதுங்கள்", speak: "உங்கள் செய்தியைப் பேசுங்கள்",
  stop: "பதிவை நிறுத்து", send: "செய்தியை அனுப்பு", disclaimer: "AI தவறு செய்யலாம். முக்கியமான செயல்களை நீங்களே உறுதிப்படுத்துங்கள்.",
  close: "உதவியாளரை மூடு", mute: "பேச்சு பதில்களை நிறுத்து", unmute: "பேச்சு பதில்களை இயக்கு",
  unavailable: "உதவியாளர் இப்போது கிடைக்கவில்லை.", micUnsupported: "இங்கு குரல் பதிவு ஆதரிக்கப்படவில்லை. செய்தியை எழுதுங்கள்.",
  micDenied: "மைக்ரோஃபோன் அனுமதி வழங்கப்படவில்லை. நீங்கள் செய்தியை எழுதலாம்.", transcribeFailed: "பதிவைப் புரிந்துகொள்ள முடியவில்லை.",
  noVoice: "இந்தச் சாதனத்தில் இந்த மொழியில் பேச்சு பதில்கள் கிடைக்கவில்லை.",
};

const te: VoiceCopy = {
  open: "Scam Shield వాయిస్ సహాయకుడిని తెరవండి", launcherTitle: "Scam Shield తో మాట్లాడండి", launcherHint: "ఏమి జరిగిందో మాట్లాడండి లేదా టైప్ చేయండి",
  dialogLabel: "Scam Shield AI సహాయకుడు", subtitle: "భద్రతా సహాయకుడు",
  notice: "OTP, PIN, పాస్‌వర్డ్, CVV లేదా పూర్తి బ్యాంక్ వివరాలను ఎప్పుడూ పంచుకోవద్దు.",
  welcome: "నమస్కారం. ఏమి జరుగుతోందో చెప్పండి, లేదా తనిఖీ, ధృవీకరణ, ఫిర్యాదు లేదా ట్రాక్ చేయమని అడగండి. OTP, PIN, పాస్‌వర్డ్ లేదా CVV ఎప్పుడూ పంచుకోవద్దు.",
  emptyTitle: "ఏమి జరిగింది?", emptyBody: "మీ మాటల్లో చెప్పండి, లేదా తనిఖీ, ధృవీకరణ, ఫిర్యాదు లేదా ట్రాక్ చేయమని అడగండి.",
  starters: [["ఎవరో నా", "OTP అడుగుతున్నారు"], ["నేను ఒక కాలర్‌కు", "డబ్బు పంపేశాను"], ["ఈ లింక్ లేదా నంబర్", "సురక్షితమేనా?"], ["నా ఫిర్యాదును ట్రాక్ చేయండి", "ఫిర్యాదు ID తో"]],
  whereToGo: "ఎక్కడికి వెళ్లాలి", next: { REPORT: "అత్యవసర ఫిర్యాదు దశలు తెరవండి", STATUS: "నా ఫిర్యాదును ట్రాక్ చేయండి", VERIFY: "ధృవీకరణ తెరవండి", CHECK: "మోసం సంకేతాలు చూడండి" },
  refSanchar: "మోసపూరిత కాల్‌ను ఫిర్యాదు చేయండి", refBank: "మీ బ్యాంక్ యాప్ లేదా కార్డ్ హెల్ప్‌లైన్", urgent: "అత్యవసరం",
  copy: "సమాధానం కాపీ చేయండి", copied: "కాపీ అయింది", readAloud: "సమాధానం చదివి వినిపించండి", thinking: "ఆలోచిస్తోంది", transcribing: "మీ స్వరం రాయబడుతోంది",
  placeholder: "Scam Shield కు సందేశం రాయండి", listening: "వింటోంది…", typeLabel: "మీ సందేశం రాయండి", speak: "మీ సందేశం చెప్పండి",
  stop: "రికార్డింగ్ ఆపండి", send: "సందేశం పంపండి", disclaimer: "AI తప్పులు చేయవచ్చు. ముఖ్యమైన చర్యలను మీరే నిర్ధారించుకోండి.",
  close: "సహాయకుడిని మూసివేయండి", mute: "మాట్లాడే సమాధానాలు ఆపండి", unmute: "మాట్లాడే సమాధానాలు ప్రారంభించండి",
  unavailable: "సహాయకుడు ప్రస్తుతం అందుబాటులో లేడు.", micUnsupported: "ఇక్కడ వాయిస్ రికార్డింగ్ సాధ్యం కాదు. సందేశం టైప్ చేయండి.",
  micDenied: "మైక్రోఫోన్ అనుమతి ఇవ్వలేదు. మీరు సందేశం టైప్ చేయవచ్చు.", transcribeFailed: "రికార్డింగ్ అర్థం కాలేదు.",
  noVoice: "ఈ పరికరంలో ఈ భాషలో మాట్లాడే సమాధానాలు అందుబాటులో లేవు.",
};

const kn: VoiceCopy = {
  open: "Scam Shield ಧ್ವನಿ ಸಹಾಯಕವನ್ನು ತೆರೆಯಿರಿ", launcherTitle: "Scam Shield ಜೊತೆ ಮಾತನಾಡಿ", launcherHint: "ಏನಾಯಿತು ಎಂದು ಮಾತನಾಡಿ ಅಥವಾ ಬರೆಯಿರಿ",
  dialogLabel: "Scam Shield AI ಸಹಾಯಕ", subtitle: "ಸುರಕ್ಷತಾ ಸಹಾಯಕ",
  notice: "OTP, PIN, ಪಾಸ್‌ವರ್ಡ್, CVV ಅಥವಾ ಪೂರ್ಣ ಬ್ಯಾಂಕ್ ವಿವರಗಳನ್ನು ಎಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.",
  welcome: "ನಮಸ್ಕಾರ. ಏನಾಗುತ್ತಿದೆ ಎಂದು ಹೇಳಿ, ಅಥವಾ ಪರಿಶೀಲಿಸಲು, ದೂರು ನೀಡಲು ಅಥವಾ ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಕೇಳಿ. OTP, PIN, ಪಾಸ್‌ವರ್ಡ್ ಅಥವಾ CVV ಎಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.",
  emptyTitle: "ಏನಾಯಿತು?", emptyBody: "ನಿಮ್ಮ ಮಾತುಗಳಲ್ಲಿ ಹೇಳಿ, ಅಥವಾ ಪರಿಶೀಲಿಸಲು, ದೂರು ನೀಡಲು ಅಥವಾ ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಕೇಳಿ.",
  starters: [["ಯಾರೋ ನನ್ನ", "OTP ಕೇಳುತ್ತಿದ್ದಾರೆ"], ["ನಾನು ಒಬ್ಬ ಕರೆದಾರರಿಗೆ", "ಹಣ ಕಳುಹಿಸಿದ್ದೇನೆ"], ["ಈ ಲಿಂಕ್ ಅಥವಾ ಸಂಖ್ಯೆ", "ಸುರಕ್ಷಿತವೇ?"], ["ನನ್ನ ದೂರನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", "ದೂರು ID ಮೂಲಕ"]],
  whereToGo: "ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು", next: { REPORT: "ತುರ್ತು ದೂರು ಹಂತಗಳನ್ನು ತೆರೆಯಿರಿ", STATUS: "ನನ್ನ ದೂರನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", VERIFY: "ಪರಿಶೀಲನೆ ತೆರೆಯಿರಿ", CHECK: "ವಂಚನೆಯ ಲಕ್ಷಣಗಳನ್ನು ಪರಿಶೀಲಿಸಿ" },
  refSanchar: "ವಂಚನೆ ಕರೆಯನ್ನು ವರದಿ ಮಾಡಿ", refBank: "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಆ್ಯಪ್ ಅಥವಾ ಕಾರ್ಡ್ ಸಹಾಯವಾಣಿ", urgent: "ತುರ್ತು",
  copy: "ಉತ್ತರ ನಕಲಿಸಿ", copied: "ನಕಲಿಸಲಾಗಿದೆ", readAloud: "ಉತ್ತರವನ್ನು ಓದಿ ಹೇಳಿ", thinking: "ಯೋಚಿಸುತ್ತಿದೆ", transcribing: "ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಬರೆಯಲಾಗುತ್ತಿದೆ",
  placeholder: "Scam Shield ಗೆ ಸಂದೇಶ ಬರೆಯಿರಿ", listening: "ಕೇಳುತ್ತಿದೆ…", typeLabel: "ನಿಮ್ಮ ಸಂದೇಶ ಬರೆಯಿರಿ", speak: "ನಿಮ್ಮ ಸಂದೇಶ ಹೇಳಿ",
  stop: "ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ", send: "ಸಂದೇಶ ಕಳುಹಿಸಿ", disclaimer: "AI ತಪ್ಪು ಮಾಡಬಹುದು. ಮುಖ್ಯ ಕ್ರಮಗಳನ್ನು ನೀವೇ ದೃಢೀಕರಿಸಿ.",
  close: "ಸಹಾಯಕವನ್ನು ಮುಚ್ಚಿ", mute: "ಮಾತಿನ ಉತ್ತರಗಳನ್ನು ನಿಲ್ಲಿಸಿ", unmute: "ಮಾತಿನ ಉತ್ತರಗಳನ್ನು ಆನ್ ಮಾಡಿ",
  unavailable: "ಸಹಾಯಕ ಈಗ ಲಭ್ಯವಿಲ್ಲ.", micUnsupported: "ಇಲ್ಲಿ ಧ್ವನಿ ರೆಕಾರ್ಡಿಂಗ್ ಸಾಧ್ಯವಿಲ್ಲ. ಸಂದೇಶ ಬರೆಯಿರಿ.",
  micDenied: "ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಸಿಗಲಿಲ್ಲ. ನೀವು ಸಂದೇಶ ಬರೆಯಬಹುದು.", transcribeFailed: "ರೆಕಾರ್ಡಿಂಗ್ ಅರ್ಥವಾಗಲಿಲ್ಲ.",
  noVoice: "ಈ ಸಾಧನದಲ್ಲಿ ಈ ಭಾಷೆಯಲ್ಲಿ ಮಾತಿನ ಉತ್ತರಗಳು ಲಭ್ಯವಿಲ್ಲ.",
};

const ml: VoiceCopy = {
  open: "Scam Shield വോയ്‌സ് സഹായി തുറക്കുക", launcherTitle: "Scam Shield നോട് സംസാരിക്കുക", launcherHint: "എന്ത് സംഭവിച്ചുവെന്ന് പറയുക അല്ലെങ്കിൽ എഴുതുക",
  dialogLabel: "Scam Shield AI സഹായി", subtitle: "സുരക്ഷാ സഹായി",
  notice: "OTP, PIN, പാസ്‌വേഡ്, CVV അല്ലെങ്കിൽ പൂർണ്ണ ബാങ്ക് വിവരങ്ങൾ ഒരിക്കലും പങ്കിടരുത്.",
  welcome: "നമസ്കാരം. എന്താണ് സംഭവിക്കുന്നതെന്ന് പറയുക, അല്ലെങ്കിൽ പരിശോധിക്കാനോ പരാതിപ്പെടാനോ ട്രാക്ക് ചെയ്യാനോ ആവശ്യപ്പെടുക. OTP, PIN, പാസ്‌വേഡ് അല്ലെങ്കിൽ CVV ഒരിക്കലും പങ്കിടരുത്.",
  emptyTitle: "എന്ത് സംഭവിച്ചു?", emptyBody: "നിങ്ങളുടെ വാക്കുകളിൽ പറയുക, അല്ലെങ്കിൽ പരിശോധിക്കാനോ പരാതിപ്പെടാനോ ട്രാക്ക് ചെയ്യാനോ ആവശ്യപ്പെടുക.",
  starters: [["ആരോ എന്റെ", "OTP ചോദിക്കുന്നു"], ["ഞാൻ ഒരു വിളിക്കാരന്", "പണം അയച്ചു"], ["ഈ ലിങ്ക് അല്ലെങ്കിൽ നമ്പർ", "സുരക്ഷിതമാണോ?"], ["എന്റെ പരാതി ട്രാക്ക് ചെയ്യുക", "പരാതി ID ഉപയോഗിച്ച്"]],
  whereToGo: "എവിടെ പോകണം", next: { REPORT: "അടിയന്തര പരാതി ഘട്ടങ്ങൾ തുറക്കുക", STATUS: "എന്റെ പരാതി ട്രാക്ക് ചെയ്യുക", VERIFY: "പരിശോധന തുറക്കുക", CHECK: "തട്ടിപ്പിന്റെ ലക്ഷണങ്ങൾ നോക്കുക" },
  refSanchar: "തട്ടിപ്പ് കോൾ റിപ്പോർട്ട് ചെയ്യുക", refBank: "നിങ്ങളുടെ ബാങ്ക് ആപ്പ് അല്ലെങ്കിൽ കാർഡ് ഹെൽപ്‌ലൈൻ", urgent: "അടിയന്തരം",
  copy: "മറുപടി പകർത്തുക", copied: "പകർത്തി", readAloud: "മറുപടി വായിച്ചു കേൾപ്പിക്കുക", thinking: "ചിന്തിക്കുന്നു", transcribing: "നിങ്ങളുടെ ശബ്ദം എഴുതുന്നു",
  placeholder: "Scam Shield ന് സന്ദേശം എഴുതുക", listening: "കേൾക്കുന്നു…", typeLabel: "നിങ്ങളുടെ സന്ദേശം എഴുതുക", speak: "നിങ്ങളുടെ സന്ദേശം പറയുക",
  stop: "റെക്കോർഡിംഗ് നിർത്തുക", send: "സന്ദേശം അയയ്ക്കുക", disclaimer: "AI തെറ്റുകൾ വരുത്താം. പ്രധാന നടപടികൾ സ്വയം ഉറപ്പാക്കുക.",
  close: "സഹായി അടയ്ക്കുക", mute: "സംസാര മറുപടികൾ നിർത്തുക", unmute: "സംസാര മറുപടികൾ ഓണാക്കുക",
  unavailable: "സഹായി ഇപ്പോൾ ലഭ്യമല്ല.", micUnsupported: "ഇവിടെ ശബ്ദ റെക്കോർഡിംഗ് സാധ്യമല്ല. സന്ദേശം എഴുതുക.",
  micDenied: "മൈക്രോഫോൺ അനുമതി ലഭിച്ചില്ല. നിങ്ങൾക്ക് സന്ദേശം എഴുതാം.", transcribeFailed: "റെക്കോർഡിംഗ് മനസ്സിലായില്ല.",
  noVoice: "ഈ ഉപകരണത്തിൽ ഈ ഭാഷയിൽ സംസാര മറുപടികൾ ലഭ്യമല്ല.",
};

const pa: VoiceCopy = {
  open: "Scam Shield ਵੌਇਸ ਸਹਾਇਕ ਖੋਲ੍ਹੋ", launcherTitle: "Scam Shield ਨਾਲ ਗੱਲ ਕਰੋ", launcherHint: "ਬੋਲ ਕੇ ਜਾਂ ਲਿਖ ਕੇ ਦੱਸੋ ਕੀ ਹੋਇਆ",
  dialogLabel: "Scam Shield AI ਸਹਾਇਕ", subtitle: "ਸੁਰੱਖਿਆ ਸਹਾਇਕ",
  notice: "OTP, PIN, ਪਾਸਵਰਡ, CVV ਜਾਂ ਪੂਰੀ ਬੈਂਕ ਜਾਣਕਾਰੀ ਕਦੇ ਸਾਂਝੀ ਨਾ ਕਰੋ।",
  welcome: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਦੱਸੋ ਕੀ ਹੋ ਰਿਹਾ ਹੈ, ਜਾਂ ਮੈਨੂੰ ਜਾਂਚ, ਪੁਸ਼ਟੀ, ਸ਼ਿਕਾਇਤ ਜਾਂ ਟ੍ਰੈਕ ਕਰਨ ਲਈ ਕਹੋ। OTP, PIN, ਪਾਸਵਰਡ ਜਾਂ CVV ਕਦੇ ਸਾਂਝਾ ਨਾ ਕਰੋ।",
  emptyTitle: "ਕੀ ਹੋਇਆ?", emptyBody: "ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਦੱਸੋ, ਜਾਂ ਮੈਨੂੰ ਜਾਂਚ, ਪੁਸ਼ਟੀ, ਸ਼ਿਕਾਇਤ ਜਾਂ ਟ੍ਰੈਕ ਕਰਨ ਲਈ ਕਹੋ।",
  starters: [["ਕੋਈ ਮੇਰੇ ਤੋਂ", "OTP ਮੰਗ ਰਿਹਾ ਹੈ"], ["ਮੈਂ ਇੱਕ ਕਾਲਰ ਨੂੰ", "ਪੈਸੇ ਭੇਜ ਦਿੱਤੇ"], ["ਕੀ ਇਹ ਲਿੰਕ ਜਾਂ ਨੰਬਰ", "ਸੁਰੱਖਿਅਤ ਹੈ?"], ["ਮੇਰੀ ਸ਼ਿਕਾਇਤ ਟ੍ਰੈਕ ਕਰੋ", "ਸ਼ਿਕਾਇਤ ID ਨਾਲ"]],
  whereToGo: "ਕਿੱਥੇ ਜਾਣਾ ਹੈ", next: { REPORT: "ਤੁਰੰਤ ਸ਼ਿਕਾਇਤ ਦੇ ਕਦਮ ਖੋਲ੍ਹੋ", STATUS: "ਮੇਰੀ ਸ਼ਿਕਾਇਤ ਟ੍ਰੈਕ ਕਰੋ", VERIFY: "ਪੁਸ਼ਟੀ ਖੋਲ੍ਹੋ", CHECK: "ਸਕੈਮ ਦੇ ਸੰਕੇਤ ਜਾਂਚੋ" },
  refSanchar: "ਧੋਖੇ ਵਾਲੀ ਕਾਲ ਦੀ ਸ਼ਿਕਾਇਤ ਕਰੋ", refBank: "ਤੁਹਾਡੇ ਬੈਂਕ ਦੀ ਐਪ ਜਾਂ ਕਾਰਡ ਹੈਲਪਲਾਈਨ", urgent: "ਤੁਰੰਤ",
  copy: "ਜਵਾਬ ਕਾਪੀ ਕਰੋ", copied: "ਕਾਪੀ ਹੋ ਗਿਆ", readAloud: "ਜਵਾਬ ਪੜ੍ਹ ਕੇ ਸੁਣਾਓ", thinking: "ਸੋਚ ਰਿਹਾ ਹੈ", transcribing: "ਤੁਹਾਡੀ ਆਵਾਜ਼ ਲਿਖੀ ਜਾ ਰਹੀ ਹੈ",
  placeholder: "Scam Shield ਨੂੰ ਸੁਨੇਹਾ ਲਿਖੋ", listening: "ਸੁਣ ਰਿਹਾ ਹੈ…", typeLabel: "ਆਪਣਾ ਸੁਨੇਹਾ ਲਿਖੋ", speak: "ਆਪਣਾ ਸੁਨੇਹਾ ਬੋਲੋ",
  stop: "ਰਿਕਾਰਡਿੰਗ ਰੋਕੋ", send: "ਸੁਨੇਹਾ ਭੇਜੋ", disclaimer: "AI ਗਲਤੀ ਕਰ ਸਕਦਾ ਹੈ। ਜ਼ਰੂਰੀ ਕਦਮ ਆਪ ਪੱਕੇ ਕਰੋ।",
  close: "ਸਹਾਇਕ ਬੰਦ ਕਰੋ", mute: "ਬੋਲੇ ਜਵਾਬ ਬੰਦ ਕਰੋ", unmute: "ਬੋਲੇ ਜਵਾਬ ਚਾਲੂ ਕਰੋ",
  unavailable: "ਸਹਾਇਕ ਹੁਣ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।", micUnsupported: "ਇੱਥੇ ਆਵਾਜ਼ ਰਿਕਾਰਡਿੰਗ ਸੰਭਵ ਨਹੀਂ। ਸੁਨੇਹਾ ਲਿਖੋ।",
  micDenied: "ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਮਿਲੀ। ਤੁਸੀਂ ਸੁਨੇਹਾ ਲਿਖ ਸਕਦੇ ਹੋ।", transcribeFailed: "ਰਿਕਾਰਡਿੰਗ ਸਮਝ ਨਹੀਂ ਆਈ।",
  noVoice: "ਇਸ ਡਿਵਾਈਸ 'ਤੇ ਇਸ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲੇ ਜਵਾਬ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।",
};

const ur: VoiceCopy = {
  open: "Scam Shield وائس اسسٹنٹ کھولیں", launcherTitle: "Scam Shield سے بات کریں", launcherHint: "بول کر یا لکھ کر بتائیں کیا ہوا",
  dialogLabel: "Scam Shield AI اسسٹنٹ", subtitle: "حفاظتی اسسٹنٹ",
  notice: "OTP، PIN، پاس ورڈ، CVV یا مکمل بینک تفصیلات کبھی شیئر نہ کریں۔",
  welcome: "السلام علیکم۔ بتائیں کیا ہو رہا ہے، یا مجھ سے جانچ، تصدیق، شکایت یا ٹریک کرنے کو کہیں۔ OTP، PIN، پاس ورڈ یا CVV کبھی شیئر نہ کریں۔",
  emptyTitle: "کیا ہوا؟", emptyBody: "اپنے الفاظ میں بتائیں، یا مجھ سے جانچ، تصدیق، شکایت یا ٹریک کرنے کو کہیں۔",
  starters: [["کوئی مجھ سے", "OTP مانگ رہا ہے"], ["میں نے ایک کالر کو", "پیسے بھیج دیے"], ["کیا یہ لنک یا نمبر", "محفوظ ہے؟"], ["میری شکایت ٹریک کریں", "شکایت ID سے"]],
  whereToGo: "کہاں جائیں", next: { REPORT: "فوری شکایت کے مراحل کھولیں", STATUS: "میری شکایت ٹریک کریں", VERIFY: "تصدیق کھولیں", CHECK: "اسکیم کی علامات جانچیں" },
  refSanchar: "دھوکہ دہی کی کال کی شکایت کریں", refBank: "آپ کے بینک کی ایپ یا کارڈ ہیلپ لائن", urgent: "فوری",
  copy: "جواب کاپی کریں", copied: "کاپی ہو گیا", readAloud: "جواب پڑھ کر سنائیں", thinking: "سوچ رہا ہے", transcribing: "آپ کی آواز لکھی جا رہی ہے",
  placeholder: "Scam Shield کو پیغام لکھیں", listening: "سن رہا ہے…", typeLabel: "اپنا پیغام لکھیں", speak: "اپنا پیغام بولیں",
  stop: "ریکارڈنگ روکیں", send: "پیغام بھیجیں", disclaimer: "AI غلطی کر سکتا ہے۔ اہم اقدامات کی خود تصدیق کریں۔",
  close: "اسسٹنٹ بند کریں", mute: "بولے گئے جواب بند کریں", unmute: "بولے گئے جواب چالو کریں",
  unavailable: "اسسٹنٹ ابھی دستیاب نہیں ہے۔", micUnsupported: "یہاں آواز ریکارڈنگ ممکن نہیں۔ پیغام لکھیں۔",
  micDenied: "مائیکروفون کی اجازت نہیں ملی۔ آپ پیغام لکھ سکتے ہیں۔", transcribeFailed: "ریکارڈنگ سمجھ نہیں آئی۔",
  noVoice: "اس ڈیوائس پر اس زبان میں بولے گئے جواب دستیاب نہیں ہیں۔",
};

// —— Answered in Hindi (voiceAgent.ts HINDI_ANSWERED) ——

const ne: VoiceCopy = {
  open: "Scam Shield भ्वाइस सहायक खोल्नुहोस्", launcherTitle: "Scam Shield सँग कुरा गर्नुहोस्", launcherHint: "बोलेर वा लेखेर भन्नुहोस् के भयो",
  dialogLabel: "Scam Shield AI सहायक", subtitle: "सुरक्षा सहायक",
  notice: "OTP, PIN, पासवर्ड, CVV वा पूरा बैंक विवरण कहिल्यै साझा नगर्नुहोस्।",
  welcome: "नमस्ते। के भइरहेको छ भन्नुहोस्, वा मलाई जाँच, प्रमाणीकरण, उजुरी वा ट्र्याक गर्न भन्नुहोस्। OTP, PIN, पासवर्ड वा CVV कहिल्यै साझा नगर्नुहोस्।",
  emptyTitle: "के भयो?", emptyBody: "आफ्नै शब्दमा भन्नुहोस्, वा मलाई जाँच, प्रमाणीकरण, उजुरी वा ट्र्याक गर्न भन्नुहोस्।",
  starters: [["कसैले मसँग", "OTP माग्दैछ"], ["मैले एक कलरलाई", "पैसा पठाइसकें"], ["के यो लिङ्क वा नम्बर", "सुरक्षित छ?"], ["मेरो उजुरी ट्र्याक गर्नुहोस्", "उजुरी ID बाट"]],
  whereToGo: "कहाँ जाने", next: { REPORT: "तुरुन्त उजुरीका चरणहरू खोल्नुहोस्", STATUS: "मेरो उजुरी ट्र्याक गर्नुहोस्", VERIFY: "प्रमाणीकरण खोल्नुहोस्", CHECK: "ठगीका संकेत जाँच्नुहोस्" },
  refSanchar: "ठगी कलको उजुरी गर्नुहोस्", refBank: "तपाईंको बैंकको एप वा कार्ड हेल्पलाइन", urgent: "तुरुन्त",
  copy: "जवाफ प्रतिलिपि गर्नुहोस्", copied: "प्रतिलिपि भयो", readAloud: "जवाफ पढेर सुनाउनुहोस्", thinking: "सोच्दैछ", transcribing: "तपाईंको आवाज लेखिँदैछ",
  placeholder: "Scam Shield लाई सन्देश लेख्नुहोस्", listening: "सुन्दैछ…", typeLabel: "आफ्नो सन्देश लेख्नुहोस्", speak: "आफ्नो सन्देश बोल्नुहोस्",
  stop: "रेकर्डिङ रोक्नुहोस्", send: "सन्देश पठाउनुहोस्", disclaimer: "AI ले गल्ती गर्न सक्छ। महत्त्वपूर्ण कदम आफैं पुष्टि गर्नुहोस्।",
  close: "सहायक बन्द गर्नुहोस्", mute: "बोलिएका जवाफ बन्द गर्नुहोस्", unmute: "बोलिएका जवाफ खोल्नुहोस्",
  unavailable: "सहायक अहिले उपलब्ध छैन।", micUnsupported: "यहाँ आवाज रेकर्डिङ सम्भव छैन। सन्देश लेख्नुहोस्।",
  micDenied: "माइक्रोफोन अनुमति दिइएन। तपाईं सन्देश लेख्न सक्नुहुन्छ।", transcribeFailed: "रेकर्डिङ बुझिएन।",
  noVoice: "यो उपकरणमा यो भाषामा बोलिएका जवाफ उपलब्ध छैनन्।",
  note: "यस भाषामा जवाफ अझै भरपर्दो छैन, त्यसैले Scam Shield हिन्दीमा जवाफ दिन्छ।",
};

const kok: VoiceCopy = {
  open: "Scam Shield आवाज सहाय्यक उगडात", launcherTitle: "Scam Shield कडेन उलयात", launcherHint: "उलोवन वा बरोवन सांगात कितें जालें",
  dialogLabel: "Scam Shield AI सहाय्यक", subtitle: "सुरक्षा सहाय्यक",
  notice: "OTP, PIN, पासवर्ड, CVV वा पुराय बँक तपशील केन्नाच वांटूंक नाकात.",
  welcome: "नमस्कार. कितें घडटा तें सांगात, वा म्हाका तपासणी, पडताळणी, कागाळ वा ट्रॅक करपाक सांगात. OTP, PIN, पासवर्ड वा CVV केन्नाच वांटूंक नाकात.",
  emptyTitle: "कितें जालें?", emptyBody: "तुमच्या उतरांनी सांगात, वा म्हाका तपासणी, पडताळणी, कागाळ वा ट्रॅक करपाक सांगात.",
  starters: [["कोणूय म्हजो", "OTP मागता"], ["हांवें एका कॉलराक", "पयशे धाडले"], ["ही लिंक वा नंबर", "सुरक्षीत आसा?"], ["म्हजी कागाळ ट्रॅक करात", "कागाळ ID वरवीं"]],
  whereToGo: "खंय वचप", next: { REPORT: "तातडीच्या कागाळीच्यो पांवड्यो उगडात", STATUS: "म्हजी कागाळ ट्रॅक करात", VERIFY: "पडताळणी उगडात", CHECK: "स्कॅमाचीं लक्षणां तपासात" },
  refSanchar: "फटवणुकेच्या कॉलाची कागाळ करात", refBank: "तुमच्या बँकेचें ॲप वा कार्ड हेल्पलायन", urgent: "तातडीचें",
  copy: "जाप कॉपी करात", copied: "कॉपी जालें", readAloud: "जाप वाचून दाखयात", thinking: "विचार करता", transcribing: "तुमचो आवाज बरयता",
  placeholder: "Scam Shield क संदेश बरयात", listening: "आयकता…", typeLabel: "तुमचो संदेश बरयात", speak: "तुमचो संदेश उलयात",
  stop: "रेकॉर्डिंग बंद करात", send: "संदेश धाडात", disclaimer: "AI चुकी करूंक शकता. म्हत्वाच्यो कृती तुमी स्वता खात्री करात.",
  close: "सहाय्यक बंद करात", mute: "उलयिल्ले जाप बंद करात", unmute: "उलयिल्ले जाप सुरू करात",
  unavailable: "सहाय्यक आतां उपलब्ध ना.", micUnsupported: "हांगा आवाज रेकॉर्डिंग शक्य ना. संदेश बरयात.",
  micDenied: "मायक्रोफोनाची परवानगी मेळूंक ना. तुमी संदेश बरोवंक शकतात.", transcribeFailed: "रेकॉर्डिंग समजलें ना.",
  noVoice: "ह्या उपकरणार ह्या भासेंत उलयिल्ले जाप उपलब्ध नात.",
  note: "ह्या भासेंत जाप अजून विस्वासाचे नात, देखून Scam Shield हिंदींत जाप दिता.",
};

const mai: VoiceCopy = {
  open: "Scam Shield आवाज सहायक खोलू", launcherTitle: "Scam Shield सँ गप्प करू", launcherHint: "बाजि कऽ वा लिखि कऽ बताउ की भेल",
  dialogLabel: "Scam Shield AI सहायक", subtitle: "सुरक्षा सहायक",
  notice: "OTP, PIN, पासवर्ड, CVV वा पूरा बैंक विवरण कहियो साझा नहि करू।",
  welcome: "प्रणाम। बताउ की भऽ रहल अछि, वा हमरा जाँच, सत्यापन, शिकायत वा ट्रैक करबाक लेल कहू। OTP, PIN, पासवर्ड वा CVV कहियो साझा नहि करू।",
  emptyTitle: "की भेल?", emptyBody: "अपन शब्दमे बताउ, वा हमरा जाँच, सत्यापन, शिकायत वा ट्रैक करबाक लेल कहू।",
  starters: [["कियो हमरासँ", "OTP माँगि रहल अछि"], ["हम एकटा कॉलरकेँ", "पाइ पठा देलहुँ"], ["की ई लिंक वा नंबर", "सुरक्षित अछि?"], ["हमर शिकायत ट्रैक करू", "शिकायत ID सँ"]],
  whereToGo: "कतऽ जाउ", next: { REPORT: "तुरंत शिकायतक डेग खोलू", STATUS: "हमर शिकायत ट्रैक करू", VERIFY: "सत्यापन खोलू", CHECK: "स्कैमक संकेत जाँचू" },
  refSanchar: "ठगी कॉलक शिकायत करू", refBank: "अहाँक बैंकक ऐप वा कार्ड हेल्पलाइन", urgent: "तुरंत",
  copy: "उत्तर कॉपी करू", copied: "कॉपी भऽ गेल", readAloud: "उत्तर पढ़ि कऽ सुनाउ", thinking: "सोचि रहल अछि", transcribing: "अहाँक आवाज लिखल जा रहल अछि",
  placeholder: "Scam Shield केँ संदेश लिखू", listening: "सुनि रहल अछि…", typeLabel: "अपन संदेश लिखू", speak: "अपन संदेश बाजू",
  stop: "रिकॉर्डिंग रोकू", send: "संदेश पठाउ", disclaimer: "AI गलती कऽ सकैत अछि। जरूरी डेग अपने पुष्टि करू।",
  close: "सहायक बंद करू", mute: "बाजल उत्तर बंद करू", unmute: "बाजल उत्तर चालू करू",
  unavailable: "सहायक एखन उपलब्ध नहि अछि।", micUnsupported: "एतऽ आवाज रिकॉर्डिंग संभव नहि। संदेश लिखू।",
  micDenied: "माइक्रोफोनक अनुमति नहि भेटल। अहाँ संदेश लिखि सकैत छी।", transcribeFailed: "रिकॉर्डिंग नहि बुझायल।",
  noVoice: "एहि उपकरणपर एहि भाषामे बाजल उत्तर उपलब्ध नहि अछि।",
  note: "एहि भाषामे उत्तर एखन भरोसेमंद नहि अछि, तेँ Scam Shield हिन्दीमे उत्तर दैत अछि।",
};

const bho: VoiceCopy = {
  open: "Scam Shield आवाज सहायक खोलीं", launcherTitle: "Scam Shield से बतियाईं", launcherHint: "बोल के भा लिख के बताईं का भइल",
  dialogLabel: "Scam Shield AI सहायक", subtitle: "सुरक्षा सहायक",
  notice: "OTP, PIN, पासवर्ड, CVV भा पूरा बैंक जानकारी कबो साझा मत करीं।",
  welcome: "प्रणाम। बताईं का हो रहल बा, भा हमसे जाँच, सत्यापन, शिकायत भा ट्रैक करे के कहीं। OTP, PIN, पासवर्ड भा CVV कबो साझा मत करीं।",
  emptyTitle: "का भइल?", emptyBody: "अपना शब्द में बताईं, भा हमसे जाँच, सत्यापन, शिकायत भा ट्रैक करे के कहीं।",
  starters: [["केहू हमसे", "OTP माँग रहल बा"], ["हम एगो कॉलर के", "पइसा भेज देनी"], ["का ई लिंक भा नंबर", "सुरक्षित बा?"], ["हमार शिकायत ट्रैक करीं", "शिकायत ID से"]],
  whereToGo: "कहाँ जाईं", next: { REPORT: "तुरंत शिकायत के कदम खोलीं", STATUS: "हमार शिकायत ट्रैक करीं", VERIFY: "सत्यापन खोलीं", CHECK: "स्कैम के संकेत जाँचीं" },
  refSanchar: "ठगी कॉल के शिकायत करीं", refBank: "रउआ बैंक के ऐप भा कार्ड हेल्पलाइन", urgent: "तुरंत",
  copy: "जवाब कॉपी करीं", copied: "कॉपी हो गइल", readAloud: "जवाब पढ़ के सुनाईं", thinking: "सोच रहल बा", transcribing: "रउआ आवाज लिखल जा रहल बा",
  placeholder: "Scam Shield के संदेश लिखीं", listening: "सुन रहल बा…", typeLabel: "आपन संदेश लिखीं", speak: "आपन संदेश बोलीं",
  stop: "रिकॉर्डिंग रोकीं", send: "संदेश भेजीं", disclaimer: "AI गलती कर सकेला। जरूरी कदम खुद पक्का करीं।",
  close: "सहायक बंद करीं", mute: "बोलल जवाब बंद करीं", unmute: "बोलल जवाब चालू करीं",
  unavailable: "सहायक अबहीं उपलब्ध नइखे।", micUnsupported: "इहाँ आवाज रिकॉर्डिंग ना हो सके। संदेश लिखीं।",
  micDenied: "माइक्रोफोन के अनुमति ना मिलल। रउआ संदेश लिख सकीले।", transcribeFailed: "रिकॉर्डिंग समझ में ना आइल।",
  noVoice: "एह डिवाइस पर एह भाषा में बोलल जवाब उपलब्ध नइखे।",
  note: "एह भाषा में जवाब अबहीं भरोसेमंद नइखे, एहसे Scam Shield हिंदी में जवाब देला।",
};

const raj: VoiceCopy = {
  open: "Scam Shield आवाज सहायक खोलो", launcherTitle: "Scam Shield सूं बात करो", launcherHint: "बोल'र या लिख'र बताओ कांई होयो",
  dialogLabel: "Scam Shield AI सहायक", subtitle: "सुरक्षा सहायक",
  notice: "OTP, PIN, पासवर्ड, CVV या पूरी बैंक जाणकारी कदे भी साझा मत करो।",
  welcome: "राम राम सा। बताओ कांई हो रियो है, या म्हनै जांच, सत्यापन, शिकायत या ट्रैक करण नै कहो। OTP, PIN, पासवर्ड या CVV कदे भी साझा मत करो।",
  emptyTitle: "कांई होयो?", emptyBody: "आपरा सबदां में बताओ, या म्हनै जांच, सत्यापन, शिकायत या ट्रैक करण नै कहो।",
  starters: [["कोई म्हासूं", "OTP मांग रियो है"], ["म्हैं एक कॉलर नै", "पइसा भेज दिया"], ["कांई ओ लिंक या नंबर", "सुरक्षित है?"], ["म्हारी शिकायत ट्रैक करो", "शिकायत ID सूं"]],
  whereToGo: "कठै जावां", next: { REPORT: "तुरंत शिकायत रा कदम खोलो", STATUS: "म्हारी शिकायत ट्रैक करो", VERIFY: "सत्यापन खोलो", CHECK: "स्कैम रा संकेत जांचो" },
  refSanchar: "ठगी कॉल री शिकायत करो", refBank: "थारै बैंक रो ऐप या कार्ड हेल्पलाइन", urgent: "तुरंत",
  copy: "जवाब कॉपी करो", copied: "कॉपी होग्यो", readAloud: "जवाब पढ़'र सुणाओ", thinking: "सोच रियो है", transcribing: "थारी आवाज लिखीजै है",
  placeholder: "Scam Shield नै संदेस लिखो", listening: "सुण रियो है…", typeLabel: "आपरो संदेस लिखो", speak: "आपरो संदेस बोलो",
  stop: "रिकॉर्डिंग रोको", send: "संदेस भेजो", disclaimer: "AI गलती कर सकै है। जरूरी कदम खुद पक्का करो।",
  close: "सहायक बंद करो", mute: "बोल्योड़ा जवाब बंद करो", unmute: "बोल्योड़ा जवाब चालू करो",
  unavailable: "सहायक अबार उपलब्ध कोनी।", micUnsupported: "अठै आवाज रिकॉर्डिंग कोनी हो सकै। संदेस लिखो।",
  micDenied: "माइक्रोफोन री अनुमति कोनी मिली। थे संदेस लिख सको हो।", transcribeFailed: "रिकॉर्डिंग समझ में कोनी आई।",
  noVoice: "इण डिवाइस पर इण भाषा में बोल्योड़ा जवाब उपलब्ध कोनी।",
  note: "इण भाषा में जवाब अबार भरोसेमंद कोनी, इण वास्तै Scam Shield हिंदी में जवाब देवै।",
};

const doi: VoiceCopy = {
  open: "Scam Shield आवाज सहायक खोलो", launcherTitle: "Scam Shield कन्नै गल्ल करो", launcherHint: "बोलियै जां लिखियै दस्सो के होआ",
  dialogLabel: "Scam Shield AI सहायक", subtitle: "सुरक्षा सहायक",
  notice: "OTP, PIN, पासवर्ड, CVV जां पूरी बैंक जानकारी कदें बी सांझी नेईं करो।",
  welcome: "नमस्कार। दस्सो के होआ करदा ऐ, जां मिगी जांच, पुश्टी, शकैत जां ट्रैक करने गितै आखो। OTP, PIN, पासवर्ड जां CVV कदें बी सांझा नेईं करो।",
  emptyTitle: "के होआ?", emptyBody: "अपने शब्दें च दस्सो, जां मिगी जांच, पुश्टी, शकैत जां ट्रैक करने गितै आखो।",
  starters: [["कोई मेरे शा", "OTP मंगा करदा ऐ"], ["मैं इक कॉलर गी", "पैसे भेजी दित्ते"], ["के एह् लिंक जां नंबर", "सुरक्षत ऐ?"], ["मेरी शकैत ट्रैक करो", "शकैत ID कन्नै"]],
  whereToGo: "कुत्थें जाना", next: { REPORT: "तुरत शकैत दे कदम खोलो", STATUS: "मेरी शकैत ट्रैक करो", VERIFY: "पुश्टी खोलो", CHECK: "स्कैम दे संकेत जांचो" },
  refSanchar: "ठग्गी आह्ली कॉल दी शकैत करो", refBank: "तुंदे बैंक दा ऐप जां कार्ड हेल्पलाइन", urgent: "तुरत",
  copy: "जवाब कॉपी करो", copied: "कॉपी होई गेआ", readAloud: "जवाब पढ़ियै सनाओ", thinking: "सोचा करदा ऐ", transcribing: "तुंदी आवाज लिखी जा करदी ऐ",
  placeholder: "Scam Shield गी संदेश लिखो", listening: "सुना करदा ऐ…", typeLabel: "अपना संदेश लिखो", speak: "अपना संदेश बोलो",
  stop: "रिकॉर्डिंग रोको", send: "संदेश भेजो", disclaimer: "AI गलती करी सकदा ऐ। जरूरी कदम आपूं पक्के करो।",
  close: "सहायक बंद करो", mute: "बोले दे जवाब बंद करो", unmute: "बोले दे जवाब चालू करो",
  unavailable: "सहायक इस बेलै उपलब्ध नेईं ऐ।", micUnsupported: "इत्थें आवाज रिकॉर्डिंग नेईं होई सकदी। संदेश लिखो।",
  micDenied: "माइक्रोफोन दी अनुमति नेईं मिली। तुस संदेश लिखी सकदे ओ।", transcribeFailed: "रिकॉर्डिंग समझ नेईं आई।",
  noVoice: "इस डिवाइस पर इस भाशा च बोले दे जवाब उपलब्ध नेईं न।",
  note: "इस भाशा च जवाब अजें भरोसेमंद नेईं न, इस करी Scam Shield हिंदी च जवाब दिंदा ऐ।",
};

const brx: VoiceCopy = {
  open: "Scam Shield गाब सहायक खेव", launcherTitle: "Scam Shield जों रायज्लाय", launcherHint: "बुंनानै एबा लिरनानै बुं मा जादों",
  dialogLabel: "Scam Shield AI सहायक", subtitle: "रैखाथि सहायक",
  notice: "OTP, PIN, पासवर्ड, CVV एबा आबुं बैंक बिबुंथि जेबो जेरैबो हानाय नङा।",
  welcome: "खुलुमबाय। मा जाबाय थादों बुं, एबा आंनो नायसंनो, फोरमाननो, गोनांथि होनो एबा ट्रैक खालामनो बुं। OTP, PIN, पासवर्ड एबा CVV जेबो हानाय नङा।",
  emptyTitle: "मा जादों?", emptyBody: "नोंथांनि रावआव बुं, एबा आंनो नायसंनो, फोरमाननो, गोनांथि होनो एबा ट्रैक खालामनो बुं।",
  starters: [["सासे आंनिफ्राय", "OTP बिनाय दों"], ["आं सासे कलारनो", "रां दैथाय होबाय"], ["बे लिंक एबा नंबरा", "रैखाथि नामा?"], ["आंनि गोनांथि ट्रैक खालाम", "गोनांथि ID जों"]],
  whereToGo: "बबेयाव थांनो", next: { REPORT: "गोख्रैयै गोनांथिनि आखान्थि खेव", STATUS: "आंनि गोनांथि ट्रैक खालाम", VERIFY: "फोरमानथि खेव", CHECK: "स्कैमनि सिनायथि नाय" },
  refSanchar: "फाथोमाखां कलनि गोनांथि हो", refBank: "नोंथांनि बैंकनि ऐप एबा कार्ड हेल्पलाइन", urgent: "गोख्रैयै",
  copy: "फिननाय कपि खालाम", copied: "कपि जाबाय", readAloud: "फिननाय फरायनानै खोनासंहो", thinking: "सानो दं", transcribing: "नोंथांनि गाब लिरनाय जागासिनो दं",
  placeholder: "Scam Shield आव खौरां लिर", listening: "खोनासंगासिनो दं…", typeLabel: "नोंथांनि खौरां लिर", speak: "नोंथांनि खौरां बुं",
  stop: "रेकर्डिं थाद", send: "खौरां दैथाय", disclaimer: "AI आ गोरोन्थि खालामनो हायो। गेदेर खामानिफोरखौ नोंथांनोसो थार खालाम।",
  close: "सहायक बन्द खालाम", mute: "बुंनाय फिननायफोर बन्द खालाम", unmute: "बुंनाय फिननायफोर खेव",
  unavailable: "सहायकआ दानो मोननो हाया।", micUnsupported: "बेयाव गाब रेकर्डिं जाया। खौरां लिर।",
  micDenied: "माइक्रोफोननि गनायथि मोनाखै। नोंथांहा खौरां लिरनो हागोन।", transcribeFailed: "रेकर्डिंखौ बुजिनो हायाखै।",
  noVoice: "बे डिभाइसआव बे रावआव बुंनाय फिननाय मोननो हाया।",
  note: "बे रावआव फिननायफोरा दासिमबो थार नङा, बेनिखायनो Scam Shield आ हिन्दीयाव फिननाय होयो।",
};

const sa: VoiceCopy = {
  open: "Scam Shield वाक्-सहायकम् उद्घाटयतु", launcherTitle: "Scam Shield इत्यनेन सह वदतु", launcherHint: "किम् अभवत् इति वदतु लिखतु वा",
  dialogLabel: "Scam Shield AI सहायकः", subtitle: "सुरक्षा-सहायकः",
  notice: "OTP, PIN, गुप्तशब्दं, CVV पूर्णं वित्तकोश-विवरणं वा कदापि मा ददातु।",
  welcome: "नमस्ते। किं भवति इति वदतु, अथवा परीक्षणं, सत्यापनं, निवेदनं, अनुसरणं वा कर्तुं माम् आदिशतु। OTP, PIN, गुप्तशब्दं CVV वा कदापि मा ददातु।",
  emptyTitle: "किम् अभवत्?", emptyBody: "स्वशब्दैः वदतु, अथवा परीक्षणं, सत्यापनं, निवेदनं, अनुसरणं वा कर्तुं माम् आदिशतु।",
  starters: [["कश्चित् माम्", "OTP याचते"], ["अहं एकस्मै आह्वातृभ्यः", "धनं प्रेषितवान्"], ["किम् एषः लिङ्कः सङ्ख्या वा", "सुरक्षितः?"], ["मम निवेदनम् अनुसरतु", "निवेदन-ID द्वारा"]],
  whereToGo: "कुत्र गन्तव्यम्", next: { REPORT: "त्वरित-निवेदन-सोपानानि उद्घाटयतु", STATUS: "मम निवेदनम् अनुसरतु", VERIFY: "सत्यापनम् उद्घाटयतु", CHECK: "वञ्चना-लक्षणानि परीक्षताम्" },
  refSanchar: "वञ्चना-आह्वानस्य निवेदनं करोतु", refBank: "भवतः वित्तकोशस्य ऐप् कार्ड-सहायवाणी वा", urgent: "त्वरितम्",
  copy: "उत्तरं प्रतिलिखतु", copied: "प्रतिलिखितम्", readAloud: "उत्तरं पठित्वा श्रावयतु", thinking: "चिन्तयति", transcribing: "भवतः स्वरः लिख्यते",
  placeholder: "Scam Shield इत्यस्मै सन्देशं लिखतु", listening: "शृणोति…", typeLabel: "स्वसन्देशं लिखतु", speak: "स्वसन्देशं वदतु",
  stop: "ध्वनिमुद्रणं स्थगयतु", send: "सन्देशं प्रेषयतु", disclaimer: "AI त्रुटिं कर्तुं शक्नोति। महत्त्वपूर्णानि कार्याणि स्वयं निश्चिनोतु।",
  close: "सहायकं पिदधातु", mute: "उक्तानि उत्तराणि स्थगयतु", unmute: "उक्तानि उत्तराणि आरभताम्",
  unavailable: "सहायकः इदानीं न उपलभ्यते।", micUnsupported: "अत्र ध्वनिमुद्रणं न शक्यम्। सन्देशं लिखतु।",
  micDenied: "ध्वनिग्राहकस्य अनुमतिः न दत्ता। भवान् सन्देशं लेखितुं शक्नोति।", transcribeFailed: "ध्वनिमुद्रणं न अवगतम्।",
  noVoice: "अस्मिन् यन्त्रे अस्यां भाषायाम् उक्तानि उत्तराणि न उपलभ्यन्ते।",
  note: "अस्यां भाषायाम् उत्तराणि अद्यापि विश्वसनीयानि न, अतः Scam Shield हिन्दीभाषायाम् उत्तरं ददाति।",
};

const gon: VoiceCopy = {
  open: "Scam Shield आवाज सहायक खोलाट", launcherTitle: "Scam Shield तोन वेहाट", launcherHint: "वेहसी या लिखसी केहाट बातल आतुन",
  dialogLabel: "Scam Shield AI सहायक", subtitle: "सुरक्षा सहायक",
  notice: "OTP, PIN, पासवर्ड, CVV या पूरा बैंक जानकारी कभी सिअ मत।",
  welcome: "सेवा जोहार। केहाट बातल आयतोर, या नाकुन जांच, सत्यापन, शिकायत या ट्रैक कियाना केहाट। OTP, PIN, पासवर्ड या CVV कभी सिअ मत।",
  emptyTitle: "बातल आतुन?", emptyBody: "निमा गोट्टिंग केहाट, या नाकुन जांच, सत्यापन, शिकायत या ट्रैक कियाना केहाट।",
  starters: [["बोर्र नाकुन", "OTP वेंजतोर"], ["नन्ना ओर्र कॉलर के", "पैसा सितोन"], ["इद लिंक या नंबर", "सुरक्षित मंता?"], ["नावा शिकायत ट्रैक किम", "शिकायत ID तोन"]],
  whereToGo: "बेगा हन्दना", next: { REPORT: "तुरंत शिकायत ता कदम खोलाट", STATUS: "नावा शिकायत ट्रैक किम", VERIFY: "सत्यापन खोलाट", CHECK: "स्कैम ता संकेत जांचाट" },
  refSanchar: "ठगी कॉल ता शिकायत किम", refBank: "निमा बैंक ता ऐप या कार्ड हेल्पलाइन", urgent: "तुरंत",
  copy: "जवाब कॉपी किम", copied: "कॉपी आतुन", readAloud: "जवाब वाचसी केंजहाट", thinking: "सोचे कियातोर", transcribing: "निमा आवाज लिखे आयता",
  placeholder: "Scam Shield के संदेश लिखाट", listening: "केंजतोर…", typeLabel: "निमा संदेश लिखाट", speak: "निमा संदेश वेहाट",
  stop: "रिकॉर्डिंग रोकाट", send: "संदेश सिम", disclaimer: "AI गलती किअ परोल। जरूरी कदम निमे पक्का किम।",
  close: "सहायक बंद किम", mute: "वेहतोल जवाब बंद किम", unmute: "वेहतोल जवाब चालू किम",
  unavailable: "सहायक इंजे उपलब्ध हिल्ले।", micUnsupported: "इगा आवाज रिकॉर्डिंग आयो। संदेश लिखाट।",
  micDenied: "माइक्रोफोन ता अनुमति मिल्ले। मीर संदेश लिखे परोल।", transcribeFailed: "रिकॉर्डिंग समझे आतो।",
  noVoice: "इद डिवाइस पोरो इद भाषा ते वेहतोल जवाब हिल्ले।",
  note: "इद भाषा ते जवाब इंजे भरोसा ता हिल्ले, अदिनटे Scam Shield हिंदी ते जवाब सीयाना।",
};

// —— Answered in English (voiceAgent.ts replyLanguage) ——

const as: VoiceCopy = {
  open: "Scam Shield ভইচ সহায়ক খোলক", launcherTitle: "Scam Shield-ৰ সৈতে কথা পাতক", launcherHint: "কৈ বা লিখি জনাওক কি হ'ল",
  dialogLabel: "Scam Shield AI সহায়ক", subtitle: "সুৰক্ষা সহায়ক",
  notice: "OTP, PIN, পাছৱৰ্ড, CVV বা সম্পূৰ্ণ বেংক তথ্য কেতিয়াও শ্বেয়াৰ নকৰিব।",
  welcome: "নমস্কাৰ। কি হৈছে কওক, বা মোক পৰীক্ষা, সত্যাপন, অভিযোগ বা ট্ৰেক কৰিবলৈ কওক। OTP, PIN, পাছৱৰ্ড বা CVV কেতিয়াও শ্বেয়াৰ নকৰিব।",
  emptyTitle: "কি হ'ল?", emptyBody: "নিজৰ ভাষাত কওক, বা মোক পৰীক্ষা, সত্যাপন, অভিযোগ বা ট্ৰেক কৰিবলৈ কওক।",
  starters: [["কোনোবাই মোৰ পৰা", "OTP বিচাৰিছে"], ["মই এজন কলাৰক", "টকা পঠিয়াই দিলোঁ"], ["এই লিংক বা নম্বৰ", "সুৰক্ষিত নে?"], ["মোৰ অভিযোগ ট্ৰেক কৰক", "অভিযোগ ID ৰে"]],
  whereToGo: "ক'লৈ যাব", next: { REPORT: "জৰুৰী অভিযোগৰ পদক্ষেপ খোলক", STATUS: "মোৰ অভিযোগ ট্ৰেক কৰক", VERIFY: "সত্যাপন খোলক", CHECK: "স্কেমৰ লক্ষণ চাওক" },
  refSanchar: "প্ৰতাৰণামূলক কলৰ অভিযোগ কৰক", refBank: "আপোনাৰ বেংকৰ এপ বা কাৰ্ড হেল্পলাইন", urgent: "জৰুৰী",
  copy: "উত্তৰ কপি কৰক", copied: "কপি হ'ল", readAloud: "উত্তৰ পঢ়ি শুনাওক", thinking: "ভাবি আছে", transcribing: "আপোনাৰ মাত লিখা হৈছে",
  placeholder: "Scam Shield-লৈ বাৰ্তা লিখক", listening: "শুনি আছে…", typeLabel: "আপোনাৰ বাৰ্তা লিখক", speak: "আপোনাৰ বাৰ্তা কওক",
  stop: "ৰেকৰ্ডিং বন্ধ কৰক", send: "বাৰ্তা পঠিয়াওক", disclaimer: "AI-এ ভুল কৰিব পাৰে। গুৰুত্বপূৰ্ণ পদক্ষেপ নিজে নিশ্চিত কৰক।",
  close: "সহায়ক বন্ধ কৰক", mute: "কথিত উত্তৰ বন্ধ কৰক", unmute: "কথিত উত্তৰ অন কৰক",
  unavailable: "সহায়ক এতিয়া উপলব্ধ নহয়।", micUnsupported: "ইয়াত মাত ৰেকৰ্ডিং সম্ভৱ নহয়। বাৰ্তা লিখক।",
  micDenied: "মাইক্ৰ'ফোনৰ অনুমতি পোৱা নগ'ল। আপুনি বাৰ্তা লিখিব পাৰে।", transcribeFailed: "ৰেকৰ্ডিং বুজি পোৱা নগ'ল।",
  noVoice: "এই ডিভাইচত এই ভাষাত কথিত উত্তৰ উপলব্ধ নহয়।",
  note: "এই ভাষাত উত্তৰ এতিয়াও নিৰ্ভৰযোগ্য নহয়, সেয়ে Scam Shield-এ ইংৰাজীত উত্তৰ দিয়ে।",
};

const or: VoiceCopy = {
  open: "Scam Shield ଭଏସ୍ ସହାୟକ ଖୋଲନ୍ତୁ", launcherTitle: "Scam Shield ସହ କଥା ହୁଅନ୍ତୁ", launcherHint: "କହି କିମ୍ବା ଲେଖି ଜଣାନ୍ତୁ କ'ଣ ହେଲା",
  dialogLabel: "Scam Shield AI ସହାୟକ", subtitle: "ସୁରକ୍ଷା ସହାୟକ",
  notice: "OTP, PIN, ପାସୱାର୍ଡ, CVV କିମ୍ବା ସମ୍ପୂର୍ଣ୍ଣ ବ୍ୟାଙ୍କ ବିବରଣୀ କେବେ ବି ସେୟାର କରନ୍ତୁ ନାହିଁ।",
  welcome: "ନମସ୍କାର। କ'ଣ ହେଉଛି କୁହନ୍ତୁ, କିମ୍ବା ମୋତେ ଯାଞ୍ଚ, ସତ୍ୟାପନ, ଅଭିଯୋଗ କିମ୍ବା ଟ୍ରାକ୍ କରିବାକୁ କୁହନ୍ତୁ। OTP, PIN, ପାସୱାର୍ଡ କିମ୍ବା CVV କେବେ ବି ସେୟାର କରନ୍ତୁ ନାହିଁ।",
  emptyTitle: "କ'ଣ ହେଲା?", emptyBody: "ନିଜ ଶବ୍ଦରେ କୁହନ୍ତୁ, କିମ୍ବା ମୋତେ ଯାଞ୍ଚ, ସତ୍ୟାପନ, ଅଭିଯୋଗ କିମ୍ବା ଟ୍ରାକ୍ କରିବାକୁ କୁହନ୍ତୁ।",
  starters: [["କେହି ମୋଠାରୁ", "OTP ମାଗୁଛି"], ["ମୁଁ ଜଣେ କଲରଙ୍କୁ", "ଟଙ୍କା ପଠାଇ ଦେଲି"], ["ଏହି ଲିଙ୍କ କିମ୍ବା ନମ୍ବର", "ସୁରକ୍ଷିତ କି?"], ["ମୋ ଅଭିଯୋଗ ଟ୍ରାକ୍ କରନ୍ତୁ", "ଅଭିଯୋଗ ID ଦ୍ୱାରା"]],
  whereToGo: "କେଉଁଠି ଯିବେ", next: { REPORT: "ଜରୁରୀ ଅଭିଯୋଗ ପଦକ୍ଷେପ ଖୋଲନ୍ତୁ", STATUS: "ମୋ ଅଭିଯୋଗ ଟ୍ରାକ୍ କରନ୍ତୁ", VERIFY: "ସତ୍ୟାପନ ଖୋଲନ୍ତୁ", CHECK: "ସ୍କାମ୍ ସଙ୍କେତ ଯାଞ୍ଚ କରନ୍ତୁ" },
  refSanchar: "ଠକେଇ କଲ୍‌ର ଅଭିଯୋଗ କରନ୍ତୁ", refBank: "ଆପଣଙ୍କ ବ୍ୟାଙ୍କର ଆପ୍ କିମ୍ବା କାର୍ଡ ହେଲ୍ପଲାଇନ୍", urgent: "ଜରୁରୀ",
  copy: "ଉତ୍ତର କପି କରନ୍ତୁ", copied: "କପି ହେଲା", readAloud: "ଉତ୍ତର ପଢ଼ି ଶୁଣାନ୍ତୁ", thinking: "ଭାବୁଛି", transcribing: "ଆପଣଙ୍କ ସ୍ୱର ଲେଖାଯାଉଛି",
  placeholder: "Scam Shield କୁ ବାର୍ତ୍ତା ଲେଖନ୍ତୁ", listening: "ଶୁଣୁଛି…", typeLabel: "ଆପଣଙ୍କ ବାର୍ତ୍ତା ଲେଖନ୍ତୁ", speak: "ଆପଣଙ୍କ ବାର୍ତ୍ତା କୁହନ୍ତୁ",
  stop: "ରେକର୍ଡିଂ ବନ୍ଦ କରନ୍ତୁ", send: "ବାର୍ତ୍ତା ପଠାନ୍ତୁ", disclaimer: "AI ଭୁଲ କରିପାରେ। ଜରୁରୀ ପଦକ୍ଷେପ ନିଜେ ନିଶ୍ଚିତ କରନ୍ତୁ।",
  close: "ସହାୟକ ବନ୍ଦ କରନ୍ତୁ", mute: "କଥିତ ଉତ୍ତର ବନ୍ଦ କରନ୍ତୁ", unmute: "କଥିତ ଉତ୍ତର ଚାଲୁ କରନ୍ତୁ",
  unavailable: "ସହାୟକ ବର୍ତ୍ତମାନ ଉପଲବ୍ଧ ନାହିଁ।", micUnsupported: "ଏଠାରେ ସ୍ୱର ରେକର୍ଡିଂ ସମ୍ଭବ ନୁହେଁ। ବାର୍ତ୍ତା ଲେଖନ୍ତୁ।",
  micDenied: "ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ। ଆପଣ ବାର୍ତ୍ତା ଲେଖିପାରିବେ।", transcribeFailed: "ରେକର୍ଡିଂ ବୁଝିହେଲା ନାହିଁ।",
  noVoice: "ଏହି ଡିଭାଇସରେ ଏହି ଭାଷାରେ କଥିତ ଉତ୍ତର ଉପଲବ୍ଧ ନାହିଁ।",
  note: "ଏହି ଭାଷାରେ ଉତ୍ତର ଏବେ ବି ନିର୍ଭରଯୋଗ୍ୟ ନୁହେଁ, ତେଣୁ Scam Shield ଇଂରାଜୀରେ ଉତ୍ତର ଦିଏ।",
};

const ks: VoiceCopy = {
  open: "Scam Shield آواز مَددگار کھولِو", launcherTitle: "Scam Shield سٕتۍ کَرِو کَتھ", launcherHint: "وَنِو یا لیٚکھِو کیا گوٚو",
  dialogLabel: "Scam Shield AI مَددگار", subtitle: "حفاظتی مَددگار",
  notice: "OTP، PIN، پاس ورڈ، CVV یا پوٗرۍ بینک تفصیل کٲنٛسہِ ہِنٛدِ خٲطرٕ مَہ دِیِو۔",
  welcome: "سلام۔ وَنِو کیا چھُ سَپدان، یا مے وَنِو جانچ، تصدیق، شکایت یا ٹریک کَرنہٕ خٲطرٕ۔ OTP، PIN، پاس ورڈ یا CVV کُنہِ مَہ دِیِو۔",
  emptyTitle: "کیا گوٚو؟", emptyBody: "پَنٕنۍ لَفظَو مَنٛز وَنِو، یا مے وَنِو جانچ، تصدیق، شکایت یا ٹریک کَرنہٕ خٲطرٕ۔",
  starters: [["کانٛہہ چھُ مے نِشہِ", "OTP مَنٛگان"], ["مے سوٗزۍ اَکِس کالرَس", "پونٛسہٕ"], ["کیا یہِ لنک یا نمبر", "محفوظ چھُ؟"], ["میٲنۍ شکایت ٹریک کَرِو", "شکایت ID سٕتۍ"]],
  whereToGo: "کوٚت گَژھُن", next: { REPORT: "فوری شکایتُک طریقہ کھولِو", STATUS: "میٲنۍ شکایت ٹریک کَرِو", VERIFY: "تصدیق کھولِو", CHECK: "اسکیمہٕ کۍ نِشان جانچِو" },
  refSanchar: "دوکھہٕ بازۍ کالہٕ ہنٛز شکایت کَرِو", refBank: "تُہٕنٛز بینکُک ایپ یا کارڈ ہیلپ لائن", urgent: "فوری",
  copy: "جواب کاپی کَرِو", copied: "کاپی گوٚو", readAloud: "جواب پٔرِتھ بوٗزنٲوِو", thinking: "سوچان", transcribing: "تُہٕنٛز آواز چھےٚ لیکھنہٕ یِوان",
  placeholder: "Scam Shield کیٛن پیغام لیٚکھِو", listening: "بوزان…", typeLabel: "پَنُن پیغام لیٚکھِو", speak: "پَنُن پیغام وَنِو",
  stop: "ریکارڈنگ رُکٲوِو", send: "پیغام سوٗزِو", disclaimer: "AI ہیٚکہِ غلطی کٔرِتھ۔ ضروری قدم کَرِو پانہٕ پَکہٕ۔",
  close: "مَددگار بند کَرِو", mute: "وَنِتھ جواب بند کَرِو", unmute: "وَنِتھ جواب چالو کَرِو",
  unavailable: "مَددگار چھُ نہٕ وۄنہِ دستیاب۔", micUnsupported: "یِتہِ چھےٚ نہٕ آواز ریکارڈنگ مُمکن۔ پیغام لیٚکھِو۔",
  micDenied: "مائیکروفونُک اِجازَت آو نہٕ دِنہٕ۔ توٚہۍ ہیٚکِو پیغام لیٚکھِتھ۔", transcribeFailed: "ریکارڈنگ آیہِ نہٕ سَمجھ۔",
  noVoice: "یَتھ ڈیوائسس پیٚٹھ چھِنہٕ یَتھ زَبٲنۍ مَنٛز وَنِتھ جواب دستیاب۔",
  note: "یَتھ زَبٲنۍ مَنٛز چھِنہٕ جواب وۄنہِ قٲبلِ بَروسہٕ، تَوے چھُ Scam Shield انگریزی مَنٛز جواب دِوان۔",
};

const sd: VoiceCopy = {
  open: "Scam Shield آواز مددگار کوليو", launcherTitle: "Scam Shield سان ڳالهايو", launcherHint: "ڳالهائي يا لکي ٻڌايو ڇا ٿيو",
  dialogLabel: "Scam Shield AI مددگار", subtitle: "حفاظتي مددگار",
  notice: "OTP، PIN، پاسورڊ، CVV يا مڪمل بئنڪ تفصيل ڪڏهن به شيئر نه ڪريو.",
  welcome: "سلام. ٻڌايو ڇا ٿي رهيو آهي، يا مونکي جانچ، تصديق، شڪايت يا ٽريڪ ڪرڻ لاءِ چئو. OTP، PIN، پاسورڊ يا CVV ڪڏهن به شيئر نه ڪريو.",
  emptyTitle: "ڇا ٿيو؟", emptyBody: "پنهنجن لفظن ۾ ٻڌايو، يا مونکي جانچ، تصديق، شڪايت يا ٽريڪ ڪرڻ لاءِ چئو.",
  starters: [["ڪو مونکان", "OTP گهري رهيو آهي"], ["مون هڪ ڪالر کي", "پئسا موڪلي ڇڏيا"], ["ڇا هي لنڪ يا نمبر", "محفوظ آهي؟"], ["منهنجي شڪايت ٽريڪ ڪريو", "شڪايت ID سان"]],
  whereToGo: "ڪيڏانهن وڃجي", next: { REPORT: "فوري شڪايت جا قدم کوليو", STATUS: "منهنجي شڪايت ٽريڪ ڪريو", VERIFY: "تصديق کوليو", CHECK: "اسڪيم جون نشانيون جانچيو" },
  refSanchar: "ٺڳيءَ واري ڪال جي شڪايت ڪريو", refBank: "توهان جي بئنڪ جي ايپ يا ڪارڊ هيلپ لائن", urgent: "فوري",
  copy: "جواب ڪاپي ڪريو", copied: "ڪاپي ٿي ويو", readAloud: "جواب پڙهي ٻڌايو", thinking: "سوچي رهيو آهي", transcribing: "توهان جو آواز لکيو پيو وڃي",
  placeholder: "Scam Shield کي پيغام لکو", listening: "ٻڌي رهيو آهي…", typeLabel: "پنهنجو پيغام لکو", speak: "پنهنجو پيغام ڳالهايو",
  stop: "رڪارڊنگ روڪيو", send: "پيغام موڪليو", disclaimer: "AI غلطي ڪري سگهي ٿو. اهم قدم پاڻ پڪ ڪريو.",
  close: "مددگار بند ڪريو", mute: "ڳالهايل جواب بند ڪريو", unmute: "ڳالهايل جواب چالو ڪريو",
  unavailable: "مددگار هن وقت موجود ناهي.", micUnsupported: "هتي آواز رڪارڊنگ ممڪن ناهي. پيغام لکو.",
  micDenied: "مائيڪروفون جي اجازت نه ملي. توهان پيغام لکي سگهو ٿا.", transcribeFailed: "رڪارڊنگ سمجهه ۾ نه آئي.",
  noVoice: "هن ڊوائيس تي هن ٻوليءَ ۾ ڳالهايل جواب موجود ناهن.",
  note: "هن ٻوليءَ ۾ جواب اڃا ڀروسي جوڳا ناهن، تنهنڪري Scam Shield انگريزيءَ ۾ جواب ڏئي ٿو.",
};

const mni: VoiceCopy = {
  open: "Scam Shield খোনজেলগী মতেং পাংবা হাংদোকপীয়ু", launcherTitle: "Scam Shield গা ৱারী শানবীয়ু", launcherHint: "করি থোকখিবগে হায়রগা নত্ত্রগা ইরগা খংহনবীয়ু",
  dialogLabel: "Scam Shield AI মতেং পাংবা", subtitle: "শেনখৈ মতেং পাংবা",
  notice: "OTP, PIN, পাসৱার্ড, CVV নত্ত্রগা বেঙ্ককী মপুংফাবা ৱাফম কদায়দা যাম্না শেয়ার তৌরনু।",
  welcome: "খুরুমজরি। করি থোকলিবগে হায়বীয়ু, নত্ত্রগা ঐবু চেক, ৱাতকপ, রিপোর্ট নত্ত্রগা ট্রেক তৌনবা হায়বীয়ু। OTP, PIN, পাসৱার্ড নত্ত্রগা CVV কদায়দা যাম্না শেয়ার তৌরনু।",
  emptyTitle: "করি থোকখিবগে?", emptyBody: "নহাক্কী ৱাহৈদা হায়বীয়ু, নত্ত্রগা ঐবু চেক, ৱাতকপ, রিপোর্ট নত্ত্রগা ট্রেক তৌনবা হায়বীয়ু।",
  starters: [["কনাগুম্বা অমনা ঐদা", "OTP হংলি"], ["ঐনা কলার অমদা", "শেল থাখ্রে"], ["লিঙ্ক নত্ত্রগা নম্বর অসি", "শেনখৈবরা?"], ["ঐগী রিপোর্ট ট্রেক তৌবীয়ু", "কমপ্লেন্ট ID না"]],
  whereToGo: "কদায়দা চৎকদগে", next: { REPORT: "থুনা রিপোর্ট তৌনবগী খোঙথাং হাংদোকপীয়ু", STATUS: "ঐগী রিপোর্ট ট্রেক তৌবীয়ু", VERIFY: "ৱাতকপ হাংদোকপীয়ু", CHECK: "স্কেমগী খুদম য়েংবীয়ু" },
  refSanchar: "নৌবা কলগী রিপোর্ট তৌবীয়ু", refBank: "নহাক্কী বেঙ্কগী এপ নত্ত্রগা কার্ড হেল্পলাইন", urgent: "থুনা",
  copy: "পাউখুম কপি তৌবীয়ু", copied: "কপি তৌরে", readAloud: "পাউখুম পাদুনা তাহনবীয়ু", thinking: "খনলি", transcribing: "নহাক্কী খোনজেল ইরি",
  placeholder: "Scam Shield দা পাও ইবীয়ু", listening: "তাবা…", typeLabel: "নহাক্কী পাও ইবীয়ু", speak: "নহাক্কী পাও হায়বীয়ু",
  stop: "রেকর্ডিং লেপহনবীয়ু", send: "পাও থাবীয়ু", disclaimer: "AI না অশোয়বা তৌবা য়াই। মরু ওইবা থবকশিং নসানা চেক তৌবীয়ু।",
  close: "মতেং পাংবা থিংবীয়ু", mute: "ৱা হায়বা পাউখুম থিংবীয়ু", unmute: "ৱা হায়বা পাউখুম হাংদোকপীয়ু",
  unavailable: "মতেং পাংবা হৌজিক লৈতে।", micUnsupported: "মফম অসিদা খোনজেল রেকর্ডিং য়াদে। পাও ইবীয়ু।",
  micDenied: "মাইক্রোফোনগী য়াথাং ফংদে। নহাক্না পাও ইবা য়াই।", transcribeFailed: "রেকর্ডিং অদু ৱাখল্লম্লোই।",
  noVoice: "ডিভাইস অসিদা লোন অসিদা ৱা হায়বা পাউখুম লৈতে।",
  note: "লোন অসিদা পাউখুমশিং হৌজিক থাজবা য়াদ্রি, মরম অসিনা Scam Shield না ইংলিশতা পাউখুম পী।",
};

const sat: VoiceCopy = {
  open: "Scam Shield ᱟᱲᱟᱝ ᱜᱚᱲᱚ ᱡᱷᱤᱡᱽ ᱢᱮ", launcherTitle: "Scam Shield ᱥᱟᱶ ᱜᱟᱞᱢᱟᱨᱟᱣ ᱢᱮ", launcherHint: "ᱢᱮᱱᱛᱮ ᱥᱮ ᱚᱞᱛᱮ ᱞᱟᱹᱭ ᱢᱮ ᱪᱮᱫ ᱦᱩᱭ ᱮᱱᱟ",
  dialogLabel: "Scam Shield AI ᱜᱚᱲᱚᱭᱤᱡ", subtitle: "ᱨᱩᱠᱷᱤᱭᱟᱹ ᱜᱚᱲᱚᱭᱤᱡ",
  notice: "OTP, PIN, ᱯᱟᱥᱣᱟᱨᱰ, CVV ᱥᱮ ᱯᱩᱨᱟᱹ ᱵᱮᱝᱠ ᱵᱤᱵᱨᱚᱬ ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ ᱦᱟᱹᱴᱤᱧ ᱢᱮ ᱾",
  welcome: "ᱡᱚᱦᱟᱨ ᱾ ᱪᱮᱫ ᱦᱩᱭ ᱦᱚᱪᱚ ᱠᱟᱱᱟ ᱞᱟᱹᱭ ᱢᱮ, ᱥᱮ ᱧᱮᱞ, ᱥᱟᱹᱨᱤ, ᱧᱟᱞᱤᱥ ᱥᱮ ᱴᱨᱮᱠ ᱞᱟᱹᱜᱤᱫ ᱢᱮᱱ ᱟᱢ ᱾ OTP, PIN, ᱯᱟᱥᱣᱟᱨᱰ ᱥᱮ CVV ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ ᱦᱟᱹᱴᱤᱧ ᱢᱮ ᱾",
  emptyTitle: "ᱪᱮᱫ ᱦᱩᱭ ᱮᱱᱟ?", emptyBody: "ᱟᱢᱟᱜ ᱟᱹᱲᱟᱹ ᱛᱮ ᱞᱟᱹᱭ ᱢᱮ, ᱥᱮ ᱧᱮᱞ, ᱥᱟᱹᱨᱤ, ᱧᱟᱞᱤᱥ ᱥᱮ ᱴᱨᱮᱠ ᱞᱟᱹᱜᱤᱫ ᱢᱮᱱ ᱟᱢ ᱾",
  starters: [["ᱡᱟᱦᱟᱸᱭ ᱤᱧ ᱛᱮ", "OTP ᱠᱟᱹᱢᱤᱫᱤᱧᱟ"], ["ᱤᱧ ᱢᱤᱫ ᱠᱚᱞᱟᱨ ᱴᱷᱮᱱ", "ᱴᱟᱠᱟ ᱠᱩᱞ ᱠᱮᱫᱟ"], ["ᱱᱚᱶᱟ ᱞᱤᱝᱠ ᱥᱮ ᱱᱚᱢᱵᱚᱨ", "ᱨᱩᱠᱷᱤᱭᱟᱹ ᱜᱮᱭᱟ ᱥᱮ?"], ["ᱤᱧᱟᱜ ᱧᱟᱞᱤᱥ ᱴᱨᱮᱠ ᱢᱮ", "ᱧᱟᱞᱤᱥ ID ᱛᱮ"]],
  whereToGo: "ᱚᱠᱟᱨᱮ ᱪᱟᱞᱟᱜ", next: { REPORT: "ᱫᱚᱨᱠᱟᱨ ᱧᱟᱞᱤᱥ ᱫᱷᱟᱯ ᱡᱷᱤᱡᱽ ᱢᱮ", STATUS: "ᱤᱧᱟᱜ ᱧᱟᱞᱤᱥ ᱴᱨᱮᱠ ᱢᱮ", VERIFY: "ᱥᱟᱹᱨᱤ ᱧᱮᱞ ᱡᱷᱤᱡᱽ ᱢᱮ", CHECK: "ᱥᱠᱮᱢ ᱪᱤᱱᱦᱟᱹ ᱧᱮᱞ ᱢᱮ" },
  refSanchar: "ᱫᱷᱚᱸᱫᱽ ᱠᱚᱞ ᱨᱤᱱ ᱧᱟᱞᱤᱥ ᱢᱮ", refBank: "ᱟᱢᱟᱜ ᱵᱮᱝᱠ ᱮᱯ ᱥᱮ ᱠᱟᱨᱰ ᱦᱮᱞᱯᱞᱟᱭᱤᱱ", urgent: "ᱫᱚᱨᱠᱟᱨ",
  copy: "ᱛᱮᱞᱟ ᱠᱚᱯᱤ ᱢᱮ", copied: "ᱠᱚᱯᱤ ᱮᱱᱟ", readAloud: "ᱛᱮᱞᱟ ᱯᱟᱲᱦᱟᱣ ᱟᱸᱡᱚᱢ ᱢᱮ", thinking: "ᱩᱭᱦᱟᱹᱨ ᱮᱫᱟ", transcribing: "ᱟᱢᱟᱜ ᱟᱲᱟᱝ ᱚᱞ ᱦᱩᱭ ᱮᱫᱟ",
  placeholder: "Scam Shield ᱴᱷᱮᱱ ᱠᱷᱚᱵᱚᱨ ᱚᱞ ᱢᱮ", listening: "ᱟᱸᱡᱚᱢ ᱮᱫᱟ…", typeLabel: "ᱟᱢᱟᱜ ᱠᱷᱚᱵᱚᱨ ᱚᱞ ᱢᱮ", speak: "ᱟᱢᱟᱜ ᱠᱷᱚᱵᱚᱨ ᱢᱮᱱ ᱢᱮ",
  stop: "ᱨᱮᱠᱚᱨᱰᱤᱝ ᱵᱚᱱᱫᱚ ᱢᱮ", send: "ᱠᱷᱚᱵᱚᱨ ᱠᱩᱞ ᱢᱮ", disclaimer: "AI ᱵᱷᱩᱞ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾ ᱡᱚᱨᱩᱨ ᱠᱟᱹᱢᱤ ᱟᱢ ᱜᱮ ᱥᱟᱹᱨᱤ ᱢᱮ ᱾",
  close: "ᱜᱚᱲᱚᱭᱤᱡ ᱵᱚᱱᱫᱚ ᱢᱮ", mute: "ᱨᱚᱲ ᱛᱮᱞᱟ ᱵᱚᱱᱫᱚ ᱢᱮ", unmute: "ᱨᱚᱲ ᱛᱮᱞᱟ ᱮᱦᱚᱵ ᱢᱮ",
  unavailable: "ᱜᱚᱲᱚᱭᱤᱡ ᱱᱤᱛᱚᱜ ᱵᱟᱝ ᱧᱟᱢᱚᱜᱼᱟ ᱾", micUnsupported: "ᱱᱚᱸᱰᱮ ᱟᱲᱟᱝ ᱨᱮᱠᱚᱨᱰᱤᱝ ᱵᱟᱝ ᱦᱩᱭ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾ ᱠᱷᱚᱵᱚᱨ ᱚᱞ ᱢᱮ ᱾",
  micDenied: "ᱢᱟᱭᱤᱠᱨᱚᱯᱷᱚᱱ ᱦᱩᱠᱩᱢ ᱵᱟᱝ ᱧᱟᱢ ᱞᱮᱱᱟ ᱾ ᱟᱢ ᱠᱷᱚᱵᱚᱨ ᱚᱞ ᱫᱟᱲᱮᱭᱟᱜᱼᱟᱢ ᱾", transcribeFailed: "ᱨᱮᱠᱚᱨᱰᱤᱝ ᱵᱟᱝ ᱵᱩᱡᱷᱟᱹᱣ ᱞᱮᱱᱟ ᱾",
  noVoice: "ᱱᱚᱶᱟ ᱰᱤᱵᱷᱟᱭᱤᱥ ᱨᱮ ᱱᱚᱶᱟ ᱯᱟᱹᱨᱥᱤ ᱨᱮ ᱨᱚᱲ ᱛᱮᱞᱟ ᱵᱟᱝ ᱧᱟᱢᱚᱜᱼᱟ ᱾",
  note: "ᱱᱚᱶᱟ ᱯᱟᱹᱨᱥᱤ ᱨᱮ ᱛᱮᱞᱟ ᱱᱤᱛᱚᱜ ᱦᱚᱸ ᱯᱚᱛᱭᱟᱹᱣ ᱵᱟᱝ ᱠᱟᱱᱟ, ᱚᱱᱟᱛᱮ Scam Shield ᱤᱝᱜᱽᱨᱮᱡᱤ ᱛᱮ ᱛᱮᱞᱟ ᱮᱢᱟ ᱾",
};

const tcy: VoiceCopy = {
  open: "Scam Shield ಸ್ವರ ಸಹಾಯಕನ್ ಬುಡೆಲೆ", launcherTitle: "Scam Shield ಒಟ್ಟುಗು ಪಾತೆರ್ಲೆ", launcherHint: "ದಾನೆ ಆಂಡ್ ಪಂಡ್‌ದ್ ಅತ್ತಂಡ ಬರೆತ್ ತೆರಿಪಾಲೆ",
  dialogLabel: "Scam Shield AI ಸಹಾಯಕೆ", subtitle: "ಸುರಕ್ಷಾ ಸಹಾಯಕೆ",
  notice: "OTP, PIN, ಪಾಸ್‌ವರ್ಡ್, CVV ಅತ್ತಂಡ ಪೂರ್ತಿ ಬ್ಯಾಂಕ್ ವಿವರೊಲೆನ್ ಏಪಲಾ ಪಟ್ಟೊಡ್ಚಿ.",
  welcome: "ನಮಸ್ಕಾರ. ದಾನೆ ಆವೊಂದುಂಡು ಪನ್ಲೆ, ಅತ್ತಂಡ ಎನನ್ ಪರೀಕ್ಷೆ, ದೂರು ಅತ್ತಂಡ ಟ್ರ್ಯಾಕ್ ಮಲ್ಪುಲೆ ಪನ್ಲೆ. OTP, PIN, ಪಾಸ್‌ವರ್ಡ್ ಅತ್ತಂಡ CVV ಏಪಲಾ ಪಟ್ಟೊಡ್ಚಿ.",
  emptyTitle: "ದಾನೆ ಆಂಡ್?", emptyBody: "ಇರೆನ ಪಾತೆರೊಡು ಪನ್ಲೆ, ಅತ್ತಂಡ ಎನನ್ ಪರೀಕ್ಷೆ, ದೂರು ಅತ್ತಂಡ ಟ್ರ್ಯಾಕ್ ಮಲ್ಪುಲೆ ಪನ್ಲೆ.",
  starters: [["ಏರೊ ಎನ್ನಡ", "OTP ಕೇನೊಂದುಲ್ಲೆರ್"], ["ಯಾನ್ ಒರಿ ಕಾಲರೆಗ್", "ಪೈಸೆ ಕಡಪುಡ್ದೆ"], ["ಉಂದು ಲಿಂಕ್ ಅತ್ತಂಡ ನಂಬರ್", "ಸುರಕ್ಷಿತನಾ?"], ["ಎನ್ನ ದೂರುನು ಟ್ರ್ಯಾಕ್ ಮಲ್ಪುಲೆ", "ದೂರು ID ಡ್"]],
  whereToGo: "ಓಲು ಪೋವೊಡು", next: { REPORT: "ಬಿರ್ಸೊದ ದೂರುದ ಹಂತೊಲೆನ್ ಬುಡೆಲೆ", STATUS: "ಎನ್ನ ದೂರುನು ಟ್ರ್ಯಾಕ್ ಮಲ್ಪುಲೆ", VERIFY: "ಪರಿಶೀಲನೆ ಬುಡೆಲೆ", CHECK: "ಮೋಸದ ಲಕ್ಷಣೊಲೆನ್ ತೂಲೆ" },
  refSanchar: "ಮೋಸದ ಕಾಲ್‌ದ ದೂರು ಕೊರ್ಲೆ", refBank: "ಇರೆನ ಬ್ಯಾಂಕ್‌ದ ಆ್ಯಪ್ ಅತ್ತಂಡ ಕಾರ್ಡ್ ಸಹಾಯವಾಣಿ", urgent: "ಬಿರ್ಸೊ",
  copy: "ಉತ್ತರೊನು ನಕಲ್ ಮಲ್ಪುಲೆ", copied: "ನಕಲ್ ಆಂಡ್", readAloud: "ಉತ್ತರೊನು ಓದುದು ಕೇನಾಲೆ", thinking: "ಯೋಚನೆ ಮಲ್ಪುವೊಂದುಂಡು", transcribing: "ಇರೆನ ಸ್ವರೊನು ಬರೆಪುವೊಂದುಂಡು",
  placeholder: "Scam Shield ಗ್ ಸಂದೇಶ ಬರೆಲೆ", listening: "ಕೇನೊಂದುಂಡು…", typeLabel: "ಇರೆನ ಸಂದೇಶ ಬರೆಲೆ", speak: "ಇರೆನ ಸಂದೇಶ ಪನ್ಲೆ",
  stop: "ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಪಾಲೆ", send: "ಸಂದೇಶ ಕಡಪುಡ್ಲೆ", disclaimer: "AI ತಪ್ಪು ಮಲ್ಪುವೊಲಿ. ಮುಖ್ಯ ಕೆಲಸೊಲೆನ್ ಈರ್ ಖಚಿತ ಮಲ್ಪುಲೆ.",
  close: "ಸಹಾಯಕನ್ ಮುಚ್ಚುಲೆ", mute: "ಪಾತೆರುನ ಉತ್ತರೊಲೆನ್ ನಿಲ್ಪಾಲೆ", unmute: "ಪಾತೆರುನ ಉತ್ತರೊಲೆನ್ ಸುರು ಮಲ್ಪುಲೆ",
  unavailable: "ಸಹಾಯಕೆ ಇತ್ತೆ ತಿಕ್ಕುಜೆ.", micUnsupported: "ಮುಲ್ಪ ಸ್ವರ ರೆಕಾರ್ಡಿಂಗ್ ಆಪುಜಿ. ಸಂದೇಶ ಬರೆಲೆ.",
  micDenied: "ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ತಿಕ್ಕಿಜಿ. ಈರ್ ಸಂದೇಶ ಬರೆಯೊಲಿ.", transcribeFailed: "ರೆಕಾರ್ಡಿಂಗ್ ಅರ್ಥ ಆಯಿಜಿ.",
  noVoice: "ಈ ಸಾಧನೊಡು ಈ ಬಾಸೆಡ್ ಪಾತೆರುನ ಉತ್ತರೊಲು ತಿಕ್ಕುಜಿ.",
  note: "ಈ ಬಾಸೆಡ್ ಉತ್ತರೊಲು ಇತ್ತೆಲಾ ನಂಬುನಂಚಿನವು ಅತ್ತ್, ಅಂಚಾದ್ Scam Shield ಇಂಗ್ಲಿಷ್‌ಡ್ ಉತ್ತರ ಕೊರ್ಪುಂಡು.",
};

const kha: VoiceCopy = {
  open: "Plie ia u nongiarap sur jong Scam Shield", launcherTitle: "Kren bad Scam Shield", launcherHint: "Ong lane thoh aiu ba la jia",
  dialogLabel: "U nongiarap AI jong Scam Shield", subtitle: "Nongiarap shaphang ka jingshlei",
  notice: "Wat ai ei ei ia ka OTP, PIN, password, CVV ne ki jingtip baroh jong ka bank.",
  welcome: "Khublei. Ong aiu ba jia, lane kylli ia nga ban peit, ban shim jingshisha, ban pynshaphang lane ban bud. Wat ai ei ei ia ka OTP, PIN, password ne CVV.",
  emptyTitle: "Aiu ba la jia?", emptyBody: "Ong da ki ktien jong phi, lane kylli ia nga ban peit, ban shim jingshisha, ban pynshaphang lane ban bud.",
  starters: [["Don uwei uba kylli", "ia ka OTP jong nga"], ["Nga la phah tyngka", "sha uwei u ba khot"], ["Ka link ne ka number kane", "ka shlei ne em?"], ["Bud ia ka report jong nga", "da ka ID jingpynshaphang"]],
  whereToGo: "Shano ban leit", next: { REPORT: "Plie ki kyrdan report kloi", STATUS: "Bud ia ka report jong nga", VERIFY: "Plie ka jingshim shisha", CHECK: "Peit ia ki dak jong ka scam" },
  refSanchar: "Pynshaphang ia ka call shukor", refBank: "Ka app bank jong phi ne ka helpline kard", urgent: "Kloi",
  copy: "Kopi ia ka jubab", copied: "La kopi", readAloud: "Pule khlam ia ka jubab", thinking: "Dang pyrkhat", transcribing: "Dang thoh ia ka sur jong phi",
  placeholder: "Thoh khubor sha Scam Shield", listening: "Dang sngap…", typeLabel: "Thoh ia ka khubor jong phi", speak: "Ong ia ka khubor jong phi",
  stop: "Pyndep ia ka recording", send: "Phah ia ka khubor", disclaimer: "Ka AI lah ban pynbakla. Pyntikna hi ia ki kam kiba kongsan.",
  close: "Khang ia u nongiarap", mute: "Pyndep ia ki jubab sur", unmute: "Pyndonkam ia ki jubab sur",
  unavailable: "U nongiarap um don mynta.", micUnsupported: "Um lah ban record sur hangne. Thoh ia ka khubor.",
  micDenied: "Ym la ai bor ia ka microphone. Phi lah ban thoh ia ka khubor.", transcribeFailed: "Ym la sngewthuh ia ka recording.",
  noVoice: "Ki jubab sur ha kane ka ktien kim don ha kane ka device.",
  note: "Ki jubab ha kane ka ktien kim pat ju shaniah, te Scam Shield u jubab ha ka ktien phareng.",
};

export const VOICE_COPY: Readonly<Record<SafetyLocale, VoiceCopy>> = {
  en, hi, bn, mr, gu, ta, te, kn, ml, pa, ur, ne, kok, mai, bho, raj, doi, brx, sa, gon, as, or, ks, sd, mni, sat, tcy, kha,
};

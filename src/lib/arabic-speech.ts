const EASTERN_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const WESTERN_DIGITS = '0123456789';
const NUMBER_WORDS: Record<string, string> = {
  '0': 'صفر',
  '1': 'واحد',
  '2': 'اثنان',
  '3': 'ثلاثة',
  '4': 'أربعة',
  '5': 'خمسة',
  '6': 'ستة',
  '7': 'سبعة',
  '8': 'ثمانية',
  '9': 'تسعة',
  '10': 'عشرة',
  '11': 'أحد عشر',
  '12': 'اثنا عشر',
  '13': 'ثلاثة عشر',
  '14': 'أربعة عشر',
  '15': 'خمسة عشر',
  '16': 'ستة عشر',
  '17': 'سبعة عشر',
  '18': 'ثمانية عشر',
  '19': 'تسعة عشر',
  '20': 'عشرون',
};

function westernizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => WESTERN_DIGITS[EASTERN_DIGITS.indexOf(digit)]);
}

/** Prepares short child-facing Arabic prompts for clear neural speech synthesis. */
export function prepareArabicSpeech(value: string): string {
  let text = westernizeDigits(value.normalize('NFC'))
    .replace(/ـ/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/…/g, '، ')
    .replace(/([،؛:])/g, '$1 ')
    .replace(/[—–-]/g, '، ')
    .replace(/\s+/g, ' ')
    .trim();

  // Questions for this product only use small numerals; speaking them as words
  // prevents locale-dependent readings such as English digit names.
  text = text.replace(/\d+/g, (number) => NUMBER_WORDS[number] ?? number);

  if (text && !/[.!؟]$/.test(text)) text += '۔';
  return text;
}

/** Escapes prompt text because the TTS package embeds it inside an SSML document. */
export function escapeSpeechXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanOneThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    str += ones[n] + ' ';
  }
  return str.trim();
}

function convertNumberToWordsIndian(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Zero';
  
  const rounded = Math.round(Number(num) * 100) / 100;
  if (rounded === 0) return 'INR Zero Only';

  const parts = rounded.toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  if (integerPart === 0 && decimalPart === 0) {
    return 'INR Zero Only';
  }

  let words = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;

  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;

  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;

  const remainder = integerPart;

  if (crore > 0) {
    words += convertLessThanOneThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertLessThanOneThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertLessThanOneThousand(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertLessThanOneThousand(remainder) + ' ';
  }

  words = words.trim();
  let result = 'INR ' + (words ? words : 'Zero');

  if (decimalPart > 0) {
    result += ' and ' + convertLessThanOneThousand(decimalPart) + ' Paise';
  }

  result += ' Only';
  return result.replace(/\s+/g, ' ');
}

module.exports = { convertNumberToWordsIndian };

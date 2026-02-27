export interface CreditCardCatalogItem {
  name: string;
  network: 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX';
}

export const CREDIT_CARD_CATALOG: Record<string, CreditCardCatalogItem[]> = {
  'HDFC Bank': [
    { name: 'Millennia Credit Card', network: 'VISA' },
    { name: 'IndianOil HDFC Bank Credit Card', network: 'VISA' },
    { name: 'Pixel Play Credit Card', network: 'VISA' },
    { name: 'Freedom Credit Card', network: 'VISA' },
    { name: 'Regalia Gold Credit Card', network: 'VISA' }
  ],
  'ICICI Bank': [
    { name: 'Sapphiro Credit Card', network: 'VISA' },
    { name: 'Rubyx Credit Card', network: 'VISA' },
    { name: 'Coral Credit Card', network: 'VISA' },
    { name: 'Amazon Pay ICICI Credit Card', network: 'VISA' },
    { name: 'Times Black ICICI Bank Credit Card', network: 'VISA' }
  ],
  'SBI Card': [
    { name: 'CASHBACK SBI Card', network: 'VISA' },
    { name: 'SimplyCLICK SBI Card', network: 'VISA' },
    { name: 'SBI Card PRIME', network: 'VISA' },
    { name: 'SBI Card ELITE', network: 'VISA' },
    { name: 'Tata Neu Infinity SBI Card', network: 'RUPAY' }
  ],
  'Axis Bank': [
    { name: 'Axis Atlas Credit Card', network: 'VISA' },
    { name: 'Axis Bank ACE Credit Card', network: 'VISA' },
    { name: 'Flipkart Axis Bank Credit Card', network: 'VISA' },
    { name: 'Axis My Zone Credit Card', network: 'MASTERCARD' },
    { name: 'IndianOil Axis Bank Credit Card', network: 'RUPAY' }
  ]
};

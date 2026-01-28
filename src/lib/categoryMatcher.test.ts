import { describe, it, expect } from 'vitest';
import { matchByKeyword, type CategoryId } from './categoryMatcher';

describe('matchByKeyword', () => {
  describe('groceries (mat)', () => {
    it.each([
      ['ICA MAXI BROMMA', 'mat'],
      ['COOP EXTRA', 'mat'],
      ['WILLYS HEMMA', 'mat'],
      ['Lidl', 'mat'],
      ['hemköp', 'mat'],
      ['CITY GROSS', 'mat'],
      ['Mathem', 'mat'],
      ['Mat.se leverans', 'mat'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
      expect(result?.confidence).toBe('high');
      expect(result?.source).toBe('keyword');
    });
  });

  describe('restaurants (restaurang)', () => {
    it.each([
      ['MAX HAMBURGAR', 'restaurang'],
      ['MCDONALDS', 'restaurang'],
      ['Burger King', 'restaurang'],
      ['SUBWAY', 'restaurang'],
      ['Pizza Hut', 'restaurang'],
      ['Thai Kitchen', 'restaurang'],
      ['Espresso House', 'restaurang'],
      ['STARBUCKS', 'restaurang'],
      ['FOODORA', 'restaurang'],
      ['Uber Eats', 'restaurang'],
      ['Wolt', 'restaurang'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('alcohol (alkohol)', () => {
    it.each([
      ['SYSTEMBOLAGET', 'alkohol'],
      ['Systemet 123', 'alkohol'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('transport', () => {
    it.each([
      ['SL', 'transport'],
      ['SJ BILJETT', 'transport'],
      ['Västtrafik', 'transport'],
      ['TAXI STOCKHOLM', 'transport'],
      ['UBER', 'transport'],
      ['BOLT', 'transport'],
      ['CIRCLE K BENSIN', 'transport'],
      ['PREEM', 'transport'],
      ['SHELL STATION', 'transport'],
      ['EasyPark', 'transport'],
      ['VOI', 'transport'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('housing (boende)', () => {
    it.each([
      ['VATTENFALL', 'boende'],
      ['E.ON ENERGI', 'boende'],
      ['Ellevio', 'boende'],
      ['TELIA', 'boende'],
      ['TELE2', 'boende'],
      ['Telenor', 'boende'],
      ['IF FÖRSÄKRING', 'boende'],
      ['Folksam', 'boende'],
      ['IKEA', 'boende'],
      ['RUSTA', 'boende'],
      ['JULA', 'boende'],
      ['BAUHAUS', 'boende'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('entertainment (noje)', () => {
    it.each([
      ['NETFLIX', 'noje'],
      ['HBO MAX', 'noje'],
      ['Disney Plus', 'noje'],
      ['SPOTIFY', 'noje'],
      ['Viaplay', 'noje'],
      ['SF BIO', 'noje'],
      ['Filmstaden', 'noje'],
      ['STEAM', 'noje'],
      ['SATS GYM', 'noje'],
      ['FITNESS24SEVEN', 'noje'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('health (halsa)', () => {
    it.each([
      ['APOTEK HJÄRTAT', 'halsa'],
      ['Apotea', 'halsa'],
      ['KRONANS APOTEK', 'halsa'],
      ['KRY', 'halsa'],
      ['DOKTOR.SE', 'halsa'],
      ['SYNOPTIK', 'halsa'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('clothing (klader)', () => {
    it.each([
      ['H&M', 'klader'],
      ['ZARA', 'klader'],
      ['UNIQLO', 'klader'],
      ['Lindex', 'klader'],
      ['Kappahl', 'klader'],
      ['STADIUM', 'klader'],
      ['Zalando', 'klader'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('shopping', () => {
    it.each([
      ['AMAZON', 'shopping'],
      ['Webhallen', 'shopping'],
      ['ELGIGANTEN', 'shopping'],
      ['MediaMarkt', 'shopping'],
      ['INET', 'shopping'],
      ['KJELL & COMPANY', 'shopping'],
      ['Clas Ohlson', 'shopping'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('travel (resor)', () => {
    it.each([
      ['SAS FLYGBILJETT', 'resor'],
      ['NORWEGIAN', 'resor'],
      ['Ryanair', 'resor'],
      ['BOOKING.COM', 'resor'],
      ['Airbnb', 'resor'],
      ['HERTZ HYRBIL', 'resor'],
      ['Flixbus', 'resor'],
    ])('matches "%s" as %s', (description, expectedCategory) => {
      const result = matchByKeyword(description);
      expect(result).not.toBeNull();
      expect(result?.category).toBe(expectedCategory);
    });
  });

  describe('unmatched descriptions', () => {
    it.each([
      'Random description',
      'John Smith',
      'Betalning 12345',
      '',
      '   ',
    ])('returns null for "%s"', (description) => {
      const result = matchByKeyword(description);
      expect(result).toBeNull();
    });
  });

  describe('case insensitivity', () => {
    it('matches regardless of case', () => {
      expect(matchByKeyword('ICA')?.category).toBe('mat');
      expect(matchByKeyword('ica')?.category).toBe('mat');
      expect(matchByKeyword('Ica')?.category).toBe('mat');
      expect(matchByKeyword('iCa')?.category).toBe('mat');
    });
  });

  describe('partial matches', () => {
    it('matches when keyword is part of larger string', () => {
      expect(matchByKeyword('ICA MAXI BROMMA 12345')?.category).toBe('mat');
      expect(matchByKeyword('Betalning till COOP')?.category).toBe('mat');
    });
  });
});

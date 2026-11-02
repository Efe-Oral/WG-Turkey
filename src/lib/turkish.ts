import { slugify } from "./slug";

const BACK_VOWELS = "aıou";
const FRONT_VOWELS = "eiöü";
const VOICELESS = "fstkçşhp";

/** "Ankara" becomes "Ankara'da", "İzmir" becomes "İzmir'de", "Sivas" "Sivas'ta". */
export function locative(name: string): string {
  const letters = name.toLocaleLowerCase("tr-TR");
  const lastVowel = [...letters]
    .reverse()
    .find((char) => BACK_VOWELS.includes(char) || FRONT_VOWELS.includes(char));
  const vowel = lastVowel && BACK_VOWELS.includes(lastVowel) ? "a" : "e";
  const consonant = VOICELESS.includes(letters.at(-1) ?? "") ? "t" : "d";

  return `${name}'${consonant}${vowel}`;
}

/** Folds Turkish letters and case, so "sanliurfa" finds "Şanlıurfa". */
export function foldForSearch(text: string): string {
  return slugify(text);
}

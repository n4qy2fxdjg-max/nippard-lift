/**
 * Seed: original demonstration content for every question format plus final categories.
 * Survey scores are SAMPLE numbers to demonstrate the game; they are not real polling data.
 * Run: npm run db:seed (idempotent: questions are matched by text).
 */
import 'dotenv/config';
import { prisma } from '../lib/db/prisma';
import { writeMedia } from './seed-media';

type A = [canonical: string, score: number, aliases?: string[]];

interface SeedQuestion {
  category: string;
  text: string;
  instructions?: string;
  format: 'OPEN' | 'BOARD' | 'CLUES' | 'LINKED' | 'PICTURE' | 'PARTIAL';
  difficulty?: number;
  explanation?: string;
  source?: string;
  settings?: Record<string, unknown>;
  /** OPEN / LINKED pool 0 */
  answers?: A[];
  /** LINKED pool 1 */
  answersB?: A[];
  /** BOARD: label + score (null = decoy) */
  board?: [label: string, score: number | null][];
  /** CLUES / PICTURE / PARTIAL: clue (or image key), accepted answers */
  items?: { clue?: string; label?: string; image?: string; answers: A[] }[];
}

const open = (category: string, text: string, instructions: string, answers: A[], difficulty = 2, explanation = ''): SeedQuestion => ({ category, text, instructions, format: 'OPEN', answers, difficulty, explanation });

const OPEN: SeedQuestion[] = [
  open('Geography', 'Name a country whose English name begins with B', 'We accepted sovereign states recognised by the United Nations whose common English name begins with the letter B.', [
    ['Brazil', 52, ['Brasil']], ['Belgium', 31], ['Bangladesh', 24], ['Bulgaria', 19], ['Bolivia', 16], ['Bahamas', 14, ['The Bahamas']], ['Botswana', 9], ['Bahrain', 8], ['Barbados', 7], ['Belarus', 6], ['Bosnia and Herzegovina', 5, ['Bosnia']], ['Belize', 4], ['Bhutan', 3], ['Burkina Faso', 2], ['Benin', 1], ['Brunei', 0, ['Brunei Darussalam']], ['Burundi', 0],
  ], 1, 'Brunei and Burundi were the rare finds in our sample.'),
  open('Science', 'Name a planet or dwarf planet in our solar system', 'The eight planets and the five dwarf planets recognised by the International Astronomical Union.', [
    ['Mars', 41], ['Jupiter', 33], ['Saturn', 29], ['Venus', 22], ['Earth', 20], ['Neptune', 17], ['Mercury', 15], ['Uranus', 13], ['Pluto', 11], ['Ceres', 2], ['Eris', 1], ['Makemake', 0], ['Haumea', 0],
  ], 1),
  open('Science', 'Name a chemical element whose symbol is a single letter', 'Elements whose symbol on the periodic table is one letter. There are fourteen.', [
    ['Oxygen', 48, ['O']], ['Hydrogen', 45, ['H']], ['Carbon', 39, ['C']], ['Nitrogen', 27, ['N']], ['Potassium', 12, ['K']], ['Sulfur', 10, ['Sulphur', 'S']], ['Iodine', 7, ['I']], ['Phosphorus', 6, ['P']], ['Fluorine', 5, ['F']], ['Boron', 4, ['B']], ['Uranium', 4, ['U']], ['Tungsten', 1, ['W', 'Wolfram']], ['Vanadium', 0, ['V']], ['Yttrium', 0, ['Y']],
  ], 3),
  open('Literature', 'Name a play written by William Shakespeare', 'Any of the plays generally attributed to Shakespeare, including collaborations such as Henry VIII.', [
    ['Romeo and Juliet', 57], ['Hamlet', 49], ['Macbeth', 44], ['Othello', 21], ['A Midsummer Night’s Dream', 18], ['King Lear', 15], ['The Tempest', 12], ['Julius Caesar', 11], ['Twelfth Night', 9], ['The Merchant of Venice', 8], ['Much Ado About Nothing', 7], ['Richard III', 6], ['Antony and Cleopatra', 4], ['As You Like It', 3], ['The Taming of the Shrew', 3], ['Henry V', 3], ['Measure for Measure', 1], ['Coriolanus', 1], ['Titus Andronicus', 0], ['Cymbeline', 0], ['Pericles', 0, ['Pericles, Prince of Tyre']], ['Timon of Athens', 0], ['The Two Gentlemen of Verona', 0], ['King John', 0],
  ], 2),
  open('World', 'Name an official language of the United Nations', 'The UN has six official languages.', [
    ['English', 71], ['French', 52], ['Spanish', 47], ['Chinese', 31, ['Mandarin']], ['Russian', 24], ['Arabic', 19],
  ], 1, 'No rare finds here: with only six answers everyone found something.'),
  open('Geography', 'Name a US state that borders Canada', 'The thirteen states sharing a land or water border with Canada.', [
    ['Alaska', 38], ['Washington', 29], ['New York', 27], ['Michigan', 22], ['Maine', 20], ['Montana', 15], ['Minnesota', 14], ['North Dakota', 9], ['Vermont', 8], ['Idaho', 6], ['New Hampshire', 4], ['Ohio', 1], ['Pennsylvania', 0],
  ], 3),
  open('Human body', 'Name a bone found in the human arm or hand', 'Any bone of the upper limb, from shoulder to fingertip.', [
    ['Humerus', 44], ['Radius', 36], ['Ulna', 30], ['Phalanges', 12, ['Phalanx', 'Finger bones']], ['Metacarpals', 9, ['Metacarpal']], ['Carpals', 7, ['Carpal bones']], ['Scaphoid', 3], ['Lunate', 1], ['Trapezium', 1], ['Hamate', 0], ['Capitate', 0], ['Pisiform', 0], ['Triquetrum', 0, ['Triquetral']], ['Trapezoid', 0],
  ], 3),
  open('Calendar', 'Name a month with exactly 31 days', 'Seven months of the Gregorian calendar have 31 days.', [
    ['January', 42], ['December', 35], ['October', 31], ['July', 27], ['March', 24], ['August', 22], ['May', 19],
  ], 1),
  open('Music', 'Name an instrument in a standard symphony orchestra string section', 'Instruments of the string section in a modern symphony orchestra.', [
    ['Violin', 73], ['Cello', 41], ['Viola', 27], ['Double bass', 18, ['Bass', 'Contrabass']], ['Harp', 6],
  ], 1),
];

const BOARD: SeedQuestion[] = [
  { category: 'Geography', format: 'BOARD', text: 'Which of these cities is a national capital?', instructions: 'Choose a city that is the official capital of a sovereign state. The others are large but not capitals.', difficulty: 2, settings: { boardColumns: 4 }, board: [['Ottawa', 23], ['Sydney', null], ['Canberra', 14], ['Istanbul', null], ['Wellington', 9], ['Toronto', null], ['Bern', 4], ['Rio de Janeiro', null], ['Abuja', 2], ['São Paulo', null], ['Nur-Sultan', 0], ['Zurich', null]] },
  { category: 'Science', format: 'BOARD', text: 'Which of these is a noble gas?', instructions: 'The noble gases are the elements in group 18 of the periodic table.', difficulty: 2, settings: { boardColumns: 4 }, board: [['Helium', 44], ['Hydrogen', null], ['Neon', 31], ['Nitrogen', null], ['Argon', 12], ['Chlorine', null], ['Krypton', 8], ['Carbon', null], ['Xenon', 4], ['Fluorine', null], ['Radon', 1], ['Oganesson', 0]] },
  { category: 'Nature', format: 'BOARD', text: 'Which of these animals is a marsupial?', instructions: 'Marsupials carry their young in a pouch. Pick one.', difficulty: 2, settings: { boardColumns: 4 }, board: [['Kangaroo', 52], ['Platypus', null], ['Koala', 28], ['Echidna', null], ['Wombat', 9], ['Capybara', null], ['Tasmanian devil', 5], ['Lemur', null], ['Wallaby', 4], ['Meerkat', null], ['Quokka', 1], ['Numbat', 0]] },
  { category: 'Literature', format: 'BOARD', text: 'Which of these novels was written by Jane Austen?', instructions: 'Austen completed six novels. The decoys are by other nineteenth-century authors.', difficulty: 3, settings: { boardColumns: 4 }, board: [['Pride and Prejudice', 61], ['Jane Eyre', null], ['Emma', 18], ['Wuthering Heights', null], ['Sense and Sensibility', 12], ['Middlemarch', null], ['Persuasion', 5], ['Vanity Fair', null], ['Mansfield Park', 3], ['North and South', null], ['Northanger Abbey', 1], ['Agnes Grey', null]] },
  { category: 'Numbers', format: 'BOARD', text: 'Which of these numbers is prime?', instructions: 'A prime number has exactly two divisors: 1 and itself.', difficulty: 3, settings: { boardColumns: 4 }, board: [['7', 48], ['21', null], ['13', 29], ['51', null], ['29', 11], ['91', null], ['41', 6], ['87', null], ['67', 3], ['119', null], ['97', 2], ['101', 1]] },
];

const CLUES: SeedQuestion[] = [
  { category: 'History', format: 'CLUES', text: 'BATTLE → COUNTRY: name the modern country where the battle took place', instructions: 'Choose a battle and give the present-day country in which it was fought.', difficulty: 3, items: [
    { clue: 'Battle of Hastings', answers: [['England', 40, ['United Kingdom', 'UK', 'Britain']]] }, { clue: 'Battle of Waterloo', answers: [['Belgium', 22]] }, { clue: 'Battle of Gettysburg', answers: [['United States', 35, ['USA', 'America']]] }, { clue: 'Battle of Stalingrad', answers: [['Russia', 30]] }, { clue: 'Battle of Trafalgar', answers: [['Spain', 9]] }, { clue: 'Battle of Agincourt', answers: [['France', 14]] }, { clue: 'Battle of Thermopylae', answers: [['Greece', 11]] }, { clue: 'Battle of Culloden', answers: [['Scotland', 6, ['United Kingdom', 'UK']]] }, { clue: 'Battle of Adwa', answers: [['Ethiopia', 0]] },
  ] },
  { category: 'Geography', format: 'CLUES', text: 'CAPITAL → COUNTRY: name the country of which this city is the capital', instructions: 'Pick a capital city and name its country.', difficulty: 2, items: [
    { clue: 'Canberra', answers: [['Australia', 44]] }, { clue: 'Ottawa', answers: [['Canada', 41]] }, { clue: 'Wellington', answers: [['New Zealand', 30]] }, { clue: 'Ankara', answers: [['Turkey', 18, ['Türkiye']]] }, { clue: 'Bern', answers: [['Switzerland', 12]] }, { clue: 'Abuja', answers: [['Nigeria', 5]] }, { clue: 'Astana', answers: [['Kazakhstan', 3]] }, { clue: 'Lima', answers: [['Peru', 15]] }, { clue: 'Hanoi', answers: [['Vietnam', 8]] }, { clue: 'Windhoek', answers: [['Namibia', 0]] }, { clue: 'Vaduz', answers: [['Liechtenstein', 0]] },
  ] },
  { category: 'Money', format: 'CLUES', text: 'CURRENCY → COUNTRY: name a country that uses this currency', instructions: 'Pick a currency and name a country where it is the official currency.', difficulty: 3, items: [
    { clue: 'Yen', answers: [['Japan', 49]] }, { clue: 'Won', answers: [['South Korea', 21, ['Korea']], ['North Korea', 3]] }, { clue: 'Rand', answers: [['South Africa', 17]] }, { clue: 'Złoty', answers: [['Poland', 13]] }, { clue: 'Forint', answers: [['Hungary', 7]] }, { clue: 'Baht', answers: [['Thailand', 14]] }, { clue: 'Rupiah', answers: [['Indonesia', 5]] }, { clue: 'Krona', answers: [['Sweden', 9], ['Iceland', 1, ['Króna']]] }, { clue: 'Lari', answers: [['Georgia', 0]] }, { clue: 'Kwacha', answers: [['Zambia', 0], ['Malawi', 0]] },
  ] },
  { category: 'Literature', format: 'CLUES', text: 'NOVEL → AUTHOR: name the author of the novel', instructions: 'Surnames are enough.', difficulty: 3, items: [
    { clue: 'Moby-Dick', answers: [['Herman Melville', 22, ['Melville']]] }, { clue: 'Dracula', answers: [['Bram Stoker', 31, ['Stoker']]] }, { clue: 'Frankenstein', answers: [['Mary Shelley', 38, ['Shelley']]] }, { clue: 'Middlemarch', answers: [['George Eliot', 6, ['Eliot', 'Mary Ann Evans']]] }, { clue: 'Ulysses', answers: [['James Joyce', 14, ['Joyce']]] }, { clue: 'Jane Eyre', answers: [['Charlotte Brontë', 27, ['Bronte', 'Charlotte Bronte', 'Brontë']]] }, { clue: 'Great Expectations', answers: [['Charles Dickens', 40, ['Dickens']]] }, { clue: 'Dune', answers: [['Frank Herbert', 12, ['Herbert']]] }, { clue: 'Kim', answers: [['Rudyard Kipling', 2, ['Kipling']]] }, { clue: 'Nostromo', answers: [['Joseph Conrad', 0, ['Conrad']]] },
  ] },
  { category: 'Science', format: 'CLUES', text: 'SYMBOL → ELEMENT: name the chemical element with this symbol', instructions: 'Choose a symbol from the periodic table and name its element.', difficulty: 3, items: [
    { clue: 'Au', answers: [['Gold', 51]] }, { clue: 'Ag', answers: [['Silver', 36]] }, { clue: 'Fe', answers: [['Iron', 42]] }, { clue: 'Pb', answers: [['Lead', 19]] }, { clue: 'Sn', answers: [['Tin', 9]] }, { clue: 'Hg', answers: [['Mercury', 23]] }, { clue: 'K', answers: [['Potassium', 25]] }, { clue: 'Na', answers: [['Sodium', 33]] }, { clue: 'W', answers: [['Tungsten', 4, ['Wolfram']]] }, { clue: 'Sb', answers: [['Antimony', 0]] }, { clue: 'Hf', answers: [['Hafnium', 0]] },
  ] },
];

const LINKED: SeedQuestion[] = [
  { category: 'Film', format: 'LINKED', text: 'Actors who have played Batman / Actors who have played Superman', instructions: 'Player A names an actor who played Batman in a live-action film; Player B names an actor who played Superman in a live-action film.', difficulty: 3, settings: { poolLabels: ['Played Batman', 'Played Superman'] },
    answers: [['Christian Bale', 40, ['Bale']], ['Michael Keaton', 24, ['Keaton']], ['Ben Affleck', 20, ['Affleck']], ['Robert Pattinson', 16, ['Pattinson']], ['George Clooney', 9, ['Clooney']], ['Val Kilmer', 5, ['Kilmer']], ['Adam West', 4, ['West']], ['Lewis Wilson', 0], ['Robert Lowery', 0]],
    answersB: [['Henry Cavill', 44, ['Cavill']], ['Christopher Reeve', 38, ['Reeve']], ['Brandon Routh', 7, ['Routh']], ['Dean Cain', 6, ['Cain']], ['Tom Welling', 4, ['Welling']], ['George Reeves', 1, ['Reeves']], ['Kirk Alyn', 0], ['David Corenswet', 0, ['Corenswet']]] },
  { category: 'Geography', format: 'LINKED', text: 'Countries bordering Germany / Countries bordering France', instructions: 'Player A names a country sharing a land border with Germany; Player B names one sharing a land border with mainland France.', difficulty: 2, settings: { poolLabels: ['Borders Germany', 'Borders France'] },
    answers: [['France', 46], ['Poland', 30], ['Austria', 26], ['Netherlands', 24], ['Switzerland', 20], ['Belgium', 18], ['Denmark', 15], ['Czech Republic', 12, ['Czechia']], ['Luxembourg', 4]],
    answersB: [['Spain', 50], ['Germany', 41], ['Italy', 31], ['Belgium', 27], ['Switzerland', 22], ['Luxembourg', 6], ['Monaco', 3], ['Andorra', 1]] },
  { category: 'Space', format: 'LINKED', text: 'Moons of Jupiter / Moons of Saturn', instructions: 'Player A names a moon of Jupiter; Player B names a moon of Saturn.', difficulty: 4, settings: { poolLabels: ['Moon of Jupiter', 'Moon of Saturn'] },
    answers: [['Europa', 33], ['Io', 28], ['Ganymede', 19], ['Callisto', 9], ['Amalthea', 1], ['Himalia', 0], ['Thebe', 0]],
    answersB: [['Titan', 45], ['Enceladus', 12], ['Rhea', 4], ['Mimas', 3], ['Iapetus', 2], ['Dione', 1], ['Tethys', 1], ['Hyperion', 0], ['Phoebe', 0]] },
];

const PICTURE: SeedQuestion[] = [
  { category: 'Flags', format: 'PICTURE', text: 'Identify the country from its flag', instructions: 'Choose a flag and name the country it belongs to.', difficulty: 2, settings: { pictureMode: 'NUMBERED', boardColumns: 4 }, items: [
    { image: 'flags/japan', answers: [['Japan', 55]] }, { image: 'flags/france', answers: [['France', 44]] }, { image: 'flags/italy', answers: [['Italy', 39]] }, { image: 'flags/germany', answers: [['Germany', 36]] }, { image: 'flags/sweden', answers: [['Sweden', 21]] }, { image: 'flags/switzerland', answers: [['Switzerland', 33]] }, { image: 'flags/poland', answers: [['Poland', 8]] }, { image: 'flags/ukraine', answers: [['Ukraine', 25]] }, { image: 'flags/austria', answers: [['Austria', 4]] }, { image: 'flags/netherlands', answers: [['Netherlands', 11, ['Holland', 'The Netherlands']]] }, { image: 'flags/denmark', answers: [['Denmark', 6]] }, { image: 'flags/finland', answers: [['Finland', 3]] },
  ] },
  { category: 'Mathematics', format: 'PICTURE', text: 'Name the geometric shape', instructions: 'Pick a shape and give its mathematical name.', difficulty: 2, settings: { pictureMode: 'IMAGE_ONLY', boardColumns: 4 }, items: [
    { image: 'shapes/pentagon', answers: [['Pentagon', 45]] }, { image: 'shapes/hexagon', answers: [['Hexagon', 48]] }, { image: 'shapes/heptagon', answers: [['Heptagon', 6, ['Septagon']]] }, { image: 'shapes/octagon', answers: [['Octagon', 37]] }, { image: 'shapes/trapezium', answers: [['Trapezium', 14, ['Trapezoid']]] }, { image: 'shapes/rhombus', answers: [['Rhombus', 22, ['Diamond']]] }, { image: 'shapes/parallelogram', answers: [['Parallelogram', 19]] }, { image: 'shapes/ellipse', answers: [['Ellipse', 16, ['Oval']]] }, { image: 'shapes/kite', answers: [['Kite', 9]] }, { image: 'shapes/crescent', answers: [['Crescent', 5]] }, { image: 'shapes/right-triangle', answers: [['Right-angled triangle', 11, ['Right triangle', 'Triangle']]] }, { image: 'shapes/star', answers: [['Pentagram', 1, ['Star', 'Five-pointed star']]] },
  ] },
  { category: 'Symbols', format: 'PICTURE', text: 'Name the mathematical or scientific symbol', instructions: 'Pick a symbol and say what it is called (the Greek letter name or the operation).', difficulty: 4, settings: { pictureMode: 'IMAGE_CLUE', boardColumns: 4 }, items: [
    { image: 'symbols/sigma', answers: [['Sigma', 30, ['Sum', 'Summation']]] }, { image: 'symbols/integral', answers: [['Integral', 24]] }, { image: 'symbols/pi', answers: [['Pi', 58]] }, { image: 'symbols/infinity', answers: [['Infinity', 49]] }, { image: 'symbols/square-root', answers: [['Square root', 36, ['Root', 'Radical']]] }, { image: 'symbols/omega', answers: [['Omega', 27, ['Ohm']]] }, { image: 'symbols/delta', answers: [['Delta', 21]] }, { image: 'symbols/approximately-equal', answers: [['Approximately equal', 8, ['Approximately', 'Almost equal']]] }, { image: 'symbols/proportional-to', answers: [['Proportional to', 3, ['Proportional']]] }, { image: 'symbols/therefore', answers: [['Therefore', 2]] }, { image: 'symbols/empty-set', answers: [['Empty set', 1, ['Null set']]] }, { image: 'symbols/lambda', answers: [['Lambda', 12]] },
  ] },
];

const mask = (s: string, keep: number[]) => s.split('').map((ch, i) => (ch === ' ' ? '  ' : keep.includes(i) ? ch : '_')).join(' ');
const scramble = (s: string, seed: number) => { const a = s.replace(/\s/g, '').toUpperCase().split(''); let x = seed; for (let i = a.length - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join(' '); };

const PARTIAL: SeedQuestion[] = [
  { category: 'Film', format: 'PARTIAL', text: 'Fill in the missing letters to name the film director', instructions: 'Each puzzle hides a well-known film director. Choose one and complete the name.', difficulty: 3, settings: { boardColumns: 3 }, items: [
    { clue: mask('CHRISTOPHER NOLAN', [0, 2, 4, 5, 6, 8, 9, 12, 14]), answers: [['Christopher Nolan', 46, ['Nolan']]] },
    { clue: mask('SOFIA COPPOLA', [0, 2, 4, 6, 8, 10]), answers: [['Sofia Coppola', 9, ['Coppola']]] },
    { clue: mask('AKIRA KUROSAWA', [0, 2, 4, 6, 8, 10, 12]), answers: [['Akira Kurosawa', 7, ['Kurosawa']]] },
    { clue: mask('GRETA GERWIG', [0, 2, 4, 6, 8, 10]), answers: [['Greta Gerwig', 15, ['Gerwig']]] },
    { clue: mask('ALFRED HITCHCOCK', [0, 2, 4, 7, 9, 11, 13, 15]), answers: [['Alfred Hitchcock', 38, ['Hitchcock']]] },
    { clue: mask('AGNES VARDA', [0, 2, 4, 6, 8, 10]), answers: [['Agnès Varda', 0, ['Agnes Varda', 'Varda']]] },
  ] },
  { category: 'Geography', format: 'PARTIAL', text: 'Unscramble the letters to find a capital city', instructions: 'Each set of letters is an anagram of a capital city. Choose one and solve it.', difficulty: 3, settings: { boardColumns: 3 }, items: [
    { clue: scramble('LISBON', 1), answers: [['Lisbon', 36]] }, { clue: scramble('NAIROBI', 2), answers: [['Nairobi', 14]] }, { clue: scramble('OSLO', 3), answers: [['Oslo', 41]] }, { clue: scramble('SANTIAGO', 4), answers: [['Santiago', 9]] }, { clue: scramble('TBILISI', 5), answers: [['Tbilisi', 1]] }, { clue: scramble('MANILA', 6), answers: [['Manila', 18]] }, { clue: scramble('ASMARA', 7), answers: [['Asmara', 0]] },
  ] },
  { category: 'Science', format: 'PARTIAL', text: 'Fill in the missing letters to name the chemical element', instructions: 'Choose a puzzle and name the element.', difficulty: 2, settings: { boardColumns: 3 }, items: [
    { clue: mask('MAGNESIUM', [0, 2, 4, 6, 8]), answers: [['Magnesium', 29]] }, { clue: mask('PLATINUM', [0, 3, 5, 7]), answers: [['Platinum', 24]] }, { clue: mask('ZIRCONIUM', [0, 2, 4, 6, 8]), answers: [['Zirconium', 2]] }, { clue: mask('BISMUTH', [0, 2, 4, 6]), answers: [['Bismuth', 3]] }, { clue: mask('COBALT', [0, 2, 4]), answers: [['Cobalt', 19]] }, { clue: mask('GALLIUM', [0, 2, 4, 6]), answers: [['Gallium', 1]] }, { clue: mask('RHENIUM', [0, 2, 4, 6]), answers: [['Rhenium', 0]] },
  ] },
];

interface SeedFinal { title: string; description: string; prompts: SeedQuestion[] }

const FINALS: SeedFinal[] = [
  { title: 'Geography', description: 'Countries, borders and capitals.', prompts: [
    open('Final · Geography', 'Countries in South America', 'The twelve sovereign states of South America.', [['Brazil', 61], ['Argentina', 44], ['Chile', 30], ['Colombia', 24], ['Peru', 22], ['Venezuela', 14], ['Uruguay', 9], ['Ecuador', 8], ['Bolivia', 7], ['Paraguay', 4], ['Guyana', 1], ['Suriname', 0]]),
    open('Final · Geography', 'Countries the Equator passes through', 'Land territory only.', [['Brazil', 38], ['Kenya', 25], ['Ecuador', 24], ['Indonesia', 19], ['Colombia', 12], ['Uganda', 8], ['Democratic Republic of the Congo', 5, ['DR Congo', 'DRC', 'Congo']], ['Gabon', 2], ['Somalia', 2], ['Republic of the Congo', 1, ['Congo-Brazzaville']], ['São Tomé and Príncipe', 0, ['Sao Tome and Principe', 'Sao Tome']]]),
    open('Final · Geography', 'European capital cities beginning with B', 'Capitals of sovereign European states.', [['Berlin', 58], ['Brussels', 41], ['Budapest', 30], ['Bern', 12], ['Belgrade', 10], ['Bucharest', 9], ['Bratislava', 6], ['Baku', 1]]),
    open('Final · Geography', 'US states beginning with M', 'There are eight.', [['Michigan', 36], ['Maine', 29], ['Montana', 24], ['Minnesota', 22], ['Massachusetts', 21], ['Missouri', 17], ['Maryland', 14], ['Mississippi', 11]]),
  ] },
  { title: 'Science', description: 'Space, chemistry and the human body.', prompts: [
    open('Final · Science', 'Planets of the solar system', 'The eight planets.', [['Mars', 48], ['Jupiter', 35], ['Saturn', 31], ['Venus', 24], ['Earth', 21], ['Neptune', 19], ['Mercury', 16], ['Uranus', 14]]),
    open('Final · Science', 'Noble gases', 'Group 18 of the periodic table.', [['Helium', 49], ['Neon', 33], ['Argon', 14], ['Krypton', 9], ['Xenon', 5], ['Radon', 2], ['Oganesson', 0]]),
    open('Final · Science', 'Bones of the human leg and foot', 'From hip to toe.', [['Femur', 55], ['Tibia', 38], ['Fibula', 26], ['Patella', 14, ['Kneecap']], ['Metatarsals', 6, ['Metatarsal']], ['Phalanges', 5], ['Talus', 2], ['Calcaneus', 1, ['Heel bone']], ['Navicular', 0], ['Cuboid', 0]]),
    open('Final · Science', 'SI base units', 'The seven base units of the International System of Units.', [['Metre', 44, ['Meter']], ['Kilogram', 40], ['Second', 36], ['Kelvin', 15], ['Ampere', 11, ['Amp']], ['Mole', 4], ['Candela', 0]]),
  ] },
  { title: 'Literature', description: 'Novels, plays and poets.', prompts: [
    open('Final · Literature', 'Tragedies by Shakespeare', 'The plays usually classified as tragedies.', [['Hamlet', 52], ['Macbeth', 47], ['Romeo and Juliet', 45], ['Othello', 26], ['King Lear', 19], ['Julius Caesar', 12], ['Antony and Cleopatra', 5], ['Coriolanus', 1], ['Titus Andronicus', 0], ['Timon of Athens', 0]]),
    open('Final · Literature', 'Novels by Charles Dickens', 'Completed novels.', [['A Christmas Carol', 44], ['Oliver Twist', 40], ['Great Expectations', 36], ['A Tale of Two Cities', 22], ['David Copperfield', 18], ['Bleak House', 7], ['Hard Times', 4], ['Nicholas Nickleby', 3], ['The Pickwick Papers', 2], ['Little Dorrit', 1], ['Dombey and Son', 0], ['Barnaby Rudge', 0], ['Our Mutual Friend', 0], ['Martin Chuzzlewit', 0]]),
    open('Final · Literature', 'Novels by Jane Austen', 'The six completed novels.', [['Pride and Prejudice', 63], ['Emma', 21], ['Sense and Sensibility', 17], ['Persuasion', 6], ['Mansfield Park', 4], ['Northanger Abbey', 2]]),
  ] },
  { title: 'Sport', description: 'Hosts, champions and tournaments.', prompts: [
    open('Final · Sport', 'Cities that hosted the Summer Olympics since 1980', 'Host cities from Moscow 1980 to Paris 2024.', [['London', 49], ['Paris', 38], ['Tokyo', 35], ['Beijing', 27], ['Rio de Janeiro', 24, ['Rio']], ['Sydney', 19], ['Athens', 14], ['Atlanta', 9], ['Barcelona', 8], ['Los Angeles', 6], ['Seoul', 3], ['Moscow', 2]]),
    open('Final · Sport', 'Countries that have won the men’s FIFA World Cup', 'Eight nations have won it.', [['Brazil', 57], ['Germany', 40, ['West Germany']], ['Argentina', 39], ['France', 33], ['Italy', 26], ['England', 20], ['Spain', 18], ['Uruguay', 4]]),
    open('Final · Sport', 'Grand Slam tennis tournaments', 'The four majors.', [['Wimbledon', 66], ['US Open', 38], ['French Open', 30, ['Roland Garros']], ['Australian Open', 29]]),
  ] },
  { title: 'History', description: 'Rulers, presidents and dynasties.', prompts: [
    open('Final · History', 'US presidents who served in the 20th century', 'Any president in office at some point between 1901 and 2000.', [['John F. Kennedy', 35, ['Kennedy', 'JFK']], ['Richard Nixon', 29, ['Nixon']], ['Ronald Reagan', 28, ['Reagan']], ['Bill Clinton', 27, ['Clinton']], ['Franklin D. Roosevelt', 24, ['FDR', 'Franklin Roosevelt', 'Roosevelt']], ['Theodore Roosevelt', 10, ['Teddy Roosevelt']], ['Jimmy Carter', 12, ['Carter']], ['George H. W. Bush', 11, ['George Bush', 'Bush']], ['Dwight D. Eisenhower', 9, ['Eisenhower']], ['Harry S. Truman', 8, ['Truman']], ['Lyndon B. Johnson', 7, ['LBJ', 'Johnson']], ['Woodrow Wilson', 5, ['Wilson']], ['Gerald Ford', 4, ['Ford']], ['Herbert Hoover', 2, ['Hoover']], ['Calvin Coolidge', 1, ['Coolidge']], ['William McKinley', 0, ['McKinley']], ['Warren G. Harding', 0, ['Harding']], ['William Howard Taft', 0, ['Taft']]]),
    open('Final · History', 'British monarchs since 1700', 'Kings and queens of Great Britain / the United Kingdom.', [['Queen Victoria', 48, ['Victoria']], ['Elizabeth II', 46, ['Queen Elizabeth II', 'Queen Elizabeth']], ['George III', 15], ['Charles III', 14, ['King Charles']], ['Edward VIII', 7], ['George VI', 6], ['George V', 5], ['Edward VII', 3], ['William IV', 2], ['George IV', 2], ['George II', 1], ['Anne', 1, ['Queen Anne']], ['George I', 0]]),
    open('Final · History', 'Roman emperors of the first century AD', 'Emperors who reigned between AD 1 and AD 100.', [['Nero', 41], ['Augustus', 32], ['Caligula', 24], ['Claudius', 14], ['Tiberius', 12], ['Vespasian', 5], ['Domitian', 3], ['Titus', 2], ['Trajan', 2], ['Nerva', 0], ['Galba', 0], ['Otho', 0], ['Vitellius', 0]]),
  ] },
];

async function mediaFor(key: string | undefined) {
  if (!key) return null;
  const url = `/images/${key}.svg`;
  const existing = await prisma.mediaAsset.findFirst({ where: { url } });
  if (existing) return existing.id;
  const created = await prisma.mediaAsset.create({ data: { kind: 'SVG', url, mimeType: 'image/svg+xml', alt: key.split('/').pop()?.replace(/-/g, ' ') ?? '' } });
  return created.id;
}

async function upsertQuestion(q: SeedQuestion): Promise<string> {
  const existing = await prisma.question.findFirst({ where: { text: q.text, category: q.category } });
  if (existing) return existing.id;
  const created = await prisma.question.create({ data: { category: q.category, text: q.text, instructions: q.instructions ?? '', format: q.format, difficulty: q.difficulty ?? 2, status: 'READY', explanation: q.explanation ?? '', source: q.source ?? 'Sample data shipped with NADIR (scores are illustrative).', settingsJson: JSON.stringify(q.settings ?? {}) } });
  let order = 0;
  const addAnswer = (a: A, poolIndex: number, boardItemId: string | null, correct = true) =>
    prisma.questionAnswer.create({ data: { questionId: created.id, poolIndex, canonical: a[0], aliasesJson: JSON.stringify(a[2] ?? []), score: correct ? a[1] : 100, correct, boardItemId, sortOrder: order++ } });
  for (const a of q.answers ?? []) await addAnswer(a, 0, null);
  for (const a of q.answersB ?? []) await addAnswer(a, 1, null);
  if (q.board) {
    for (const [i, [label, score]] of q.board.entries()) {
      const item = await prisma.boardItem.create({ data: { questionId: created.id, kind: 'TEXT', label, decoy: score === null, sortOrder: i } });
      if (score !== null) await addAnswer([label, score], 0, item.id);
    }
  }
  if (q.items) {
    for (const [i, it] of q.items.entries()) {
      const kind = q.format === 'PICTURE' ? 'IMAGE' : q.format === 'PARTIAL' ? (it.clue?.includes('_') ? 'PARTIAL' : 'SCRAMBLED') : 'CLUE';
      const mediaAssetId = await mediaFor(it.image);
      const item = await prisma.boardItem.create({ data: { questionId: created.id, kind, label: it.label ?? (q.format === 'PICTURE' ? String(i + 1) : ''), clue: it.clue ?? '', mediaAssetId, decoy: false, sortOrder: i } });
      for (const a of it.answers) await addAnswer(a, 0, item.id);
    }
  }
  return created.id;
}

async function main() {
  writeMedia();
  const all = [...OPEN, ...BOARD, ...CLUES, ...LINKED, ...PICTURE, ...PARTIAL];
  let n = 0;
  for (const q of all) {
    await upsertQuestion(q);
    n++;
  }
  for (const f of FINALS) {
    const existing = await prisma.finalCategory.findFirst({ where: { title: f.title } });
    if (existing) continue;
    const cat = await prisma.finalCategory.create({ data: { title: f.title, description: f.description, status: 'READY' } });
    for (const [i, p] of f.prompts.entries()) {
      const qid = await upsertQuestion({ ...p, status: undefined } as SeedQuestion);
      await prisma.finalPrompt.create({ data: { categoryId: cat.id, questionId: qid, sortOrder: i } });
    }
  }
  const bank = await prisma.jackpot.findUnique({ where: { currency: 'GBP' } });
  if (!bank) await prisma.jackpot.create({ data: { currency: 'GBP', amount: 1000 } });
  console.log(`Seeded ${n} questions and ${FINALS.length} final categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

export const DEFAULT_PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'crap', 'piss', 'dick', 'cock',
  'pussy', 'asshole', 'bastard', 'slut', 'whore', 'fag', 'retard',
  'f*ck', 'sh*t', 'b*tch', 'a$$', 'd*ck', 'p*ssy',
  'fck', 'sht', 'btch', 'dck', 'fuk', 'shyt',
  'nigger', 'nigga', 'faggot', 'tranny', 'retarded',
  'n*gger', 'n*gga', 'f*ggot',
  'kys', 'kill yourself', 'neck yourself',
  'porn', 'hentai', 'nsfw', 'xxx', 'sex',
  'discord.gg/nitro', 'free nitro', 'click here for nitro',
  'steam gift', 'cs go skins', 'csgo skins'
].join(',');

export const PROFANITY_PRESETS = {
  strict: [
    'fuck', 'shit', 'bitch', 'ass', 'damn', 'crap', 'piss', 'dick', 'cock',
    'pussy', 'asshole', 'bastard', 'slut', 'whore', 'fag', 'retard',
    'f*ck', 'sh*t', 'b*tch', 'a$$', 'd*ck', 'p*ssy',
    'fck', 'sht', 'btch', 'dck', 'fuk', 'shyt',
    'nigger', 'nigga', 'faggot', 'tranny', 'retarded',
    'n*gger', 'n*gga', 'f*ggot',
    'kys', 'kill yourself', 'neck yourself',
    'porn', 'hentai', 'nsfw', 'xxx'
  ].join(','),

  moderate: [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'slut', 'whore',
    'f*ck', 'sh*t', 'b*tch', 'fck', 'sht', 'btch',
    'nigger', 'nigga', 'faggot', 'tranny', 'retarded',
    'n*gger', 'n*gga', 'f*ggot',
    'kys', 'kill yourself'
  ].join(','),

  slurs_only: [
    'nigger', 'nigga', 'faggot', 'tranny', 'retarded',
    'n*gger', 'n*gga', 'f*ggot',
    'kys', 'kill yourself', 'neck yourself'
  ].join(','),

  off: ''
};

export type ProfanityPreset = keyof typeof PROFANITY_PRESETS;

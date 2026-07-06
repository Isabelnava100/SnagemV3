import {  Text,  Box,  } from '@mantine/core';

//Minimum password requirements
export const requirements = [
    { re: /[0-9]/, label: 'Includes number' },
    { re: /[a-z]/, label: 'Includes lowercase letter' },
    { re: /[A-Z]/, label: 'Includes uppercase letter' },
    { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
  ];
  
  //Visual indication of password strength
  export  function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
    return (
      <Text
        color={meets ? 'teal' : 'red'}
        sx={{ display: 'flex', alignItems: 'center' }}
        mt={7}
        size="sm"
      >
        {meets ? 'A' : 'X'} <Box ml={10}>{label}</Box>
      </Text>
    );
  }
  
  //Indicate rating of password strength
  export function getStrength(password: string) {
    let multiplier = password.length > 5 ? 0 : 1;
  
    requirements.forEach((requirement) => {
      if (!requirement.re.test(password)) {
        multiplier += 1;
      }
    });
  
    return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
  }
  
  //Generate password for applicants. This is a real account password, so use a CSPRNG
  export function generatePassword() {
    const length = 24,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const values = crypto.getRandomValues(new Uint32Array(length));
    let retVal = "";
    for (let i = 0; i < length; ++i) {
        retVal += charset.charAt(values[i] % charset.length);
    }
    return retVal;
}

// Current Team Snagem guild (9852) roster, synced from the member list. Sign-up
// matches a Gaia applicant's username against this allow-list, case-insensitively.
  export const Gusers:Array<string>=[
      "SubonicXP",
      "Reno Vantas",
      "Darksol88",
      "Atlantis_Darts",
      "Linkx9999",
      "Oni the crazy",
      "wings_of_Snagem",
      "YokoRoxMySox",
      "Falcoseymour",
      "Zykke",
      "Lord_Felix",
      "Azalin",
      "Blizzard120",
      "Otaku-RolePlay-Gamer",
      "Olimar7",
      "Lockichu22",
      "Luigi4ever1",
      "rico008",
      "Hadotaro",
      "Elphaba_The_Fallen_Angel",
      "Ambient ChrisC",
      "Reutan",
      "MewtwoWarrior",
      "LanceDragorin",
      "Sammy-Rose",
      "Iceman105",
      "Water demon Nathan",
      "PLATINUMGBASP",
      "YouCan-Not-Go",
      "Sky~126",
      "KoTci",
      "GC the Silence Slayer",
      "Matt The Mapler",
      "Phoenix_Lord1010",
      "Trainer23667",
      "Zane Belazarus",
      "Arkelos",
      "Not a Noise",
      "Cecile Silverstone",
      "HauntMyCroissant",
      "glitchedmirrors",
      "DignityPower",
      "Isaac Hawking",
      "KomradeKarina",
      "Thard_Verad",
      "nahobinokami",
      "Ms Edyn",
      "Jay Angel Of Darkness",
      "a-girl-named-Angel",
      "Pale1Ryder",
      "manglewren",
      "A Scarecrow",
      "Ryssa Blackblood",
      "emensmansera",
      "Carrie The Ninja",
      "shadekitsune",
      "DelsieD",
      "Zoideu",
      "Stardust Drifter",
      "Mistress Dahlia",
      "Skulllily",
      "DreamingInColour",
      "Jump Einatz",
      "In the Garden of Monsters",
      "BirdieAnn15",
      "Steven Quartz Universee",
      "MurasakiTek",
      "DeathDealervamp",
      "Netherworld Overlord-Has",
      "Rico_Senpai",
      "Kurorin_083",
      "Sage_Cinder",
      "Crolley",
      "megasonichobs",
      "Umbykirb",
      "Vulbreeon",
      "SlashJX",
      "Lucario Master",
      "bloodysword4",
      "coolgriff14",
      "Katina Star",
      "SpikeQB",
      "Sportsman189",
      "I Am DakeDesu",
      "Brian_Link",
      "LinkwithZelda",
      "Ausraben",
      "RhymeJW",
      "Dante Yashi",
      "Royal Summe",
      "HammerofHam",
      "GroudonSage",
      "Wazi Kong",
      "KisaRinny",
      "The Azure Maestro",
      "bloodshed2.0",
      "Noire Silver",
      "pokegod11(Cal)",
      "Sylar Ginyoku",
      "Lord of the Vine",
      "Fancy Mr A",
      "PNN - Carrie",
      "Blue Bone Daddy",
      "Pelchik",
      "Midnight_Euphomy",
      "MisterCrimson",
      "Otternavy",
      "Al Eyan Hominid",
      "Bokyaku Kuchiki",
      "SwankDon",
      "HunterMetroid64",
      "Toryuuku Shinjuku",
      "KytanaTheThief",
      "Kotsuko",
      "Valiant Fenris",
      "Magiking",
      "Kasumi of Vientown",
      "Thursdays Noon",
      "UBERSERKERMAN",
      "kid_brown45",
      "Koukaze",
      "NotAnUndercoverCop",
      "CrystalizedMagic",
      "Michael Bladebreaker",
      "prinxe shadow",
      "Deviled Dregs",
      "forkcity",
      "Grey Moonfang IV",
      "Local Imp",
      "Pixelsylveon",
      "Mournings of a Incubus",
      "Hauntedflames",
      "Lyle Tsuyoshi",
      "Tainted Blonde",
      "Keiko Yurino",
      "vunqs",
      "DragonYolk",
      "Dumb Furret",
      "-l- JoltiBun -l-",
      "Fridurmus",
      "KrystatheMewes",
      "Ulla_Hanabi",
      "Requiem of Whyspers",
      "TerashiLeonGoken",
      "Espeon_Commander",
      "DragonFang099",
      "MoniqueBrie",
      "DeoLux",
    ];
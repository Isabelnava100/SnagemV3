import { useState, useRef } from 'react';
import {
    TextInput,    PasswordInput,   Anchor,    Paper,    Title,
    Text,    Container,    Group,    Button,    Grid, Textarea, Progress,  Popover,  Box, Radio, LoadingOverlay
  } from '@mantine/core';
  import { useForm } from '@mantine/form';
import { addDoc, collection } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import {auth, db, firebase} from '../../context/firebase';
import { createUserWithEmailAndPassword, getAuth,updateProfile,sendEmailVerification } from 'firebase/auth';

const Gusers:Array<string>=[
  "Guest",
    "SubonicXP",
    "Reno Vantas",
    "Darksol88",
    "Espeon_Commander",
    "Royal Summe",
    "SwankDon",
    "Dante Yashi",
    "bloodshed2.0",
    "cannibalelves",
    "Wazi Kong",
    "Pelchik",
    "I Am DakeDesu",
    "Carrie The Ninja",
    "The Azure Maestro",
    "HammerofHam",
    "Al Eyan Hominid",
    "MisterCrimson",
    "Blue Bone Daddy",
    "Lord of the Vine",
    "Bokyaku Kuchiki",
    "Fancy Mr A",
    "Noire Silver",
    "DelsieD",
    "shadekitsune",
    "Toryuuku Shinjuku",
    "OfficerBooty",
    "KytanaTheThief",
    "Otternavy",
    "Tsuki the Fated Wind",
    "DignityPower",
    "Thard_Verad",
    "PNN - Carrie",
    "Brian_Link",
    "Kotsuko",
    "Cipher Head Django",
    "HunterMetroid64",
    "Not a Noise",
    "Sportsman189",
    "Magiking",
    "Midnight_Euphomy",
    "SpikeQB",
    "UBERSERKERMAN",
    "coolgriff14",
    "bloodysword4",
    "Sylar Ginyoku",
    "DragonYolk",
    "KisaRinny",
    "Kasumi of Vientown",
    "MoniqueBrie",
    "-l- JoltiBun -l-",
    "DeathDealervamp",
    "MurasakiTek",
    "Hauntedflames",
    "Pixelsylveon",
    "Steven Quartz Universee",
    "Local Imp",
    "Pale1Ryder",
    "BirdieAnn15",
    "Tainted Blonde",
    "Lyle Tsuyoshi",
    "Keiko Yurino",
    "Jay Angel Of Darkness",
    "a-girl-named-Angel",
    "DrachenKaiser2021",
    "Netherworld Overlord-Has",
    "DragonFang099",
    "KrystatheMewes",
    "glitchedmirrors",
    "vunqs",
    "Cecile Silverstone",
    "emensmansera",
    "manglewren",
    "A Scarecrow",
    "Arkelos",
    "CrystalizedMagic",
    "Mistress Dahlia",
    "Stardust Drifter",
    "NotAnUndercoverCop",
    "Koukaze",
    "kid_brown45",
    "Zoideu",
    "Valiant Fenris",
    "Michael Bladebreaker",
    "prinxe shadow",
    "Skulllily",
    "Ryssa Blackblood",
    "Fridurmus",
    "In the Garden of Monsters",
    "Grey Moonfang IV",
    "Jump Einatz",
    "Mournings of a Incubus",
    "forkcity",
    "Deviled Dregs",
    "DreamingInColour",
    "Isaac Hawking",
    "Heroyuy711",
    "Phoenix_Lord1010",
    "Matt The Mapler",
    "GC the Silence Slayer",
    "Umbykirb",
    "KoTci",
    "Sky~126",
    "YouCan-Not-Go",
    "PLATINUMGBASP",
    "Water demon Nathan",
    "Arthur_Hinton",
    "snagemalec",
    "Link3332",
    "Ambient ChrisC",
    "Katina Star",
    "W0F",
    "LinkwithZelda",
    "Mike_Version_1",
    "CirCusPhreak",
    "KatanaHunter",
    "Sage~of~Water",
    "Katsu Redmoon",
    "Iceman105",
    "Sammy-Rose",
    "Oni the crazy",
    "Otaku-RolePlay-Gamer",
    "Olimar7",
    "Lockichu22",
    "Luigi4ever1",
    "rico008",
    "Lucario Master",
    "Hadotaro",
    "Elphaba_The_Fallen_Angel",
    "Reutan",
    "RhymeJW",
    "Sage_Cinder",
    "MewtwoWarrior",
    "wings_of_Snagem",
    "LuckyDeviI",
    "GroudonSage",
    "YokoRoxMySox",
    "Falcoseymour",
    "Zykke",
    "Lord_Felix",
    "Azalin",
    "Linkx9999",
    "LanceDragorin",
    "Atlantis_Darts",
    "pokegod11(Cal)",
    "Team Snagem",
    "SGO",
    "Mark Brother of King",
    "Ama-Clutch",
    "Correst",
    "Ganonsdoom",
    "Arthmael",
    "Kawazoe Taiki",
    "Vulbreeon",
    "Arcanine_Hybrid",
    "Thursdays Noon",
    "Ms Edyn",
    "Blizzard120",
    "Requiem of Whyspers",
    "Trainer23667",
    "Dumb Furret",
    "TerashiLeonGoken",
    "Immortal Amaranth",
    "Crolley",
    "Aleissa",
    "Bloag",
    "auron legendary warrior",
    "kirby8cookie",
    "desertmonkeymanz",
    "[K.i.s.s.Y.o.u.r.W.h.a.t]",
    "Kyosuke Kusaragi",
    "lollyz",
    "Regal_Byrant",
    "*sonic",
    "Pyro_Onichan",
    "SlashJX",
    "HyrulianHistorian",
    "VampiricRogue",
    "pimp_a",
    "DarkSamus10",
    "Existence of Self",
    "Minamoto_Tennyo",
    "PokeGrove_Account",
    "megasonichobs",
    "Escobar Corbin",
    "Jin Kisuragi",
    "MiniSoul",
    "Ranpu Majjiku_NJ",
    "Kato Achendyn",
    "JaysonFour",
    "Kyosuke Kusaragi",
    "lollyz",
    "Regal_Byrant",
    "*sonic",
    "Pyro_Onichan",
    "SlashJX",
    "HyrulianHistorian",
    "VampiricRogue",
    "pimp_a",
    "DarkSamus10",
    "Existence of Self",
  ];

function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
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
  
  const requirements = [
    { re: /[0-9]/, label: 'Includes number' },
    { re: /[a-z]/, label: 'Includes lowercase letter' },
    { re: /[A-Z]/, label: 'Includes uppercase letter' },
    { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
  ];
  
  function getStrength(password: string) {
    let multiplier = password.length > 5 ? 0 : 1;
  
    requirements.forEach((requirement) => {
      if (!requirement.re.test(password)) {
        multiplier += 1;
      }
    });
  
    return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
  }
  
  
  export function NewRegister() {
    const [popoverOpened, setPopoverOpened] = useState(false);
    const [value, setValue] = useState('');
     
    const navigate = useNavigate();
    const checks = requirements.map((requirement, index) => (
      <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(value)} />
    ));
  
    const strength = getStrength(value);
    const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';
    //above is pw check
  
      const [gaia,setGaia]=useState("No");
      const refRadio=useRef<HTMLInputElement>(null);
      const refTextarea=useRef<HTMLTextAreaElement>(null);
      const form = useForm({
        initialValues: {
          email: '',
          username:'',
          isGaia:gaia,
          gaiaName:'',
          application:'',
          password:'',
          confirmPassword:'',
        },
    
        validate: {
          email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email.'),
          username: (value) => (/^[a-zA-Z0-9-_]{3,23}$/.test(value) ? null : 'Invalid username.'),
          confirmPassword: (value, values) =>
          value !== values.password&& gaia==='Yes' ? 'Passwords did not match.' : null,
          application: (value) => value.length < 500 && gaia==='No' ? 'Application must be at least 500 characters long.' : null,
          gaiaName: (value) => gaia==='Yes' && Gusers.findIndex(element => {
            return element.toLowerCase() === value.toLowerCase();
          })<0 ? 'Gaia username does not exist.' : null,
        },
      });
  
      
     const registerUser= (email: string, password: string, application:string, gaiaName:string, username:string  )=> {
     
      createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
          addDoc(collection(db, "users"), {
            app: application?application:null,
            email: userCredential.user.email,
            gaia: gaiaName,
            username: username,
            new: true,
            uid: userCredential.user.uid
          }); 
          const theuser = firebase.auth().currentUser;
          theuser?.updateProfile({
            displayName: username
          });
        })
      .then(() => navigate('/Profile'))
      .catch((error: firebase.FirebaseError) => {
       
        //console.log(error.code);
        if (error.code === 'auth/email-already-in-use') {
          form.setErrors({ email: 'Email already in use.' });
        }
        if (error.code === 'auth/invalid-email') {
          form.setErrors({ email: 'Badly formatted email.' });
        }
      });
      }

      function generatePassword() {
        var length = 8,
            charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            retVal = "";
        for (var i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    }
 
    return (
      <Container size={840} my={40} >
        <Title
          align="center"
          sx={(theme) => ({ fontFamily: `Greycliff CF, ${theme.fontFamily}`, fontWeight: 900 })}
        >
          Apply to Join
        </Title>
        <Text color="dimmed" size="sm" align="center" mt={5}>
          Already have an account?{' '}
          <Anchor<'a'> href="login" size="sm">
            Go to login.
          </Anchor>
        </Text>
  
        <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{background:'#222125'}}>
        <form onSubmit={form.onSubmit((values) =>{
        //console.log(values);
        if(values.isGaia==='Yes'){
          registerUser(values.email, values.password, values.application, values.gaiaName, values.username );
          return
        }
        registerUser(values.email, generatePassword(), values.application, values.gaiaName, values.username);
         
        
        })}
        style={{display:'flex',justifyContent:'space-between',width:'100%'}}>
      <Grid gutter="sm" style={{width:'100%'}}>
        
        <Grid.Col xs={6}>
            <TextInput          
            required
            label="Email"
            placeholder="Your@email.com"
            {...form.getInputProps('email')}
          />
     <TextInput
            required
            mt="md"
            label="Username"
            placeholder="Username"
            {...form.getInputProps('username')}
          />
          
             <Radio.Group
             size="sm"
             mt="md"
            ref={refRadio}
             value={form.values.isGaia}
             onChange={(val)=>{
               setGaia(val);
               form.setFieldValue("isGaia",val);
              }}
      label="Are you in the gaiaonline Snagem guild?"
      required
    >
      <Radio value="Yes" label="Yes"  />
      <Radio value="No" label="No" />
    </Radio.Group>
    {
        gaia==='Yes'?'':
    <Text color="dimmed" size="sm" mt={5}>
        Your registration will be accepted based on your 
        application. <Anchor<'a'> href="forum" size="sm" target="_blank"> Learn more about Team Snagem here. </Anchor>
         </Text>   
  }
   
    </Grid.Col>
    <Grid.Col xs={6}>
          {
        gaia==='Yes'?
        <>
        <TextInput
        required
        label="Gaiaonline Username"
        placeholder="Your gaiaonline username"
        {...form.getInputProps('gaiaName')}
      />
      
 <Popover opened={popoverOpened} onChange={setPopoverOpened} transition="pop"
 position="bottom-start">
      <Popover.Target>
     <PasswordInput
        mt="md"
          required
          {...form.getInputProps('password')}
          label="Your password"
          placeholder="Your password"
          description="Should include letters in lower and uppercase, at least 1 number and at least 1 special symbol."
          value={value}          
        onFocus={() => setPopoverOpened((o) =>true)}
        onBlur={() => setPopoverOpened((o) => false)}
          onChange={(event) => {setValue(event.currentTarget.value);form.setFieldValue("password",event.currentTarget.value);}}
        />
        </Popover.Target>
     <Popover.Dropdown >
     <Progress color={color} value={strength} size={5} style={{ marginBottom: 10 }} />
      <PasswordRequirement label="Includes at least 6 characters" meets={value.length > 5} />
      {checks}
     </Popover.Dropdown>
    </Popover>
      <PasswordInput
       {...form.getInputProps('confirmPassword')}
      placeholder="Your Password again"
      mt="md"
      label="Confirm Password"
      required
    />
    </>
        :
        <>
        <Textarea
        {...form.getInputProps('application')}
        ref={refTextarea}
        placeholder="Write your answer here."
        description="With a character in mind write out a brief Roleplaying example based on a moment in your character's life. It can be a short story about where the grew up, why the decided to join Team Snagem or whatever you want. Just have it ending with them joining Team Snagem, or deciding to. Furthermore in this scenario reveal your character's starter Pokemon and a battle scene. The pokemon can be any first stage non-legendary Pokemon that still evolves."   
        label="Application"
        minRows={12}
        required
      />
      
      <Group position="right">
      <Text size="xs">
        {refTextarea.current?.value.length ?refTextarea.current?.value.length:0} Characters</Text>
    </Group>
    </>
    }
  
          <Group position="right" mt="md">
            <Button type="submit">Submit</Button>
          </Group>
          </Grid.Col>
      </Grid>
        </form>
        </Paper>
      </Container>
    );
  }
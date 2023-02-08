
import { useEffect, useState } from 'react';
import { RichTextEditor, Link } from '@mantine/tiptap';
import StarterKit, { StarterKitOptions } from '@tiptap/starter-kit';
import {
  Paper,
  Text,
  TextInput,
  Group,
  Container,
  createStyles,
} from '@mantine/core';
import { ButtonProgress } from './components/LoadingButton';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { SimpleGrid } from '@mantine/core';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../context/firebase';
import { useForm } from '@mantine/form';
import { useEditor } from '@tiptap/react';
import { UserAuth } from '../../context/AuthContext';


const data = [
  { value: '1', label: 'Main Forums' },
  { value: '2', label: 'Side Roleplay' },
  { value: '3', label: 'Master Mission' },
  { value: '4', label: 'Quests' },
  { value: '5', label: 'Events' },
  { value: '6', label: 'Private' },
  { value: '7', label: 'Archived' },
];
const useStyles = createStyles((theme) => {
  const BREAKPOINT = theme.fn.smallerThan('sm');

  return {
    wrapper: {
      display: 'flex',
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
      borderRadius: theme.radius.lg,
      padding: 4,
      border: `1px solid ${
        theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[2]
      }`,

      [BREAKPOINT]: {
        flexDirection: 'column',
      },
    },

    form: {
      boxSizing: 'border-box',
      flex: 1,
      padding: theme.spacing.xl,
      paddingLeft: theme.spacing.sm * 2,
      borderLeft: 0,

      [BREAKPOINT]: {
        padding: theme.spacing.sm,
        paddingLeft: theme.spacing.sm,
      },
    },

    fields: {
      marginTop: -12,
    },

    fieldInput: {
      flex: 1,

      '& + &': {
        marginLeft: theme.spacing.sm,

        [BREAKPOINT]: {
          marginLeft: 0,
          marginTop: theme.spacing.md,
        },
      },
    },

    fieldsGroup: {
      display: 'flex',

      [BREAKPOINT]: {
        flexDirection: 'column',
      },
    },

    contacts: {
      boxSizing: 'border-box',
      position: 'relative',
      borderRadius: theme.radius.lg - 2,
      background: theme.fn.linearGradient(45, '#4338ca','#6b21a8',),
      padding: theme.spacing.xl,
      flex: '0 0 280px',
      marginBottom:'20px',
      marginTop:'20px',

      [BREAKPOINT]: {
        marginBottom: theme.spacing.sm,
        marginTop:0,
        paddingLeft: theme.spacing.sm,
      },
    },

    title: {
      marginBottom: theme.spacing.xl,
      fontFamily: `Greycliff CF, ${theme.fontFamily}`,

      [BREAKPOINT]: {
        marginBottom: theme.spacing.xl,
      },
    },
    title2: {
      marginBottom: theme.spacing.sm,
      fontFamily: `Greycliff CF, ${theme.fontFamily}`,

      [BREAKPOINT]: {
        marginBottom: theme.spacing.xl,
      },
    },

    control: {
      [BREAKPOINT]: {
        flex: 1,
      },
    },
  };
});

interface Item {
  id:string;
  character:string;
  owner:string;
  text:string;
  thread:number;
}

interface Thread {
  id:string;
  private: boolean;
  title:string;
  closed:boolean;
  location:number;
}


export function NewPost() {  
  const { id: thethreadid } = useParams();
  const { classes } = useStyles();
  // const [valuepost, changePost] = useState('');
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);
  const [allThreads, setAllThreads] = useState<Thread[]>([]);
  const { user } = UserAuth();
  const navigate=useNavigate();

//check permissions
  const dataRun=async(ThreadLocation:number)=>{
    const newData:Thread[]=[];
    try{
      await getDocs(collection(db, 'threads'))
    .then((postsData)=>{
    postsData.forEach((doc) => {
      //  console.log(doc.id, " => ", doc.data());
      if (doc.data().count === ThreadLocation) {
        newData.push({
          id: doc.id,
          private: doc.data().private,
          title: doc.data().title,
          closed: doc.data().closed,
          location: doc.data().location,
        });
      } //filter
    });
  })
  .then(() => {
  setAllThreads(newData);
  });
    } 
    catch (error) {console.log(error);}    
  } // check permissions

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
    ],
    onUpdate: (props) => {
      form.setFieldValue("text", props.editor.getHTML());
    },
    
  });

  const form = useForm({
    initialValues: {
      character: '',
      text: '',
    },validate: {
      character: (value) => (value.length < 2 ? 'Name must have at least 2 letters' : null),
      text: (value) => (value.length < 2 ? 'Post must have at least 2 letters' : null),
    },
  });
  
  

useEffect(() => {
  if (Number.isNaN(Number(thethreadid))) {
    setShouldNavigate(true);
  }else {
    dataRun(Number(thethreadid));
  }
}, [thethreadid]); //set to page

if (shouldNavigate) {
  return <Navigate to="/forum" />;
}


const handleSubmit = async (character: string,text: string) => {
  
  try {
    
    const dataRef = db.collection('posts');
    const docRef = await dataRef.add({
      character:character,
      thread: Number(thethreadid),
      owner: user?.displayName,
      text:text,
      timePosted: new Date(),
    });
    if (docRef){
      navigate('/forum/thread/'+thethreadid);
    }
    
  } catch (error:unknown) {     
  }
};//form

const formTheCheck =form.isValid();

  return (
    <Container size="lg" style={{marginTop:20,paddingBottom:100}}>
       <form  onSubmit={form.onSubmit((values) =>{
        handleSubmit(values.character, values.text);
        })}>
    <Paper shadow="md" radius="lg">
      <div className={classes.wrapper}>

       <div className={classes.form} >

       {
        allThreads.map((thread)  => 
          <Text size="lg" weight={700} className={classes.title} key={thread.id}>
            Make a Post on {thread.title}
          </Text>
           )
        }
          

          <div className={classes.fields}>
            <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
              
          <TextInput label="Post As"
           placeholder="Write the Name of your Character" required
          {...form.getInputProps('character')}
          />
            {/* <Select
            data={data} mb="md"
            label="Post As"
            placeholder="Choose your character "
            required
          />
             <Select
            data={data} mb="md"
            label="With"
            placeholder="Choose your team "
            required
          /> */}
            </SimpleGrid>
          <Text size="sm" style={{ marginTop:10 }}>Your Message 
          <span aria-hidden="true" style={{color:'#ff6b6b'}}> *</span>
          </Text>
           
           

<RichTextEditor editor={editor}  >
      <RichTextEditor.Toolbar >
      <RichTextEditor.ControlsGroup>
          <RichTextEditor.H1 />
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
          <RichTextEditor.H4 />
        </RichTextEditor.ControlsGroup>

        
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.ClearFormatting />
          {/* <RichTextEditor.Highlight />
          <RichTextEditor.Code /> */}
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Blockquote />
          <RichTextEditor.Hr />
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
          {/* <RichTextEditor.Subscript />
          <RichTextEditor.Superscript /> */}
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>

        {/* <RichTextEditor.ControlsGroup>
          <RichTextEditor.AlignLeft />
          <RichTextEditor.AlignCenter />
          <RichTextEditor.AlignJustify />
          <RichTextEditor.AlignRight />
        </RichTextEditor.ControlsGroup> */}
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content  />
    </RichTextEditor>

            <Group position="right" mt="md">
              <ButtonProgress formCheck={!formTheCheck} />
            </Group>
          </div>
          </div>
      </div>
    </Paper>
    </form>
    </Container>
  );
}
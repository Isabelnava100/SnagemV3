import { RichTextEditor, Link } from '@mantine/tiptap';
import {
  Paper,
  Text,
  TextInput,
  Textarea,
  Group,
  Container,
  createStyles, Select
} from '@mantine/core';
import { UserAuth } from '../../context/AuthContext';
import { EditorOptions, Extension, Mark, useEditor } from '@tiptap/react';
import StarterKit, { StarterKitOptions } from '@tiptap/starter-kit';
import { useState, useEffect } from 'react';
import { ButtonProgress } from './components/LoadingButton';
import { useNavigate, useParams } from 'react-router-dom';
import { LinkOptions } from '@tiptap/extension-link';
import { useForm } from '@mantine/form';
import { db,firebase } from '../../context/firebase';


const data = [
  { value: '1', label: 'Main Forums' },
  { value: '2', label: 'Side Roleplay' },
  { value: '3', label: 'Master Mission' },
  { value: '4', label: 'Quests' },
  { value: '5', label: 'Events' },
  { value: '6', label: 'Private' },
  // { value: '7', label: 'Archived' },
];

const useStyles = createStyles((theme) => {
  const BREAKPOINT = theme.fn.smallerThan('sm');

  return {
    wrapper: {
      display: 'flex',
      padding: 4,
      gap:12,

      [BREAKPOINT]: {
        flexDirection: 'column',
      },
    },

    form: {
      boxSizing: 'border-box',
      flex: 1,
      padding: theme.spacing.md,
      paddingLeft: theme.spacing.sm * 2,
      borderLeft: 0,
      
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
      borderRadius: theme.radius.lg,

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
      // background: theme.fn.linearGradient(45, '#4338ca','#6b21a8',),
      padding: theme.spacing.md,
      flex: '0 0 280px',
      marginBottom: 2,
      

      [BREAKPOINT]: {
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

export function NewTopic() {  
  const { id } = useParams();
  const { classes } = useStyles();
  const { user } = UserAuth();
  const [valueNewThread, setValueNT] = useState<number>();
  
  // const [valueForm, setValue] = useState<string>(id?id:'1');
  
  const navigate=useNavigate();
  
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
    ],
    onUpdate: (props) => {
      form.setFieldValue("firstpost", props.editor.getHTML());
    },
  });
  
  const handleSubmit = async (title: string,forum: string,postas: string,firstpost: string) => {
  
    try {
      const dataRef = db.collection('threads');
      const dataRef2 = db.collection('posts');
      const docRef = await dataRef.add({
        closed: false,
        count: valueNewThread,
        createdBy: user?.displayName,
        location: Number(forum),
        private: false,
        timePosted: new Date(),
        title: title
      });
      const docRef2 = await dataRef2.add({
        character: postas,
        owner: user?.displayName,
        text: firstpost,
        thread: valueNewThread,
        timePosted: new Date(),
      });
      if (docRef && docRef2){
        navigate('/Forum/'+forum);
      }
      
    } catch (error:unknown) {     
    }
  };//form


  const form = useForm({
    initialValues: {
      title: '',
      forum2:id?id:'1',
      postas:'',
      firstpost: '',
    },
     validate: {
      title: (value) => (value.length < 2 ? 'Title must have at least 2 letters' : null),
      postas: (value) => (value.length < 2 ? 'Name must have at least 2 letters' : null),
      firstpost: (value) => (value.length < 2 ? 'Post must have at least 2 letters' : null),
    },
  });  

  useEffect(()=>{
    const dataRef = db.collection('threads');
      dataRef.get().then((snapshot) => {
      setValueNT(snapshot.size+1);
      });
  })
  const formTheCheck =form.isValid();
  

  return (
    <Container size="lg" style={{marginTop:20,paddingBottom:100}}>
       <form onSubmit={form.onSubmit((values) =>{
        handleSubmit(values.title, values.forum2,values.postas,values.firstpost);
        })}>
    <Paper shadow="md" radius="lg">
      <div className={classes.wrapper}>
        <div className={classes.contacts}>
          <Text size="lg" weight={700} className={classes.title2} sx={{ color: '#fff' }}>
            Topic Information
          </Text>
          
          <TextInput label="Title" className='mb-4'
           {...form.getInputProps('title')}
          placeholder="Title of the Topic" required />

          {/* <Textarea
            mt="md" mb="md"
            label="Short Description"
            placeholder="This short description will show up under the title name, it's optional."
            minRows={3}
          /> */}
          <Select
            data={data} mb="md"
            // value={valueForm} onChange={setValue}
            label="Forum"
            {...form.getInputProps('forum2')}
            placeholder="Choose location of the topic"
            required
          />


          {/* <Select
            data={data} mb="md"
            label="Post As"
            placeholder="Choose your character "
            required
          /> */}

          <TextInput label="Post As"           
          {...form.getInputProps('postas')}
          placeholder="Write the Name of your Character" required />


          {/* <Select
            data={data} mb="md"
            label="With"            
            placeholder="Choose your team"
            required
          /> */}


        </div>

       <div className={classes.form} >
          <Text size="lg" weight={700} className={classes.title}>
            First Post <span className="text-red-600">*</span>
          </Text>

          <div className={classes.fields}>
            {/* <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
              <TextInput label="Your name" placeholder="Your name" />
              <TextInput label="Your email" placeholder="hello@mantine.dev" required />
            </SimpleGrid> 
            style={{ height: 480 }} sticky={false}
            */}


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
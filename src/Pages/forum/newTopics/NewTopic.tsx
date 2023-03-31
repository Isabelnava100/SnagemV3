import { RichTextEditor, Link } from '@mantine/tiptap';
import {
  Paper, Text, TextInput, Group, Container, Select
} from '@mantine/core';
import { UserAuth } from '../../../context/AuthContext';
import { ButtonProgress } from '../reusable-components/LoadingButton';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align'; 
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import Image from '@tiptap/extension-image';
import { IconColorPicker, IconPictureInPictureOn } from '@tabler/icons';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { handleSubmit } from './components/handleSubmitTopic'
import { filteredData } from '../reusable-components/checkPermsForum'
import { NewForumInfo } from '../../../components/types/typesUsed';
import { useCallback, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import Mention from '@tiptap/extension-mention';
import EmojiModal from '../../../components/editor/EmojiModal'
import suggestion from '../../../components/editor/Suggestion'
import { useDisclosure } from '@mantine/hooks';


import '../../../components/editor/style.css'

import '/src/assets/styles/newTopics.css'; 
import CropImgModal from '../../../components/crop-image/cropImgModal';


export function NewTopic() {
  const [opened, { open, close }] = useDisclosure(false);
  const [ openedCropImg , { open: openCropImg, close: closeCropImg }] = useDisclosure(false);
  const { forum } = useParams();
  const { user } = UserAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      title: '',
      forum2: forum ? NewForumInfo.find(info => info.link === forum) : '2',
      postas: '',
      firstpost: '',
    },
    validate: {
      title: (value) => (value.length < 2 ? 'Title must have at least 2 letters' : null),
      postas: (value) => (value.length < 2 ? 'Name must have at least 2 letters' : null),
      firstpost: (value) => (value.length < 2 ? 'Post must have at least 2 letters' : null),
    },
  });
  const formTheCheck = form.isValid();

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Image,
      Underline,
      Placeholder.configure({ placeholder: 'This is placeholder' }),
      Link,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion,
      }),
    ],
    // onUpdate: useCallback((props: { editor: { getHTML: () => string; }; }) => {
    //   form.setFieldValue('firstpost', props.editor.getHTML());
    // }, [form]),    
    onUpdate: (props) => {
      form.setFieldValue("firstpost", props.editor.getHTML());
    },
  });


  const handleSubmitForm = async (values: { title: any; forum2: any; postas: any; firstpost: any; }) => {
    // console.log(values.forum2);

    try{
    const success = await handleSubmit(values.title, values.forum2, values.postas, values.firstpost,user);

    if (success) {
      navigate('/Forum/' + NewForumInfo.find(info => info.value === values.forum2)?.link);
    } else {
      navigate('/Forum/Main-Forum');
    }
    }catch (err){console.error(err)}finally{return Promise.resolve()} //add to all promises
   
  }

  // ADD IMAGE
  const addImage = useCallback(() => {
    // const url = window.prompt('URL');
    // if (url) {
    //   editor?.chain().focus().setImage({ src: url }).run()
    // }

    openCropImg()
  }, [editor])

  // INSERT EMOJI
  const insertEmoji = (emoji: { emoji: string }) => {
    if (emoji) {
      editor?.chain().focus().insertContent(emoji?.emoji).run()
    }
    close()
  }
  // MENTION USER
  const handleMention = () => {
    editor?.chain().focus().insertContent('@').run()
  }


  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <form onSubmit={form.onSubmit(async (values) => {
       try{ await handleSubmitForm(values); }catch (err){console.error(err)}finally{return Promise.resolve()}
      })}>

    <Paper shadow="md" radius="lg">
      <div className='wrapperNewTopic'>
        <div className='contactNewTopics'>
          <Text size="lg" weight={700} className='title2NewTopic'  sx={{ color: '#fff' }}>
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
                data={filteredData(user)} mb="md"
                // value={valueForm} onChange={checkNewThread}
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

       <div className='formNewTopic'>
          <Text size="lg" weight={700} className='titleNewTopic'>
            First Post <span className="text-red-600">*</span>
          </Text>

          <div>


                <RichTextEditor editor={editor}  >
                  <RichTextEditor.Toolbar >

                    <RichTextEditor.ColorPicker
                      colors={[
                        '#25262b',
                        '#868e96',
                        '#fa5252',
                        '#e64980',
                        '#be4bdb',
                        '#7950f2',
                        '#4c6ef5',
                        '#228be6',
                        '#15aabf',
                        '#12b886',
                        '#40c057',
                        '#82c91e',
                        '#fab005',
                        '#fd7e14',
                      ]}
                    />

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Control interactive={false}>
                        <IconColorPicker size={16} stroke={1.5} />
                      </RichTextEditor.Control>
                      <RichTextEditor.Color color="#F03E3E" />
                      <RichTextEditor.Color color="#7048E8" />
                      <RichTextEditor.Color color="#1098AD" />
                      <RichTextEditor.Color color="#37B24D" />
                      <RichTextEditor.Color color="#F59F00" />
                    </RichTextEditor.ControlsGroup>

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
                      <RichTextEditor.Subscript />
                      <RichTextEditor.Superscript />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Link />
                      <RichTextEditor.Unlink />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.AlignLeft />
                      <RichTextEditor.AlignCenter />
                      <RichTextEditor.AlignJustify />
                      <RichTextEditor.AlignRight />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Control
                        onClick={addImage}
                        aria-label="Insert image"
                        title="Insert image"
                      >
                        <IconPictureInPictureOn stroke={1.5} size={16} />
                      </RichTextEditor.Control>
                      <RichTextEditor.Control
                        onClick={() => open()}
                        aria-label="Insert emoji"
                        title="Insert emoji"
                      >
                        {/* <Icon360 stroke={1.5} size={16} /> */}
                        😘
                      </RichTextEditor.Control>
                      <RichTextEditor.Control
                        aria-label="Mention someone"
                        title="Mention someone"
                        onClick={handleMention}

                      >
                        @
                      </RichTextEditor.Control>

                    </RichTextEditor.ControlsGroup>

                  </RichTextEditor.Toolbar>
                  {/* {isEmojiOpen && <EmojiPicker />} */}
                  <EmojiModal opened={opened} close={close} insertEmoji={insertEmoji} />
                  <CropImgModal opened={openedCropImg} close={closeCropImg} editor={editor} />
                  <RichTextEditor.Content />

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
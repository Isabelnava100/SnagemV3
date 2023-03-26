import { useCallback, useEffect, useState } from "react";
import {
  Paper,
  Text,
  TextInput,
  Group,
  Container,
} from "@mantine/core";
import { ButtonProgress } from "../reusable-components/LoadingButton";
import { useNavigate, useParams } from "react-router-dom";
import { SimpleGrid } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEditor } from "@tiptap/react";
import { RichTextEditor, Link } from "@mantine/tiptap";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import SubScript from "@tiptap/extension-subscript";
import { IconColorPicker, IconStar } from "@tabler/icons";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Image from '@tiptap/extension-image';
import { getThreadDataForNewPostAndCheckPrivateBoolean } from "./components/checkPostingPerms";
import { ThreadInformation } from "../../../components/types/typesUsed";
import { handleSubmit } from "./components/handleNewPostSubmit";
import { UserAuth } from "../../../context/AuthContext";
import '/src/assets/styles/newPost.css'; 

export function NewPost() {
  const { id: thethreadid, forum:forumName } = useParams();
  const { user } = UserAuth();
  const [allThreads, setAllThreads] = useState<ThreadInformation[]>([]);
  const navigate = useNavigate();

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Placeholder.configure({ placeholder: "This is placeholder" }),
      Link,
      Image.configure({
        inline: true,
      }),
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
    ],
    onUpdate: (props) => {
      form.setFieldValue("text", props.editor.getHTML());
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt('URL');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const form = useForm({
    initialValues: {
      character: "",
      text: "",
    },
    validate: {
      character: (value) =>
        value.length < 2 ? "Name must have at least 2 letters" : null,
      text: (value) =>
        value.length < 2 ? "Post must have at least 2 letters" : null,
    },
  });

  const formTheCheck = form.isValid();



  useEffect(() => {
    async function fetchData() {
    if(forumName&&allThreads.length === 0){ 
      const threadData = await getThreadDataForNewPostAndCheckPrivateBoolean(Number(thethreadid), forumName);
      // console.log(threadData);
      if(threadData.length===0) {
        navigate("/Forum/Main-Forum");
      }else {
        if(threadData[0].private===true){
          if(threadData[0].privateTo&&threadData[0].privateTo.includes(user?.displayName)){
            setAllThreads(threadData);
          }else {
            navigate("/Forum/Main-Forum");
            //User isn't allowed to post.
          }
        }else {
          setAllThreads(threadData);
        }//check if privacy exists
      }
    }
  }
  if (allThreads.length===0){
    fetchData();
  }    
  }, [thethreadid,forumName]); //set to page

  async function handleSubmitWrapper(values: { character: string, text: string }) {
    await handleSubmit(
      values.character,
      values.text,
      thethreadid,
      user,
      forumName,
      allThreads
    ).finally(() => {      
      navigate(`/Forum/${forumName}/thread/${thethreadid}`);
      return;
    });
  }

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <form
        onSubmit={form.onSubmit((values) => {
          handleSubmitWrapper(values);
        })}
      >
        <Paper shadow="md" radius="lg">
          <div className='wrapper'>
            <div className='form'>
              {allThreads&&allThreads.map((thread) => (
                <Text
                  size="lg"
                  weight={700}
                  className='title'
                  key={thread.id}
                >
                  Make a Post on {thread.title}
                </Text>
              ))}

              <div className='fields'>
                <SimpleGrid
                  cols={2}
                  breakpoints={[{ maxWidth: "sm", cols: 1 }]}
                >
                  <TextInput
                    label="Post As"
                    placeholder="Write the Name of your Character"
                    required
                    {...form.getInputProps("character")}
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
                <Text size="sm" style={{ marginTop: 10,marginBottom:4 }}>
                  Your Message
                  <span aria-hidden="true" style={{ color: "#ff6b6b" }}>
                    {" "}
                    *
                  </span>
                </Text>

                <RichTextEditor editor={editor}>
                  <RichTextEditor.Toolbar>
                    <RichTextEditor.ColorPicker
                      colors={[
                        "#25262b",
                        "#868e96",
                        "#fa5252",
                        "#e64980",
                        "#be4bdb",
                        "#7950f2",
                        "#4c6ef5",
                        "#228be6",
                        "#15aabf",
                        "#12b886",
                        "#40c057",
                        "#82c91e",
                        "#fab005",
                        "#fd7e14",
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
                      <RichTextEditor.Control
                          onClick={addImage}
                          aria-label="Insert image"
                          title="Insert image"
                        >
                          <IconStar stroke={1.5} size={16} />
                        </RichTextEditor.Control>
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.AlignLeft />
                      <RichTextEditor.AlignCenter />
                      <RichTextEditor.AlignJustify />
                      <RichTextEditor.AlignRight />
                    </RichTextEditor.ControlsGroup>
                  </RichTextEditor.Toolbar>
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

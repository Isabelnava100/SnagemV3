import { useDisclosure } from '@mantine/hooks';
import { Modal } from '@mantine/core';
import CropImg from './cropImg';
import { Editor } from '@tiptap/react';


interface propsType {
    close: () => void,
    opened: boolean,
    editor: Editor | null
}

function CropImgModal(props: propsType) {
    const { close, opened, editor} = props
    return (
        <>
            <Modal opened={opened} onClose={close} withCloseButton={false} centered size={'lg'}>
                <CropImg editor={editor} close={close}/>
            </Modal>
            {/* <Group position="center">
                <Button onClick={open}>Open Modal</Button>
            </Group> */}
        </>
    );
}


export default CropImgModal
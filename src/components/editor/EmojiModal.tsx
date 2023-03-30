import { useDisclosure } from '@mantine/hooks';
import { Modal, Button, Group } from '@mantine/core';
import EmojiPicker from 'emoji-picker-react';
import { FC } from 'react';


interface propTypes {
    opened: boolean,
    close: () => void,
    insertEmoji: (emoji: {emoji: string}) => void
}

const EmojiModal = (props: propTypes) => {
    const { opened, close, insertEmoji } = props
    return (
        <>
            <Modal opened={opened} onClose={close} centered withCloseButton={false} size={'auto'} >
                <EmojiPicker  onEmojiClick={insertEmoji}/>
            </Modal>
        </>
    );
}


export default EmojiModal
import { Modal, Button, Group } from '@mantine/core';
import EmojiPicker from 'emoji-picker-react';



interface propTypes {
    opened: boolean,
    close: () => void,
    insertEmoji: (emoji: {emoji: string}) => void
}

const EmojiModal2 = (props: propTypes) => {
    const { opened, close, insertEmoji } = props
    return (
        <>
            <Modal opened={opened} onClose={close} centered withCloseButton={false} size={'auto'} >
                <EmojiPicker  onEmojiClick={insertEmoji}/>
            </Modal>
        </>
    );
}


export default EmojiModal2
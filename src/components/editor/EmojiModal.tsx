import { useState } from 'react';
import { Modal } from '@mantine/core';

interface EmojiObject {
  emoji: string;
  name: string;
  unicode: string;
}

interface Props {
    opened: boolean;
    close: () => void;
    insertEmoji: (emoji: { emoji: string }) => void; // new prop
}

const EMOJI_LIST: EmojiObject[] = [
  { emoji: '😀', name: 'Grinning Face', unicode: '1f600' },
  { emoji: '😆', name: 'Grinning Squinting Face', unicode: '1f606' },
  { emoji: '😅', name: 'Grinning Face with Sweat', unicode: '1f605' },
  { emoji: '🤣', name: 'Rolling on the Floor Laughing', unicode: '1f923' },
  { emoji: '😂', name: 'Face with Tears of Joy', unicode: '1f602' },
  { emoji: '🙂', name: 'Slightly Smiling Face', unicode: '1f642' },
  { emoji: '🙃', name: 'Upside-Down Face', unicode: '1f643' },
  { emoji: '😉', name: 'Winking Face', unicode: '1f609' },
  { emoji: '😊', name: 'Smiling Face with Smiling Eyes', unicode: '1f60a' },
  { emoji: '😇', name: 'Smiling Face with Halo', unicode: '1f607' },
];

function EmojiModal(props: Props) {
    const { opened, close } = props
    
function handleEmojiClick(emoji: EmojiObject) {
    const { insertEmoji, close } = props;
    const emojiToInsert = { emoji: emoji.emoji }; 
    insertEmoji(emojiToInsert);
    close(); 
  }

  return (
    <Modal opened={opened} onClose={close} centered withCloseButton={true} size={'auto'}>
      <h2>Select an Emoji</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji.unicode}
            onClick={() => handleEmojiClick(emoji)}
            style={{ fontSize: '2rem', margin: '0.5rem' }}
          >
            {emoji.emoji}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default EmojiModal;

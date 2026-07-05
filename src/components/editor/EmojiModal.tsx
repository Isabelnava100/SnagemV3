import { Image, Modal, SimpleGrid, Stack, Text, Title, Tooltip } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { emojiData, getEmoteImageURL } from "../../data/emote";
import { getEmojis } from "../../queries/settings";

interface EmojiObject {
  emoji: string;
  name: string;
  unicode: string;
}

interface Props {
  opened: boolean;
  close: () => void;
  /** `emoji` may be a unicode character or an HTML snippet (custom emotes). */
  insertEmoji: (emoji: { emoji: string }) => void;
}

const EMOJI_LIST: EmojiObject[] = [
  { emoji: "😀", name: "Grinning Face", unicode: "1f600" },
  { emoji: "😆", name: "Grinning Squinting Face", unicode: "1f606" },
  { emoji: "😅", name: "Grinning Face with Sweat", unicode: "1f605" },
  { emoji: "🤣", name: "Rolling on the Floor Laughing", unicode: "1f923" },
  { emoji: "😂", name: "Face with Tears of Joy", unicode: "1f602" },
  { emoji: "🙂", name: "Slightly Smiling Face", unicode: "1f642" },
  { emoji: "🙃", name: "Upside-Down Face", unicode: "1f643" },
  { emoji: "😉", name: "Winking Face", unicode: "1f609" },
  { emoji: "😊", name: "Smiling Face with Smiling Eyes", unicode: "1f60a" },
  { emoji: "😇", name: "Smiling Face with Halo", unicode: "1f607" },
];

/**
 * Emoji picker for the forum editors: standard unicode emojis plus the
 * custom guild emotes the user owns (collection shown in Dashboard →
 * Settings → Collections; earned/bought via the marketplace).
 */
function EmojiModal(props: Props) {
  const { opened, close, insertEmoji } = props;
  const { user } = useAuth();

  const { data: ownedEmojiIds } = useQuery({
    queryKey: ["get-emojis", user?.uid],
    queryFn: () => getEmojis(user!.uid),
    enabled: !!user && opened,
  });

  const ownedEmotes = emojiData.filter((emote) => (ownedEmojiIds ?? []).includes(emote.id));

  const handleUnicodeClick = (emoji: EmojiObject) => {
    insertEmoji({ emoji: emoji.emoji });
    close();
  };

  const handleEmoteClick = (filename: string, name: string) => {
    // Inserted as an inline image; sanitized on render like all post HTML.
    insertEmoji({
      emoji: `<img src="${getEmoteImageURL(filename)}" alt="${name}" title="${name}">`,
    });
    close();
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      centered
      withCloseButton
      size="auto"
      title={<Title order={3}>Select an Emoji</Title>}
    >
      <Stack gap={10}>
        <div style={{ display: "flex", flexWrap: "wrap", maxWidth: 340 }}>
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji.unicode}
              onClick={() => handleUnicodeClick(emoji)}
              title={emoji.name}
              style={{
                fontSize: "1.6rem",
                margin: "0.3rem",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {emoji.emoji}
            </button>
          ))}
        </div>

        {!!ownedEmotes.length && (
          <>
            <Text fz={13} fw={600}>
              Your Emotes
            </Text>
            <SimpleGrid cols={6} spacing={6} style={{ maxWidth: 340 }}>
              {ownedEmotes.map((emote) => (
                <Tooltip label={emote.Name} key={emote.id}>
                  <button
                    onClick={() => handleEmoteClick(emote.Filename, emote.Name)}
                    style={{
                      background: "#3C3A3C",
                      border: "none",
                      borderRadius: "100%",
                      width: 44,
                      height: 44,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image src={getEmoteImageURL(emote.Filename)} alt={emote.Name} width={28} />
                  </button>
                </Tooltip>
              ))}
            </SimpleGrid>
          </>
        )}
      </Stack>
    </Modal>
  );
}

export default EmojiModal;

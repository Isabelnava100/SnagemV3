import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "react-router-dom";
import {
  IconArrowLeft,
  IconBook,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { canManageLore } from "../../lib/permissions";
import {
  deleteLoreBook,
  deleteLoreEntry,
  getAllLoreEntries,
  getLoreBooks,
  getLoreEntries,
  LoreBook,
  LoreBookType,
  LoreEntry,
  upsertLoreBook,
  upsertLoreEntry,
} from "../../queries/lore";

/**
 * Lore Library: the guild's worldbuilding, migrated from Gaia's read-only
 * "Library" subforum. A shelf of loreBooks opens into a book of loreEntries.
 * Structured books (Compendium, Unique Objects) render their attributes as a
 * field list; prose books render sanitized HTML. Editing is gated behind the
 * ManageLore capability. See docs/LORE_DATA.md.
 */

const BOOK_TYPES: { value: LoreBookType; label: string }[] = [
  { value: "type_book", label: "Book of [Type]" },
  { value: "compendium", label: "Compendium (structured)" },
  { value: "objects", label: "Unique Objects (structured)" },
  { value: "history", label: "History" },
  { value: "short_stories", label: "Short Stories" },
  { value: "other", label: "Other" },
];

const typeLabel = (t: LoreBookType) => BOOK_TYPES.find((b) => b.value === t)?.label ?? t;

/**
 * An entry is "empty" when it has no prose body, no non-blank attribute values,
 * and no images (e.g. the "[To be finished.]" placeholder rosters). These are
 * hidden from readers, but kept for editors so the stubs stay fillable. The
 * seeded data is untouched; this is a render-time filter only.
 */
function isEmptyEntry(entry: LoreEntry): boolean {
  const hasBody = !!entry.body?.trim();
  const hasAttr = Object.values(entry.attributes ?? {}).some((v) => v?.trim());
  const hasImages = !!entry.images?.length;
  return !hasBody && !hasAttr && !hasImages;
}

/** "by <author>" byline; links to the author's profile when they have an account. */
function AuthorLine(props: { name?: string; uid?: string }) {
  if (!props.name) return null;
  return (
    <Text fz={12} c="dimmed">
      by{" "}
      {props.uid ? (
        <Anchor component={Link} to={`/Users/${props.name}`} fz={12}>
          {props.name}
        </Anchor>
      ) : (
        <Text component="span" c="rgba(255,255,255,0.7)">
          {props.name}
        </Text>
      )}
    </Text>
  );
}

/** Sanitized rich-text block, matching the forum post render precedent. */
function LoreProse(props: { html: string }) {
  return (
    <Box
      fz={14}
      c="rgba(255,255,255,0.85)"
      style={{ lineHeight: 1.7, wordBreak: "break-word" }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(props.html) }}
    />
  );
}

/** Render an entry's structured attributes as a labeled field list. */
function AttributeList(props: { attributes: Record<string, string> }) {
  const rows = Object.entries(props.attributes).filter(([, v]) => v?.trim());
  if (!rows.length) return null;
  return (
    <Stack gap={2}>
      {rows.map(([key, value]) => (
        <Text key={key} fz={13} c="rgba(255,255,255,0.75)">
          <Text component="span" fw={700} c="white">
            {key}:
          </Text>{" "}
          {value}
        </Text>
      ))}
    </Stack>
  );
}

function EntryCard(props: { entry: LoreEntry; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const { entry } = props;
  return (
    <Card bg="#26252a" radius="md" p={14} withBorder>
      <Stack gap={8}>
        <Group justify="space-between" wrap="nowrap" align="flex-start" gap={8}>
          <Box style={{ minWidth: 0 }}>
            {entry.category && (
              <Text fz={11} c="dimmed" tt="uppercase" fw={700}>
                {entry.category}
              </Text>
            )}
            <Text fz={16} c="white" fw={600}>
              {entry.title}
            </Text>
            <AuthorLine name={entry.authorName} uid={entry.authorUid} />
          </Box>
          <Group gap={4} wrap="nowrap">
            {entry.status === "stub" && (
              <Badge size="sm" variant="light" color="yellow">
                To be finished
              </Badge>
            )}
            {props.canEdit && (
              <>
                <ActionIcon variant="subtle" color="gray" onClick={props.onEdit} aria-label={`Edit ${entry.title}`}>
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" onClick={props.onDelete} aria-label={`Delete ${entry.title}`}>
                  <IconTrash size={16} />
                </ActionIcon>
              </>
            )}
          </Group>
        </Group>

        {entry.attributes && <AttributeList attributes={entry.attributes} />}
        {entry.images?.length ? (
          <Group gap={8}>
            {entry.images.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 6 }}
              />
            ))}
          </Group>
        ) : null}
        {entry.body?.trim() && <LoreProse html={entry.body} />}
      </Stack>
    </Card>
  );
}

/* ------------------------------ Editors ---------------------------------- */

const emptyBook = (order: number): Omit<LoreBook, "id"> & { id?: string } => ({
  title: "",
  description: "",
  type: "other",
  order,
});

function BookEditor(props: {
  opened: boolean;
  initial: (Omit<LoreBook, "id"> & { id?: string }) | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = React.useState(props.initial ?? emptyBook(0));
  React.useEffect(() => {
    if (props.initial) setDraft(props.initial);
  }, [props.initial]);

  const mutation = useMutation({
    mutationFn: () => upsertLoreBook(draft),
    onSuccess: () => {
      props.onSaved();
      props.onClose();
    },
  });

  return (
    <Modal opened={props.opened} onClose={props.onClose} title={draft.id ? "Edit book" : "New book"} centered>
      <Stack gap={12}>
        <TextInput
          label="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.currentTarget.value })}
          required
        />
        <Textarea
          label="Description"
          autosize
          minRows={2}
          value={draft.description ?? ""}
          onChange={(e) => setDraft({ ...draft, description: e.currentTarget.value })}
        />
        <TextInput
          label="Author (name)"
          placeholder="Gaia poster / attribution"
          value={draft.authorName ?? ""}
          onChange={(e) => setDraft({ ...draft, authorName: e.currentTarget.value })}
        />
        <Select
          label="Type"
          data={BOOK_TYPES}
          value={draft.type}
          onChange={(v) => v && setDraft({ ...draft, type: v as LoreBookType })}
          allowDeselect={false}
        />
        <NumberInput
          label="Shelf order"
          value={draft.order}
          onChange={(v) => setDraft({ ...draft, order: typeof v === "number" ? v : 0 })}
        />
        {mutation.isError && (
          <Text role="status" aria-live="polite" c="red" fz={13}>
            Could not save. You may not have permission.
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={props.onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!draft.title.trim()}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

const emptyEntry = (bookId: string, order: number): Omit<LoreEntry, "id"> & { id?: string } => ({
  bookId,
  category: "",
  title: "",
  body: "",
  attributes: {},
  order,
  status: "complete",
});

/** Editable list of attribute key/value pairs for structured entries. */
function AttributeEditor(props: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const rows = Object.entries(props.value);
  const setRow = (index: number, key: string, val: string) => {
    const next = rows.map(([k, v], i) => (i === index ? [key, val] : [k, v])) as [string, string][];
    props.onChange(Object.fromEntries(next.filter(([k]) => k.trim())));
  };
  const addRow = () => props.onChange({ ...props.value, "": "" });
  const removeRow = (index: number) =>
    props.onChange(Object.fromEntries(rows.filter((_, i) => i !== index)));

  return (
    <Stack gap={6}>
      <Text fz={13} fw={600} c="white">
        Structured fields (optional)
      </Text>
      {rows.map(([key, val], i) => (
        <Group key={i} gap={6} wrap="nowrap">
          <TextInput
            placeholder="Field"
            value={key}
            onChange={(e) => setRow(i, e.currentTarget.value, val)}
            w={140}
            aria-label="Field name"
          />
          <TextInput
            placeholder="Value"
            value={val}
            onChange={(e) => setRow(i, key, e.currentTarget.value)}
            style={{ flex: 1 }}
            aria-label="Field value"
          />
          <ActionIcon variant="subtle" color="red" onClick={() => removeRow(i)} aria-label="Remove field">
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      <Button variant="subtle" size="compact-sm" leftSection={<IconPlus size={14} />} onClick={addRow}>
        Add field
      </Button>
    </Stack>
  );
}

function EntryEditor(props: {
  opened: boolean;
  initial: (Omit<LoreEntry, "id"> & { id?: string }) | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = React.useState(props.initial ?? emptyEntry("", 0));
  React.useEffect(() => {
    if (props.initial) setDraft(props.initial);
  }, [props.initial]);

  const mutation = useMutation({
    mutationFn: () =>
      upsertLoreEntry({ ...draft, body: DOMPurify.sanitize(draft.body ?? "") }),
    onSuccess: () => {
      props.onSaved();
      props.onClose();
    },
  });

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={draft.id ? "Edit entry" : "New entry"}
      size="lg"
      centered
    >
      <Stack gap={12}>
        <TextInput
          label="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.currentTarget.value })}
          required
        />
        <Group grow>
          <TextInput
            label="Category (optional)"
            placeholder="Minerals, Kanto Natives, a story arc..."
            value={draft.category ?? ""}
            onChange={(e) => setDraft({ ...draft, category: e.currentTarget.value })}
          />
          <NumberInput
            label="Order"
            value={draft.order}
            onChange={(v) => setDraft({ ...draft, order: typeof v === "number" ? v : 0 })}
          />
        </Group>
        <Select
          label="Status"
          data={[
            { value: "complete", label: "Complete" },
            { value: "stub", label: "Stub (to be finished)" },
          ]}
          value={draft.status}
          onChange={(v) => v && setDraft({ ...draft, status: v as LoreEntry["status"] })}
          allowDeselect={false}
          maw={240}
        />
        <TextInput
          label="Author (name)"
          placeholder="Gaia poster / attribution"
          value={draft.authorName ?? ""}
          onChange={(e) => setDraft({ ...draft, authorName: e.currentTarget.value })}
          maw={320}
        />
        <AttributeEditor
          value={draft.attributes ?? {}}
          onChange={(attributes) => setDraft({ ...draft, attributes })}
        />
        <Textarea
          label="Body (HTML)"
          description="Paste the migrated post HTML. It is sanitized on save and on display."
          autosize
          minRows={4}
          maxRows={16}
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.currentTarget.value })}
        />
        {draft.body.trim() && (
          <Card bg="#1c1b1f" p={10} radius="md" withBorder>
            <Text fz={11} c="dimmed" mb={4}>
              Preview
            </Text>
            <LoreProse html={draft.body} />
          </Card>
        )}
        {mutation.isError && (
          <Text role="status" aria-live="polite" c="red" fz={13}>
            Could not save. You may not have permission.
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={props.onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!draft.title.trim()}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/* ------------------------------ Book view -------------------------------- */

function BookView(props: { book: LoreBook; canEdit: boolean; onBack: () => void }) {
  const { book } = props;
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [editorOpen, editor] = useDisclosure(false);
  const [editing, setEditing] = React.useState<(Omit<LoreEntry, "id"> & { id?: string }) | null>(null);

  const { data: entries, isPending } = useQuery({
    queryKey: ["lore-entries", book.id],
    queryFn: () => getLoreEntries(book.id),
  });

  const del = useMutation({
    mutationFn: (entryId: string) => deleteLoreEntry(entryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lore-entries", book.id] }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["lore-entries", book.id] });

  const q = search.trim().toLowerCase();
  const shown = React.useMemo(() => {
    let list = entries ?? [];
    // Readers never see fully-empty placeholder entries; editors keep them so
    // the stubs remain visible and fillable.
    if (!props.canEdit) list = list.filter((e) => !isEmptyEntry(e));
    if (!q) return list;
    return list.filter(
      (e) => e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q)
    );
  }, [entries, q, props.canEdit]);

  const openNew = () => {
    setEditing(emptyEntry(book.id, (entries?.length ?? 0) + 1));
    editor.open();
  };
  const openEdit = (entry: LoreEntry) => {
    setEditing(entry);
    editor.open();
  };

  return (
    <Stack gap={14}>
      <Group justify="space-between" wrap="wrap" gap={8}>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={props.onBack}>
          All books
        </Button>
        {props.canEdit && (
          <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
            Add entry
          </Button>
        )}
      </Group>

      <Box>
        <Title order={2} c="white" size={24} fw={600}>
          {book.title}
        </Title>
        <Group gap={8} wrap="wrap">
          <Text fz={12} c="dimmed">
            {typeLabel(book.type)}
          </Text>
          <AuthorLine name={book.authorName} uid={book.authorUid} />
        </Group>
        {book.description && (
          <Text fz={14} c="rgba(255,255,255,0.8)" mt={6}>
            {book.description}
          </Text>
        )}
      </Box>

      <TextInput
        placeholder="Search this book"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        maw={320}
        w="100%"
        radius="xl"
        styles={{ input: { background: "#2E2D2E" } }}
        aria-label="Search entries in this book"
      />

      {isPending ? (
        <SectionLoader />
      ) : !shown.length ? (
        <Text c="dimmed">{q ? "No entries match your search." : "This book has no entries yet."}</Text>
      ) : (
        <Stack gap={10}>
          {shown.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              canEdit={props.canEdit}
              onEdit={() => openEdit(entry)}
              onDelete={() => {
                if (window.confirm(`Delete "${entry.title}"?`)) del.mutate(entry.id);
              }}
            />
          ))}
        </Stack>
      )}

      {props.canEdit && (
        <EntryEditor opened={editorOpen} initial={editing} onClose={editor.close} onSaved={refresh} />
      )}
    </Stack>
  );
}

/* ------------------------------ Shelf ------------------------------------ */

export default function LoreTab() {
  const { user } = useAuth();
  const canEdit = canManageLore(user);
  const queryClient = useQueryClient();
  const [openBookId, setOpenBookId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [bookEditorOpen, bookEditor] = useDisclosure(false);
  const [editingBook, setEditingBook] = React.useState<
    (Omit<LoreBook, "id"> & { id?: string }) | null
  >(null);

  const { data: books, isPending } = useQuery({ queryKey: ["lore-books"], queryFn: getLoreBooks });

  // Readers only see books that hold at least one substantive entry; editors
  // keep seeing empty shelves so they can fill them.
  const { data: allEntries } = useQuery({
    queryKey: ["lore-entries-all"],
    queryFn: getAllLoreEntries,
    enabled: !canEdit,
  });
  const booksWithContent = React.useMemo(() => {
    if (canEdit || !allEntries) return null;
    const filled = new Set(
      allEntries.filter((e) => !isEmptyEntry(e)).map((e) => e.bookId)
    );
    return filled;
  }, [allEntries, canEdit]);

  const del = useMutation({
    mutationFn: (bookId: string) => deleteLoreBook(bookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lore-books"] }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["lore-books"] });

  const openBook = books?.find((b) => b.id === openBookId) ?? null;

  const q = search.trim().toLowerCase();
  const shelf = React.useMemo(() => {
    let list = books ?? [];
    if (booksWithContent) list = list.filter((b) => booksWithContent.has(b.id));
    if (!q) return list;
    return list.filter(
      (b) => b.title.toLowerCase().includes(q) || (b.description ?? "").toLowerCase().includes(q)
    );
  }, [books, q, booksWithContent]);

  if (openBook) {
    return <BookView book={openBook} canEdit={canEdit} onBack={() => setOpenBookId(null)} />;
  }

  return (
    <Stack gap={14}>
      <Group justify="space-between" wrap="wrap" gap={8}>
        <TextInput
          placeholder="Search books"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          maw={320}
          w="100%"
          radius="xl"
          styles={{ input: { background: "#2E2D2E" } }}
          aria-label="Search lore books"
        />
        {canEdit && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setEditingBook(emptyBook((books?.length ?? 0) + 1));
              bookEditor.open();
            }}
          >
            Add book
          </Button>
        )}
      </Group>

      {isPending ? (
        <SectionLoader />
      ) : !shelf.length ? (
        <Text c="dimmed">
          {q ? "No books match your search." : "The Lore Library is empty for now."}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="md">
          {shelf.map((book) => (
            <Card key={book.id} bg="#26252a" radius="md" p={16} withBorder>
              <Stack gap={8} style={{ height: "100%" }}>
                <Group gap={8} wrap="nowrap">
                  <IconBook size={20} color="#b088e6" />
                  <Text fz={16} c="white" fw={600} lineClamp={2}>
                    {book.title}
                  </Text>
                </Group>
                <Badge size="sm" variant="light" color="grape" w="fit-content">
                  {typeLabel(book.type)}
                </Badge>
                {book.description && (
                  <Text fz={13} c="dimmed" lineClamp={3}>
                    {book.description}
                  </Text>
                )}
                <Group gap={6} mt="auto" justify="space-between">
                  <Button variant="light" color="grape" size="compact-sm" onClick={() => setOpenBookId(book.id)}>
                    Open
                  </Button>
                  {canEdit && (
                    <Group gap={4}>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={() => {
                          setEditingBook(book);
                          bookEditor.open();
                        }}
                        aria-label={`Edit ${book.title}`}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => {
                          if (window.confirm(`Delete "${book.title}" and all its entries?`)) del.mutate(book.id);
                        }}
                        aria-label={`Delete ${book.title}`}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  )}
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {canEdit && (
        <BookEditor opened={bookEditorOpen} initial={editingBook} onClose={bookEditor.close} onSaved={refresh} />
      )}
    </Stack>
  );
}

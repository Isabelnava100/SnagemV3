import { useState } from "react";
import { Link, Outlet, useOutletContext, useParams } from "react-router-dom";
import { ScrollArea, Header, Group } from "@mantine/core";
import { NewForumInfo as links } from "../../../../components/types/typesUsed";
import '/src/assets/styles/miniNavForum.css';


type ContextType = { active: string | null };

function MiniNavForum() {
  const { forum:forumName } = useParams();
  const [active, setActive] = useState<string | null>(forumName||links[0].link);

  const items = links.map((link) => (
    <Link
      key={link.label}
      to={`/Forum/${link.link}`}
      className={'linkMini ' + (active === link.link && 'linkActiveMini')}
      onClick={(event) => {
        setActive(link.link);
      }}
    >
      {link.label}
    </Link>
  ));
  return (
    <>
      <Header height={40} className='header'>
        <ScrollArea style={{ height: 46 }} offsetScrollbars scrollbarSize={6}>
          <div className='inner'>
            <Group spacing={5}>{items}</Group>
          </div>
        </ScrollArea>
      </Header>

      <Outlet context={{ active }} />
    </>
  );
}
export default MiniNavForum;

export function useForumLink() {
  return useOutletContext<ContextType>();
}

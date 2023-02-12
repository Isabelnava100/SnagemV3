
import { Container, Table, Text } from '@mantine/core';
import MiniNavForum, { useForumLink } from './components/MiniNavForum';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroText } from './components/HeroSection';
import { UserAuth } from '../../context/AuthContext';
import { collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../../context/firebase';

interface Item {
  timePosted:Date;
  threadLink:number;
  private: boolean;
  title:string;
  closed:boolean;
  id:string;
  location:number;
  createdBy:string
}


function MainForum() {
  const forumPlace  = useForumLink();
  const place=forumPlace?.active;
  
  const [allThreads, setAllThreads] = useState<Item[]>([]);
  const {user}=UserAuth();
  
  const dataRun=async(ForumPlace:number)=>{
    const newData:Item[]=[];
    try{
      await getDocs(collection(db, 'threads'))
    .then((postsData)=>{
    postsData.forEach((doc) => {
      //  console.log(doc.id, " => ", doc.data());
      if (doc.data().location === ForumPlace) {
        newData.push({
          id: doc.id,
          createdBy: doc.data().createdBy,
          location: doc.data().location,
          timePosted: new Date(doc.data().timePosted.seconds * 1000),
          threadLink: doc.data().threadLink,
          private: doc.data().private,
          title: doc.data().title,
          closed: doc.data().closed
        });
      } //filter
    });
})
.then(() => {
  setAllThreads(newData);
});
    } 
    catch (error) {console.log(error);}    
}

  useEffect(() => {
const placeNum = place && !isNaN(parseInt(place.split("/")[2])) ? parseInt(place.split("/")[2]) : 1;
  dataRun(placeNum);
  }, [place]);



  return (
    <>
    
    <Container size="lg" style={{marginTop:20,paddingBottom:100}}>
        <div style={{ position: 'relative',display:'flex',flexDirection:'column' }}>
        <HeroText send={place}/>
        <Table highlightOnHover>
      <thead><tr><th>TOPICS</th><th>LAST POST</th></tr></thead>
      <tbody>
      {allThreads.map((thread) => (
       <tr key={thread.id}>        
        <td>
          <Link style={{textDecoration: 'none'}}  to={`/Forum/thread/${thread.threadLink}`}  state={{ newlocation: thread.id}}>
            {thread.title}
            <Text color="dimmed" size="sm">
             Created by {thread.createdBy}
            </Text></Link></td> 
          <td>
            <Link style={{textDecoration: 'none'}} to={`/Forum/thread/${thread.threadLink}`} state={{ newlocation: thread.id}}>
              {
              thread.timePosted.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false })
              }
          </Link></td>
        </tr>
      ))}
        </tbody>
        </Table>

      </div>
        </Container>
        </>
  )
}

export default MainForum;
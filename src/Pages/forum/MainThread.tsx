
import { useEffect, useState } from 'react';
import { Container, Pagination, LoadingOverlay, Button } from '@mantine/core';
// import threadJSON from '../../context/temporary/oneThread.json';
import { ArticleCardVertical } from './components/EachPost';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { FeaturesTitle } from './components/setTitleperThread';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { UserAuth } from '../../context/AuthContext';
import { db } from '../../context/firebase';



interface Item {
  id:string;
  character:string;
  owner:string;
  text:string;
  thread:number;
  threadLink:string;
  timePosted: {
    seconds: number;
    nanoseconds: number;
  };
}

interface Thread {
  id:string;
  createdBy:string;
  private: boolean;
  title:string;
  closed:boolean;
}


function Threads() {
  let { state } = useLocation();
  const checkingLoc=(state && state.newlocation)?true:false;
  const { id: thethreadid, page: thecurrentpage } = useParams();
  const [allPosts, setAllPosts] = useState<Item[]>([]);
  const [threadInfo, setThreadInfo] = useState<Thread[]>([]);
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);

  const [totalItemsCount, setTots]=useState<number>(0);

  const [page, onChangePG] = useState<number>(thecurrentpage?Number(thecurrentpage):1); //if last then pages = pagesCount
  
  const { user } = UserAuth(); // for permissions
  
  const postPerPage=6;
  const pagesCount=Math.ceil(totalItemsCount / postPerPage);
  
  const start=(page - 1) * postPerPage;
  const end=Math.min(page * postPerPage, totalItemsCount);


  const sortPostsByTime = (posts: Item[]): Item[] => {
    return posts.sort((a, b) => {
      const timeA:number = a.timePosted.seconds + a.timePosted.nanoseconds / 1e9;
      const timeB:number = b.timePosted.seconds + b.timePosted.nanoseconds / 1e9;
      return timeA - timeB;
    });
  };
  
//part 1
  const dataRun=async(threadPlace:number)=>{
    const newdata2:Thread[]=[];
    
try{
 //below gets info/title of the thread... needs to be redone without the foreach, just the uid
if(checkingLoc){
//1
await getDoc(doc(db, "threads", state.newlocation))
.then((currentThread)=>{
  newdata2.push({ 
    id: currentThread.id, 
    createdBy: currentThread.data()?.createdBy,
    private: currentThread.data()?.private,
    title: currentThread.data()?.title,
    closed: currentThread.data()?.closed
  });
setThreadInfo(newdata2);
  } 
).finally(()=>{
  dataRun2(newdata2);
});//1
}else {
  //2
  await getDocs(collection(db, 'threads'))
  .then((postsData)=>{
  postsData.forEach((doc) => {
    //  console.log(doc.id, " => ", doc.data());
    if(doc.data().threadLink === threadPlace) {
    newdata2.push({ 
      id: doc.id, 
      createdBy: doc.data().createdBy,
      private: doc.data().private,
      title: doc.data().title,
      closed: doc.data().closed
    });
    }
  setThreadInfo(newdata2);
    //filter    
  });
}).finally(()=>{
  dataRun2(newdata2);
});
//2
}//state.newlocation

}catch (error) {
  alert("There has been an error, please inform the administrator.");
  setShouldNavigate(true);}
}
//part 1


//part 2
 const dataRun2=async(newdata2:Thread[])=>{
    const newdata:Item[]=[];
   if(Object.keys(newdata2).length===0){
    setShouldNavigate(true);
   }else{
    try{
      //3
      await getDocs(collection(db, 'posts'))
        .then(async (postsData)=>{ 
        postsData.forEach((doc) => {
          //  console.log(doc.id, " => ", doc.data());
          if(doc.data().thread === newdata2[0].id) {
          newdata.push({ 
            id: doc.id, 
            character:doc.data().character,
            owner: doc.data().owner,  
            text:doc.data().text, 
            thread:doc.data().thread, 
            threadLink:doc.data().threadLink, 
            timePosted:doc.data().timePosted
          });
          } //filter      
      setAllPosts(sortPostsByTime(newdata));
      setTots(newdata.length);
      // console.log(newdata);
        });   
    });
    //3    
    }catch (error) {
      alert("There has been an error, please inform the administrator.");
      setShouldNavigate(true);
    }
   }
}



useEffect(() => {
  if (Number.isNaN(Number(thethreadid))) {
    setShouldNavigate(true);
  }else {
   dataRun(Number(thethreadid));
  }
}, [thethreadid, page]); //set to page

if (shouldNavigate) {
  return <Navigate to="/Forum/1" />;
}

  return (
      
    <Container size="lg" style={{marginTop:20,paddingBottom:100}}>
        <div id="loadingContainer">
       {threadInfo.length?<FeaturesTitle info={threadInfo} threadID={checkingLoc?state.newlocation:null} />:''}
        
          <Pagination total={pagesCount} color="violet" withEdges page={page} onChange={onChangePG}  
          style={{alignSelf: 'end'}} />
          {
          allPosts.map((apost,index) => 
          index>=start&&index+1<=end&&
            <ArticleCardVertical key={apost.id}
            image={''} bigText={apost.text} chara={apost.character} author={{
              name: apost.owner,
              avatar: 'avie'
            }}/>
           )
        }
          <Pagination total={pagesCount} color="violet" withEdges page={page} onChange={onChangePG} 
          style={{alignSelf: 'end'}} />
          {/* {user&&
          <Button
          variant="gradient"
          gradient={{ deg: 133, from: 'grape', to: 'violet' }}
          size="lg"
          radius="md"
          mt="xl"
          style={{alignSelf: 'end'}}
          component={Link} to={`/Forum/thread/${id}/post`}
        >
          Make a New Post
        </Button>
           } */}
           
          
      </div>
        </Container>
   
  )
}

export default Threads;
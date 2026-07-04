import { Link } from "react-router-dom";
import "/src/assets/styles/homepage.css";

export const HomePage = () => {
  return (
    <div className="homepage">
    <div className="heroIMGcontainer">
           <div className="centered-container">
              <h1>The Snagem Guild</h1>
              <h2>Ready to start your journey?</h2>
              <div className="button-container">
              <Link to="/" className="red button">Discover What We Do</Link>
              <Link to="/Forum/Main-Forum" className="purple button">Go to the Forums</Link>
              </div>
           </div>

    </div>

        <div className="secondmodule">
          <div className="innerHold2 oneM">
      <h2>A new imagined way of <span>story telling.</span></h2>
      <span className="paragraph2">
      It is simple and easy to get started in the role-playing, based on Pokemon.
      </span>
      <Link to="/" className="button yellow">Read About Snagem</Link>
      </div>


    <div className="innerHold2 twoM">
      <h2 className="right-text">Forums custom built <span className="red-text">for roleplay.</span></h2>
      <span className="paragraph2">
      We created this platform that adjusts to our needs and regularly update it with new features.
      <Link to="/" className="button red">See Anticipated Updates</Link>
      </span>
      
      </div>
    </div>

    <div className="teammodule">
      <h2>Meet the Team</h2>
      <span className="paragraph3">
      A lot of us have dedicated years to the story and we hope you join us along the way.
      </span>
      <img
        className="teamGroupIMG"
        src="https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/site%2Fteamgroup.png?alt=media&token=acde80c2-f735-45ac-a8a2-730b186090ea"
        alt="Team Snagem members and their Pokemon"
      />
    </div>

    <div className="ctamodule">
      <h2>
        <span className="lineOne">let&rsquo;s make</span>
        <span className="lineTwo">great stories</span>
        <span className="lineThree">
          <Link to="/Register" className="button purple">Join the Team</Link>
          together
        </span>
      </h2>
    </div>

    <div className="creditbar">
      Credit: Seviyummy, Batsky
      <br />
      All artwork used on this site has proper licensed purchased, commissioned or drawn by our team.
    </div>
    </div>
  );
};

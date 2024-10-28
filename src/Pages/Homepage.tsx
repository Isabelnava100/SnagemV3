import "/src/assets/styles/homepage.css";

export const HomePage = () => {
  return (
    <div className="homepage">
    <div className="heroIMGcontainer">
           <div className="centered-container">
              <h1>The Snagem Guild</h1>
              <h2>Ready to start your journey?</h2>
              <div className="button-container">
              <a href="/" className="red button">Discover What We Do</a>
              <a href="/Forum/Main-Forum" className="purple button">Go to the Forums</a>
              </div>
           </div>

    </div>

        <div className="secondmodule">
          <div className="innerHold2 oneM">
      <h2>A new imagined way of <span>story telling.</span></h2>
      <span className="paragraph2">
      It is simple and easy to get started in the role-playing, based on Pokemon.
      </span>
      <a href="/" className="button yellow">Read About Snagem</a>
      </div>


    <div className="innerHold2 twoM">
      <h2 className="right-text">Forums custom built <span className="red-text">for roleplay.</span></h2>
      <span className="paragraph2">
      We created this platform that adjusts to our needs and regularly update it with new features.
      <a href="/" className="button red">See Anticipated Updates</a>
      </span>
      
      </div>
    </div>
    </div>
  );
};

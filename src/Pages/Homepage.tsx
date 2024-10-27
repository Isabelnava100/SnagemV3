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
      <h2>A new imagined way of <span>story telling.</span></h2>
      <span>
      It is simple and easy to get started in the role-playing, based on Pokemon.
      </span>
      <a href="/" className="button yellow">Read About Snagem</a>
    </div>
    </div>
  );
};

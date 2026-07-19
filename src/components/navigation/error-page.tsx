import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import Seo from "../common/Seo";
// import Navigation from "../components/navigation/NavBase";

export function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    // if (error.status === 401) {
    //   // ...
    //   console.log(error);
    // }
    // else if (error.status === 404) {
    //   // ...
    //   console.log(error);
    // }

    return (
      <div id="error-page">
        <Seo noindex title="Page Not Found | Snagem Guild" />
        <h1>Oops! {error.status}</h1>
        <p>{error.statusText}</p>
        {error.data?.message && (
          <p>
            <i>{error.data.message}</i>
          </p>
        )}
         <Link to='/'>Go back to HQ</Link>
      </div>
    );
  } else if (error instanceof Error) {
    <div id="error-page">
      <h1>Oops! Unexpected Error</h1>
      <p>Something went wrong.</p>
      <p>
        <i>{error.message}</i>
      </p>
         <Link to='/'>Go back to HQ</Link>
    </div>;
  } else {
    return <Seo noindex title="Page Not Found | Snagem Guild" />;
  }

  return <Seo noindex title="Page Not Found | Snagem Guild" />;
}
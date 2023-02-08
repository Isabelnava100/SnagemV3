
import { LoaderFunction } from 'react-router-dom';

export type LoaderData<TLoaderFn extends LoaderFunction> = 
Awaited<ReturnType<TLoaderFn>> extends Response | infer D
	? D
	: never;


// export const loader = (async () => {
// 	if (FORBIDDEN) return redirect('/signin)
// 	return { ok: true};
// }) satisfies LoaderFunction;


// export async function loader({ params }) {
// 	const contact = await getContact(params.contactId);
// 	if (!contact) {
// 	  throw new Response("", {
// 		status: 404,
// 		statusText: "Not Found",
// 	  });
// 	}
// 	return contact;
//   }
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../../context/firebase";
import { generatePassword } from "./Components";

/** A GaiaOnline name reduced to a stable, Firestore-safe claim key. */
const gaiaClaimId = (gaiaName: string) =>
  gaiaName.trim().toLowerCase().replace(/[/.#$\[\]]+/g, "_");

export const registerUser = async (
  email: string,
  pwCheck: string,
  application: string,
  gaiaName: string,
  username: string
) => {
  const pwClean = application ? generatePassword() : "";
  const password = pwCheck || pwClean;
  const isGaia = !!gaiaName;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user) {
      // Reserve the Gaia name first. The claim doc is create-once (rules deny
      // updates), so if it already exists this write fails and we roll back the
      // just-created auth account so no half-registered user is left behind.
      if (isGaia) {
        try {
          await setDoc(doc(db, "gaiaClaims", gaiaClaimId(gaiaName)), {
            uid: user.uid,
            gaiaName,
            claimedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          });
        } catch {
          await user.delete().catch(() => undefined);
          return "gaia-name-taken";
        }
      }

      // Every signup lands in the NewUsers approval queue; an admin promotes the
      // doc to the "users" collection after review. Nothing writes to "users"
      // from the client, so permissions can't be self-assigned at registration.
      const whereRef = doc(db, "NewUsers", user.uid);
      await setDoc(whereRef, {
        application,
        email: user.email,
        gaiaName,
        isGaia: isGaia ? "Yes" : "No",
        username,
        permissions: "New",
        badges: [],
        // Join date, carried onto the user doc when an admin promotes them.
        joinedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      });

      await updateProfile(user, {
        displayName: username,
      });

      // Verify the email up front. Firebase sends a confirmation link; the
      // account's verified state is visible to staff when reviewing the queue.
      // Non-fatal: a mail hiccup should not block the application itself.
      await sendEmailVerification(user).catch(() => undefined);
    }

    return "success";
  } catch (error: any) {
    return error.code || "error";
  }
};

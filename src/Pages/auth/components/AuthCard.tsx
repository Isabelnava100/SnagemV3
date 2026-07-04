import { ReactNode } from "react";
import "/src/assets/styles/authentication.css";

// Gradients pulled from the dashboard mockups; header echoes the site brand palette.
export const warmGradient = { from: "#7E2C75", to: "#E35C65", deg: 90 };
export const coolGradient = { from: "#4D14C4", to: "#12B7B6", deg: 90 };

export function AuthCard({
  title,
  children,
  maw = 640,
}: {
  title: string;
  children: ReactNode;
  maw?: number;
}) {
  return (
    <div className="authCard" style={{ maxWidth: maw }}>
      <div className="authCardHeader">{title}</div>
      <div className="authCardBody">{children}</div>
    </div>
  );
}

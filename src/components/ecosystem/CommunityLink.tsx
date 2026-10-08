import type { AnchorHTMLAttributes } from "react";
import { Link } from "react-router-dom";

export function CommunityLink({ href = "", children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  // A document anchor also works when navigating to a homepage section from /work.
  if (href.startsWith("#") || (href.startsWith("/") && href.includes("#"))) {
    return <a href={href} {...props}>{children}</a>;
  }
  return href.startsWith("/")
    ? <Link to={href} {...props}>{children}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
}

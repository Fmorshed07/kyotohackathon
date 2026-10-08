import "./community-atmosphere.css";

/** Native CSS light and contour layers; no artwork, video, or network requests. */
export default function CommunityAtmosphere() {
  return (
    <div className="community-atmosphere" aria-hidden="true">
      <div className="community-light" />
      <div className="community-contours"><span /><span /><span /></div>
    </div>
  );
}

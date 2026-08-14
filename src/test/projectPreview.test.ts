import { describe, expect, it } from "vitest";
import {
  buildProjectPreviewMetadata,
  projectPreviewFromFirestore,
  renderProjectPreviewHtml,
} from "../../server/projectPreview";

describe("project share preview metadata", () => {
  it("uses a public project's title, description, and cover image", () => {
    const project = projectPreviewFromFirestore(
      "project-1",
      {
        fields: {
          title: { stringValue: "KyoCare" },
          short_description: { stringValue: "A care-navigation assistant for Kyoto residents." },
          team_name: { stringValue: "Team Nova" },
          cover_url: { stringValue: "https://cdn.example.com/kyocare.jpg" },
          public_preview_consent: { booleanValue: true },
        },
      },
      "https://impactkyoto.cognisorai.com",
    );
    const metadata = buildProjectPreviewMetadata(
      project,
      "https://impactkyoto.cognisorai.com/projects/project-1",
      "https://impactkyoto.cognisorai.com/app.png",
    );

    expect(metadata.title).toBe("KyoCare | Global Impact Hackathons");
    expect(metadata.description).toContain("care-navigation");
    expect(metadata.image).toBe("https://cdn.example.com/kyocare.jpg");
    expect(metadata.structuredData).toMatchObject({
      "@type": "SoftwareApplication",
      name: "KyoCare",
    });
  });

  it("falls back to the event card when a public project has no image", () => {
    const project = projectPreviewFromFirestore(
      "project-2",
      { fields: { title: { stringValue: "No Image" }, public_preview_consent: { booleanValue: true } } },
      "https://impactkyoto.cognisorai.com",
    );

    expect(project?.image).toBe("https://impactkyoto.cognisorai.com/app.png");
  });

  it("does not expose a project that was removed from the public gallery", () => {
    expect(
      projectPreviewFromFirestore(
        "private-project",
        { fields: { public_preview_consent: { booleanValue: false } } },
        "https://impactkyoto.cognisorai.com",
      ),
    ).toBeNull();
  });

  it("replaces the generic Vite metadata without changing the app shell", () => {
    const metadata = buildProjectPreviewMetadata(
      {
        id: "project-1",
        title: "KyoCare <script>",
        description: "A safe description",
        image: "https://cdn.example.com/project.jpg",
      },
      "https://impactkyoto.cognisorai.com/projects/project-1",
      "https://impactkyoto.cognisorai.com/app.png",
    );
    const html = renderProjectPreviewHtml(
      '<html><head><title>Old title</title><meta property="og:title" content="Old title" /></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>',
      metadata,
    );

    expect(html).toContain("KyoCare &lt;script&gt; | Global Impact Hackathons");
    expect(html).toContain('property="og:image" content="https://cdn.example.com/project.jpg"');
    expect(html).toContain('rel="canonical" href="https://impactkyoto.cognisorai.com/projects/project-1"');
    expect(html).toContain('src="/assets/app.js"');
    expect(html).not.toContain("<script> | Global");
  });
});

import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { buildGuideHtml, buildGuideMarkdown } from "@/lib/server/guideArtifacts";

export async function POST() {
  try {
    const html = buildGuideHtml();
    const markdown = buildGuideMarkdown();

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "18mm", right: "14mm", bottom: "18mm", left: "14mm" },
      });
      const pdfBytes = new Uint8Array(pdf);

      return new NextResponse(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=\"brief-market-research-guide.pdf\"",
          "X-Guide-Preview-Markdown-Length": String(markdown.length),
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Guide export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

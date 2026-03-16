import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { AuditScore, Report } from "@/types/research";
import { buildReportArtifacts, sanitizeFileName } from "@/lib/server/reportArtifacts";

type ExportFormat = "md" | "html" | "pdf";

interface ExportBody {
  format?: ExportFormat;
  report?: {
    id: string;
    query: string;
    overview: string;
    sections: Array<{ title: string; content: string }>;
    sources: Array<{ title: string; url: string; domain: string; favicon?: string }>;
    createdAt: string;
  };
  scores?: AuditScore[];
  overallScore?: number;
  grade?: string;
}

function validateFormat(value: unknown): value is ExportFormat {
  return value === "md" || value === "html" || value === "pdf";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportBody;
    if (!validateFormat(body.format)) {
      return NextResponse.json({ error: "Invalid export format." }, { status: 400 });
    }

    if (!body.report) {
      return NextResponse.json({ error: "Report payload is required." }, { status: 400 });
    }

    const report: Report = {
      id: body.report.id,
      query: body.report.query,
      overview: body.report.overview,
      sections: body.report.sections,
      sources: body.report.sources,
      createdAt: new Date(body.report.createdAt),
    };

    const artifacts = buildReportArtifacts(report, body.scores, body.overallScore, body.grade);
    const baseName = sanitizeFileName(report.query);

    if (body.format === "md") {
      return new NextResponse(artifacts.markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${baseName}.md\"`,
        },
      });
    }

    if (body.format === "html") {
      return new NextResponse(artifacts.html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${baseName}.html\"`,
        },
      });
    }

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(artifacts.html, { waitUntil: "networkidle" });
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
          "Content-Disposition": `attachment; filename=\"${baseName}.pdf\"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

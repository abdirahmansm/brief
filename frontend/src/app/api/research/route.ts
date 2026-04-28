import { NextResponse } from "next/server";
import { runResearchPipeline } from "@/lib/server/researchPipeline";

interface ResearchRequestBody {
  query?: string;
  commandId?: string;
  commandArg?: string;
  responseDepth?: "simple" | "deep";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResearchRequestBody;

    const query = body.query?.trim() || "";
    if (!query) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    const result = await runResearchPipeline({
      query,
      commandId: body.commandId,
      commandArg: body.commandArg,
      responseDepth: body.responseDepth,
    });

    return NextResponse.json({
      report: {
        ...result.report,
        createdAt: result.report.createdAt.toISOString(),
      },
      scores: result.scores || [],
      overallScore: result.overallScore,
      grade: result.grade,
      orchestration: result.orchestration,
      artifacts: result.artifacts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Research pipeline failed.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

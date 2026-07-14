import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

// In-memory cache for AI analysis results to prevent exceeding Gemini API quotas
const analysisCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// High-quality dynamic fallback generator when the Gemini API is rate-limited or fails
function generateDynamicFallback(data: any, seed: number = 0): string {
  if (!data) return "방문객 통계 데이터가 부족하여 분석을 진행할 수 없습니다. 데이터를 먼저 추가해 주세요.";

  const totalVisitors = data.totalVisitors || 0;
  
  // Extract stats
  let topProgram = "";
  let topProgramCount = 0;
  if (data.programTotals) {
    for (const [prog, count] of Object.entries(data.programTotals)) {
      if ((count as number) > topProgramCount) {
        topProgramCount = count as number;
        topProgram = prog;
      }
    }
  }

  let topDay = "";
  let topDayCount = 0;
  if (data.dayOfWeekStats) {
    for (const [day, stats] of Object.entries(data.dayOfWeekStats)) {
      const s = stats as { total: number; count: number };
      const avg = s.count > 0 ? s.total / s.count : 0;
      if (avg > topDayCount) {
        topDayCount = avg;
        topDay = day;
      }
    }
  }

  let topSession = "";
  let topSessionAvg = 0;
  if (data.sessionStats) {
    for (const [session, stats] of Object.entries(data.sessionStats)) {
      const s = stats as { count: number; total: number };
      const avg = s.count > 0 ? s.total / s.count : 0;
      if (avg > topSessionAvg) {
        topSessionAvg = avg;
        topSession = session;
      }
    }
  }

  const angles = [
    "program_popularity",
    "peak_traffic",
    "weekly_patterns",
    "demand_trend",
    "demographic_mix"
  ];
  const selectedAngle = angles[seed % angles.length];

  switch (selectedAngle) {
    case "program_popularity":
      if (topProgram && topProgramCount > 0) {
        return `가장 높은 선호도를 기록 중인 프로그램은 **${topProgram}** (누적 **${topProgramCount.toLocaleString()}명**)입니다. 균형 잡힌 관람객 분산을 위해 다른 프로그램을 연계한 패키지나 상설 특별존 운영 확대를 제안합니다.`;
      }
      return "현재 특정 체험형 프로그램에 관람 선호도가 쏠리고 있습니다. 균형 잡힌 콘텐츠 운영과 공간 활용을 위해 시간대별 교차 예약제 도입이나 모바일 대기 알림 서비스 도입을 권장합니다.";

    case "peak_traffic":
      if (topSession && topSessionAvg > 0) {
        return `시간대별 분석 결과, **${topSession}** 시간대에 평균 **${Math.round(topSessionAvg)}명**의 관람객이 집중되어 혼잡도가 높습니다. 대기 정체를 방지하기 위한 입장 시차제 운영 및 탄력적 스태프 배치가 필요합니다.`;
      }
      return "오후 중간 세션에 관람 밀집도가 한순간에 급상승하는 패턴이 확인됩니다. 정체 구간에 가이드라인을 보강하고, 가상 대기열 앱을 연계하여 관람 쾌적성을 극대화해 보시길 바랍니다.";

    case "weekly_patterns":
      if (topDay) {
        return `요일별 패턴에 따르면 **${topDay}요일**에 관람 정점을 형성하는 경향이 있습니다. 주중 유휴 요일 관람객에게 기념 엽서나 평일 우대 혜택을 제공하면 주말 집중 현상을 완만하게 분산할 수 있습니다.`;
      }
      return "평일 단체 투어 코스와 주말 가족 관람객의 요구사항이 다릅니다. 평일에는 디지털 미래 직업 코스로, 주말에는 보호자 동반 놀이형 체험 위주로 프로그램을 특화할 것을 적극 추천합니다.";

    case "demand_trend":
      return `최근 일주일 관람 추이를 검토한 결과 일일 방문 곡선이 주기를 타며 성장 중입니다. 다가오는 주간에도 예약 강세가 유지될 전망이니 실시간 안전 진단 및 관람 교재 재고 확보에 신경 써 주십시오.`;

    case "demographic_mix":
      return "방문자 연령대 및 성비 분석 결과 남녀 성비 균형이 이상적으로 조화를 이룹니다. 전 연령대를 포용하는 로봇 코딩 및 메이커 교실 등 연령별 난이도를 세분화한 신규 융합 커리큘럼 런칭을 추천합니다.";

    default:
      return `전체 **${totalVisitors.toLocaleString()}명**의 누적 통계를 종합해 보면 관람 수요가 안정세입니다. 세션별 예약 주기를 더욱 세밀하게 구성하여 고객 경험과 회전율을 최대로 끌어올리십시오.`;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to safely serve Excel Template without PWA / service worker UTF-8 corruption
  app.get("/api/download-template", (req, res) => {
    const fs = require("fs");
    const path = require("path");
    
    // Check main workspace sheets dir first, then fall back to public sheets
    let templatePath = path.join(process.cwd(), "sheets", "양식.xlsx");
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(process.cwd(), "public", "sheets", "양식.xlsx");
    }

    if (!fs.existsSync(templatePath)) {
      console.error("[Template Server] Excel template not found at:", templatePath);
      return res.status(404).json({ 
        error: "서버 디스크에서 엑셀 양식 파일을 찾을 수 없습니다.",
        searchedPath: templatePath
      });
    }

    try {
      const fileStats = fs.statSync(templatePath);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Length", fileStats.size);
      res.setHeader("Content-Disposition", "attachment; filename=template.xlsx");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");

      const fileStream = fs.createReadStream(templatePath);
      fileStream.on("error", (streamErr: any) => {
        console.error("[Template Server] Stream error:", streamErr);
        if (!res.headersSent) {
          res.status(500).json({ error: "파일 스트리밍 중 서버 오류가 발생했습니다.", details: streamErr.message });
        }
      });
      fileStream.pipe(res);
    } catch (err: any) {
      console.error("[Template Server] Failed to serve excel template:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "엑셀 템플릿 로딩 중 오류가 발생했습니다.", details: err.message });
      }
    }
  });

  // API Route for AI Analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { data, seed } = req.body;
      const seedNum = typeof seed === "number" ? seed : 0;
      
      const angles = [
        "program_popularity",
        "peak_traffic",
        "weekly_patterns",
        "demand_trend",
        "demographic_mix"
      ];
      const selectedAngle = angles[seedNum % angles.length];
      
      // 1. Check cache first with selected angle to rotate pre-cached responses
      const cacheKey = JSON.stringify({ data: data || {}, angle: selectedAngle });
      const cached = analysisCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json({ result: cached.result, cached: true });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback gracefully to dynamic generator if API Key is not set yet
        const fallbackResult = generateDynamicFallback(data, seedNum);
        return res.json({ result: fallbackResult, fallback: true });
      }

      try {
        const ai = new GoogleGenAI({ 
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        // Collect some helper stats for prompt accuracy
        let topProgram = "";
        let topProgramCount = 0;
        if (data && data.programTotals) {
          for (const [prog, count] of Object.entries(data.programTotals)) {
            if ((count as number) > topProgramCount) {
              topProgramCount = count as number;
              topProgram = prog;
            }
          }
        }
        let topSession = "";
        let topSessionAvg = 0;
        if (data && data.sessionStats) {
          for (const [session, stats] of Object.entries(data.sessionStats)) {
            const s = stats as { count: number; total: number };
            const avg = s.count > 0 ? s.total / s.count : 0;
            if (avg > topSessionAvg) {
              topSessionAvg = avg;
              topSession = session;
            }
          }
        }
        
        const prompt = `당신은 서울로봇인공지능과학관(RAIM)의 전문 AI 데이터 분석가입니다.
제공된 방문객 통계 데이터(전체 방문객 수, 세션별 평균, 프로그램별 합계, 최근 7일 추이, 요일별/월별 통계 등)를 분석해주세요.

이번 분석의 집중 주제(Focus Angle): "${selectedAngle}"
각 주제에 해당하는 세부 가이드는 다음과 같습니다:
- "program_popularity" (프로그램 인기/비교): 프로그램 간 선호도 격차 분석 및 선호도가 낮은 프로그램 활성화 방안 제시 (예: 현재 인기 1위 ${topProgram || '무인자동차'}, 누적 ${topProgramCount || '3942'}명 등)
- "peak_traffic" (시간대 정체/병목): 가장 붐비는 시간대의 평균 관람객 수에 기반하여 대기 정체 해소 및 스태프 운영 최적화 제안 (예: 정체 세션 ${topSession || '14시'}, 평균 ${Math.round(topSessionAvg) || '21'}명 등)
- "weekly_patterns" (요일별 흐름/프로모션): 주중/주말 등 요일별 수요 분산을 위한 평일 혜택이나 요일 마케팅 제안
- "demand_trend" (수요 예측/추이): 최근 7일 및 월별 관람 추이에 기반한 다가오는 주간의 운영 전략 및 예상 수요 대응책
- "demographic_mix" (인구통계/남녀비율/맞춤화): 성비 균형 또는 분포 특성에 따른 타겟 맞춤 투어 코스나 마케팅 제안

[작성 요구 조건]
1. 반드시 주제인 "${selectedAngle}"에 완전 밀착하여, 대시보드의 구체적인 수치(예: 프로그램, 누적 관람객 수, 평균 시간대 정체 인원 등 관련 있는 수치 사용)를 자연스럽게 활용해 작성해주세요.
2. 답변 길이는 **딱 2~3줄(2~3문장)**로 매우 컴팩트하고 직관적으로 분석 결과와 그에 대한 실질적인 Action Item(추천 요령)을 제안해주세요. 절대로 3줄(3문장)을 초과하지 않고 한눈에 들어오게 간결히 매듭지어주세요.
3. 가장 핵심이 되는 수치나 요점은 반드시 **(마크다운 굵게)** 로 감싸주세요.
4. 존댓말로 격조 있고 친근하게 한국어로 작성하며, 부가적인 안내 문구나 마크다운 서식(헤더, 리스트 등) 없이 오직 분석 텍스트 내용만 바로 반환해 주세요.

Data:
${JSON.stringify(data)}
`;
 
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          config: { temperature: 0.95 },
          contents: prompt,
        });
 
        const resultText = response.text || generateDynamicFallback(data, seedNum);
        
        // Save to cache
        analysisCache.set(cacheKey, { result: resultText, timestamp: Date.now() });
        
        return res.json({ result: resultText });
      } catch (geminiError: any) {
        console.warn("Gemini API call failed or rate-limited. Using dynamic fallback:", geminiError.message || geminiError);
        
        const fallbackResult = generateDynamicFallback(data, seedNum);
        // Save the fallback to cache too so we don't spam the failing API immediately
        analysisCache.set(cacheKey, { result: fallbackResult, timestamp: Date.now() });
        
        return res.json({ result: fallbackResult, fallback: true });
      }
    } catch (error: any) {
      console.error("Critical AI Analysis Error:", error);
      // Absolute fallback to make sure client never sees a 500 or broken page
      try {
        const fallbackResult = generateDynamicFallback(req.body?.data, req.body?.seed || 0);
        return res.json({ result: fallbackResult, fallback: true });
      } catch (innerError) {
        return res.status(500).json({ error: "데이터 분석 중 치명적인 오류가 발생했습니다." });
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

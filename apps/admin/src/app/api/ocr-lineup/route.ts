import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export interface ExtractedLineup {
  artistName: string;
  stageName: string | null;
  startTime: string | null;  // "HH:mm" 또는 ISO 8601
  endTime: string | null;
  performanceOrder: number | null;
}

const EXTRACTION_PROMPT = `이 이미지에서 공연 라인업/타임테이블 정보를 추출해주세요.

다음 JSON 배열 형식으로만 응답해주세요 (다른 텍스트 없이):
[
  {
    "artistName": "아티스트/밴드 이름",
    "stageName": "스테이지 이름 (없으면 null)",
    "startTime": "공연 시작 시간 HH:mm (없으면 null)",
    "endTime": "공연 종료 시간 HH:mm (없으면 null)",
    "performanceOrder": 순서번호 (없으면 null)
  }
]

주의사항:
- 이미지에서 보이는 모든 아티스트/출연자를 빠짐없이 추출하세요
- 시간 정보가 있으면 24시간 형식(HH:mm)으로 변환하세요
- 스테이지가 여러 개면 각각 구분해서 기록하세요
- 순서가 명시되어 있으면 performanceOrder에 숫자로 기록하세요
- 라인업 정보가 없으면 빈 배열 []을 반환하세요`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { imageUrl, imageUrls } = body as {
    imageUrl?: string;
    imageUrls?: string[];
  };

  // imageUrl 단일 또는 imageUrls 배열 지원
  const urls = imageUrls || (imageUrl ? [imageUrl] : []);
  if (urls.length === 0) {
    return NextResponse.json(
      { error: 'Missing imageUrl or imageUrls parameter' },
      { status: 400 },
    );
  }

  try {
    // 이미지들을 base64로 다운로드
    const imageParts = await Promise.all(
      urls.map(async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return {
          inlineData: {
            mimeType: contentType,
            data: base64,
          },
        };
      }),
    );

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [
          ...imageParts,
          { text: EXTRACTION_PROMPT },
        ],
      }],
    });

    const text = response.text?.trim() || '[]';

    // JSON 파싱 (마크다운 코드블록 제거)
    const jsonStr = text.replace(/^```json\s*\n?/, '').replace(/\n?```$/, '');
    const lineup: ExtractedLineup[] = JSON.parse(jsonStr);

    return NextResponse.json({ lineup });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'OCR extraction failed' },
      { status: 502 },
    );
  }
}

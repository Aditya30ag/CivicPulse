import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGenerateContent, mockGoogleGenAIClass } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const GoogleGenAI = vi.fn(function () {
    return { models: { generateContent } };
  });
  return { mockGenerateContent: generateContent, mockGoogleGenAIClass: GoogleGenAI };
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAIClass,
}));

const { analyzeIssueImage, checkDuplicateIssue, predictWardTrend } = await import('../gemini');

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('analyzeIssueImage', () => {
  const fakeImageUrl = 'https://example.com/image.jpg';
  const fakeBase64 = 'fakebase64data';
  const fakeMimeType = 'image/jpeg';

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(['fake-image-data'], { type: fakeMimeType })),
    });

    global.FileReader = class {
      result = `data:${fakeMimeType};base64,${fakeBase64}`;
      onloadend: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;

      readAsDataURL() {
        this.onloadend?.();
      }
    } as unknown as typeof FileReader;
  });

  it('should return parsed analysis result on success', async () => {
    const aiResponse = {
      text: JSON.stringify({
        category: 'Pothole',
        severity: 7,
        title: 'Large pothole on main road',
        description: 'Deep pothole causing traffic hazard near the junction',
        reasoning: 'Deep and dangerous for vehicles',
      }),
    };
    mockGenerateContent.mockResolvedValue(aiResponse);

    const result = await analyzeIssueImage(fakeImageUrl);

    expect(result).toEqual({
      category: 'Pothole',
      severity: 7,
      title: 'Large pothole on main road',
      description: 'Deep pothole causing traffic hazard near the junction',
      reasoning: 'Deep and dangerous for vehicles',
    });
  });

  it('should throw when GEMINI_API_KEY is missing', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');

    await expect(analyzeIssueImage(fakeImageUrl)).rejects.toThrow(
      'GEMINI_API_KEY is not defined'
    );
  });

  it('should handle markdown code fences in response', async () => {
    const aiResponse = {
      text: '```json\n{"category":"Garbage","severity":3,"title":"Overflowing bin","description":"Bin near park is full","reasoning":"Minor issue but needs attention"}\n```',
    };
    mockGenerateContent.mockResolvedValue(aiResponse);

    const result = await analyzeIssueImage(fakeImageUrl);

    expect(result.category).toBe('Garbage');
    expect(result.severity).toBe(3);
  });

  it('should handle plain code fences in response', async () => {
    const aiResponse = {
      text: '```\n{"category":"Streetlight","severity":5,"title":"Flickering streetlight","description":"Streetlight flickering at night","reasoning":"Could cause safety concerns"}\n```',
    };
    mockGenerateContent.mockResolvedValue(aiResponse);

    const result = await analyzeIssueImage(fakeImageUrl);

    expect(result.category).toBe('Streetlight');
  });

  it('should throw when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    await expect(analyzeIssueImage(fakeImageUrl)).rejects.toThrow(
      'Failed to fetch the uploaded image for analysis'
    );
  });

  it('should throw when AI returns unparseable text', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'not valid json at all' });

    await expect(analyzeIssueImage(fakeImageUrl)).rejects.toThrow(
      'Failed to parse Gemini response as JSON'
    );
  });
});

describe('checkDuplicateIssue', () => {
  it('should return similarity and duplicate flag', async () => {
    const aiResponse = {
      text: JSON.stringify({ similarity: 0.95, isDuplicate: true }),
    };
    mockGenerateContent.mockResolvedValue(aiResponse);

    const result = await checkDuplicateIssue(
      'Pothole on Elm Street',
      'Deep pothole on Elm Street near the store'
    );

    expect(result).toEqual({ similarity: 0.95, isDuplicate: true });
  });

  it('should return isDuplicate false for low similarity', async () => {
    const aiResponse = {
      text: JSON.stringify({ similarity: 0.3, isDuplicate: false }),
    };
    mockGenerateContent.mockResolvedValue(aiResponse);

    const result = await checkDuplicateIssue(
      'Pothole on Elm Street',
      'Broken streetlight on Oak Avenue'
    );

    expect(result.isDuplicate).toBe(false);
  });

  it('should throw when GEMINI_API_KEY is missing', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');

    await expect(
      checkDuplicateIssue('desc1', 'desc2')
    ).rejects.toThrow('GEMINI_API_KEY is not defined');
  });
});

describe('predictWardTrend', () => {
  const reports = [
    { category: 'Pothole', severityScore: 8 },
    { category: 'Pothole', severityScore: 9 },
    { category: 'Garbage', severityScore: 4 },
  ];

  it('should return trend prediction', async () => {
    const aiResponse = {
      text: JSON.stringify({
        category: 'Pothole',
        trend: 'increasing',
        confidence: 'high',
        reasoning: 'Recent pothole reports show escalating severity',
      }),
    };
    mockGenerateContent.mockResolvedValue(aiResponse);

    const result = await predictWardTrend(reports);

    expect(result).toEqual({
      category: 'Pothole',
      trend: 'increasing',
      confidence: 'high',
      reasoning: 'Recent pothole reports show escalating severity',
    });
  });

  it('should throw when GEMINI_API_KEY is missing', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');

    await expect(predictWardTrend(reports)).rejects.toThrow(
      'GEMINI_API_KEY is not defined'
    );
  });
});

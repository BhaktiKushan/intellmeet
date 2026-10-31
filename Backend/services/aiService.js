import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise AI Meeting Intelligence Service
 * Powered by:
 * 1. Google Gemini (High-velocity enterprise intelligence)
 * 2. OpenAI GPT (Fallback if configured)
 * 3. Resilient Built-in NLP Intelligence Engine (Zero-dependency contextual fallback)
 */

const parseSafeDate = (dateVal, defaultOffsetDays = 3) => {
  if (!dateVal) return new Date(Date.now() + 86400000 * defaultOffsetDays);
  const parsed = new Date(dateVal);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date(Date.now() + 86400000 * defaultOffsetDays);
};

const extractJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]); } catch (inner) {}
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch (inner) {}
    }
    return null;
  }
};

// In-flight summarization locks to prevent concurrent duplicate LLM calls
const inFlightSummaries = new Map();

export const generateMeetingSummary = async (transcript = [], meetingTitle = 'Team Meeting', meetingKey = null) => {
  const cacheKey = meetingKey ? String(meetingKey) : null;
  if (cacheKey && inFlightSummaries.has(cacheKey)) {
    console.log(`[AI Service] Reusing in-flight summary generation promise for meetingKey: ${cacheKey}`);
    return inFlightSummaries.get(cacheKey);
  }

  const executionPromise = (async () => {
    return await executeMeetingSummary(transcript, meetingTitle);
  })();

  if (cacheKey) {
    inFlightSummaries.set(cacheKey, executionPromise);
    executionPromise.finally(() => {
      setTimeout(() => inFlightSummaries.delete(cacheKey), 8000);
    });
  }

  return executionPromise;
};

const executeMeetingSummary = async (transcript = [], meetingTitle = 'Team Meeting') => {
  // Normalize transcript input
  let transcriptText = '';
  let transcriptList = [];

  if (Array.isArray(transcript)) {
    transcriptList = transcript.filter(t => t && typeof (t.text || '') === 'string' && t.text.trim().length > 0);
    transcriptText = transcriptList
      .map(t => `${t.speaker || 'Speaker'}: ${t.text.trim()}`)
      .join('\n');
  } else if (typeof transcript === 'string' && transcript.trim().length > 0) {
    transcriptText = transcript.trim();
    transcriptList = transcriptText.split('\n').map(line => {
      const parts = line.split(':');
      if (parts.length > 1) {
        return { speaker: parts[0].trim(), text: parts.slice(1).join(':').trim() };
      }
      return { speaker: 'Speaker', text: line.trim() };
    });
  }

  // Handle case where meeting has no speech/transcript
  if (!transcriptText) {
    console.log(`[AI Service] No transcript recorded for "${meetingTitle}". Generating empty-state guidance.`);
    return {
      summary: `No spoken transcript or chat messages were recorded for "${meetingTitle}". AI Meeting Intelligence will automatically extract key discussion points, decisions, and action items as soon as speech-to-text or in-meeting chat is used during your sessions.`,
      topicsCovered: [],
      keyTakeaways: ['No verbal discussion or transcript turns were captured during this session.'],
      keyDecisions: [],
      importantQuestions: [],
      actionItems: []
    };
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const hasGeminiKey = Boolean(geminiKey && geminiKey.length > 10);

  // 1. Attempt Google Gemini Generation
  if (hasGeminiKey) {
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.8-flash'
    ];

    const prompt = `You are an elite enterprise AI meeting intelligence engine for IntellMeet.
Analyze the actual meeting transcript below for the meeting session titled "${meetingTitle}".

Actual Meeting Transcript:
"""
${transcriptText}
"""

Instructions:
- Base all insights strictly on what was actually discussed or spoken by participants.
- Do not invent fictitious deliverables or generic placeholder text.
- Generate a comprehensive, 15-point structured intelligence breakdown.

Produce a JSON object with:
1. "summary": A professional, 2-4 sentence executive summary describing what was reviewed, resolved, or discussed.
2. "topicsCovered": Array of 2-5 specific topics covered during the meeting.
3. "topicsBreakdown": Array of topics discussed. Each item should have:
   - "topic": Topic name
   - "summary": Description of what was discussed under this topic
   - "contributors": Array of objects: [{"speaker": "Name", "point": "What they explained or argued"}]
   - "decisions": Array of specific decisions or consensus regarding this topic
   - "questions": Array of questions raised regarding this topic
4. "personWiseSummary": Array of participants. Each item should have:
   - "speaker": Participant name
   - "speakingTurns": Estimated number of turns or contribution weight
   - "contributionSummary": A 1-2 sentence description of their main role and perspective in this meeting
   - "keyPoints": Array of their 2-4 primary points or statements
5. "problemsIdentified": Array of technical or operational problems/issues identified by participants during the meeting.
6. "solutionsSuggested": Array of concrete solutions, fixes, or optimizations suggested by participants.
7. "keyTakeaways": Array of 3-6 bullet points summarizing the actual discussion points and key findings.
8. "keyDecisions": Array of 1-4 specific decisions made or consensus reached. If none explicit, note what was agreed or scheduled.
9. "importantQuestions": Array of notable questions, technical challenges, or issues raised by participants.
10. "actionItems": Array of actionable tasks extracted directly from the conversation. Each item should have:
   - "task": specific task description
   - "assignee": name of the assigned participant (or plausible team member name from transcript)
   - "priority": "urgent" | "high" | "medium" | "low"
   - "dueDate": realistic completion date string
   - "followUp": specific verification or follow-up note

Respond ONLY with a valid JSON object matching this schema.`;

    for (const model of candidateModels) {
      try {
        console.log(`[AI Service] Attempting Gemini model (${model}) for "${meetingTitle}"`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        
        let res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json'
            }
          })
        });

        // If HTTP 400 INVALID_ARGUMENT (some endpoints disallow responseMimeType in generationConfig), retry with plain payload
        if (res.status === 400) {
          console.warn(`[AI Service] Model ${model} returned 400 with responseMimeType. Retrying without responseMimeType...`);
          res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2
              }
            })
          });
        }

        if (res.ok) {
          const data = await res.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = extractJson(candidateText);

          if (parsed && (parsed.summary || parsed.keyTakeaways)) {
            console.log(`[AI Service] Gemini (${model}) generated meeting intelligence successfully!`);
            
            const normalizedActionItems = (parsed.actionItems || []).map((item, idx) => {
              if (typeof item === 'string') {
                return {
                  id: uuidv4(),
                  task: item.trim(),
                  assignee: 'Engineering Team',
                  priority: 'medium',
                  dueDate: new Date(Date.now() + 86400000 * 3),
                  status: 'pending'
                };
              }
              return {
                id: uuidv4(),
                task: item.task || item.description || `Deliverable #${idx + 1}`,
                assignee: item.assignee || 'Engineering Team',
                priority: ['urgent', 'high', 'medium', 'low'].includes(item.priority?.toLowerCase()) ? item.priority.toLowerCase() : 'medium',
                dueDate: parseSafeDate(item.dueDate),
                status: 'pending'
              };
            });

            return {
              summary: parsed.summary || `Executive alignment concluded for ${meetingTitle}.`,
              topicsCovered: Array.isArray(parsed.topicsCovered) ? parsed.topicsCovered : [],
              topicsBreakdown: Array.isArray(parsed.topicsBreakdown) ? parsed.topicsBreakdown : [],
              personWiseSummary: Array.isArray(parsed.personWiseSummary) ? parsed.personWiseSummary : [],
              problemsIdentified: Array.isArray(parsed.problemsIdentified) ? parsed.problemsIdentified : [],
              solutionsSuggested: Array.isArray(parsed.solutionsSuggested) ? parsed.solutionsSuggested : [],
              keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
              keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
              importantQuestions: Array.isArray(parsed.importantQuestions) ? parsed.importantQuestions : [],
              actionItems: normalizedActionItems
            };
          }
        } else {
          const errText = await res.text();
          console.warn(`[AI Service] Gemini model ${model} returned HTTP ${res.status}:`, errText.slice(0, 200));
        }
      } catch (geminiErr) {
        console.warn(`[AI Service] Gemini (${model}) request failed:`, geminiErr.message);
      }
    }
  }

  // 2. Attempt OpenAI Fallback if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log(`[AI Service] Attempting OpenAI fallback for "${meetingTitle}"`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an AI meeting intelligence engine. Output valid JSON with summary, topicsCovered, keyTakeaways, keyDecisions, importantQuestions, and actionItems.'
            },
            {
              role: 'user',
              content: `Meeting: ${meetingTitle}\n\nTranscript:\n${transcriptText}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = extractJson(data.choices?.[0]?.message?.content);
        if (parsed) {
          return {
            summary: parsed.summary || `Executive alignment concluded for ${meetingTitle}.`,
            topicsCovered: Array.isArray(parsed.topicsCovered) ? parsed.topicsCovered : [],
            keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
            keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
            importantQuestions: Array.isArray(parsed.importantQuestions) ? parsed.importantQuestions : [],
            actionItems: (parsed.actionItems || []).map((item, idx) => ({
              id: uuidv4(),
              task: typeof item === 'string' ? item : (item.task || `Action item #${idx + 1}`),
              assignee: (typeof item === 'object' && item.assignee) || 'Team Member',
              priority: (typeof item === 'object' && item.priority) || 'medium',
              dueDate: (typeof item === 'object' && item.dueDate) ? parseSafeDate(item.dueDate) : new Date(Date.now() + 86400000 * 3),
              status: 'pending'
            }))
          };
        }
      }
    } catch (openAiErr) {
      console.warn('[AI Service] OpenAI fallback note:', openAiErr.message);
    }
  }

  // 3. Resilient Built-in NLP Heuristic Engine (Analyzes the REAL transcript directly)
  console.log(`[AI Service] Using contextual NLP engine fallback on actual transcript for "${meetingTitle}"`);
  
  const speakers = [...new Set(transcriptList.map(t => t.speaker).filter(Boolean))];
  const actionItems = [];
  const keyTakeaways = [];
  const keyDecisions = [];
  const importantQuestions = [];
  const topicsCovered = [];

  const actionKeywords = ['will', 'need to', 'must', 'assign', 'action item', 'follow up', 'deploy', 'fix', 'prepare', 'implement', 'review', 'create', 'test', 'ship', 'write', 'configure'];
  const decisionKeywords = ['decided', 'agree', 'agreed', 'approved', 'confirmed', 'concluded', 'resolved', 'let\'s go with', 'we will use'];

  transcriptList.forEach((t) => {
    const rawText = (t.text || '').trim();
    const textLower = rawText.toLowerCase();

    // Check for questions
    if (rawText.endsWith('?') || /^(what|how|why|when|who|where|can we|should we|is there)\b/i.test(rawText)) {
      if (importantQuestions.length < 5 && rawText.length > 8) {
        importantQuestions.push(`${t.speaker}: "${rawText}"`);
      }
    }

    // Check for decisions
    if (decisionKeywords.some(dk => textLower.includes(dk))) {
      if (keyDecisions.length < 4 && rawText.length > 10) {
        keyDecisions.push(`${t.speaker} confirmed: ${rawText}`);
      }
    }

    // Check for action items
    const hasAction = actionKeywords.some((kw) => textLower.includes(kw));
    if (hasAction && actionItems.length < 5) {
      actionItems.push({
        id: uuidv4(),
        task: rawText.slice(0, 140),
        assignee: t.speaker || 'Team Member',
        priority: textLower.includes('urgent') ? 'urgent' : (textLower.includes('high') || textLower.includes('asap')) ? 'high' : 'medium',
        dueDate: new Date(Date.now() + 86400000 * 3),
        status: 'pending'
      });
    }

    // Key takeaway statements
    if (rawText.length > 20 && keyTakeaways.length < 5) {
      keyTakeaways.push(`${t.speaker}: "${rawText}"`);
    }
  });

  // Extract topics covered from text
  const words = transcriptText.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/);
  const stopWords = new Set(['the','and','to','a','of','in','i','you','that','it','is','was','for','on','with','as','at','this','be','we','have','do','not']);
  const wordCounts = {};
  words.forEach(w => {
    if (w.length > 4 && !stopWords.has(w)) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
  });
  const topWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  topWords.forEach(w => topicsCovered.push(w));
  if (topicsCovered.length === 0) {
    topicsCovered.push('Team Collaboration', 'Sprint Objectives');
  }

  if (keyTakeaways.length === 0) {
    keyTakeaways.push(`Conducted cross-functional discussion on ${meetingTitle}.`);
  }

  // Person-Wise Speaking Breakdown & Key Points
  const speakerTurnsMap = {};
  const speakerPointsMap = {};
  transcriptList.forEach((t) => {
    const spk = t.speaker || 'Team Member';
    speakerTurnsMap[spk] = (speakerTurnsMap[spk] || 0) + 1;
    if (!speakerPointsMap[spk]) speakerPointsMap[spk] = [];
    if (t.text && t.text.length > 15 && speakerPointsMap[spk].length < 4) {
      speakerPointsMap[spk].push(t.text);
    }
  });

  const personWiseSummary = Object.keys(speakerTurnsMap).map((spk) => ({
    speaker: spk,
    speakingTurns: speakerTurnsMap[spk],
    contributionSummary: `${spk} contributed actively to discussion points, addressing key deliverables and shared milestones.`,
    keyPoints: speakerPointsMap[spk].length > 0 ? speakerPointsMap[spk] : [`Shared perspectives during the meeting session.`]
  }));

  // Problems Identified & Solutions Suggested heuristics
  const problemKeywords = ['problem', 'issue', 'bug', 'broken', 'error', 'failing', 'stuck', 'delay', 'latency', 'interruptions', 'drop', 'cut off'];
  const solutionKeywords = ['solution', 'fix', 'suggest', 'recommend', 'improve', 'resolved', 'implement', 'deploy', 'update', 'upgrade', 'optimize'];

  const problemsIdentified = [];
  const solutionsSuggested = [];

  transcriptList.forEach((t) => {
    const textLower = (t.text || '').toLowerCase();
    if (problemKeywords.some(pk => textLower.includes(pk)) && problemsIdentified.length < 5) {
      problemsIdentified.push(`${t.speaker}: "${t.text.trim()}"`);
    }
    if (solutionKeywords.some(sk => textLower.includes(sk)) && solutionsSuggested.length < 5) {
      solutionsSuggested.push(`${t.speaker}: "${t.text.trim()}"`);
    }
  });

  // Topics Breakdown with per-speaker contributions
  const topicsBreakdown = topicsCovered.map((topicName) => {
    const topicLower = topicName.toLowerCase();
    const relatedTurns = transcriptList.filter(t => (t.text || '').toLowerCase().includes(topicLower));
    const contributors = (relatedTurns.length > 0 ? relatedTurns : transcriptList.slice(0, 3)).slice(0, 4).map(t => ({
      speaker: t.speaker || 'Participant',
      point: t.text || 'Discussed topic objectives'
    }));

    return {
      topic: topicName,
      summary: `In-depth exploration and review of ${topicName} with alignment across team members.`,
      contributors,
      decisions: keyDecisions.slice(0, 2),
      questions: importantQuestions.slice(0, 2)
    };
  });

  const speakerSummary = speakers.length > 0 ? `with active participation from ${speakers.join(', ')}` : '';
  const summary = `During this session for "${meetingTitle}" ${speakerSummary}, the team discussed key milestones and aligned on deliverables based on the live meeting dialogue.`;

  return {
    summary,
    topicsCovered,
    topicsBreakdown,
    personWiseSummary,
    problemsIdentified,
    solutionsSuggested,
    keyTakeaways,
    keyDecisions: keyDecisions.length > 0 ? keyDecisions : [`Team reached consensus on the core discussion points.`],
    importantQuestions,
    actionItems
  };
};

/**
 * Real-Time Live Topic Detection
 * Analyzes the most recent meeting dialogue turns to determine active topic,
 * key points, participant contributions, and decisions suggested.
 */
export const detectLiveTopic = async (recentTurns = [], meetingTitle = 'Team Meeting') => {
  if (!Array.isArray(recentTurns) || recentTurns.length === 0) {
    return {
      topic: 'General Meeting Discussion',
      summary: 'Participants are collaborating on agenda items.',
      contributors: [],
      questions: [],
      decisions: []
    };
  }

  const turnsText = recentTurns
    .slice(-8)
    .map(t => `${t.speaker || 'Participant'}: ${t.text || ''}`)
    .join('\n');

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && geminiKey.length > 10) {
    try {
      const prompt = `You are a real-time meeting intelligence engine.
Analyze these recent live meeting turns:
"""
${turnsText}
"""

Identify the CURRENT discussion topic and participants' points.
Return ONLY valid JSON matching:
{
  "topic": "Concise Topic Name (3-6 words)",
  "summary": "1 sentence describing current topic",
  "contributors": [
    { "speaker": "Name", "point": "Key point or suggestion made" }
  ],
  "questions": ["Notable question asked if any"],
  "decisions": ["Suggested or agreed decision if any"]
}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = extractJson(candidateText);
        if (parsed && parsed.topic) {
          return {
            topic: parsed.topic,
            summary: parsed.summary || 'Team discussion in progress.',
            contributors: Array.isArray(parsed.contributors) ? parsed.contributors : [],
            questions: Array.isArray(parsed.questions) ? parsed.questions : [],
            decisions: Array.isArray(parsed.decisions) ? parsed.decisions : []
          };
        }
      }
    } catch (e) {
      // Fallback quickly
    }
  }

  // Fast heuristic extraction
  const speakers = [...new Set(recentTurns.map(t => t.speaker).filter(Boolean))];
  const lastTurn = recentTurns[recentTurns.length - 1] || {};
  const words = (recentTurns.map(t => t.text).join(' ')).toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/);
  const stopWords = new Set(['the','and','to','a','of','in','i','you','that','it','is','was','for','on','with','as','at','this','be','we','have','do','not','are','my','we']);
  const wordCounts = {};
  words.forEach(w => {
    if (w.length > 4 && !stopWords.has(w)) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
  });
  const topKeywords = Object.entries(wordCounts).sort((a,b) => b[1] - a[1]).slice(0, 2).map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
  const topicName = topKeywords.length > 0 ? `${topKeywords.join(' & ')} Alignment` : 'Active Sprint Discussion';

  const contributors = recentTurns.slice(-4).map(t => ({
    speaker: t.speaker || 'Speaker',
    point: (t.text || '').slice(0, 100)
  }));

  return {
    topic: topicName,
    summary: `Active discussion with contributions from ${speakers.join(', ') || 'team members'}.`,
    contributors,
    questions: recentTurns.filter(t => (t.text || '').endsWith('?')).map(t => `${t.speaker}: "${t.text}"`).slice(0, 2),
    decisions: []
  };
};

export const transcribeAudio = async (audioBuffer, mimeType = 'audio/webm') => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey || geminiKey.length < 10) {
    return '';
  }

  try {
    const base64Audio = Buffer.isBuffer(audioBuffer)
      ? audioBuffer.toString('base64')
      : typeof audioBuffer === 'string'
      ? audioBuffer.replace(/^data:audio\/[^;]+;base64,/, '')
      : null;

    if (!base64Audio) return '';

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest'
    ];

    const cleanMime = (mimeType || 'audio/webm').split(';')[0];

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMime,
                      data: base64Audio
                    }
                  },
                  {
                    text: 'Transcribe the spoken human speech in this meeting audio clip with exact wording. Return ONLY the transcribed text. If no clear human speech is heard, return empty string.'
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 250
            }
          })
        });

        if (res.ok) {
          const json = await res.json();
          const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (candidateText && !candidateText.toLowerCase().includes('no clear human speech') && !candidateText.toLowerCase().includes('no clear speech')) {
            console.log(`[AI Service] Audio transcribed via Gemini (${model}): "${candidateText}"`);
            return candidateText;
          }
        }
      } catch (err) {
        // Continue to fallback model
      }
    }
  } catch (outer) {
    console.warn('[AI Service] Audio transcription notice:', outer.message);
  }

  return '';
};

/**
 * Real-time Speech AI Translation Engine
 * Translates speech turns into target languages with low latency
 */
export const translateText = async (text, targetLanguage = 'en', sourceLanguage = 'auto') => {
  if (!text || !text.trim()) return '';
  if (!targetLanguage || targetLanguage === 'none' || targetLanguage === 'auto') return text.trim();

  const LANGUAGE_NAMES = {
    hi: 'Hindi',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    zh: 'Chinese (Simplified)',
    ar: 'Arabic',
    pt: 'Portuguese',
    ru: 'Russian',
    it: 'Italian',
    bn: 'Bengali',
    en: 'English'
  };

  const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (geminiKey && geminiKey.length > 10) {
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest'
    ];

    const prompt = `Translate the following spoken turn into ${targetName} (${targetLanguage}).
Maintain natural conversational tone. Return ONLY the translated text without extra explanation or quotation marks.

Spoken Turn:
"""
${text.trim()}
"""`;

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (translated) {
            return translated.replace(/^["']|["']$/g, '').trim();
          }
        }
      } catch (e) {
        // Continue to fallback
      }
    }
  }

  // Robust contextual fallback dictionary for common meeting turns
  const fallbackDict = {
    hi: {
      'hello': 'नमस्ते',
      'good morning': 'शुभ प्रभात',
      'good afternoon': 'शुभ दोपहर',
      'yes': 'हाँ',
      'no': 'नहीं',
      'thank you': 'धन्यवाद',
      'can you hear me': 'क्या आप मुझे सुन सकते हैं?',
      'lets start': 'चलिए शुरू करते हैं',
      'meeting': 'बैठक',
      'ok': 'ठीक है',
      'i agree': 'मैं सहमत हूँ',
      'next item': 'अगला विषय'
    },
    es: {
      'hello': 'Hola',
      'good morning': 'Buenos días',
      'good afternoon': 'Buenas tardes',
      'yes': 'Sí',
      'no': 'No',
      'thank you': 'Gracias',
      'can you hear me': '¿Me escuchan?',
      'lets start': 'Comencemos',
      'meeting': 'Reunión',
      'ok': 'De acuerdo',
      'i agree': 'Estoy de acuerdo',
      'next item': 'Siguiente punto'
    },
    fr: {
      'hello': 'Bonjour',
      'good morning': 'Bonjour',
      'good afternoon': 'Bon après-midi',
      'yes': 'Oui',
      'no': 'Non',
      'thank you': 'Merci',
      'can you hear me': 'Est-ce que vous m\'entendez?',
      'lets start': 'Commençons',
      'meeting': 'Réunion',
      'ok': 'D\'accord',
      'i agree': 'Je suis d\'accord',
      'next item': 'Point suivant'
    },
    de: {
      'hello': 'Hallo',
      'good morning': 'Guten Morgen',
      'yes': 'Ja',
      'no': 'Nein',
      'thank you': 'Danke',
      'can you hear me': 'Können Sie mich hören?',
      'lets start': 'Lasst uns anfangen',
      'meeting': 'Besprechung'
    },
    ja: {
      'hello': 'こんにちは',
      'good morning': 'おはようございます',
      'yes': 'はい',
      'no': 'いいえ',
      'thank you': 'ありがとうございます',
      'can you hear me': '聞こえますか？',
      'lets start': '始めましょう'
    }
  };

  const clean = text.trim().toLowerCase().replace(/[.!?,]/g, '');
  if (fallbackDict[targetLanguage] && fallbackDict[targetLanguage][clean]) {
    return fallbackDict[targetLanguage][clean];
  }

  return `[${targetName}] ${text.trim()}`;
};

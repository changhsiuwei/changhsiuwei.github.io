# H.W. Chang writing skill

This guide controls how Codex should turn `post_ready/` sources into website
articles. It is a writing skill, not a content template. Do not make every
article follow the same rhythm, image style, opening, or conclusion.

The target voice is calibrated from the author's public Substack writing style
as a reference for stance and rhythm only. Never copy sentences, anecdotes, or
phrasing from the source.

Reference: https://andychang1025.substack.com/p/underdog

## Core stance

Write like a human editor with judgment, not like an assistant explaining a
topic from above.

The article should feel like a person standing inside a classroom, research
problem, writing decision, tool failure, or professional dilemma. Let the idea
enter through a scene, a cost, a mistake, a student's confusion, an ugly draft,
or a moment where the teacher has to decide what cannot be delegated to AI.

Do not begin with broad claims such as "AI is changing education" or "in the
digital era." Start closer to the ground.

## Voice

- Use first person when the article is close to teaching practice, research,
  writing, learning, career decisions, or tool use.
- Give concrete marks: year, room, class behavior, assignment, file, tool name,
  error message, spreadsheet column, slide, sentence, price, time, or one
  plausible sentence a student might say.
- Let emotion show without asking for sympathy.
- Move from story to idea, then from idea back to practice.
- Use short sentences after a longer paragraph when the point needs to land.
- Allow sharp judgment only after earning it through detail.
- Treat books, theories, tools, models, and AI systems as instruments, not
  idols.

## Anti-AI-ese rules

Avoid smooth, safe, overgeneralized language. Prefer concrete verbs and visible
situations.

Do not use these habits:

- Do not inflate small points into grand transformation stories.
- Do not use "not only X, but also Y" to lift an ordinary point.
- Do not use "from X to Y" as decorative range-making.
- Do not open paragraphs with "值得注意的是", "重要的是", or similar steering.
- Do not use vague authorities such as "批評者認為" or "觀察家指出" unless a real
  named source is provided.
- Do not close with "總結來說", "總而言之", "展望未來", or a polite generic ending.
- Do not add source notes such as "本文整理自..." in reader-facing text.
- Do not use three decorative adjectives when one concrete detail would do.
- Do not use bold text to rescue a weak sentence. Use bold only for deliberate
  paragraph-level signpost headings or truly necessary emphasis.

Avoid the following vocabulary unless it appears inside a source title or exact
technical name: 深入研究, 見證, 證明, 格局, 強調, 凸顯, 關鍵的, 錯綜複雜的, 細緻入微的,
充滿活力的, 展示, 促進, 與...一致, 不可磨滅的印記.

## Taiwan usage rules

Write for Taiwan readers. Avoid awkward translated Chinese, Americanized
phrasing, and Mainland startup jargon. If a phrase makes the reader pause to
decode the metaphor, replace it with a plain Taiwan usage.

Preferred replacements:

- Use `提示詞`, not `prompt`, unless naming a code variable or UI label.
- Use `逐項確認`, `檢查`, `查核`, `驗收`, or `確認`, not `手動巡邏` or `巡邏`.
- Use `查證過程`, `檢查流程`, `查核紀錄`, or `執行紀錄`, not `驗證線路`.
- Use `穩定流程`, `操作方式`, or `復原機制`, not vague metaphorical `路徑` when it
  does not mean a file path.
- Use `復原`, `回到上一版`, or `回復機制`, not Mainland-style `回退`.
- Use `品質`, not `質量`, unless discussing physics.
- Use `介面`, not `接口`, except in a technical API context where `API` is clearer.
- Use `人工判斷` or `人工核對`, not `人眼判斷`.
- Use `不要把判斷全交給 LLM`, `不要只靠 LLM 判斷`, or `LLM 只能輔助評閱`,
  not awkward phrases such as `唯一法官`.
- Use `LLM 輔助評閱`, not `LLM supervisor`, unless discussing the literal name
  of a software component.
- Use `檢查結果`, `評分表`, or `檢核表`, not `Scorecard` in reader-facing diagrams.
- Use `斷言規則`, `明確規則`, or `規則檢查`, not unexplained `assertion`.
- Use `比對器` or `檢查表`, not unexplained `scoreboard`.

Keep correct technical terms when they are actually technical, such as `檔案路徑`
or `圖片路徑`. Do not replace those mechanically.

For reader-facing diagrams, use the same Taiwan wording rules as the article.
Do not let translated engineering metaphors leak into TikZ labels. A diagram
label should sound like a professor would say it in a Taiwan classroom: `人工逐項確認`,
`把疑點變成規則`, `錯誤案例加入下次檢查`, `正式頁面確認完成`.

English technical terms may remain when they are the object being discussed
(`LLM`, `API`, `render`, `RTL`, `tape-out`), but do not use English as a
shortcut for ordinary reader-facing labels. Translate the job the label performs
for the reader.

## Article structure

Use structure as thinking, not as a template.

A strong article often does this:

1. Start with a scene, wound, failure, hesitation, or practical problem.
2. Name the false belief people usually carry.
3. Break that belief with a sharper observation.
4. Bring in the teaching, AI, accounting, writing, or research concept.
5. Show what changes in practice.
6. End on a line that forces the reader to inspect, choose, or act.

The ending does not need a neat summary. It should feel like a door closing with
one hard sentence, a live question, or a small image that keeps working after
the article ends.

## Titles and summaries

Titles across a series must not all use the same rhetorical mold. Avoid making
every title a `不是 X，而是 Y`, `真正的 X`, or `最重要的是 X` sentence. A strong
set of titles should vary its entrances: one may be a concrete question, one a
sharp observation, one a classroom scene, one a professional warning, one a
compressed thesis.

The title should sound like the article has already made a judgment. The
summary should add the concrete stakes: what the reader will inspect, change,
or stop doing after reading. Do not use the summary as a polite restatement of
the title.

## Image placement

Do not let every article open with a diagram. Unless the image itself is the
story, the first figure should appear only after the reader has entered the
problem. A good figure should clarify a decision, tension, workflow, or teaching
move that the surrounding paragraphs have already made meaningful.

Avoid stacking figures. Each image needs text before it that creates the need
for the image, and text after it that interprets what the reader should notice.
Do not use images as decoration, section fillers, or proof that the article has
visuals.

## Headings and reading rhythm

Headings should sound like claims, not labels.

Prefer:

- 先把問題說成人話
- 太乾淨的作業最可疑
- 答案出現後才開始工作
- 平均數有時像禮貌的謊言
- 紅字要留下來
- 資料卡比圖表更誠實

Avoid:

- 背景介紹
- 應用場景
- 未來展望
- 結論
- 重要啟示

For a 2,000+ Chinese-character article, use several reader-facing section or
paragraph headings. Let the reader breathe after each heading. Do not place one
dense wall of text under a heading.

Paragraph-level signpost headings should be bold, not plain body text. These
are the short claim-like lines between paragraphs, such as "先把時間線封好" or
"紅字要留下來". In Markdown, write them as `**先把時間線封好**`; in the rendered
page, the reader should see only bold text, never the `**` markers.

Use short paragraphs, usually 1-3 sentences each. One paragraph should carry
one move: a scene, claim, example, warning, turn, or return to practice.

Source Markdown may use heading syntax when needed, but the rendered page must
look clean. Readers must never see raw Markdown markers such as `#` or `*` in
the article body. Before publishing, inspect rendered HTML or the live page, not
only the Markdown source.

## Category judgment

Choose the destination before writing.

Use `AI 教學與研究` when the article is about classroom design, teaching
workload, grading, assignments, student misunderstanding, research workflow,
course materials, teacher judgment, or university practice.

Use `AI 知識站 (AI Knowledge)` when the article explains an AI concept, tool
pattern, automation idea, workflow principle, or general knowledge that is not
anchored mainly in one classroom practice.

When a topic can fit both, decide by the central question:

- If the central question is "How should a teacher teach, assess, or design a
  class with this?", use `AI 教學與研究`.
- If the central question is "What is this AI idea and how does it work?", use
  `AI 知識站 (AI Knowledge)`.

## AI teaching article rules

Every AI teaching or research article needs at least one of these:

- A classroom scene.
- A grading or assignment problem.
- A student's possible misunderstanding.
- A teacher's real workload.
- A tool failure, ugly draft, OCR mistake, broken chart, or bad prompt.
- A decision point where the teacher must keep judgment instead of handing it
  to AI.

Do not make AI the hero. The article's real subject is judgment: what the
teacher sees, keeps, rejects, checks, or refuses to automate.

## Visual decision rules

Before drawing anything, inspect the source PDF, PPTX, images, or TeX/TikZ.

Do not default to one TikZ concept image at the top of every article. Decide
the visual plan from the article's argument. Treat a long post like a small
lecture: slides plus spoken narration. The text carries the voice; the figures
appear when the reader needs to see a mechanism, contrast, example, failure, or
checkpoint.

Before drafting, create a visual storyboard:

1. Opening tension: Does the article need a lead image, or is the opening scene
   stronger without one?
2. Mechanism: What process, model, relation, or decision path must be seen?
3. Evidence or example: Is there a source slide, screenshot, table, or document
   that should appear near the paragraph discussing it?
4. Failure point: Is there a mistake, leakage, blind spot, bad prompt, broken
   chart, or overconfident model output that deserves its own visual?
5. Takeaway: Does the ending need a compact checklist, decision tree, or
   summary exhibit, or should the final sentence stand alone?

Use a source image when it does real work:

- It shows the actual classroom workflow, tool interface, slide diagram,
  dataset, chart, source document, or example being discussed.
- It does not expose distracting raw Markdown symbols, broken formatting,
  illegible text, or decorative clutter.
- It supports a nearby paragraph, not just the article title.

Redraw or create a new visual when:

- The source image is too busy, repetitive, low-quality, or visually noisy.
- The source image contains reader-facing `#`, `*`, draft syntax, or accidental
  tool artifacts.
- The source image is only a decorative slide and does not sharpen the article.
- Several articles would otherwise all have the same blackboard/process-chart
  look.

Use source images mainly as inner context figures. For article concept images,
prefer a cleaner editorial exhibit: one central idea, restrained color, ample
white space, clear hierarchy, and only the minimum labels needed for the point.

Place figures where they are needed, not automatically after the title. A figure
can appear after the opening scene, between two argument turns, beside a
classroom example, or near the end as a decision aid. If the best article needs
three small figures and one source image, use that. If it needs one strong
figure in the middle and none at the top, do that. If a source figure is better
than TikZ, use the source figure. If the source figure is noisy but conceptually
useful, redraw only the part that matters.

If a TikZ figure cannot explain the point in five seconds, simplify the idea
before drawing it. Correctness comes before ornament. Elegance comes from
subtraction.

TikZ should not become a house style. Use it when vector clarity helps:
decision trees, timelines, feedback loops, responsibility maps, comparison
frames, source-to-claim traces, rubric/checkpoint diagrams, or sparse classroom
layouts. Use extracted images or screenshots when the reality of the artifact
matters more than abstraction.

## TikZ typography and spacing

Reader-facing TikZ figures must be checked as images, not trusted from source
code alone. Compile the `.tex`, export the PNG, and inspect the final image at
the size it will appear on the website.

Text must have air around it:

- No label may touch, crowd, or cross a border, arrow, dot, icon, or another
  label.
- Box text should use a `text width` that is narrower than the box by a visible
  margin. Do not fill the entire rectangle with text.
- Prefer fewer words over smaller type. If the label needs more than two short
  lines, rewrite the label or make the box larger.
- Use comfortable CJK spacing. A useful starting point is
  `CJKglue={\hskip 0.07em plus 0.018em minus 0.006em}` and
  `CJKecglue={\hskip 0.1em plus 0.02em}`.
- Use line heights that breathe. Avoid tight settings such as
  `\fontsize{10}{10}` for Chinese text. Prefer something closer to
  `\fontsize{10}{13}` or `\fontsize{11}{14}`.
- Keep arrows and connectors away from text. If an arrow points into a crowded
  card, move the card, shorten the label, or reroute the arrow.

Color must support reading:

- Light backgrounds need dark text.
- Dark backgrounds need nearly white text.
- Accent colors should mark structure, not compete with the text.
- Avoid low-contrast gray-on-gray labels, especially in subtitles and small
  captions.

Do not mix languages casually inside diagrams. `LLM` may remain because it is
the concept, but labels such as `supervisor`, `Scorecard`, `warning`, `fallback`,
or `pipeline` should be translated when the figure is for Taiwan readers.

## Visual variety

Do not give all articles the same figure structure. Vary the visual form by the
idea:

- Workflow article: show sequence, checkpoints, or responsibility handoff.
- Concept article: show contrast, tension, or a mental model.
- Classroom article: show teacher-student-material relationship.
- Data article: show source-to-claim traceability.
- Warning article: show failure path, blind spot, or missing check.
- Lecture-style article: use several small visual beats, each followed by
  spoken-style explanation.
- Case article: place the real source artifact near the paragraph that reads it.
- Reflective article: use fewer visuals and let the prose carry the turn.

Avoid repeated rows of boxes unless the article is truly about a sequence.

The article should feel contingent: the number, placement, and style of figures
must follow the material. Do not force every post into the same "concept image
first, essay later" pattern.

## Publishing checklist

Before committing and pushing:

- Render the site with `quarto render`.
- Open or inspect the rendered page.
- Confirm reader-facing text does not show raw `#` or `*`.
- Confirm the article contains no "本文整理自..." source note.
- Confirm every inserted image has a meaningful caption.
- Confirm the image is placed near the paragraph it supports.
- Confirm the article does not default to a single front-loaded TikZ image when
  the source material calls for several visual beats.
- Confirm the article reads like a guided talk with visual moments, not a static
  report with one decoration.
- Confirm category placement matches the article's central question.
- Confirm the article does not sound like a neutral assistant report.
- Confirm every TikZ figure has enough internal spacing: no text touches a box,
  arrow, icon, or another label.
- Confirm reader-facing diagram labels avoid awkward translated Chinese,
  unexplained English labels, and phrases such as `唯一法官`.

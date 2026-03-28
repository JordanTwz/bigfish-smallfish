const intakeFields = [
  {
    label: "Interviewer name",
    value: "Jane Doe",
    helper: "Required. Used to generate focused TinyFish search plans.",
  },
  {
    label: "Company",
    value: "ExampleCo",
    helper: "Required. Improves identity resolution and source ranking.",
  },
  {
    label: "Role title",
    value: "Software Engineer Intern",
    helper: "Optional. Helps infer interview angle and team context.",
  },
  {
    label: "Interview stage",
    value: "Technical screen",
    helper: "Optional. Adjusts the final guidance and question framing.",
  },
];

const textInputs = [
  {
    label: "Job description",
    value:
      "Own backend platform features, contribute to reliability tooling, and work closely with product and infrastructure peers.",
  },
  {
    label: "Candidate resume",
    value:
      "Built internal observability tools, improved API latency by 38%, and led debugging efforts during critical production incidents.",
  },
];

const pipelineSteps = [
  {
    name: "Query generation",
    detail: "LLM expands interviewer name + company into targeted web queries.",
    status: "Complete",
  },
  {
    name: "TinyFish discovery",
    detail: "Parallel search-result runs collect likely company, LinkedIn, GitHub, talk, and article URLs.",
    status: "Running",
  },
  {
    name: "Identity resolution",
    detail: "The backend scores consistency across company, title, and repeated domain signals.",
    status: "Queued",
  },
  {
    name: "Page extraction",
    detail: "TinyFish revisits high-confidence pages and returns structured facts and evidence snippets.",
    status: "Queued",
  },
  {
    name: "Brief synthesis",
    detail: "An LLM merges evidence into guidance, rapport hooks, and personalized questions.",
    status: "Queued",
  },
];

const sources = [
  {
    title: "Speaker Bio",
    type: "Conference page",
    confidence: "0.92",
    snippet: "Led a talk on internal developer tooling and reliability workflows.",
  },
  {
    title: "GitHub Profile",
    type: "Professional profile",
    confidence: "0.88",
    snippet: "Recent repositories emphasize distributed systems, tooling, and debugging ergonomics.",
  },
  {
    title: "Engineering Blog Interview",
    type: "Article",
    confidence: "0.79",
    snippet: "Discussed balancing shipping speed with operational confidence.",
  },
];

const guidance = [
  "Lead with backend ownership stories that show debugging depth and measurable impact.",
  "Use examples where you traded off iteration speed against reliability or maintainability.",
  "Frame collaboration in terms of tooling leverage across engineering teams, not only individual output.",
];

const questions = [
  "What kinds of tooling investments have had the most leverage for your team recently?",
  "How do you evaluate engineering judgment when reliability and delivery speed are in tension?",
  "What patterns separate strong interns from candidates who only know the implementation details?",
];

const signals = [
  {
    label: "Architecture focus",
    value: "High",
  },
  {
    label: "Debugging / operations",
    value: "High",
  },
  {
    label: "Leadership / mentorship",
    value: "Medium",
  },
  {
    label: "Product focus",
    value: "Medium",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(252,192,116,0.35),_transparent_36%),radial-gradient(circle_at_82%_18%,_rgba(81,112,255,0.2),_transparent_28%),linear-gradient(180deg,_#f5efe6_0%,_#f3f7fb_50%,_#eef2f6_100%)] text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,_rgba(16,24,40,0.96),_rgba(24,37,57,0.92))] px-6 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium tracking-[0.2em] text-white/72 uppercase">
                AI Interviewer Research Agent
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                  Prep for the person behind the interview, not just the role.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                  A focused front end for the MVP described in the README:
                  collect interviewer context, orchestrate TinyFish-powered
                  research, and return an evidence-backed prep brief with
                  tailored guidance.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                  <p className="text-sm text-slate-300">Relevant sources</p>
                  <p className="mt-3 text-3xl font-semibold">3-8</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Public professional pages ranked by confidence and evidence richness.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                  <p className="text-sm text-slate-300">Inference themes</p>
                  <p className="mt-3 text-3xl font-semibold">2-4</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Expertise, interview lens, and rapport hooks synthesized by the app.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/12 bg-white/6 p-4 backdrop-blur">
                  <p className="text-sm text-slate-300">Orchestration mode</p>
                  <p className="mt-3 text-3xl font-semibold">Async</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Discovery and extraction fan out with TinyFish `run-async`.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Live job view</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                    Research status
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-400/18 px-3 py-1 text-xs font-medium text-emerald-200">
                  2 / 5 stages active
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {pipelineSteps.map((step, index) => (
                  <div
                    key={step.name}
                    className="rounded-2xl border border-white/10 bg-slate-950/18 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-100">
                            {index + 1}
                          </span>
                          <h3 className="text-base font-semibold text-white">
                            {step.name}
                          </h3>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {step.detail}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          step.status === "Complete"
                            ? "bg-emerald-300/20 text-emerald-100"
                            : step.status === "Running"
                              ? "bg-amber-300/18 text-amber-100"
                              : "bg-white/10 text-slate-200"
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/82 p-6 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Input form</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                  Research request
                </h2>
              </div>
              <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                Run research
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {intakeFields.map((field) => (
                <label
                  key={field.label}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {field.label}
                  </span>
                  <input
                    readOnly
                    value={field.value}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none"
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    {field.helper}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {textInputs.map((field) => (
                <label
                  key={field.label}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {field.label}
                  </span>
                  <textarea
                    readOnly
                    value={field.value}
                    rows={5}
                    className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 grid gap-3 rounded-3xl bg-slate-950 p-5 text-slate-50">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">Generated search plan</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                  README-driven
                </span>
              </div>
              <div className="grid gap-2 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  {'"Jane Doe" "ExampleCo"'}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  {'"Jane Doe" ExampleCo GitHub'}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  {'"Jane Doe" ExampleCo talk'}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  {'"Jane Doe" ExampleCo blog'}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  {'"Jane Doe" ExampleCo LinkedIn'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/84 p-6 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">MVP output</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                    Interviewer prep brief
                  </h2>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Verified identity confidence: <span className="font-semibold">High</span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl bg-slate-950 p-5 text-slate-50">
                  <p className="text-sm text-slate-400">Interviewer profile</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                    Jane Doe
                  </h3>
                  <p className="mt-2 text-lg text-slate-200">
                    Senior Software Engineer at ExampleCo
                  </p>
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    Likely works close to developer tooling and distributed systems
                    problems, with an interview lens tilted toward system design,
                    debugging, and engineering ownership.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      "Distributed systems",
                      "Developer tooling",
                      "System design",
                      "Debugging",
                      "Ownership",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {signals.map((signal) => (
                    <div
                      key={signal.label}
                      className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4"
                    >
                      <p className="text-sm text-slate-500">{signal.label}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-lg font-semibold text-slate-900">
                          {signal.value}
                        </p>
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              signal.value === "High"
                                ? "w-full bg-sky-500"
                                : "w-2/3 bg-amber-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    Candidate guidance
                  </h3>
                  <div className="mt-4 space-y-3">
                    {guidance.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    Questions to ask
                  </h3>
                  <div className="mt-4 space-y-3">
                    {questions.map((item, index) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm"
                      >
                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white/84 p-6 shadow-[0_24px_60px_rgba(148,163,184,0.16)] backdrop-blur sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Evidence cards</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                    Source review
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  Expandable cards next
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {sources.map((source) => (
                  <article
                    key={source.title}
                    className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.98))] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
                          {source.type}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">
                          {source.title}
                        </h3>
                      </div>
                      <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm text-white">
                        Confidence {source.confidence}
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {source.snippet}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                        View evidence
                      </button>
                      <button className="rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                        Open source
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

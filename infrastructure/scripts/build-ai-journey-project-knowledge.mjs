import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ownerId = '00000000-0000-0000-0000-000000000001';
const projectId = 'proj-43ddcb9c-19cd-40cc-b03b-86a0b9ea017b';
const artifactId = 'artifact-ai-journey-evidence-index';
const now = '2026-08-25T00:15:00.000Z';
const output = resolve('.wrangler/generated/ai-journey-project-knowledge.sql');

const quote = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
};
const json = (value) => JSON.stringify(value);
const insert = (table, row, update = true) => {
  const entries = Object.entries(row);
  const columns = entries.map(([key]) => key);
  const values = entries.map(([, value]) => quote(value));
  const conflict = update
    ? ` ON CONFLICT(id) DO UPDATE SET ${columns
        .filter((column) => column !== 'id')
        .map((column) => `${column}=excluded.${column}`)
        .join(', ')}`
    : ' ON CONFLICT DO NOTHING';
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})${conflict};`;
};

const evidenceIds = Array.from(
  { length: 21 },
  (_, index) => `evidence-ai-journey-day-${String(index + 1).padStart(2, '0')}`,
);
const contentIds = Array.from(
  { length: 21 },
  (_, index) => `ai-journey-day-${String(index + 1).padStart(2, '0')}`,
);
const evidenceRange = (start, end) => evidenceIds.slice(start - 1, end);

const skills = [
  {
    id: 'skill-python',
    name: 'Python',
    slug: 'python',
    description:
      'Python language foundations used to model data, design reusable functions and classes, manage files and exceptions, organize packages, and implement numerical AI exercises.',
    aliases: ['Python 3', 'Python for AI'],
    category: 'programming_language',
    first: '2026-07-14',
    last: '2026-08-23',
  },
  {
    id: 'skill-linear-algebra',
    name: 'Linear Algebra',
    slug: 'linear-algebra',
    description:
      'Vectors, matrices, projections, basis, rank, Gram–Schmidt, transformations, eigenvectors, norms, determinants, inverses, and neural-network matrix operations.',
    aliases: ['LA', 'Matrix Algebra'],
    category: 'domain_knowledge',
    first: '2026-07-25',
    last: '2026-08-07',
  },
  {
    id: 'skill-calculus',
    name: 'Calculus',
    slug: 'calculus',
    description:
      'Derivatives, gradients, chain rule, Hessians, curvature, backpropagation, automatic differentiation, and gradient-based optimization for AI systems.',
    aliases: ['Calculus for AI', 'Differential Calculus'],
    category: 'domain_knowledge',
    first: '2026-08-09',
    last: '2026-08-23',
  },
  {
    id: 'skill-probability',
    name: 'Probability',
    slug: 'probability',
    description:
      'Distributions, conditional probability, Bayes reasoning, likelihoods, priors, posteriors, log-softmax, cross-entropy, MLE, and MAP.',
    aliases: ['Probability for AI', 'Probabilistic Reasoning'],
    category: 'domain_knowledge',
    first: '2026-08-16',
    last: '2026-08-22',
  },
  {
    id: 'skill-statistics',
    name: 'Statistics',
    slug: 'statistics',
    description:
      'Statistical estimation and experimental reasoning demonstrated through maximum-likelihood and MAP estimation, Naive Bayes, and A/B-test analysis.',
    aliases: ['Stats', 'Statistical Reasoning'],
    category: 'data',
    first: '2026-08-22',
    last: '2026-08-22',
  },
];

const capabilities = [
  {
    id: 'cap-python-ai-foundations',
    title: 'Build structured Python foundations for AI work',
    slug: 'build-structured-python-foundations-for-ai-work',
    description:
      'Design and implement learning-scale Python systems using functions, collections, files, exceptions, object-oriented models, modules, environments, generators, and NumPy arrays.',
    maturity: 'applying',
    rationale:
      'Twelve source-verified daily records show repeated implementation across language, object modeling, packaging, and numerical-computing contexts.',
    outcome:
      'Can turn a problem into a small, organized Python program and explain the data, control-flow, state, and module boundaries used.',
    first: '2026-07-14',
    last: '2026-07-25',
    evidence: evidenceRange(1, 12),
  },
  {
    id: 'cap-linear-algebra-ai',
    title: 'Implement linear algebra for numerical and neural computation',
    slug: 'implement-linear-algebra-for-numerical-and-neural-computation',
    description:
      'Use arrays, vectors, matrices, projections, basis and rank, Gram–Schmidt, transformations, eigenvectors, and matrix multiplication in executable Python exercises.',
    maturity: 'applying',
    rationale:
      'Four source-verified records move from NumPy matrix operations to first-principles linear algebra and a framework-free neural forward pass.',
    outcome:
      'Can implement and inspect the matrix operations that underpin neural computation, while checking shapes, rank, norms, and transformation behavior.',
    first: '2026-07-25',
    last: '2026-08-07',
    evidence: evidenceRange(12, 15),
  },
  {
    id: 'cap-calculus-optimization',
    title: 'Apply calculus to gradients, backpropagation, and optimization',
    slug: 'apply-calculus-to-gradients-backpropagation-and-optimization',
    description:
      'Derive and implement gradients, chain-rule propagation, curvature reasoning, backpropagation, automatic differentiation, and optimizer updates.',
    maturity: 'applying',
    rationale:
      'Four source-verified records cover gradients and Hessians, backpropagation, a scalar autodiff engine with gradient checks, and optimizer behavior on Rosenbrock.',
    outcome:
      'Can trace how loss gradients move through a computation graph and use them to update parameters with gradient descent, momentum, RMSProp, or Adam.',
    first: '2026-08-09',
    last: '2026-08-23',
    evidence: [...evidenceRange(16, 18), evidenceIds[20]],
  },
  {
    id: 'cap-probabilistic-modeling',
    title: 'Implement probability models and probabilistic loss functions',
    slug: 'implement-probability-models-and-probabilistic-loss-functions',
    description:
      'Connect probability distributions to log-softmax and cross-entropy, then implement Bayesian updates, Naive Bayes, likelihood estimation, MLE, and MAP.',
    maturity: 'practicing',
    rationale:
      'Two source-verified records demonstrate the concepts in code; broader datasets and repeated external applications are still needed.',
    outcome:
      'Can explain and implement how priors, likelihoods, posteriors, and probabilistic losses convert uncertainty into model decisions.',
    first: '2026-08-16',
    last: '2026-08-22',
    evidence: evidenceRange(19, 20),
  },
  {
    id: 'cap-statistical-experimentation',
    title: 'Reason about estimates and controlled statistical comparisons',
    slug: 'reason-about-estimates-and-controlled-statistical-comparisons',
    description:
      'Use likelihood-based estimation and A/B-test reasoning to compare hypotheses, interpret observations, and state limitations without overstating certainty.',
    maturity: 'practicing',
    rationale:
      'A source-verified Bayesian and A/B testing implementation establishes the first observable record; more repeated experiments are required for a stronger maturity claim.',
    outcome:
      'Can frame a small statistical comparison, calculate evidence under competing assumptions, and communicate the result with explicit limitations.',
    first: '2026-08-22',
    last: '2026-08-22',
    evidence: [evidenceIds[19]],
  },
];

const contributions = [
  [
    'designed',
    'Designed a phased learning architecture that moves from Python syntax and program structure into numerical computing, mathematics, neural computation, probability, statistics, and optimization.',
    'Roadmap structure, daily boundaries, and evidence model',
    evidenceRange(1, 21),
  ],
  [
    'implemented',
    'Implemented Python exercises covering functions, collections, durable file state, exception handling, object-oriented design, lazy computation, modules, packages, and environments.',
    'Days 01–10 · Python foundations',
    evidenceRange(1, 10),
  ],
  [
    'implemented',
    'Implemented NumPy arrays and matrix operations, first-principles vector projection and Gram–Schmidt, a neural forward pass, and transformation/eigenvector investigations.',
    'Days 11–15 · Numerical Python and linear algebra',
    evidenceRange(11, 15),
  ],
  [
    'implemented',
    'Implemented gradients, Hessian and curvature experiments, backpropagation, a scalar automatic-differentiation engine, an MLP/XOR exercise, probability losses, Bayesian reasoning, and optimizer comparisons.',
    'Days 16–21 · Calculus, probability, statistics, and optimization',
    evidenceRange(16, 21),
  ],
  [
    'tested',
    'Validated mathematical implementations with shape checks, gradient checks, comparative optimizer runs, and observable outputs recorded in the source repository.',
    'Learning-scale validation, not a production benchmark claim',
    [...evidenceRange(12, 18), evidenceIds[20]],
  ],
  [
    'documented',
    'Authored 21 rich Journal entries with headings, explanations, code, callouts, quotes, lists, images, architecture diagrams, metrics, artifacts, and canonical relationship tags.',
    'Public Journal and provenance record',
    evidenceRange(1, 21),
  ],
  [
    'maintained',
    'Maintained one canonical evidence index connecting each public day to its GitHub folder, Journal entry, project record, and learned knowledge graph.',
    'Repository and Career OS synchronization',
    evidenceRange(1, 21),
  ],
];

const adrs = [
  {
    title: 'Use evidence-first daily slices as the unit of progress',
    context:
      'A long AI roadmap can create progress claims that are difficult to verify or revisit.',
    decision:
      'Organize work into dated, source-backed daily folders and pair every completed day with a public Journal entry and evidence record.',
    rationale:
      'Small canonical slices keep scope inspectable and make the learning timeline reconstructable from source history.',
    alternatives: [
      'Track only course completion',
      'Publish milestone summaries without daily source links',
      'Keep private notes separate from code',
    ],
    tradeOffs:
      'Daily documentation adds overhead, but it produces stronger provenance and makes gaps visible.',
    consequences:
      'The project now exposes 21 individually inspectable days and can connect each day to skills, capabilities, artifacts, and milestones.',
    date: '2026-07-14',
    evidence: evidenceRange(1, 21),
  },
  {
    title: 'Implement foundations before depending on high-level AI frameworks',
    context:
      'Frameworks can hide data shape, gradient flow, and optimizer behavior before the underlying concepts are understood.',
    decision:
      'Implement core structures, neural forward computation, gradients, backpropagation, autodiff, losses, and optimization with Python and NumPy before adopting larger frameworks.',
    rationale:
      'First-principles implementations create a durable mental model and make future abstractions easier to debug.',
    alternatives: [
      'Begin immediately with PyTorch',
      'Follow API-first tutorials',
      'Treat mathematics as separate theory',
    ],
    tradeOffs:
      'The path is slower initially and uses small examples rather than production-scale models.',
    consequences:
      'The repository contains inspectable implementations for matrix operations, autodiff, probabilistic losses, Bayesian reasoning, and optimizers.',
    date: '2026-07-24',
    evidence: evidenceRange(11, 21),
  },
  {
    title: 'Separate skills from observable capabilities',
    context:
      'A list of technologies can look like a proficiency claim even when evidence only supports early practice.',
    decision:
      'Model Python, Linear Algebra, Calculus, Probability, and Statistics as taxonomy nodes, then connect them to bounded capabilities with descriptive maturity and explicit evidence.',
    rationale:
      'The distinction communicates what was learned and what can currently be demonstrated without inventing scores.',
    alternatives: [
      'Use percentage proficiency bars',
      'List keywords without evidence',
      'Promote every completed lesson to expert status',
    ],
    tradeOffs: 'The model needs more records and relationship maintenance than a flat skills list.',
    consequences:
      'Each public skill and capability now links back to source-verified days, while maturity remains practicing or applying.',
    date: '2026-08-25',
    evidence: evidenceRange(1, 21),
  },
  {
    title: 'Publish through a canonical Career OS projection',
    context:
      'Repository work, Journal narrative, evidence, artifacts, project milestones, and learned abilities were previously visible in separate places.',
    decision:
      'Use one project record as the public aggregation root and connect approved Journey, evidence, artifact, skill, capability, decision, experiment, debugging, version, and deployment records.',
    rationale:
      'A single sanitized public projection lets every view draw from the same source of truth.',
    alternatives: [
      'Hard-code a standalone portfolio case study',
      'Duplicate content independently on every page',
    ],
    tradeOffs:
      'The projection depends on explicit public state, owner approval, and relationship records.',
    consequences:
      'General project pages, Deep Dive, Journal, evidence views, skills, capabilities, and the graph can stay consistent.',
    date: '2026-08-25',
    evidence: evidenceRange(1, 21),
  },
];

const experiments = [
  [
    'Data shapes, mutation, and durable records',
    'Choosing data structures deliberately will make CRUD operations and persistence behavior easier to reason about.',
    'Implemented list, tuple, dictionary, and set exercises; built a dictionary-backed CRUD system; then added string processing, file persistence, and exception handling.',
    ['data structure', 'mutation strategy', 'persistence boundary', 'error path'],
    'Small local records and files',
    'The exercises produced a working progression from in-memory collections to safer durable state.',
    'The examples are intentionally local and single-process; they do not test concurrent or distributed storage.',
    'Data representation should be chosen from required operations, and persistence boundaries need explicit failure handling.',
    '2026-07-16/2026-07-18',
    evidenceRange(3, 5),
  ],
  [
    'Object-oriented banking domain model',
    'Encapsulation, inheritance, polymorphism, and abstraction will be clearer when exercised inside one coherent domain model.',
    'Built classes and constructors, compared the four OOP pillars as trade-offs, and assembled an OOP banking model with domain behaviors.',
    ['class boundary', 'state ownership', 'inheritance', 'polymorphism'],
    'Learning-scale account and transaction scenarios',
    'The domain exercise converted isolated OOP concepts into collaborating objects with explicit state and behavior.',
    'The model is not a regulated banking system and does not claim production security, concurrency, or accounting guarantees.',
    'OOP is useful when object boundaries clarify responsibility; the pillars are design tools, not goals by themselves.',
    '2026-07-19/2026-07-21',
    evidenceRange(6, 8),
  ],
  [
    'Projection, basis, rank, and Gram–Schmidt',
    'Implementing projection and orthogonalization from first principles will expose the geometric meaning behind matrix operations.',
    'Compared NumPy matrix operations with explicit vector calculations, constructed projections, inspected basis and rank, and implemented Gram–Schmidt.',
    ['vector input', 'rank', 'basis', 'orthogonality', 'numerical tolerance'],
    'Small deterministic vectors and matrices',
    'The implementation connected array mechanics to geometric interpretation and produced an inspectable orthogonalization workflow.',
    'Small examples do not characterize numerical stability for ill-conditioned large matrices.',
    'First-principles math plus library verification is a strong pattern for building intuition without rejecting reliable numerical tools.',
    '2026-07-25/2026-07-28',
    evidenceRange(12, 13),
  ],
  [
    'Framework-free neural forward computation',
    'A neural layer can be understood as matrix multiplication, bias addition, and a nonlinear activation before introducing a deep-learning framework.',
    'Implemented matrix multiplication, bias, and ReLU; then investigated transformations and eigenvectors to see what matrices preserve.',
    ['weight matrix', 'input vector', 'bias', 'activation', 'transformation'],
    'Small NumPy tensors and deterministic inputs',
    'The exercise produced a transparent forward path and connected neural computation to transformation geometry.',
    'No training loop, large dataset, generalization measure, or production inference benchmark was part of this experiment.',
    'Neural-network operations become less mysterious when every tensor shape and transformation can be inspected.',
    '2026-08-02/2026-08-07',
    evidenceRange(14, 15),
  ],
  [
    'Automatic differentiation, MLP, and XOR gradient checks',
    'A scalar computation graph with local derivatives can reproduce chain-rule backpropagation and train a small multilayer perceptron.',
    'Built scalar value nodes, recorded graph dependencies, propagated gradients backward, assembled an MLP for XOR, and compared analytical gradients with numerical checks.',
    [
      'graph topology',
      'local derivative',
      'gradient accumulation',
      'learning rate',
      'network parameters',
    ],
    'XOR and small scalar expressions',
    'The engine made credit assignment inspectable and the gradient checks provided a direct correctness signal for the implementation.',
    'The engine is educational, scalar, and not optimized for large tensor workloads.',
    'Autodiff correctness depends on graph construction, gradient accumulation, reset behavior, and numerical verification—not only on derivative formulas.',
    '2026-08-09/2026-08-14',
    evidenceRange(16, 18),
  ],
  [
    'Probabilistic losses, Bayesian updates, and A/B reasoning',
    'Log-domain probability operations and Bayesian updates can connect uncertainty modeling to practical classification and comparison tasks.',
    'Implemented distributions, log-softmax, cross-entropy, priors, likelihoods, posteriors, Naive Bayes, MLE, MAP, and a learning-scale A/B-test analysis.',
    ['prior', 'likelihood', 'posterior', 'logit', 'sample observation'],
    'Small synthetic classification and comparison examples',
    'The exercises connected probability theory to stable loss calculations and explicit evidence updates.',
    'The datasets are instructional; they do not establish real-world statistical power or causal validity.',
    'Probability and statistics require assumptions to be visible, and log-domain calculations help prevent numerical instability.',
    '2026-08-16/2026-08-22',
    evidenceRange(19, 20),
  ],
  [
    'Optimizer behavior on Rosenbrock',
    'Gradient descent, momentum, Adam, and schedules will follow measurably different trajectories on a curved objective.',
    'Implemented multiple update rules, ran them against the Rosenbrock function, and compared trajectory and convergence behavior under chosen hyperparameters.',
    ['optimizer', 'learning rate', 'momentum', 'schedule', 'initial point'],
    'Rosenbrock objective and deterministic starting conditions',
    'The runs exposed sensitivity to curvature, learning rate, accumulated moments, and scheduling choices.',
    'One synthetic function does not predict performance on neural-network training workloads.',
    'Optimizer choice is an empirical systems decision; diagnostics and controlled comparisons matter more than assuming one universal winner.',
    '2026-08-23',
    [evidenceIds[20]],
  ],
];

const debuggingLessons = [
  [
    'Mutation and persistence boundaries',
    'State changes were easy to lose or misread when collection mutation, string conversion, file I/O, and exception paths were mixed together.',
    'Incorrect or fragile record behavior during CRUD and file exercises.',
    'Local Python scripts · Days 03–05',
    'Traced each state transition, separated representation from persistence, and forced missing-file and malformed-input paths.',
    'Responsibilities for in-memory state, serialization, and error handling were not separated clearly.',
    'Introduced explicit record operations, guarded file access, and handled expected exceptions at the persistence boundary.',
    'Keep state transitions small, validate before persistence, and test both the success and failure paths.',
    'Durable state is a boundary with failure modes, not merely a call to write a file.',
    '2026-07-16/2026-07-18',
    ['python', 'state', 'files', 'exceptions'],
    evidenceRange(3, 5),
  ],
  [
    'Package and import context',
    'Code that worked as a single script became confusing when moved into modules and packages.',
    'Import errors or ambiguous module behavior across execution contexts.',
    'Local Python package and virtual environment · Day 10',
    'Inspected package layout, import paths, execution entry points, and environment isolation.',
    'Script execution context and package import context were being treated as interchangeable.',
    'Used an explicit package structure, predictable imports, and an isolated environment.',
    'Run code through a defined package entry point and keep environment setup reproducible.',
    'Modules are architectural boundaries; import behavior depends on how the program is launched.',
    '2026-07-23',
    ['python', 'modules', 'packages', 'environment'],
    [evidenceIds[9]],
  ],
  [
    'Array shape and matrix-operation mismatches',
    'Numerical operations failed or produced misleading results when dimensions and transformation intent were not checked first.',
    'Shape mismatch, invalid multiplication, or confusing matrix output.',
    'NumPy and first-principles linear algebra · Days 11–15',
    'Printed shapes, isolated individual operations, compared hand-derived expectations with NumPy output, and checked rank and norms.',
    'The semantic meaning of axes and compatible dimensions was implicit.',
    'Made dimensions explicit before operations and added small verification examples for each transformation.',
    'Treat shape as part of the type of numerical data and assert it at boundaries.',
    'Most numerical bugs become easier once dimensions and transformation direction are explicit.',
    '2026-07-24/2026-08-07',
    ['numpy', 'shape', 'matrix', 'linear-algebra'],
    evidenceRange(11, 15),
  ],
  [
    'Gradient graph bookkeeping',
    'Backpropagation can silently fail when graph dependencies, accumulation order, or gradient reset behavior are wrong.',
    'Incorrect gradients or stalled learning in the scalar autodiff and XOR exercises.',
    'Educational scalar autodiff engine · Days 16–18',
    'Compared analytical derivatives to finite differences, inspected topological order, and traced gradient contributions node by node.',
    'The computation graph did not yet make every dependency and accumulation rule observable.',
    'Recorded graph parents and local derivatives, traversed in reverse topological order, accumulated gradients, and reset them between steps.',
    'Keep gradient checks as a regression tool and make graph lifecycle explicit.',
    'Correct derivative formulas are insufficient without correct graph traversal and state management.',
    '2026-08-09/2026-08-14',
    ['calculus', 'autodiff', 'backpropagation', 'gradient-check'],
    evidenceRange(16, 18),
  ],
  [
    'Stable probability calculations',
    'Direct probability calculations can underflow and make loss values unreliable.',
    'Unstable softmax or cross-entropy behavior for larger logits.',
    'Probability and loss exercises · Day 19',
    'Reframed the calculation in log space and inspected normalization and loss terms separately.',
    'Exponentials were being evaluated without the standard maximum-logit stabilization step.',
    'Used stable log-softmax reasoning and computed cross-entropy from log probabilities.',
    'Prefer log-domain formulations and test extreme logits, not only friendly examples.',
    'Numerical stability is part of algorithm correctness.',
    '2026-08-16',
    ['probability', 'log-softmax', 'cross-entropy', 'numerical-stability'],
    [evidenceIds[18]],
  ],
  [
    'Optimizer sensitivity and curved objectives',
    'An optimizer that improved quickly under one setting could oscillate or stall under another.',
    'Unstable or slow movement on the Rosenbrock objective.',
    'Optimizer comparison · Day 21',
    'Compared trajectories while varying update rule, learning rate, momentum, and scheduling behavior.',
    'Hyperparameters and curvature interact; a fixed step rule did not fit every region of the objective.',
    'Used momentum/adaptive moments and schedules, then interpreted the path instead of only the final number.',
    'Log optimizer settings and trajectories so convergence claims remain reproducible.',
    'Optimization is a controlled experiment, not a one-command guarantee.',
    '2026-08-23',
    ['calculus', 'optimization', 'adam', 'momentum'],
    [evidenceIds[20]],
  ],
];

const versions = [
  [
    'Python syntax and functional foundations',
    'v0.1',
    'Variables, control flow, functions, parameters, scope, and return values.',
    'Days 01–02 established the first executable Python mental model and reusable function contracts.',
    'A source-backed baseline for reasoning about Python programs.',
    '2026-07-14',
    '2026-07-15',
    evidenceRange(1, 2),
  ],
  [
    'Python data and software structure',
    'v0.2',
    'Collections, CRUD modeling, durable file state, exceptions, OOP, lazy computation, modules, packages, and environments.',
    'Days 03–10 moved from syntax into stateful programs and explicit software boundaries.',
    'A coherent Python foundation spanning data representation, object modeling, iteration, and project organization.',
    '2026-07-16',
    '2026-07-23',
    evidenceRange(3, 10),
  ],
  [
    'Numerical Python and linear algebra',
    'v0.3',
    'NumPy arrays, matrix operations, projections, basis, rank, Gram–Schmidt, neural matrix computation, transformations, and eigenvectors.',
    'Days 11–15 connected Python code to the geometric and matrix foundations of AI.',
    'Executable linear-algebra evidence extending from array mechanics to a transparent neural forward pass.',
    '2026-07-24',
    '2026-08-07',
    evidenceRange(11, 15),
  ],
  [
    'Calculus, backpropagation, and autodiff',
    'v0.4',
    'Gradients, chain rule, Hessians, curvature, backpropagation, scalar automatic differentiation, MLP, XOR, and gradient checks.',
    'Days 16–18 turned derivatives into an inspectable learning system.',
    'A working educational computation graph that demonstrates gradient flow and validation.',
    '2026-08-09',
    '2026-08-14',
    evidenceRange(16, 18),
  ],
  [
    'Probability, statistics, and optimization',
    'v0.5',
    'Probabilistic losses, Bayesian reasoning, estimation, Naive Bayes, A/B tests, gradient descent, momentum, Adam, schedules, and Rosenbrock.',
    'Days 19–21 connected uncertainty and optimization to executable experiments.',
    'Evidence-backed early practice in probabilistic modeling, statistical comparison, and optimizer diagnosis.',
    '2026-08-16',
    '2026-08-23',
    evidenceRange(19, 21),
  ],
  [
    'Public evidence-backed Career OS release',
    'v1.0',
    'Published the full 21-day Journey with canonical evidence, artifacts, relationships, skills, capabilities, decisions, experiments, debugging lessons, milestones, and deployment provenance.',
    'Unified the GitHub journey and portfolio into one public project knowledge system.',
    'Every completed day can now be inspected through the Journal, evidence directory, project Deep Dive, skills, capabilities, and focused knowledge graph.',
    '2026-08-24',
    '2026-08-25',
    evidenceRange(1, 21),
  ],
];

const lines = [
  '-- Generated by infrastructure/scripts/build-ai-journey-project-knowledge.mjs',
  '-- Canonical, idempotent enrichment for the public AI Engineer Journey project.',
  `UPDATE projects SET
    description=${quote('A 21-day, evidence-backed AI engineering learning system spanning Python, numerical computing, linear algebra, calculus, probability, statistics, neural computation, and optimization.')},
    detailed_context=${quote('The repository is organized as a sequence of inspectable daily learning slices. Each slice begins with a concept, turns it into executable Python or NumPy work, records experiments and debugging lessons, and is connected to a public Journal entry plus source-verified GitHub evidence. The portfolio projects that source into decisions, milestones, skills, capabilities, and a focused graph without treating a completed exercise as an expert-level claim.')},
    started_at='2026-07-14', completed_at=NULL,
    role_description=${quote('Repository owner, learner, developer, tester, and documentation author')},
    problem_statement=${quote('AI Engineering spans software foundations, mathematics, data, modeling, deployment, and operations. The project creates one structured, continuously documented path that connects daily learning and code to verifiable progress instead of relying on disconnected tutorials or unsupported skill claims.')},
    non_goals=${quote(json(['Claim expert proficiency from a short learning period', 'Treat roadmap items as completed before source evidence exists', 'Present instructional exercises as production-scale AI benchmarks', 'Hide failed approaches, limitations, or debugging work', 'Replace conceptual understanding with framework memorization']))},
    contribution_statement=${quote('I designed the roadmap structure, implemented and tested every published exercise, documented the reasoning and failure modes, maintained the repository, and built the public evidence links. This is an individual learning project; no team or employer contributions are implied.')},
    collaboration_context=${quote('Solo, self-directed project. GitHub supplies source provenance; the portfolio Career OS supplies publication, evidence, artifacts, relationships, and public graph projections.')},
    recruiter_summary=${quote('Delivered 21 source-verified learning increments: 12 days of Python and NumPy foundations, 4 focused linear-algebra/neural-computation records, 4 calculus and optimization records, 2 probability records, and 1 explicit statistics/A-B testing record. Built from-first-principles implementations including an OOP banking model, Gram–Schmidt, a neural forward pass, scalar autodiff with gradient checks, probabilistic losses, Bayesian reasoning, and optimizer comparisons. The maturity claims remain deliberately bounded at practicing or applying.')},
    deep_dive_content=${quote('Architecture: GitHub daily source folders are the execution layer; rich Journal revisions are the narrative layer; source-verified evidence items and the downloadable evidence index are the provenance layer; project decisions, experiments, debugging lessons, versions, and deployment records are the engineering-history layer; owner-approved skill and capability relationships are the knowledge layer; the public API applies visibility and publication gates before General, Recruiter, Deep Dive, Evidence, Journal, Skills, Capabilities, and Graph views render the same canonical record.')},
    case_study_body=${quote('The journey begins with Python intent and program structure, advances through data modeling and object-oriented systems, crosses into NumPy and linear algebra, then implements neural computation, gradients, backpropagation, automatic differentiation, probability, statistical reasoning, and optimization. Each phase ends with executable evidence, explicit limitations, and a milestone outcome. The public portfolio does not infer expertise: it exposes what was practiced, how it was tested, which evidence supports it, and what remains to be learned.')},
    repository_references=${quote(json(['https://github.com/usman611b/ai-engineer-journey']))},
    live_demo_references=${quote(json(['https://usmanalii.com/deep-dive/record?slug=ai-engineer-journey', 'https://usmanalii.com/journey', 'https://usmanalii.com/evidence']))},
    hero_artifact_id=${quote(artifactId)}, is_featured=1,
    provenance=${quote(json({ source: 'owner-approved AI Engineer Journey enrichment', repository: 'https://github.com/usman611b/ai-engineer-journey', evidenceCount: 21, generatedAt: now }))},
    updated_at=${quote(now)}, version_no=CASE WHEN version_no < 10 THEN 10 ELSE version_no END
   WHERE id=${quote(projectId)} AND owner_id=${quote(ownerId)};`,
];

for (const skill of skills) {
  lines.push(
    insert('skills', {
      id: skill.id,
      owner_id: ownerId,
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      parent_id: null,
      aliases: json(skill.aliases),
      visibility: 'public',
      created_at: now,
      updated_at: now,
      archived_at: null,
      version_no: 1,
      category: skill.category,
      skill_type: 'technical',
      lifecycle_state: 'active',
      first_observed_at: skill.first,
      last_demonstrated_at: skill.last,
      owner_confirmed: 1,
      external_identifier: null,
      provenance_metadata: json({
        projectId,
        evidenceIds: skill.id === 'skill-python' ? evidenceRange(1, 12) : [],
      }),
    }),
  );
  lines.push(
    `INSERT INTO project_skills (project_id, skill_id, created_at) VALUES (${quote(projectId)}, ${quote(skill.id)}, ${quote(now)}) ON CONFLICT(project_id, skill_id) DO NOTHING;`,
  );
}

for (const capability of capabilities) {
  lines.push(
    insert('capabilities', {
      id: capability.id,
      owner_id: ownerId,
      title: capability.title,
      slug: capability.slug,
      description: capability.description,
      maturity: capability.maturity,
      maturity_rationale: capability.rationale,
      maturity_rule_version: 'v2.0',
      qualifying_evidence_rules: json({
        minimumVerifiedRecords: capability.evidence.length,
        requiredVerificationStates: ['source_verified'],
        scope: 'AI Engineer Journey days 01–21',
      }),
      visibility: 'public',
      state: 'published',
      last_reviewed_at: '2026-08-25',
      created_at: now,
      updated_at: now,
      archived_at: null,
      version_no: 1,
      outcome_statement: capability.outcome,
      lifecycle_state: 'active',
      owner_confirmed: 1,
      first_demonstrated_at: capability.first,
      last_demonstrated_at: capability.last,
      provenance_metadata: json({
        projectId,
        evidenceIds: capability.evidence,
        ownerApproved: true,
      }),
    }),
  );
  lines.push(
    insert(
      'project_relationships',
      {
        id: `project-capability-${capability.id}`,
        owner_id: ownerId,
        source_id: projectId,
        source_type: 'project',
        target_id: capability.id,
        target_type: 'capability',
        relationship_type: 'develops',
        relevance: 5,
        display_order: capabilities.indexOf(capability),
        provenance: json({ ownerApproved: true, source: '21-day journey evidence' }),
        created_by_classification: 'owner_manual',
        approval_state: 'approved',
        owner_note:
          'Capability is bounded to the public learning evidence and descriptive maturity shown on the record.',
        created_at: now,
        archived_at: null,
      },
      false,
    ),
  );
}

const capabilitySkills = [
  ['cap-python-ai-foundations', 'skill-python', 'required', 5],
  ['cap-linear-algebra-ai', 'skill-linear-algebra', 'required', 5],
  ['cap-linear-algebra-ai', 'skill-python', 'supporting', 4],
  ['cap-calculus-optimization', 'skill-calculus', 'required', 5],
  ['cap-calculus-optimization', 'skill-linear-algebra', 'supporting', 4],
  ['cap-calculus-optimization', 'skill-python', 'supporting', 4],
  ['cap-probabilistic-modeling', 'skill-probability', 'required', 5],
  ['cap-probabilistic-modeling', 'skill-python', 'supporting', 4],
  ['cap-statistical-experimentation', 'skill-statistics', 'required', 5],
  ['cap-statistical-experimentation', 'skill-probability', 'supporting', 5],
  ['cap-statistical-experimentation', 'skill-python', 'supporting', 3],
];
for (const [capabilityId, skillId, relationshipType, relevance] of capabilitySkills) {
  lines.push(
    insert(
      'capability_skill_relationships',
      {
        id: `csr-${capabilityId}-${skillId}`,
        owner_id: ownerId,
        capability_id: capabilityId,
        skill_id: skillId,
        relationship_type: relationshipType,
        relevance,
        ordering: 0,
        evidence_provenance: json({ projectId, ownerApproved: true }),
        created_by_classification: 'owner',
        approval_state: 'accepted',
        owner_note: 'Explicit relationship derived from the published learning implementation.',
        created_at: now,
        archived_at: null,
      },
      false,
    ),
  );
}

const skillRelationships = [
  ['skill-python', 'skill-linear-algebra', 'applied_with', 5],
  ['skill-python', 'skill-calculus', 'applied_with', 5],
  ['skill-python', 'skill-probability', 'applied_with', 5],
  ['skill-python', 'skill-statistics', 'applied_with', 4],
  ['skill-linear-algebra', 'skill-calculus', 'complementary', 5],
  ['skill-probability', 'skill-statistics', 'prerequisite', 5],
];
for (const [source, target, type, relevance] of skillRelationships) {
  lines.push(
    insert(
      'skill_relationships',
      {
        id: `skill-rel-${source}-${target}`,
        owner_id: ownerId,
        source_skill_id: source,
        target_skill_id: target,
        relationship_type: type,
        relevance,
        ordering: 0,
        evidence_provenance: json({ projectId, evidenceIds }),
        created_by_classification: 'owner',
        approval_state: 'accepted',
        owner_note: 'Owner-approved relationship demonstrated inside the AI Engineer Journey.',
        created_at: now,
        archived_at: null,
      },
      false,
    ),
  );
}

contributions.forEach(([type, description, scope, evidence], index) => {
  lines.push(
    insert('project_contributions', {
      id: `contrib-ai-journey-${String(index + 1).padStart(2, '0')}`,
      project_id: projectId,
      owner_id: ownerId,
      contribution_type: type,
      description,
      scope,
      start_date: '2026-07-14',
      end_date: type === 'maintained' ? null : '2026-08-25',
      collaboration_context: 'Solo, self-directed work; no external team contribution is claimed.',
      supporting_evidence_ids: json(evidence),
      verification_state: 'system_verified',
      visibility: 'public',
      owner_approval: 1,
      provenance: json({ source: 'GitHub source-verified daily records', evidenceIds: evidence }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }),
  );
});

adrs.forEach((adr, index) => {
  lines.push(
    insert('project_adrs', {
      id: `adr-ai-journey-${String(index + 1).padStart(2, '0')}`,
      project_id: projectId,
      owner_id: ownerId,
      adr_number: index + 1,
      title: adr.title,
      slug: `ai-journey-adr-${String(index + 1).padStart(2, '0')}`,
      context: adr.context,
      decision: adr.decision,
      consequences: adr.consequences,
      status: 'accepted',
      superseded_by: null,
      visibility: 'public',
      state: 'published',
      created_at: now,
      updated_at: now,
      archived_at: null,
      version_no: 1,
      alternatives_considered: json(adr.alternatives),
      rationale: adr.rationale,
      trade_offs: adr.tradeOffs,
      related_adr_ids: '[]',
      decision_date: adr.date,
      supporting_evidence_ids: json(adr.evidence),
      provenance: json({ ownerApproved: true, source: 'published journey evidence' }),
      deleted_at: null,
    }),
  );
});

experiments.forEach((experiment, index) => {
  const [
    title,
    hypothesis,
    methodology,
    variables,
    inputs,
    results,
    limitations,
    conclusion,
    dates,
    evidence,
  ] = experiment;
  lines.push(
    insert('experiments', {
      id: `experiment-ai-journey-${String(index + 1).padStart(2, '0')}`,
      project_id: projectId,
      owner_id: ownerId,
      title,
      slug: `ai-journey-experiment-${String(index + 1).padStart(2, '0')}`,
      hypothesis,
      methodology,
      results,
      conclusion,
      status: 'concluded',
      visibility: 'public',
      state: 'published',
      created_at: now,
      updated_at: now,
      archived_at: null,
      version_no: 1,
      motivation:
        'Convert the day’s concept into observable code and preserve what the result does and does not prove.',
      variables: json(variables),
      inputs,
      limitations,
      dates,
      supporting_evidence_ids: json(evidence),
      artifact_ids: json([artifactId]),
      provenance: json({
        source: 'GitHub source and rich Journal narrative',
        evidenceIds: evidence,
      }),
      deleted_at: null,
    }),
  );
});

debuggingLessons.forEach((lesson, index) => {
  const [
    title,
    symptom,
    impact,
    environment,
    investigation,
    rootCause,
    resolution,
    prevention,
    learned,
    dates,
    tags,
    evidence,
  ] = lesson;
  lines.push(
    insert('debugging_lessons', {
      id: `debug-ai-journey-${String(index + 1).padStart(2, '0')}`,
      project_id: projectId,
      owner_id: ownerId,
      title,
      slug: `ai-journey-debug-${String(index + 1).padStart(2, '0')}`,
      symptom,
      root_cause: rootCause,
      resolution,
      prevention,
      tags: json(tags),
      visibility: 'public',
      state: 'published',
      created_at: now,
      updated_at: now,
      archived_at: null,
      version_no: 1,
      impact,
      environment,
      investigation,
      lessons_learned: learned,
      relevant_dates: dates,
      supporting_evidence_ids: json(evidence),
      artifact_ids: json([artifactId]),
      provenance: json({
        source: 'Journal debugging and limitations record',
        evidenceIds: evidence,
      }),
      deleted_at: null,
    }),
  );
});

versions.forEach((version, index) => {
  const [name, identifier, description, changelog, outcome, started, completed, evidence] = version;
  lines.push(
    insert('project_versions', {
      id: `version-ai-journey-${String(index + 1).padStart(2, '0')}`,
      project_id: projectId,
      owner_id: ownerId,
      name,
      version_identifier: identifier,
      description,
      status: 'released',
      started_date: started,
      completed_date: completed,
      changelog,
      outcome,
      supporting_evidence_ids: json(evidence),
      artifact_ids: json([artifactId]),
      previous_version_id: index ? `version-ai-journey-${String(index).padStart(2, '0')}` : null,
      visibility: 'public',
      state: 'published',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }),
  );
});

lines.push(
  insert('deployments', {
    id: 'deployment-ai-journey-public-v1',
    project_id: projectId,
    owner_id: ownerId,
    environment: 'production',
    release_version: 'career-os-project-v1.0',
    git_sha: null,
    deployment_url: 'https://usmanalii.com/deep-dive/record?slug=ai-engineer-journey',
    status: 'success',
    deployed_at: '2026-08-25T00:15:00.000Z',
    visibility: 'public',
    created_at: now,
    updated_at: now,
    started_at: '2026-08-24T22:49:52.699Z',
    rollback_info:
      'D1 export captured before enrichment; Pages and Worker version history remain available for rollback.',
    outcome:
      'Published the portfolio knowledge record—not a claim that the learning exercises themselves are a production AI service—with 21 public days, complete engineering history, and owner-approved learned-skill connections.',
    supporting_evidence_ids: json(evidenceIds),
    artifact_ids: json([artifactId]),
    state: 'published',
    provenance: json({
      project: 'usmanalii-web-production',
      database: 'usmanalii-production',
      ownerApproved: true,
    }),
    deleted_at: null,
  }),
);

lines.push(
  insert(
    'project_relationships',
    {
      id: 'project-artifact-ai-journey-evidence-index',
      owner_id: ownerId,
      source_id: projectId,
      source_type: 'project',
      target_id: artifactId,
      target_type: 'artifact',
      relationship_type: 'documented_by',
      relevance: 5,
      display_order: 0,
      provenance: json({ ownerApproved: true, role: 'canonical evidence index' }),
      created_by_classification: 'owner_manual',
      approval_state: 'approved',
      owner_note: 'Downloadable canonical index for the 21 public source records.',
      created_at: now,
      archived_at: null,
    },
    false,
  ),
);

contentIds.forEach((contentId, index) => {
  lines.push(
    insert(
      'project_relationships',
      {
        id: `project-journey-link-${String(index + 1).padStart(2, '0')}`,
        owner_id: ownerId,
        source_id: projectId,
        source_type: 'project',
        target_id: contentId,
        target_type: 'journey',
        relationship_type: 'documented_by',
        relevance: 5,
        display_order: index,
        provenance: json({ ownerApproved: true, evidenceId: evidenceIds[index] }),
        created_by_classification: 'owner_manual',
        approval_state: 'approved',
        owner_note: `Day ${String(index + 1).padStart(2, '0')} canonical Journal relationship.`,
        created_at: now,
        archived_at: null,
      },
      false,
    ),
  );
});

const dayKnowledge = new Map();
for (let day = 1; day <= 10; day += 1)
  dayKnowledge.set(day, [
    ['skill', 'skill-python', 'Python'],
    ['capability', 'cap-python-ai-foundations', 'Build structured Python foundations for AI work'],
  ]);
dayKnowledge.set(11, [
  ['skill', 'skill-python', 'Python'],
  ['skill', 'skill-linear-algebra', 'Linear Algebra'],
  ['capability', 'cap-python-ai-foundations', 'Build structured Python foundations for AI work'],
]);
dayKnowledge.set(12, [
  ['skill', 'skill-python', 'Python'],
  ['skill', 'skill-linear-algebra', 'Linear Algebra'],
  [
    'capability',
    'cap-linear-algebra-ai',
    'Implement linear algebra for numerical and neural computation',
  ],
]);
for (let day = 13; day <= 15; day += 1)
  dayKnowledge.set(day, [
    ['skill', 'skill-linear-algebra', 'Linear Algebra'],
    [
      'capability',
      'cap-linear-algebra-ai',
      'Implement linear algebra for numerical and neural computation',
    ],
  ]);
for (let day = 16; day <= 18; day += 1)
  dayKnowledge.set(day, [
    ['skill', 'skill-calculus', 'Calculus'],
    [
      'capability',
      'cap-calculus-optimization',
      'Apply calculus to gradients, backpropagation, and optimization',
    ],
  ]);
dayKnowledge.set(19, [
  ['skill', 'skill-probability', 'Probability'],
  [
    'capability',
    'cap-probabilistic-modeling',
    'Implement probability models and probabilistic loss functions',
  ],
]);
dayKnowledge.set(20, [
  ['skill', 'skill-probability', 'Probability'],
  ['skill', 'skill-statistics', 'Statistics'],
  [
    'capability',
    'cap-probabilistic-modeling',
    'Implement probability models and probabilistic loss functions',
  ],
  [
    'capability',
    'cap-statistical-experimentation',
    'Reason about estimates and controlled statistical comparisons',
  ],
]);
dayKnowledge.set(21, [
  ['skill', 'skill-calculus', 'Calculus'],
  [
    'capability',
    'cap-calculus-optimization',
    'Apply calculus to gradients, backpropagation, and optimization',
  ],
]);

for (const [day, relationships] of dayKnowledge) {
  const contentId = contentIds[day - 1];
  for (const [entityType, entityId] of relationships) {
    if (entityType === 'skill') {
      lines.push(
        `INSERT INTO content_skills (content_item_id, skill_id, created_at) VALUES (${quote(contentId)}, ${quote(entityId)}, ${quote(now)}) ON CONFLICT(content_item_id, skill_id) DO NOTHING;`,
      );
    }
  }

  const revisionId = `rev-${contentId}-knowledge-v1`;
  lines.push(
    `UPDATE content_items SET version_no=version_no+1, updated_at=${quote(now)} WHERE id=${quote(contentId)} AND owner_id=${quote(ownerId)} AND NOT EXISTS (SELECT 1 FROM content_revisions WHERE id=${quote(revisionId)});`,
  );
  const jsonArgs = relationships
    .map(
      ([entityType, entityId, label], relationshipIndex) =>
        `'$[#]', json_object('id', ${quote(`learning-${String(day).padStart(2, '0')}-${relationshipIndex + 1}`)}, 'type', 'relationship_tag', 'entityType', ${quote(entityType)}, 'entityId', ${quote(entityId)}, 'label', ${quote(label)})`,
    )
    .join(', ');
  lines.push(`INSERT INTO content_revisions (id, content_item_id, owner_id, revision_no, body_snapshot, body_schema_version, revision_note, created_at, created_by)
    SELECT ${quote(revisionId)}, ci.id, ci.owner_id, ci.version_no, json_insert(cr.body_snapshot, ${jsonArgs}), cr.body_schema_version,
           'Connected evidence-backed learned skills and capabilities.', ${quote(now)}, 'usmanali611b@gmail.com'
    FROM content_items ci
    JOIN content_revisions cr ON cr.content_item_id=ci.id AND cr.revision_no=(SELECT MAX(r2.revision_no) FROM content_revisions r2 WHERE r2.content_item_id=ci.id)
    WHERE ci.id=${quote(contentId)}
    ON CONFLICT(id) DO NOTHING;`);
}

const skillEvidence = [
  ['skill-python', evidenceRange(1, 12)],
  ['skill-linear-algebra', evidenceRange(11, 15)],
  ['skill-calculus', [...evidenceRange(16, 18), evidenceIds[20]]],
  ['skill-probability', evidenceRange(19, 20)],
  ['skill-statistics', [evidenceIds[19]]],
];
for (const [skillId, ids] of skillEvidence) {
  ids.forEach((evidenceId, index) => {
    const type =
      index === 0 ? 'introduces' : index === ids.length - 1 ? 'demonstrates' : 'practices';
    lines.push(
      insert(
        'evidence_skill_links',
        {
          id: `esl-${evidenceId}-${skillId}`,
          owner_id: ownerId,
          evidence_id: evidenceId,
          skill_id: skillId,
          relationship_type: type,
          relevance: 5,
          ordering: index,
          evidence_provenance: json({
            canonicalLocator: `https://github.com/usman611b/ai-engineer-journey`,
            projectId,
          }),
          created_by_classification: 'owner',
          approval_state: 'accepted',
          owner_note: 'Owner-approved link to source-verified daily work.',
          created_at: now,
          archived_at: null,
        },
        false,
      ),
    );
  });
}

for (const capability of capabilities) {
  capability.evidence.forEach((evidenceId, index) => {
    lines.push(
      insert(
        'evidence_capability_links',
        {
          id: `ecl-${evidenceId}-${capability.id}`,
          owner_id: ownerId,
          evidence_id: evidenceId,
          capability_id: capability.id,
          relationship_type: index === capability.evidence.length - 1 ? 'demonstrates' : 'supports',
          relevance: 5,
          ordering: index,
          evidence_provenance: json({ projectId, verificationState: 'source_verified' }),
          created_by_classification: 'owner',
          approval_state: 'accepted',
          owner_note:
            'Evidence supports only the bounded outcome and descriptive maturity on this capability.',
          created_at: now,
          archived_at: null,
        },
        false,
      ),
    );
  });
}

const progression = [
  [
    'skill-python',
    null,
    'applying',
    evidenceRange(1, 12),
    'Repeated source-verified implementation across Python language, software structure, and NumPy exercises.',
  ],
  [
    'skill-linear-algebra',
    null,
    'applying',
    evidenceRange(11, 15),
    'Applied matrix and vector concepts in executable numerical and neural-computation exercises.',
  ],
  [
    'skill-calculus',
    null,
    'applying',
    [...evidenceRange(16, 18), evidenceIds[20]],
    'Applied derivatives and chain-rule reasoning in autodiff, backpropagation, and optimization exercises.',
  ],
  [
    'skill-probability',
    null,
    'practicing',
    evidenceRange(19, 20),
    'Practiced probabilistic losses and Bayesian reasoning in two source-verified records.',
  ],
  [
    'skill-statistics',
    null,
    'practicing',
    [evidenceIds[19]],
    'Established an initial source-verified record for estimation and A/B-test reasoning.',
  ],
  [
    null,
    'cap-python-ai-foundations',
    'applying',
    evidenceRange(1, 12),
    'Observable Python program design across twelve public daily records.',
  ],
  [
    null,
    'cap-linear-algebra-ai',
    'applying',
    evidenceRange(12, 15),
    'Observable matrix, vector, and neural-computation implementations across four public records.',
  ],
  [
    null,
    'cap-calculus-optimization',
    'applying',
    [...evidenceRange(16, 18), evidenceIds[20]],
    'Observable gradients, autodiff, backpropagation, and optimization implementations.',
  ],
  [
    null,
    'cap-probabilistic-modeling',
    'practicing',
    evidenceRange(19, 20),
    'Two public implementations support early probabilistic modeling practice.',
  ],
  [
    null,
    'cap-statistical-experimentation',
    'practicing',
    [evidenceIds[19]],
    'One public implementation supports an initial statistical experimentation record.',
  ],
];
progression.forEach(([skillId, capabilityId, stage, supporting, reason], index) => {
  lines.push(
    insert(
      'progression_events',
      {
        id: `progress-ai-journey-${String(index + 1).padStart(2, '0')}`,
        owner_id: ownerId,
        skill_id: skillId,
        capability_id: capabilityId,
        previous_stage: null,
        new_stage: stage,
        supporting_evidence_ids: json(supporting),
        reason,
        actor_classification: 'owner',
        approval_state: 'accepted',
        supersedes_event_id: null,
        created_at: now,
      },
      false,
    ),
  );
});

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${lines.join('\n\n')}\n`, 'utf8');
console.log(`Generated ${output} with ${lines.length} statements/sections.`);

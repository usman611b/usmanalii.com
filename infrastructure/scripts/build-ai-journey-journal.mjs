import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ownerId = '00000000-0000-0000-0000-000000000001';
const ownerEmail = 'usmanali611b@gmail.com';
const projectId = 'proj-43ddcb9c-19cd-40cc-b03b-86a0b9ea017b';
const artifactId = 'artifact-ai-journey-evidence-index';
const artifactName = 'ai-engineer-journey-evidence-index.md';
const r2Key = `artifacts/${ownerId}/${artifactId}.md`;
const generatedAt = new Date().toISOString();

const phases = {
  foundations: {
    name: 'Python Foundations',
    image: '/images/journal/ai-engineer-journey/python-foundations.png',
    alt: 'Abstract computational pipeline showing simple values becoming structured Python data.',
  },
  design: {
    name: 'Software Design',
    image: '/images/journal/ai-engineer-journey/software-design.png',
    alt: 'Modular software components connected through an object-oriented blueprint.',
  },
  numerical: {
    name: 'Numerical Computing',
    image: '/images/journal/ai-engineer-journey/numerical-computing.png',
    alt: 'Luminous matrices, vectors, and orthogonal geometry in a numerical computing space.',
  },
  neural: {
    name: 'Neural Computation',
    image: '/images/journal/ai-engineer-journey/neural-computation.png',
    alt: 'A neural computation graph with forward signals and backward gradient flow.',
  },
  probability: {
    name: 'Probability and Optimization',
    image: '/images/journal/ai-engineer-journey/probability-optimization.png',
    alt: 'Probability distributions and optimizer paths moving across a complex loss landscape.',
  },
};

const journal = [
  {
    day: 1,
    phase: 'foundations',
    title: 'From Syntax to Intent: Building My First Python Mental Model',
    summary:
      'Variables, types, conditions, and loops became the first layer of a deliberate AI-engineering foundation.',
    question:
      'How does a program turn raw values into repeatable decisions without hiding the mechanics from me?',
    opening:
      'I began with the smallest useful unit of computation: a named value. The goal was not to memorize Python punctuation. It was to understand how state enters a program, how types constrain operations, and how control flow converts a static script into a decision-making process.',
    concepts: [
      'Variables bind meaningful names to changing state.',
      'Primitive types determine which operations are valid.',
      'Conditions select a path from explicit alternatives.',
      'Loops turn one correct operation into repeatable work.',
    ],
    steps: [
      'Represent personal and academic facts as typed values.',
      'Inspect the difference between integers, floats, strings, and booleans.',
      'Use comparisons to produce boolean decisions.',
      'Branch with if, elif, and else.',
      'Repeat bounded work with for and conditional work with while.',
    ],
    architecture: [
      'Input values',
      'Typed variables',
      'Boolean conditions',
      'Control-flow branch',
      'Observable output',
    ],
    architectureText:
      'This is the first reusable computation pipeline in the journey: capture state, apply a rule, choose a path, and make the result visible.',
    needle: 'my_name =',
    codeLines: 18,
    codeAnalysis:
      'The code is intentionally direct. Each value has a descriptive name, and the output makes the state observable. That visibility matters later when tensors, gradients, and model parameters become harder to inspect.',
    designNote:
      'Readable variable names are an engineering control, not decoration. They reduce ambiguity before a system becomes large enough to need stronger abstractions.',
    quote:
      'The first step toward understanding intelligent systems was learning to make ordinary computation explicit.',
    limitation:
      'This day proves basic control over syntax and flow, but it does not yet establish reusable boundaries, automated tests, or persistent state.',
    nextStep:
      'Replace repeated instructions with functions that accept inputs, return results, and make behavior reusable.',
  },
  {
    day: 2,
    phase: 'foundations',
    title: 'Functions as Contracts: Reuse, Parameters, Scope, and Return Values',
    summary:
      'I moved from one-off scripts to named units of behavior with explicit inputs and outputs.',
    question:
      'What changes when a useful calculation becomes a reusable contract instead of copied code?',
    opening:
      'Functions were the first major abstraction in the journey. A function gives behavior a name, defines what information it needs, and decides what it exposes. That turns a sequence of statements into something that can be reasoned about, tested, and composed.',
    concepts: [
      'Definition stores behavior; invocation executes it.',
      'Parameters describe required inputs while arguments provide concrete values.',
      'Return values carry results across boundaries.',
      'Local scope prevents unrelated parts of a program from sharing accidental state.',
    ],
    steps: [
      'Identify repeated behavior in a script.',
      'Extract it behind a descriptive function name.',
      'Replace hard-coded values with parameters.',
      'Return data instead of relying only on printed output.',
      'Call the function with several inputs to test the contract.',
    ],
    architecture: ['Caller', 'Arguments', 'Function boundary', 'Local computation', 'Return value'],
    architectureText:
      'The function boundary isolates implementation details. Callers depend on the input/output contract rather than the internal sequence of statements.',
    needle: 'def greet():',
    codeLines: 28,
    codeAnalysis:
      'The repository begins with a zero-argument greeting and then expands into parameterized arithmetic and introductions. That progression records the shift from fixed behavior to reusable computation.',
    designNote:
      'Printing is useful for learning, but returning a value is more composable. A returned result can feed another function, a test assertion, an API response, or a model pipeline.',
    quote:
      'A good function is a small promise: give me these inputs and I will produce this result.',
    limitation:
      'The exercises establish function mechanics, but production code would add type validation, error contracts, tests, and documentation for public interfaces.',
    nextStep:
      'Use functions alongside collections so one behavior can process many related values.',
  },
  {
    day: 3,
    phase: 'foundations',
    title: 'Collections as Data Shapes: Lists, Tuples, Indexing, and Mutation',
    summary:
      'Lists and tuples reframed individual values as ordered datasets—the shape that later becomes vectors and batches.',
    question:
      'How can one program represent many related observations while preserving order and meaning?',
    opening:
      'The day moved from scalar thinking to collection thinking. A list is more than convenient syntax: it is a model for an ordered, mutable dataset. Indexing, slicing, iteration, and mutation are the first tools for navigating data at scale.',
    concepts: [
      'Lists preserve order and allow mutation.',
      'Tuples preserve order while communicating structural stability.',
      'Indexing selects one observation; slicing selects a region.',
      'Iteration applies one operation across a collection.',
    ],
    steps: [
      'Create a collection from related observations.',
      'Read positions with positive and negative indexes.',
      'Select ranges with slices.',
      'Add, update, sort, and remove elements deliberately.',
      'Iterate while keeping the data shape visible.',
    ],
    architecture: [
      'Raw observations',
      'Ordered collection',
      'Index or slice',
      'Transformation',
      'Updated collection',
    ],
    architectureText:
      'This collection pipeline is a precursor to vectorized data processing: organize values first, then select and transform them predictably.',
    needle: 'students = [90, 85, 78, 91]',
    codeLines: 28,
    codeAnalysis:
      'The source repeatedly contrasts separate variables with one list. That is an important modeling decision: the program can now scale the same logic from four marks to thousands without inventing thousands of names.',
    designNote:
      'Mutability is powerful and risky. Lists are appropriate when the collection must change; tuples communicate that a record or coordinate should remain stable.',
    quote: 'Data becomes programmable when related values share a shape.',
    limitation:
      'The work focuses on in-memory collections. It does not yet address schemas, validation, persistence, or efficient numerical storage.',
    nextStep: 'Model richer records with dictionaries and enforce uniqueness with sets.',
  },
  {
    day: 4,
    phase: 'foundations',
    title: 'Modeling Records: Dictionaries, Sets, and a CRUD System',
    summary:
      'I combined collections into a working student-record system with create, read, update, search, and delete flows.',
    question: 'How do basic data structures become a small but complete information system?',
    opening:
      'This was the first day where separate language features converged into a system. Dictionaries modeled named fields, a list stored many records, a loop kept the program alive, and conditions routed user commands through CRUD operations.',
    concepts: [
      'Dictionary keys give fields semantic names.',
      'Sets express uniqueness and fast membership checks.',
      'A list of dictionaries forms a simple record store.',
      'CRUD operations reveal the lifecycle of application data.',
    ],
    steps: [
      'Define a student record with stable field names.',
      'Append records to an in-memory collection.',
      'Traverse records for display and search.',
      'Update a matched record without replacing unrelated fields.',
      'Delete deliberately and report whether the target existed.',
    ],
    architecture: [
      'Menu input',
      'Command router',
      'Record collection',
      'CRUD operation',
      'User feedback',
    ],
    architectureText:
      'The menu loop acts as a controller, while the collection acts as an in-memory repository. Each branch implements one record lifecycle operation.',
    needle: 'student_records = []',
    codeLines: 38,
    codeAnalysis:
      'The student management program is concrete evidence that the early concepts can cooperate. It tracks identity, stores structured fields, and implements the same lifecycle found later in databases and APIs.',
    designNote:
      'A generated counter works for a single process, but durable systems need collision-resistant identifiers and persistence. Recognizing that limit is part of the engineering lesson.',
    quote:
      'The moment data gains identity and lifecycle, a script starts behaving like an application.',
    limitation:
      'All records disappear when the process exits, input parsing is permissive, and update/search behavior assumes exact names.',
    nextStep: 'Persist the records to a file and make failure handling part of the program design.',
  },
  {
    day: 5,
    phase: 'foundations',
    title: 'Durable State: Strings, Files, Exceptions, and Safer Record Handling',
    summary:
      'The student system crossed the process boundary by persisting records and accounting for failure paths.',
    question: 'What must change when data is expected to survive after the program stops?',
    opening:
      'Persistence introduced a new reality: programs interact with resources they do not fully control. Files may be absent, malformed, locked, or partially written. String parsing became data decoding, and exception handling became a way to define reliable failure behavior.',
    concepts: [
      'Text serialization converts structured records into durable bytes.',
      'Parsing reconstructs fields from a stable delimiter.',
      'Read-modify-write is a simple persistence transaction.',
      'Exceptions separate expected failure handling from the happy path.',
    ],
    steps: [
      'Choose a consistent on-disk record format.',
      'Check for duplicates before appending.',
      'Read and split each line into named fields.',
      'Rewrite the file when updating or deleting records.',
      'Handle missing files and invalid user values explicitly.',
    ],
    architecture: [
      'User command',
      'Validation',
      'File repository',
      'Parse or serialize',
      'Confirmed result',
    ],
    architectureText:
      'The file becomes a repository boundary. Commands validate input, translate records to or from text, and report a deterministic outcome.',
    needle: 'def add_student',
    codeLines: 36,
    codeAnalysis:
      'The add flow checks the existing file before writing and normalizes comparison with stripped, lower-cased text. The implementation is still simple, but it demonstrates identity checks and durable storage.',
    designNote:
      'Opening a file with write mode replaces its contents. Safe updates therefore require reading the complete current state before selectively writing the next state.',
    quote: 'Reliability begins when failure is treated as part of the design, not as a surprise.',
    limitation:
      'A delimiter-based text file has no transaction isolation, concurrent-write protection, schema migration, or robust escaping for delimiter characters.',
    nextStep:
      'Move the data and behavior into objects so invariants live next to the state they protect.',
  },
  {
    day: 6,
    phase: 'design',
    title: 'Objects as Models: Classes, Constructors, Identity, and State',
    summary:
      'Classes turned loose dictionaries and functions into explicit models with initialized state and behavior.',
    question: 'When should related data and operations become one coherent object?',
    opening:
      'Object-oriented programming began with a blueprint metaphor, but the deeper lesson was about invariants. A constructor establishes valid starting state; instance methods operate on that state; separate objects preserve separate identities even when they share one class.',
    concepts: [
      'A class defines structure and behavior.',
      'An object is one concrete instance with its own state.',
      'The constructor establishes required attributes.',
      'self makes the current instance explicit inside a method.',
    ],
    steps: [
      'Name the domain concept represented by the class.',
      'Identify the attributes every instance requires.',
      'Initialize those attributes in the constructor.',
      'Create multiple instances with independent values.',
      'Add methods that preserve the model’s rules.',
    ],
    architecture: [
      'Constructor arguments',
      'Class blueprint',
      'Object instance',
      'Instance method',
      'State transition',
    ],
    architectureText:
      'Construction turns raw arguments into a valid object. Methods then provide controlled transitions instead of allowing unrelated code to manipulate state freely.',
    needle: 'class Student:',
    codeLines: 34,
    codeAnalysis:
      'The repository moves from an empty Student blueprint to initialized student objects. That visible progression matters: it records why constructors exist rather than presenting the final syntax without context.',
    designNote:
      'A class is justified when it owns meaningful rules or behavior. Creating classes only to group fields can add ceremony without adding protection.',
    quote: 'An object is useful when it makes invalid state harder to create.',
    limitation:
      'The initial model is educational and does not yet validate attribute ranges, serialize itself, or separate domain behavior from interface concerns.',
    nextStep:
      'Use encapsulation, inheritance, polymorphism, and abstraction to control extension and variation.',
  },
  {
    day: 7,
    phase: 'design',
    title: 'The Four OOP Pillars as Design Trade-offs',
    summary:
      'Encapsulation, inheritance, polymorphism, and abstraction became tools for managing change—not vocabulary to memorize.',
    question:
      'How can a system support many behaviors without scattering type-specific conditions everywhere?',
    opening:
      'The four pillars became concrete when the same method call produced different behavior across subclasses. The central idea was substitutability: callers can depend on a stable interface while implementations vary behind it.',
    concepts: [
      'Encapsulation protects state behind controlled operations.',
      'Inheritance reuses and specializes a base contract.',
      'Polymorphism lets one interface dispatch many implementations.',
      'Abstraction exposes essential behavior while hiding mechanism.',
    ],
    steps: [
      'Define a stable base behavior.',
      'Create specialized implementations.',
      'Override only the behavior that truly varies.',
      'Store different implementations in one collection.',
      'Invoke the shared interface without type-specific branching.',
    ],
    architecture: [
      'Shared interface',
      'Base contract',
      'Specialized classes',
      'Runtime dispatch',
      'Behavior-specific output',
    ],
    architectureText:
      'The caller addresses the shared contract. Runtime dispatch selects the correct implementation, which keeps variation out of the caller’s control flow.',
    needle: 'class Animal:',
    codeLines: 34,
    codeAnalysis:
      'Animal.sound is deliberately overridden by Dog, Cat, and Lion. Iterating across those objects demonstrates polymorphism with one call site and multiple outcomes.',
    designNote:
      'Inheritance creates coupling. Composition is often safer when the relationship is “has a” rather than “is a,” or when behavior must be assembled dynamically.',
    quote:
      'A stable interface is more valuable than a clever implementation because it protects every caller from change.',
    limitation:
      'The examples prove dispatch mechanics but do not yet test Liskov substitution, deep hierarchies, or composition-based alternatives.',
    nextStep:
      'Apply the pillars together in one domain model with accounts, customers, and a bank.',
  },
  {
    day: 8,
    phase: 'design',
    title: 'From Concepts to a Domain System: An OOP Banking Model',
    summary:
      'A banking exercise connected abstraction, protected state, specialization, association, and service-level orchestration.',
    question:
      'Can the OOP principles survive contact with a domain that has real rules and relationships?',
    opening:
      'The banking model was the first integrated object system. An abstract Account defined the contract, concrete accounts supplied interest behavior, Customer associated people with accounts, and Bank coordinated lookup and lifecycle operations.',
    concepts: [
      'Abstract base classes prevent incomplete domain objects.',
      'Private balance state is changed through deposit and withdraw rules.',
      'Subclasses specialize interest behavior.',
      'Associations model relationships without forcing inheritance.',
    ],
    steps: [
      'Define the Account abstraction and its invariant-bearing state.',
      'Expose safe balance-changing methods.',
      'Implement SavingsAccount and CurrentAccount behavior.',
      'Associate customers with account instances.',
      'Let Bank coordinate lookup, listing, and closure.',
    ],
    architecture: [
      'Customer',
      'Bank service',
      'Account abstraction',
      'Concrete account',
      'Balance and interest rules',
    ],
    architectureText:
      'The Bank coordinates, Account protects financial state, and concrete account types supply variable policy. Responsibilities are separated by domain meaning.',
    needle: 'class  Account(ABC):',
    codeLines: 46,
    codeAnalysis:
      'The private balance and abstract interest method are the strongest parts of the design. They demonstrate both protection of state and enforced specialization.',
    designNote:
      'Money should use decimal arithmetic rather than binary floating point in production. Domain modeling includes choosing representations that preserve business invariants.',
    quote: 'A design earns its abstractions when each object has one clear reason to change.',
    limitation:
      'The model has no transaction ledger, authentication, persistence, concurrency control, or decimal money type; it remains a learning system.',
    nextStep:
      'Study iterators and generators to understand how objects participate in Python’s execution protocols.',
  },
  {
    day: 9,
    phase: 'design',
    title: 'Lazy Computation: Comprehensions, Lambdas, Iterators, and Generators',
    summary:
      'I learned how Python separates iterable data from iteration state and how generators stream work lazily.',
    question:
      'How can a program process a sequence without constructing every result in memory first?',
    opening:
      'Iteration stopped being magic. An iterable supplies an iterator, the iterator tracks position, and next advances the state until exhaustion. Generators package that protocol behind yield, enabling lazy pipelines that become important for datasets and model inputs.',
    concepts: [
      'An iterable can create an iterator.',
      'An iterator stores traversal state.',
      'yield pauses a function while preserving local state.',
      'Comprehensions describe common transformations compactly.',
    ],
    steps: [
      'Create an iterable collection.',
      'Request its iterator with iter.',
      'Advance manually with next to expose the protocol.',
      'Handle exhaustion as a normal terminal state.',
      'Replace eager result construction with a yielding generator.',
    ],
    architecture: ['Iterable source', 'Iterator state', 'next request', 'Yielded item', 'Consumer'],
    architectureText:
      'The consumer pulls one item at a time. State stays inside the iterator, so the pipeline can process large or unbounded streams with bounded memory.',
    needle: 'numbers = [10, 20, 30]',
    codeLines: 32,
    codeAnalysis:
      'The exercises move from a for loop to iter and next before introducing generators. That sequence exposes the protocol that a for loop normally hides.',
    designNote:
      'Laziness changes when errors occur: a generator may fail during consumption rather than construction. Callers must understand that execution boundary.',
    quote: 'A generator is a computation scheduled by demand.',
    limitation:
      'The examples are synchronous and single-threaded; they do not yet cover asynchronous iteration, backpressure, or resource cleanup.',
    nextStep: 'Organize reusable behavior into modules, packages, and isolated environments.',
  },
  {
    day: 10,
    phase: 'design',
    title: 'Python as a System: Modules, Packages, Imports, and Environments',
    summary:
      'The codebase itself became an object of design through module boundaries and dependency isolation.',
    question: 'How does working code become a maintainable project rather than one growing file?',
    opening:
      'Modules and packages introduced architecture at the filesystem level. Reusable functions moved behind imports, namespaces prevented collisions, and virtual environments isolated dependency versions from the global machine.',
    concepts: [
      'A module is a reusable Python file and namespace.',
      'A package groups related modules into a coherent API.',
      'Import style controls name visibility.',
      'A virtual environment makes dependencies project-specific.',
    ],
    steps: [
      'Separate reusable calculations from the entry script.',
      'Import the module through an explicit namespace.',
      'Expose only the functions callers should depend on.',
      'Group related modules into a package.',
      'Create an isolated environment and record dependencies.',
    ],
    architecture: [
      'Application entry',
      'Package interface',
      'Reusable module',
      'Third-party dependency',
      'Isolated environment',
    ],
    architectureText:
      'The application depends on package interfaces; packages depend on focused modules; the environment supplies controlled external versions.',
    needle: 'def add(a, b):',
    codeLines: 20,
    codeAnalysis:
      'The calculator example makes duplication visible and then removes it through importable functions. It is a small example of dependency direction.',
    designNote:
      'An import is an architectural dependency. Clear package boundaries make those dependencies visible enough to test and change.',
    quote: 'Project structure is the map future maintainers use before they understand the code.',
    limitation:
      'The repository records environment practice, but a committed virtual environment later inflated the tree—evidence of why generated dependencies belong in ignore rules, not source control.',
    nextStep:
      'Enter numerical Python and learn why arrays are a different computational model from ordinary lists.',
  },
  {
    day: 11,
    phase: 'numerical',
    title: 'Crossing into Numerical Python: Arrays, Dimensions, Indexing, and Slicing',
    summary:
      'NumPy introduced typed multidimensional arrays—the core data structure beneath practical machine learning.',
    question: 'Why do AI workloads use arrays instead of nested Python lists?',
    opening:
      'NumPy changed the unit of thought from individual Python objects to homogeneous multidimensional arrays. Shape and dimension became explicit, and indexing extended naturally from vectors to matrices and tensors.',
    concepts: [
      'ndarray stores homogeneous values in a compact layout.',
      'shape describes the size of every axis.',
      'ndim describes how many axes exist.',
      'Multiaxis slicing selects structured regions without manual nested loops.',
    ],
    steps: [
      'Construct one-, two-, and three-dimensional arrays.',
      'Inspect dtype, shape, and ndim.',
      'Select scalar elements with axis-aware indexes.',
      'Slice rows, columns, and tensor regions.',
      'Relate each index operation to the resulting shape.',
    ],
    architecture: [
      'Python values',
      'ndarray construction',
      'Shape metadata',
      'Index or slice',
      'Tensor view',
    ],
    architectureText:
      'Array construction produces both data and shape metadata. Every later operation must preserve, reduce, or transform that shape intentionally.',
    needle: 'import numpy as np',
    codeLines: 42,
    codeAnalysis:
      'The code walks from a vector to a matrix and then a rank-three tensor. Printing shape after each construction makes dimensionality observable rather than implicit.',
    designNote:
      'Most machine-learning bugs are shape bugs before they are algorithm bugs. Inspecting dimensions early is a high-leverage debugging habit.',
    quote: 'In numerical computing, shape is part of the type.',
    limitation:
      'The exercises demonstrate indexing semantics but do not yet benchmark vectorization, memory layout, broadcasting cost, or dtype precision.',
    nextStep:
      'Use NumPy’s linear-algebra operations to manipulate matrices as mathematical objects.',
  },
  {
    day: 12,
    phase: 'numerical',
    title: 'Matrix Operations in Practice: Determinants, Inverses, Norms, and Linear Algebra',
    summary:
      'Array mechanics became mathematical operations through NumPy linear algebra and matrix transformations.',
    question:
      'What do matrix operations reveal about whether a transformation preserves, collapses, or reverses information?',
    opening:
      'The day connected numerical APIs to linear-algebra meaning. Determinants diagnose invertibility and volume scaling, inverses reverse eligible transformations, transposes reorganize axes, and norms measure magnitude.',
    concepts: [
      'The determinant summarizes signed volume scaling.',
      'A zero determinant signals a non-invertible transformation.',
      'The inverse reverses a full-rank square transformation.',
      'Norms provide a consistent measure of vector or matrix magnitude.',
    ],
    steps: [
      'Construct matrices with known shapes.',
      'Compute and interpret determinants.',
      'Invert matrices only when mathematically valid.',
      'Transpose to exchange row and column roles.',
      'Measure magnitude and solve representative linear systems.',
    ],
    architecture: [
      'Input matrix',
      'Property check',
      'Linear algebra operation',
      'Numerical result',
      'Interpretation',
    ],
    architectureText:
      'Numerical output is not the endpoint. Each operation is followed by an interpretation step that ties the API result back to geometry and information flow.',
    needle: 'import numpy as np',
    codeLines: 40,
    codeAnalysis:
      'The representative file computes the same properties across two- and three-dimensional examples. Repetition across shapes helps separate the operation’s definition from one convenient case.',
    designNote:
      'Explicit matrix inversion is often less stable and less efficient than solving a linear system directly. Library fluency includes knowing when not to call an available function.',
    quote: 'A matrix operation is useful only when I can explain the transformation it performs.',
    limitation:
      'The repository demonstrates operations but does not yet quantify conditioning, floating-point error, or algorithmic complexity.',
    nextStep:
      'Rebuild the underlying vector and matrix ideas from first principles, including basis, rank, projection, and orthogonality.',
  },
  {
    day: 13,
    phase: 'numerical',
    title:
      'Linear Algebra from First Principles: Vectors, Projection, Basis, Rank, and Gram–Schmidt',
    summary:
      'Ten focused sessions rebuilt linear algebra as the geometry and language of model representations.',
    question:
      'How can arbitrary vectors be transformed into a clean coordinate system a learning algorithm can reason about?',
    opening:
      'This was the deepest conceptual day so far. Vectors became directions and magnitudes, dot products measured alignment, cosine similarity compared direction, projection decomposed information, and Gram–Schmidt turned independent vectors into an orthonormal basis.',
    concepts: [
      'Dot products combine magnitude and directional agreement.',
      'Projection separates explained and residual components.',
      'Rank measures how many independent directions survive.',
      'Gram–Schmidt produces perpendicular unit vectors spanning the same space.',
    ],
    steps: [
      'Implement vector operations rather than treating them as black boxes.',
      'Use dot product and cosine similarity to measure alignment.',
      'Project one vector onto another and inspect the residual.',
      'Test linear dependence and determine rank.',
      'Orthogonalize an independent set with Gram–Schmidt.',
    ],
    architecture: [
      'Independent vectors',
      'Projection',
      'Residual subtraction',
      'Normalization',
      'Orthonormal basis',
    ],
    architectureText:
      'Each new basis vector is built by removing components already explained by earlier basis vectors, then normalizing what remains.',
    needle: 'u1 = v1 / |v1|',
    codeLines: 18,
    codeAnalysis:
      'The source records the algorithm in symbolic pseudocode after building the prerequisite ideas across nine earlier sessions. The sequence makes the final procedure explainable.',
    designNote:
      'Classical Gram–Schmidt is intuitive but can lose numerical orthogonality. Modified Gram–Schmidt or QR decomposition is preferred when stability matters.',
    quote:
      'A basis is not just a coordinate system; it is a decision about which directions make information easy to express.',
    limitation:
      'The work establishes intuition and hand-built operations but does not yet compare numerical stability across orthogonalization algorithms.',
    nextStep:
      'Use the custom Matrix abstraction to construct a two-layer neural-network forward pass without NumPy.',
  },
  {
    day: 14,
    phase: 'neural',
    title: 'A Neural Network Before Frameworks: Matrix Multiplication, Bias, and ReLU',
    summary:
      'I assembled a two-layer forward pass using a custom Matrix class to expose every shape transformation.',
    question: 'What is a neural network when the framework abstractions are removed?',
    opening:
      'The network reduced to a sequence of linear transformations and nonlinear activations. Building it with a custom Matrix class made dimensions impossible to ignore: inputs, weights, biases, hidden activations, and outputs each had a precise shape.',
    concepts: [
      'Weights linearly mix input features.',
      'Biases shift activation thresholds independently of the input.',
      'ReLU introduces the nonlinearity needed to compose expressive functions.',
      'Layer shapes define which matrix products are valid.',
    ],
    steps: [
      'Represent the input as a column vector.',
      'Initialize first-layer weights and bias with compatible dimensions.',
      'Compute the hidden pre-activation and apply ReLU.',
      'Repeat the transformation for the output layer.',
      'Print every shape and verify the architecture contract.',
    ],
    architecture: [
      'Input 3×1',
      'Linear layer 4×3',
      'ReLU hidden 4×1',
      'Linear layer 2×4',
      'Output 2×1',
    ],
    architectureText:
      'The inner dimensions must match at each multiplication. The resulting outer dimensions become the activation shape passed to the next layer.',
    needle: 'from session01_Matrix_Operations',
    codeLines: 30,
    codeAnalysis:
      'The code is a complete forward pass with no training loop. That separation is valuable: it proves the network’s computation and shapes before adding gradients and optimization.',
    designNote:
      'Random initialization should be seeded for repeatable experiments and scaled according to activation choice to control signal variance.',
    quote:
      'A neural layer is not mysterious: it is a shape-checked transformation followed by a nonlinearity.',
    limitation:
      'The network does not compute a loss, gradients, parameter updates, or dataset metrics; it establishes only forward computation.',
    nextStep:
      'Study transformations and eigenvectors to understand how matrices reshape spaces and preserve special directions.',
  },
  {
    day: 15,
    phase: 'neural',
    title: 'Transformations and Eigenvectors: Seeing What a Matrix Preserves',
    summary:
      'Rotation, scaling, shearing, reflection, composition, determinants, and eigenvectors connected matrix algebra to geometry.',
    question: 'Which directions survive a transformation without changing orientation?',
    opening:
      'Matrices became active geometric operators rather than static grids of numbers. Visualizing rotation, scaling, shear, and reflection made composition intuitive; eigenvectors then identified the rare directions a transformation only stretches or flips.',
    concepts: [
      'A transformation maps every vector to a new position.',
      'Composition corresponds to ordered matrix multiplication.',
      'The determinant tracks orientation and area or volume scaling.',
      'Eigenvectors preserve direction while eigenvalues describe scaling.',
    ],
    steps: [
      'Apply elementary transformations to concrete vectors.',
      'Compose transformations and observe that order matters.',
      'Use determinants to inspect global scaling and orientation.',
      'Compute eigenvalues and eigenvectors numerically.',
      'Verify the defining relation by multiplying the matrix and vector.',
    ],
    architecture: [
      'Vector space',
      'Transformation matrix',
      'Mapped vectors',
      'Eigen decomposition',
      'Invariant directions',
    ],
    architectureText:
      'Most vectors rotate into new directions. Eigenvectors form the exceptional set whose direction is preserved, with the eigenvalue recording the scale change.',
    needle: 'import numpy as np',
    codeLines: 28,
    codeAnalysis:
      'The representative code computes eigenpairs and checks each one against the transformation. Verification turns a library result into evidence of the mathematical identity.',
    designNote:
      'Eigenvectors can be unstable when eigenvalues are repeated or nearly equal. Interpretation must consider numerical conditioning and the structure of the matrix.',
    quote: 'Eigenvectors reveal the coordinate directions a transformation cannot disguise.',
    limitation:
      'The exercises focus on small matrices and visual intuition; they do not yet handle sparse operators, complex eigenpairs, or large-scale iterative solvers.',
    nextStep:
      'Introduce derivatives, gradients, the chain rule, curvature, and optimizers—the mechanics that let models learn.',
  },
  {
    day: 16,
    phase: 'neural',
    title: 'Calculus Becomes an Optimizer: Gradients, Chain Rule, Hessians, Momentum, and RMSProp',
    summary: 'Derivatives moved from symbolic slopes to executable parameter-update algorithms.',
    question: 'How does local slope information become a reliable sequence of learning steps?',
    opening:
      'Calculus became operational. Numerical and analytical derivatives checked each other, partial derivatives assembled gradients, the chain rule propagated influence through compositions, and the Hessian exposed curvature. Those ideas culminated in optimizer implementations.',
    concepts: [
      'A derivative measures local sensitivity.',
      'A gradient collects partial derivatives for many parameters.',
      'The chain rule propagates influence through composed operations.',
      'Momentum and RMSProp use history to reshape the update.',
    ],
    steps: [
      'Define a loss function with known analytical derivative.',
      'Approximate the derivative numerically as a correctness check.',
      'Extend from one variable to gradients and Hessians.',
      'Implement ordinary gradient descent.',
      'Add velocity or squared-gradient memory and compare trajectories.',
    ],
    architecture: [
      'Current parameters',
      'Loss evaluation',
      'Gradient or Hessian',
      'Optimizer state',
      'Updated parameters',
    ],
    architectureText:
      'Learning is a feedback loop. The objective measures error, derivatives explain sensitivity, optimizer state shapes the response, and the parameters become the next input.',
    needle: 'def loss_function',
    codeLines: 52,
    codeAnalysis:
      'The optimizer file keeps the objective and gradient separate from update strategies. That makes ordinary descent, momentum, and RMSProp directly comparable against the same landscape.',
    designNote:
      'Optimizer comparisons are meaningful only when initialization, objective, step budget, and stopping conditions are controlled.',
    quote: 'An optimizer is memory plus a rule for turning slope into motion.',
    limitation:
      'The experiments use low-dimensional deterministic functions; stochastic gradients and neural-network parameter scales introduce additional behavior.',
    nextStep: 'Follow gradient signals through an actual neuron and then a multilayer computation.',
  },
  {
    day: 17,
    phase: 'neural',
    title: 'From Curvature to Backpropagation: Following Credit Through a Network',
    summary:
      'Second-order ideas, integrals, and manual backpropagation connected calculus to learning in a neuron.',
    question: 'How does one prediction error assign responsibility to every upstream parameter?',
    opening:
      'Backpropagation became understandable when reduced to local derivatives. The loss produced a signal, each operation multiplied that signal by its local sensitivity, and the resulting parameter gradients drove a controlled update.',
    concepts: [
      'The loss is the scalar objective that initiates gradient flow.',
      'Local derivatives distribute credit or blame through the graph.',
      'Weight and bias gradients have different local factors.',
      'A learning rate controls how much of the computed correction is applied.',
    ],
    steps: [
      'Run a forward pass for one prediction.',
      'Compute the error and squared loss.',
      'Differentiate the loss with respect to the prediction.',
      'Apply the chain rule to weight and bias.',
      'Update parameters and verify that loss moves in the intended direction.',
    ],
    architecture: [
      'Input and parameters',
      'Prediction',
      'Loss signal',
      'Local gradients',
      'Parameter update',
    ],
    architectureText:
      'The forward path calculates what happened. The backward path explains how each parameter contributed, enabling a targeted correction.',
    needle: 'def one_weight_step',
    codeLines: 46,
    codeAnalysis:
      'The one-weight and one-neuron functions expose every intermediate value: prediction, error, loss signal, gradients, and updated parameters. Nothing is delegated to a framework.',
    designNote:
      'A gradient formula is not trusted because it looks plausible. It should be checked numerically and tested on cases where the expected direction is known.',
    quote: 'Backpropagation is bookkeeping for causality in a differentiable program.',
    limitation:
      'The manual derivation covers small scalar paths and does not yet manage arbitrary computation graphs or accumulated gradients.',
    nextStep:
      'Build a scalar automatic-differentiation engine that records the graph and performs backward traversal automatically.',
  },
  {
    day: 18,
    phase: 'neural',
    title: 'Building Autodiff from Scratch: A Scalar Engine, MLP, XOR, and Gradient Checks',
    summary:
      'Nine sessions assembled an automatic-differentiation engine and used it to train a multilayer perceptron.',
    question:
      'Can I reproduce the essential learning machinery of a deep-learning framework with code I can fully explain?',
    opening:
      'This was the integration milestone of the first 18 days. A Value object recorded operands and operations, closures implemented local backward rules, topological ordering guaranteed dependency-safe traversal, and neural layers composed those values into a trainable MLP.',
    concepts: [
      'Each Value stores data, gradient, parents, and the operation that created it.',
      'Backward closures implement local derivative rules.',
      'Topological order ensures children propagate before parents are finalized.',
      'Gradient checking compares autodiff with finite differences.',
    ],
    steps: [
      'Implement scalar addition, multiplication, powers, and activation operations.',
      'Record parent links and local backward functions.',
      'Traverse the graph in reverse topological order.',
      'Compose Value objects into neurons, layers, and an MLP.',
      'Train XOR, check gradients, and compare selected results with PyTorch.',
    ],
    architecture: [
      'Scalar operations',
      'Dynamic computation graph',
      'Reverse topological pass',
      'Neuron and layer composition',
      'MLP training loop',
    ],
    architectureText:
      'Forward operations construct both values and graph edges. The backward pass reverses that graph, accumulating gradient contributions before the optimizer changes parameters.',
    needle: 'class Value:',
    codeLines: 62,
    codeAnalysis:
      'The Value class overloads arithmetic while attaching a backward closure to each result. That compact interface lets ordinary-looking expressions build a differentiable graph.',
    designNote:
      'Gradients must accumulate with += because one value can influence the loss through multiple downstream paths. Overwriting would silently discard valid contributions.',
    quote:
      'The framework stopped being magic when every edge in the graph had a derivative rule I wrote myself.',
    limitation:
      'The engine is scalar, educational, and CPU-bound. It lacks tensor kernels, broadcasting, memory planning, mixed precision, and production-grade numerical safeguards.',
    nextStep:
      'Add probability and information-theoretic losses so model outputs can represent calibrated class beliefs.',
  },
  {
    day: 19,
    phase: 'probability',
    title: 'Probability into Loss: Distributions, Log-Softmax, and Cross-Entropy',
    summary:
      'Probability distributions became executable model outputs and cross-entropy became the bridge from confidence to training signal.',
    question:
      'How should a classifier express uncertainty, and how should the loss penalize confident mistakes?',
    opening:
      'The day built probability from events and distributions through expectation, variance, joint and marginal reasoning, the central limit theorem, log probabilities, softmax, and cross-entropy. The progression connected uncertainty to classification training.',
    concepts: [
      'A probability distribution assigns normalized mass to outcomes.',
      'Softmax maps arbitrary logits to positive probabilities.',
      'Log-softmax performs the transformation stably in log space.',
      'Cross-entropy scores the log probability assigned to the true class.',
    ],
    steps: [
      'Model common discrete and continuous distributions.',
      'Compute expectation and variance as distribution summaries.',
      'Transform classifier logits with a stable log-sum-exp calculation.',
      'Select the target class log probability.',
      'Negate it to obtain cross-entropy loss and inspect confidence effects.',
    ],
    architecture: [
      'Model logits',
      'Stable log-sum-exp',
      'Log probabilities',
      'Target selection',
      'Cross-entropy loss',
    ],
    architectureText:
      'The stable path avoids exponentiating large raw logits directly. The target selects one log probability, and its negative becomes the scalar objective for backpropagation.',
    needle: 'import math',
    codeLines: 46,
    codeAnalysis:
      'The implementation subtracts the maximum logit before exponentiation and computes log probabilities before the loss. That is the numerically stable route used by mature libraries.',
    designNote:
      'A low cross-entropy loss measures fit to labeled outcomes, not calibration by itself. Reliability diagrams and proper evaluation are needed to assess confidence quality.',
    quote:
      'A classifier is not only choosing a label; it is making a quantified claim under uncertainty.',
    limitation:
      'The repository covers core distributions and loss mechanics but does not yet evaluate calibration, class imbalance, label smoothing, or out-of-distribution uncertainty.',
    nextStep:
      'Move from fixed probabilities to Bayesian updating, posterior uncertainty, and evidence-aware decisions.',
  },
  {
    day: 20,
    phase: 'probability',
    title:
      'Bayesian Reasoning: Priors, Likelihoods, Posteriors, Naive Bayes, MLE, MAP, and A/B Tests',
    summary:
      'Nineteen sessions developed Bayesian updating from first principles and turned it into a simulation-based product decision.',
    question:
      'How should beliefs change when new evidence arrives, especially when data is limited?',
    opening:
      'Bayesian reasoning reframed probability as an update process. Priors encoded starting uncertainty, likelihoods measured compatibility with evidence, posteriors combined both, and conjugate Beta updates made repeated Bernoulli observations concrete.',
    concepts: [
      'Bayes’ rule reverses conditional probability with base rates included.',
      'A prior records uncertainty before the current evidence.',
      'The likelihood describes how probable the observations are under a hypothesis.',
      'The posterior becomes the next prior in sequential learning.',
    ],
    steps: [
      'Derive Bayes’ rule from conditional probability and total probability.',
      'Test intuition with medical base-rate examples.',
      'Build a Naive Bayes classifier with smoothing and log probabilities.',
      'Compare MLE, MAP, and posterior means.',
      'Run Bayesian A/B simulations and estimate both win probability and useful lift.',
    ],
    architecture: [
      'Prior belief',
      'Observed evidence',
      'Likelihood',
      'Posterior distribution',
      'Decision threshold',
    ],
    architectureText:
      'Evidence does not replace the prior; it reweights it. The posterior preserves uncertainty and supports decisions based on probability of benefit rather than a single point estimate.',
    needle: 'def posterior',
    codeLines: 50,
    codeAnalysis:
      'The A/B implementation samples conversion rates from two Beta posteriors, measures how often B wins, and separately measures how often its lift clears a practical threshold.',
    designNote:
      '“Probability B wins” and “probability B improves enough to matter” answer different questions. Product decisions need the second quantity as well as the first.',
    quote: 'Evidence should update confidence, not erase uncertainty.',
    limitation:
      'The simulations assume Bernoulli outcomes and chosen priors; real experiments must also handle segmentation, stopping rules, novelty effects, and business costs.',
    nextStep:
      'Study how optimizers behave across difficult landscapes and compare gradient descent, momentum, and Adam under controlled conditions.',
  },
  {
    day: 21,
    phase: 'probability',
    title: 'Optimization in the Wild: Gradient Descent, Momentum, Adam, Schedules, and Rosenbrock',
    summary:
      'The first 21-day arc closed with controlled optimizer experiments across difficult loss landscapes.',
    question:
      'Why do optimizers with the same gradient reach different outcomes on the same landscape?',
    opening:
      'Optimization became an experimental discipline rather than a formula. Batch choices changed gradient noise, momentum carried velocity through shallow regions, Adam adapted updates with first and second moments, and learning-rate schedules changed the journey over time.',
    concepts: [
      'Learning rate determines the scale of every update.',
      'Mini-batches trade exact gradients for cheaper, noisier estimates.',
      'Momentum smooths directions by accumulating velocity.',
      'Adam combines momentum-like first moments with adaptive second-moment scaling.',
    ],
    steps: [
      'Define a common objective and analytical gradient.',
      'Implement gradient descent, momentum, and Adam behind the same step interface.',
      'Control initialization, learning rate, and iteration budget.',
      'Run each optimizer on the Rosenbrock valley.',
      'Compare convergence traces and inspect sensitivity to hyperparameters.',
    ],
    architecture: [
      'Loss landscape',
      'Gradient sample',
      'Optimizer state',
      'Scheduled update',
      'Convergence trace',
    ],
    architectureText:
      'Every optimizer receives the same local gradient. Its internal state and schedule transform that signal into a different trajectory across the landscape.',
    needle: 'from math import isfinite, sqrt',
    codeLines: 70,
    codeAnalysis:
      'The comparison file defines one Rosenbrock objective, one gradient, and three optimizer classes. A shared experiment harness makes the trajectories comparable rather than anecdotal.',
    designNote:
      'An optimizer “winning” one toy landscape does not make it universally superior. The evidence supports behavior under the documented setup, not a global ranking.',
    quote:
      'Learning is not only the direction of the gradient; it is the history of how we choose to follow it.',
    limitation:
      'The experiments are intentionally small and synthetic. Neural training adds stochastic data, high-dimensional parameter spaces, regularization, and hardware constraints.',
    nextStep:
      'Convert the 21-day foundation into production AI projects with datasets, evaluation protocols, reproducible experiments, deployment, and monitoring.',
  },
];

const sourceIndex = JSON.parse(await readFile('.wrangler/ai-journey-sources.json', 'utf8'));
const sourceByDay = new Map(sourceIndex.days.map((entry) => [entry.day, entry]));

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function compactSource(source, needle, wantedLines) {
  const lines = source.replace(/\r/g, '').split('\n');
  let start = Math.max(
    0,
    lines.findIndex((line) => line.includes(needle)),
  );
  if (start < 0) start = 0;
  const picked = [];
  let inTriple = false;
  for (let index = start; index < lines.length && picked.length < wantedLines; index += 1) {
    const line = lines[index];
    const tripleCount = (line.match(/'''|\"\"\"/g) ?? []).length;
    if (inTriple) {
      if (tripleCount % 2 === 1) inTriple = false;
      continue;
    }
    if (tripleCount > 0) {
      if (tripleCount % 2 === 1) inTriple = true;
      continue;
    }
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    picked.push(line.replace(/\s+$/, ''));
  }
  return picked.join('\n').trim();
}

function block(day, sequence, type, fields) {
  return {
    id: `day-${String(day).padStart(2, '0')}-${String(sequence).padStart(2, '0')}`,
    type,
    ...fields,
  };
}

function makeBlocks(entry, source) {
  const phase = phases[entry.phase];
  const evidenceId = `evidence-ai-journey-day-${String(entry.day).padStart(2, '0')}`;
  const filename = path.posix.basename(source.representativePath);
  const code = compactSource(source.source, entry.needle, entry.codeLines);
  const evidenceCommit = source.newestCommit;
  const blocks = [];
  const add = (type, fields) => blocks.push(block(entry.day, blocks.length + 1, type, fields));

  add('heading', { level: 2, text: `Day ${String(entry.day).padStart(2, '0')} — ${phase.name}` });
  add('paragraph', { text: entry.opening });
  add('image', {
    url: phase.image,
    alt: phase.alt,
    caption: `${phase.name}: an original visual chapter marker for Days ${entry.phase === 'foundations' ? '01–05' : entry.phase === 'design' ? '06–10' : entry.phase === 'numerical' ? '11–13' : entry.phase === 'neural' ? '14–18' : '19–21'}.`,
  });
  add('callout', { calloutType: 'info', title: 'Engineering question', text: entry.question });
  add('heading', { level: 2, text: 'The mental model I built' });
  add('list', { style: 'unordered', items: entry.concepts });
  add('architecture_diagram', {
    title: `${entry.title.split(':')[0]} — reasoning flow`,
    nodes: entry.architecture,
    text: entry.architectureText,
  });
  add('heading', { level: 2, text: 'Step-by-step implementation' });
  add('list', { style: 'ordered', items: entry.steps });
  add('heading', { level: 3, text: 'Repository excerpt' });
  add('code_block', {
    language: 'python',
    caption: `${source.representativePath} — source-authored excerpt`,
    code,
  });
  add('paragraph', { text: entry.codeAnalysis });
  add('callout', { calloutType: 'tip', title: 'Engineering design note', text: entry.designNote });
  add('heading', { level: 2, text: 'Evidence and measurable scope' });
  add('metrics', {
    title: `Day ${String(entry.day).padStart(2, '0')} repository evidence`,
    items: [
      `${source.fileCount} | Authored files | Day folder, generated environments excluded`,
      `${source.commitCount} | Commits | GitHub history scoped to this day`,
      `${source.sourceLineCount} | Source lines | Representative file: ${filename}`,
      `${evidenceCommit.sha.slice(0, 8)} | Evidence commit | Latest commit touching the day folder`,
    ],
  });
  add('list', {
    style: 'unordered',
    items: [
      `Day folder: ${source.folderUrl}`,
      `Representative source: ${source.representativeUrl}`,
      `Evidence commit: ${evidenceCommit.url}`,
      `Commit message: ${evidenceCommit.message}`,
    ],
  });
  add('embed_artifact', {
    artifactId,
    caption: `Open the complete 21-day GitHub evidence index (includes Day ${String(entry.day).padStart(2, '0')})`,
  });
  add('heading', { level: 2, text: 'Reflection, limits, and the next experiment' });
  add('quote', {
    text: entry.quote,
    cite: `Usman Ali — Day ${String(entry.day).padStart(2, '0')} reflection`,
  });
  add('paragraph', { text: entry.limitation });
  add('callout', { calloutType: 'note', title: 'Next experiment', text: entry.nextStep });
  add('heading', { level: 2, text: 'Connected knowledge graph' });
  add('relationship_tag', {
    entityType: 'project',
    entityId: projectId,
    label: 'AI Engineer Journey — From Fundamentals to Production AI',
  });
  add('relationship_tag', {
    entityType: 'evidence',
    entityId: evidenceId,
    label: `Source-verified GitHub evidence — Day ${String(entry.day).padStart(2, '0')}`,
  });
  add('paragraph', {
    text: `This entry is connected to the public project record and a source-verified evidence record. The canonical repository remains ${sourceIndex.repository}.`,
  });
  return blocks;
}

function estimateReadingTime(blocks) {
  const text = blocks
    .flatMap((item) => [
      item.text,
      item.title,
      item.caption,
      item.code,
      ...(item.items ?? []),
      ...(item.nodes ?? []),
    ])
    .filter(Boolean)
    .join(' ');
  return Math.max(5, Math.ceil(text.split(/\s+/).length / 190));
}

const artifactLines = [
  '# AI Engineer Journey — 21-Day Evidence Index',
  '',
  `Repository: ${sourceIndex.repository}`,
  `Captured for the portfolio: ${generatedAt}`,
  '',
  'This artifact maps each private journal draft to the public GitHub folder, a representative source file, and the latest commit that touched that day. File counts exclude the accidentally committed virtual environment and generated bytecode.',
  '',
];

for (const entry of journal) {
  const source = sourceByDay.get(entry.day);
  artifactLines.push(
    `## Day ${String(entry.day).padStart(2, '0')} — ${entry.title}`,
    '',
    `- Day folder: ${source.folderUrl}`,
    `- Representative source: ${source.representativeUrl}`,
    `- Evidence commit: ${source.newestCommit.url}`,
    `- Commit: \`${source.newestCommit.sha}\` — ${source.newestCommit.message}`,
    `- Scope: ${source.fileCount} authored files and ${source.commitCount} commits`,
    '',
  );
}

const artifactBody = `${artifactLines.join('\n')}\n`;
const artifactBytes = Buffer.byteLength(artifactBody);
const artifactChecksum = createHash('sha256').update(artifactBody).digest('hex');

// Remote D1 executes uploaded SQL as a managed batch and rejects explicit
// BEGIN/COMMIT statements.
const statements = [];
statements.push(
  `UPDATE projects SET repository_url = ${sql(sourceIndex.repository)}, updated_at = ${sql(generatedAt)}, version_no = version_no + 1 WHERE id = ${sql(projectId)} AND repository_url IS NULL;`,
);
statements.push(
  `INSERT INTO artifacts (id, owner_id, title, description, artifact_type, media_type, byte_size, checksum, r2_key, r2_public_key, original_name, visibility, created_at, updated_at, archived_at, deleted_at, uploaded_by) VALUES (${sql(artifactId)}, ${sql(ownerId)}, ${sql('AI Engineer Journey — 21-Day Evidence Index')}, ${sql('Canonical map of all 21 journal entries to GitHub folders, representative source files, and source commit evidence.')}, ${sql('source_index')}, ${sql('text/markdown; charset=utf-8')}, ${artifactBytes}, ${sql(artifactChecksum)}, ${sql(r2Key)}, NULL, ${sql(artifactName)}, 'public', ${sql(generatedAt)}, ${sql(generatedAt)}, NULL, NULL, ${sql(ownerEmail)}) ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, artifact_type=excluded.artifact_type, media_type=excluded.media_type, byte_size=excluded.byte_size, checksum=excluded.checksum, r2_key=excluded.r2_key, original_name=excluded.original_name, visibility=excluded.visibility, updated_at=excluded.updated_at, archived_at=NULL, deleted_at=NULL;`,
);

const tagNames = new Map([
  ['ai-engineer-journey', 'AI Engineer Journey'],
  ['python', 'Python'],
  ['mathematics-for-ai', 'Mathematics for AI'],
  ...Object.entries(phases).map(([key, phase]) => [`phase-${key}`, phase.name]),
]);
for (const [slug, name] of tagNames) {
  statements.push(
    `INSERT INTO journal_tags (id, owner_id, name, slug, created_at) VALUES (${sql(`tag-${slug}`)}, ${sql(ownerId)}, ${sql(name)}, ${sql(slug)}, ${sql(generatedAt)}) ON CONFLICT(owner_id, slug) DO UPDATE SET name=excluded.name;`,
  );
}

for (const entry of journal) {
  const day = String(entry.day).padStart(2, '0');
  const contentId = `ai-journey-day-${day}`;
  const revisionId = `${contentId}-rev-rich-1`;
  const evidenceId = `evidence-ai-journey-day-${day}`;
  const source = sourceByDay.get(entry.day);
  const blocks = makeBlocks(entry, source);
  const readingTime = estimateReadingTime(blocks);
  const phase = phases[entry.phase];
  const provenance = {
    repository: sourceIndex.repository,
    branch: sourceIndex.branch,
    folder: source.folder,
    folderUrl: source.folderUrl,
    representativePath: source.representativePath,
    representativeUrl: source.representativeUrl,
    newestCommit: source.newestCommit,
    oldestCommit: source.oldestCommit,
    authoredFiles: source.files,
    capturedAt: sourceIndex.capturedAt,
  };
  const signals = {
    publicRepository: true,
    commitScoped: true,
    representativeSourceCaptured: true,
    authoredFileCount: source.fileCount,
    commitCount: source.commitCount,
  };

  statements.push(`DELETE FROM content_revisions WHERE id = ${sql(revisionId)};`);
  statements.push(
    `INSERT INTO content_revisions (id, content_item_id, owner_id, revision_no, body_snapshot, body_schema_version, revision_note, created_at, created_by) VALUES (${sql(revisionId)}, ${sql(contentId)}, ${sql(ownerId)}, 2, ${sql(JSON.stringify(blocks))}, 'v1', ${sql('Complete portfolio-grade rewrite: narrative, code, callouts, architecture, metrics, visual, artifact, evidence, and relationships.')}, ${sql(generatedAt)}, ${sql(ownerEmail)});`,
  );
  statements.push(
    `UPDATE content_items SET title=${sql(`Day ${day} — ${entry.title}`)}, summary=${sql(entry.summary)}, reading_time_minutes=${readingTime}, occurred_at=${sql(source.oldestCommit.date)}, cover_image_url=${sql(phase.image)}, is_featured=${entry.day === 18 || entry.day === 21 ? 1 : 0}, comments_enabled=1, seo_title=${sql(`Day ${day}: ${entry.title}`)}, seo_description=${sql(entry.summary)}, updated_at=${sql(generatedAt)}, version_no=2 WHERE id=${sql(contentId)} AND owner_id=${sql(ownerId)};`,
  );
  statements.push(
    `INSERT INTO evidence_items (id, owner_id, evidence_type, source_type, provider, external_id, canonical_locator, title, description, provider_created_at, provider_updated_at, captured_at, occurred_at, content_hash, authorship_note, provenance_snapshot, verification_state, verification_method, verified_by, verified_at, quality_signals, visibility, created_at, updated_at, archived_at, version_no) VALUES (${sql(evidenceId)}, ${sql(ownerId)}, 'commit', 'github', 'github', ${sql(source.newestCommit.sha)}, ${sql(source.folderUrl)}, ${sql(`AI Engineer Journey Day ${day} — GitHub source`)}, ${sql(`Source evidence for ${entry.title}. Includes the day folder, representative code, authored file scope, and commit history.`)}, ${sql(source.oldestCommit.date)}, ${sql(source.newestCommit.date)}, ${sql(sourceIndex.capturedAt)}, ${sql(source.oldestCommit.date)}, ${sql(source.newestCommit.sha)}, ${sql('Authored in the public usman611b/ai-engineer-journey repository.')}, ${sql(JSON.stringify(provenance))}, 'source_verified', ${sql('Verified against the public GitHub API, raw source, repository path, and commit SHA.')}, ${sql('github.com/usman611b')}, ${sql(generatedAt)}, ${sql(JSON.stringify(signals))}, 'public', ${sql(generatedAt)}, ${sql(generatedAt)}, NULL, 1) ON CONFLICT(id) DO UPDATE SET external_id=excluded.external_id, canonical_locator=excluded.canonical_locator, title=excluded.title, description=excluded.description, provider_created_at=excluded.provider_created_at, provider_updated_at=excluded.provider_updated_at, captured_at=excluded.captured_at, occurred_at=excluded.occurred_at, content_hash=excluded.content_hash, provenance_snapshot=excluded.provenance_snapshot, verification_state=excluded.verification_state, verification_method=excluded.verification_method, verified_by=excluded.verified_by, verified_at=excluded.verified_at, quality_signals=excluded.quality_signals, visibility=excluded.visibility, updated_at=excluded.updated_at, archived_at=NULL;`,
  );
  statements.push(
    `INSERT OR IGNORE INTO evidence_verification_events (id, evidence_item_id, owner_id, previous_state, new_state, verification_method, verifier_identity, rationale, created_at) VALUES (${sql(`verify-${evidenceId}`)}, ${sql(evidenceId)}, ${sql(ownerId)}, 'unverified', 'source_verified', ${sql('Public GitHub source and commit verification')}, ${sql('github.com/usman611b')}, ${sql('Folder, representative source, commit SHA, timestamps, and authored file count were captured from GitHub.')}, ${sql(generatedAt)});`,
  );
  statements.push(
    `INSERT INTO evidence_links (id, evidence_item_id, project_id, support_type, rationale, approval_state, approved_by, approved_at, created_at, updated_at, relevance, ordering, provenance) VALUES (${sql(`link-${evidenceId}-project`)}, ${sql(evidenceId)}, ${sql(projectId)}, 'demonstrates', ${sql(`Day ${day} source demonstrates incremental work in the AI Engineer Journey project.`)}, 'approved', ${sql(ownerEmail)}, ${sql(generatedAt)}, ${sql(generatedAt)}, ${sql(generatedAt)}, 5, ${entry.day}, ${sql('GitHub folder and commit history')}) ON CONFLICT(id) DO UPDATE SET rationale=excluded.rationale, approval_state='approved', approved_by=excluded.approved_by, approved_at=excluded.approved_at, updated_at=excluded.updated_at, relevance=5, ordering=excluded.ordering, provenance=excluded.provenance;`,
  );
  statements.push(
    `INSERT INTO evidence_links (id, evidence_item_id, content_item_id, support_type, rationale, approval_state, approved_by, approved_at, created_at, updated_at, relevance, ordering, provenance) VALUES (${sql(`link-${evidenceId}-content`)}, ${sql(evidenceId)}, ${sql(contentId)}, 'demonstrates', ${sql(`Source-verified GitHub work directly supports the implementation claims in journal Day ${day}.`)}, 'approved', ${sql(ownerEmail)}, ${sql(generatedAt)}, ${sql(generatedAt)}, ${sql(generatedAt)}, 5, 0, ${sql('GitHub folder, source excerpt, and commit SHA')}) ON CONFLICT(id) DO UPDATE SET rationale=excluded.rationale, approval_state='approved', approved_by=excluded.approved_by, approved_at=excluded.approved_at, updated_at=excluded.updated_at, relevance=5, provenance=excluded.provenance;`,
  );

  const entryTags = [
    'ai-engineer-journey',
    entry.day <= 12 ? 'python' : 'mathematics-for-ai',
    `phase-${entry.phase}`,
  ];
  for (const [ordering, slug] of entryTags.entries()) {
    statements.push(
      `INSERT OR IGNORE INTO journal_entry_tags (content_item_id, tag_id, ordering, created_at) VALUES (${sql(contentId)}, ${sql(`tag-${slug}`)}, ${ordering}, ${sql(generatedAt)});`,
    );
  }
}

await mkdir('.wrangler/generated', { recursive: true });
await writeFile(`.wrangler/generated/${artifactName}`, artifactBody, 'utf8');
await writeFile(
  '.wrangler/generated/ai-engineer-journey-rich.sql',
  `${statements.join('\n')}\n`,
  'utf8',
);
await writeFile(
  '.wrangler/generated/ai-engineer-journey-rich-report.json',
  JSON.stringify(
    {
      generatedAt,
      artifact: {
        id: artifactId,
        name: artifactName,
        r2Key,
        bytes: artifactBytes,
        checksum: artifactChecksum,
      },
      entries: journal.map((entry) => {
        const source = sourceByDay.get(entry.day);
        const blocks = makeBlocks(entry, source);
        return {
          day: entry.day,
          id: `ai-journey-day-${String(entry.day).padStart(2, '0')}`,
          title: entry.title,
          blocks: blocks.length,
          blockTypes: [...new Set(blocks.map((item) => item.type))],
          readingTimeMinutes: estimateReadingTime(blocks),
          evidenceId: `evidence-ai-journey-day-${String(entry.day).padStart(2, '0')}`,
          representativeSource: source.representativeUrl,
        };
      }),
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`Built ${journal.length} rich journal revisions.`);
console.log(`Artifact: ${artifactName} (${artifactBytes} bytes, sha256 ${artifactChecksum})`);
console.log(`SQL statements: ${statements.length}`);
console.log(
  'Each entry includes heading, paragraph, code, callout, quote, list, image, architecture, metrics, artifact, and relationships.',
);

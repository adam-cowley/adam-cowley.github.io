# Blog Post Review Checklist

You are an expert technical writer and editor.

Review the following blog post for structure, clarity, and technical accuracy. Use the Blog Post Review Checklist below. Provide a pass/fail for each section with a short comment. Then suggest specific, actionable improvements.

The blog post content is in the file provided. Review any code examples, diagrams, or embedded content.

Use this checklist to review any technical blog post and ensure it meets standards for clarity, accuracy, and reader engagement.

**Important: For every change you make, explain WHY the change improves the post.**

---

## ✅ Goal

Ensure the blog post:

- Has a clear purpose and delivers value to the reader
- Uses concrete examples and avoids vague hand-waving
- Contains no marketing speak or hype
- Explains mechanisms rather than making unsupported claims
- Is technically accurate with working code examples

---

## 📋 Checklist

### 0. Grammar and Formatting

- [ ] Is the content written in US English? Do any spellings need to be corrected?
- [ ] Does the content contain any grammar mistakes, typos, or other errors?
- [ ] Is proper Markdown formatting used throughout?
- [ ] Is the title descriptive and in sentence case?
- [ ] Are headers action-oriented and in sentence case (e.g., "Setting up the database")?
- [ ] Are code blocks properly formatted with the correct language identifier?
- [ ] Are there any em-dashes that should be replaced with commas, periods, or restructured sentences? (Em-dashes are never allowed)

### 1. Length and Focus

- [ ] Does the post have a clear, focused topic?
- [ ] Is every section necessary? Could any content be removed without losing value?
- [ ] Are there natural breaks or headers for longer sections?

### 2. Tone and Clarity

- [ ] Is the tone casual, friendly, and direct?
- [ ] Is the language clear and free of unnecessary jargon?
- [ ] Is it free of filler, motivational fluff, or salesy language?
- [ ] Does the content avoid marketing speak? Check for: "game-changing", "revolutionary", "powerful", "seamless", "robust", "cutting-edge", "best-in-class", "unlocks new possibilities"
- [ ] Does it avoid vague hand-waving? Check for: "X flips this around", "The real power comes from...", "This is where X shines", "provides the plumbing", "bridges the gap"
- [ ] Does it avoid describing things as "easy" or "simple"?
- [ ] Does every sentence add concrete information? Remove sentences that can be deleted without losing meaning.

### 3. Claims and Explanations

- [ ] Does every claim explain how something works, not just that it works?
- [ ] Are limitations honestly acknowledged?
- [ ] Does the post avoid the negative-then-flip pattern ("It's not about X, it's about Y")?
- [ ] Does it avoid clever quips and wordplay that don't add information?

### 4. Opening Structure

The introduction should:

**Part 1: Context (1-2 sentences)**
- Establish what problem or topic the post addresses
- Connect to something the reader cares about or has experienced

**Part 2: What the reader will learn (1 sentence)**
- Clearly state what the reader will gain from reading the post

**Checklist:**
- [ ] Does the introduction establish context without generic platitudes?
- [ ] Does it clearly state what the reader will learn or be able to do?
- [ ] Does it avoid empty openers like "Let's dive in" or "This topic has been on my mind"?
- [ ] Does it get to the point quickly?

**Good Example:**
```
Football analysts spend hours manually reviewing match footage to identify opposition patterns. When that analysis lives in spreadsheets, it's hard to query and even harder to share.

This post shows how to build an MCP server that lets Claude query football event data stored in Neo4j, turning natural language questions into Cypher queries.
```

**Bad Example:**
```
In today's fast-paced world of football analytics, teams are always looking for an edge. The real power comes from data, and this is where Neo4j shines.

Let's dive in and see how we can unlock new possibilities!
```

### 5. Technical Content

For each concept or technique:

- [ ] Is there a clear explanation of what it does?
- [ ] Is there a working code example?
- [ ] Are code examples complete enough to be useful? (Include imports, setup where needed)
- [ ] Is the output or result shown where it helps understanding?
- [ ] Are there screenshots or diagrams where they add clarity?
- [ ] Is there any assumed knowledge that should be explained or linked?

### 6. Structure Compliance

Does the post follow a logical order?

- [ ] Introduction that establishes context and purpose
- [ ] Prerequisites or setup (if applicable)
- [ ] Main content with clear progression
- [ ] Concrete examples for each key concept
- [ ] Conclusion that summarizes what was covered (without being salesy)

### 7. Code Quality

- [ ] Do all code examples work as written?
- [ ] Are there any hardcoded values that should be variables or configuration?
- [ ] Is error handling appropriate for the context?
- [ ] Are comments used where they add value (not obvious comments)?
- [ ] Is the code idiomatic for the language being used?

### 8. Frontmatter and Metadata

- [ ] Does the frontmatter include required fields (title, date, tags, description)?
- [ ] Is the description concise and accurate?
- [ ] Are tags relevant and consistent with other posts?
- [ ] Is the date correct?

---

## Task

Your task is to review the document and provide suggestions. Fix anything that can be fixed directly in the file. **For every change, explain WHY the change improves the post.**

If the problem cannot be fixed without more context or a decision from the author, provide a checklist at the top of your response that can be addressed one by one.

Focus on:
1. Removing vague language and marketing speak
2. Ensuring every claim is backed by explanation
3. Verifying code examples are complete and correct
4. Improving structure and flow
5. Replacing all em-dashes with commas, periods, or restructured sentences

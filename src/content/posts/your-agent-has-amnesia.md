---
title: "Your agent has amnesia"
date: 2026-10-22T21:48:00+00:00
description: The three kinds of agent memory, how each one fails, and why your agent needs all of them
image: "/images/posts/your-agent-has-amnesia/your-agent-has-amnesia-9.3-types-of-memory.png"
action: Build an agent that remembers <br/><a href="https://ga.neo4j.com/athens26" target="_blank">Join the free Agent Memory workshop on Neo4j GraphAcademy</a>.
categories:
- genai
tags:
- talks
- thoughts
---

Is anyone else feeling exhausted right now?

Yeah, I feel exhausted.

It has been almost four years since ChatGPT launched, and the rate of change has been phenomenal.  In that time, I've gone from writing code daily, to being the bottleneck for code reviews.

We're seeing new models and products from frontier labs released daily, new techniques, bugs that have existed for years being uncovered, and it's a struggle to keep up.

I was promised productivity and more free time and all that has happened is I've managed to pile more work on to my plate.


## An outdated definition of an Agent

I have also had to update my definition of an agent.  The problem is, if you ask ten different people for their definition of an agent, they will likely give you a different answer.

For a while, I have been defining an agent as:

> An Agent is **a system** \
> that **acts independently**  \
> to **achieve a specific goal**.

Honestly, most of the descriptions I hear of agents these days are closer to a scheduled task, a task running at the same time every day, querying a database and firing off a summary.  OK, an LLM may be generating that summary, but `cron` has been around since the invention of Unix.

I think the definition needs to be updated.  To truly be called an agent, it needs to **learn and improve** as it works.

> An agent is **a system** \
> that **acts autonomously** \
> and **learns to improve** \
> as it **achieves a specific goal**.




## My army of agents

All of this extra work has led me to build more and more personal agents.  

Small, self-contained agents that take care of the repetitive tasks so I can focus on the things I care about.

### My AI Chief of Staff

My AI Chief of Staff, Wayne _(named after [obscure 90's footballer Wayne Allison](https://en.wikipedia.org/wiki/Wayne_Allison) AKA The Chief)_, reads my calendar, tasks and emails and briefs me in Slack at the start of each day.  After each meeting, it takes my notes, updates my systems and builds a personal knowledge graph.

![My AI Chief of Staff's morning briefing in Slack](/images/posts/your-agent-has-amnesia/your-agent-has-amnesia-6.2-chief-of-staff.png)

### Sage the support bot

**Sage** watches our support channels on [GraphAcademy](https://graphacademy.neo4j.com) and drafts answers from our docs and code, for a human to approve, then documents its findings so the same work doesn't need to be repeated again.

![How Sage answers learner questions and learns from the answers](/images/posts/your-agent-has-amnesia/your-agent-has-amnesia-7.5-support-agent.png)

## The Agent Loop

These agents run in a loop, first **reasoning** on the input, **acting** by calling tools, and **observing** the results, all building up **context** until the task is complete, or there is enough information to answer the question.  Both agents use a combination of custom tools and MCP integrations. 

![The agent loop: reason, act and observe](/images/posts/your-agent-has-amnesia/your-agent-has-amnesia-agent-loop.png)

Three types of memory help the agents to learn, and help us humans to understand why they do what they do.

1. **Short-term memory** - _what was said?_
2. **Long-term memory** - _what do you know?_
3. **Context traces** - _why did you do that?_

![Where the three types of memory sit in the agent loop](/images/posts/your-agent-has-amnesia/your-agent-has-amnesia-9.3-types-of-memory.png)

Let's explore these in more detail, and look at how your agent may go wrong without each of them.


## Short-term memory

The short-term memory lasts for the scope of a session or conversation. 

Each request you send to an LLM is isolated and stateless, the models themselves never remember information between requests, so it is important to have short-term memory in place.

The short-term memory is retrieved at the start of the loop, and included in the context sent to the LLM.

### OpenClaw goes rogue

In February 2026, Summer Yue's story of her OpenClaw agent deleting her emails went viral.  Her instruction to her agent was to analyse her inbox and, most importantly, confirm before acting.

The agent suddenly started deleting emails, and Summer had to run to her Mac mini to kill the process to stop any more being deleted.

Summer's explanation was that the instruction was lost during compaction.

To understand how that can happen, we need to look at the context window.


### Context window sizing

All models come with a maximum amount of information they can handle, known as the size of the context window.

As you run agentic loops, and tools are called, this context window is filled with more and more information.  At a certain point this will become too much for the model to handle.

There are two ways to counteract this:

* **Sliding windows** - the default approach is to send the last _N_ number of messages to the model.  With this approach you lose what was said earlier in the conversation.
* **Compaction** - ask a model to summarise the conversation.  This approach is lossy.  You rely on the model to retain the wording and severity of your instructions.

Either way, you're leaving it to chance and probabilities.

### Protecting yourself against short-term failures

* **Enforce rules in code, not in the prompt.** The prompt is a suggestion, and the model weighs it against everything else in the window
* **Human in the loop** for risky calls such as delete or send. The model cannot talk its way past it
* **Auto-approve the safe ones**, so approvals stay rare enough that people read them


## Long-term memory

Long-term memory answers _what_ the agent knows and what it has learned over time.  Without long-term memory, each conversation starts from scratch.

We all know the frustration of spending hours in a back-and-forth conversation, only for the tool to forget everything you said the day after.

In our agents, we can use the rich information provided to extract facts, knowledge and entities and use them to create a personal knowledge graph so your agent has access to more information over time.

![Extracting entities and relationships from text into a knowledge graph](/images/posts/your-agent-has-amnesia/your-agent-has-amnesia-15.2-extract-knowledge.png)


### Beware of Memory Poisoning

In February 2025, security researcher Johann Rehberger demonstrated how false memories could be planted in Gemini's long-term memory.  He hid instructions in a document and asked Gemini to summarise it.  Gemini won't save memories while it reads untrusted content, so the instruction waited until the user said a particular phrase in a normal chat, at which point Gemini saved the false memories as if the user had asked for them.

It is not an isolated example:

* **MINJA**: ordinary chat messages alone planted malicious memories in an agent over 95% of the time, and steered later answers over 70% of the time
* **AgentPoison**: poisoning under 0.1% of an agent's memory or knowledge base triggered the attack over 80% of the time, with under 1% effect on normal tasks

None of these attacks required special access.  They came through the same channels as any other user.

### Protecting your long-term memory

To protect your long-term memory, your agent must only save information from trusted sources. 

Save a record of where every memory came from, with a trust level so you can trace the memory back to its source.

Let your users see what is stored, so planted memories can be found and removed.



## Context traces

Context traces bring together short-term and long-term memory and give you, as a human, the information you need to know why an agent acted the way that it did.

A context trace holds the conversation history, along with the tools called at each step, so you can see what the model could see and what it asked for.

![The graph the agent loop leaves behind: sessions, steps, messages and tool calls](/images/posts/your-agent-has-amnesia/your-agent-has-amnesia-21.6-context-trace.png)


<!-- ### SaaStr -  -->


### Avoiding unexplainable problems

The context trace explains why something happened, but prevention is better than cure.  These conventions are the same as they were 20 years ago.

* **Practice the principle of least privilege** - don't give the agent more access than it needs
* **Enforce the freeze in code** - an agent without knowledge of a system can never affect it, and an agent without tools cannot act on it
* **Audit every call** - log what the harness actually received, whatever the model says it did
* **Record a trace of every step** so you can understand what the model saw and what it asked for
* **Read the trace, not the agent's account** - so you know what happened, not what the agent thinks happened


### Learning from context traces

These traces contain rich information about the steps that an agent took to perform an action.  If the task is repeated often enough, and the outcome is reliable, the process can be distilled into a skill, or written into code as a workflow.

This is the difference between a cron job and an agent.


## Build your own agent

The best way to learn is to build, or ask a coding agent to build for you.

We have courses that cover [Generative AI and context graphs on GraphAcademy](https://graphacademy.neo4j.com/categories/generative-ai).

Join us, and build an agent that acts autonomously and learns to improve as it achieves a goal.


---
title: "Starting Over - What would I learn?"
date: 2022-07-21T09:00:00+01:00
description: I was recently asked on a podcast what advice I would give to someone starting out in development today.  I botched the answer, this is what I should have said...
categories:
- advice
---

I was recently asked [on an episode of the Syntax.fm podcast](https://syntax.fm), knowing what I know now, what advice I would give to someone starting out in development?  Because it was a JS podcast, I tried to stick to JavaScript & front end topics and ended up butchering the answer.

I've thought this question over many over times since the recording, and here is what I should have said.


## Learn Python

If I were to start from scratch now, I would start by learning Python.

I didn't learn Python until I joined [Neo4j](https://neo4j.com), and now I feel like I missed out on so much.  Python can be used for so many things.

I like to think of Python as a gateway language, and that's not trying to be disparaging.   It's really easy to learn, there are no brackets and no semi-colons to contend with so you can concentrate on achieving your goal.

I know friends whose children that are not even teenagers yet learning to write learning Python at school.  Imagine what these kids will be able to achieve when they get to working age!

### Great Ecosystem

The ecosystem around Python is excellent, and there are some great open source libraries that you can use to do a really diverse range of things.  [Pandas](https://pandas.pydata.org/) are great data analysis and DataFrames allow you to perform some pretty complex actions.  Once you have manipulated that data, you can quickly visualise in a multitude of ways with [matplotlib](https://matplotlib.org/) with a couple of lines of code.

### Jupyter Notebooks

You can do this all inside a [Jupyter notebook](https://jupyter.org/) and share the results with anyone or write a tutorial that anyone can recreate.

I've spent a lot of time recently producing reporting on [GraphAcademy](https://graphacademy.neo4j.com), plotting enrolment numbers over time, identifying trends, and so on.  Previously, I would have tried to over-engineer a solution here by creating an SPA with Vue or React and plot the data with a library like Highcharts, Chart.js or Nivo Charts but that is extremely labour intensive.

It's much easier to do this in Python.  Jupyter notebooks allow you to wrap code with comments and markdown so you can tell a story as you go and make things easy to understand.

### Python for AI/ML

When we talk about building APIs with Node.js, the rational is that you use the same language in the backend as the UI.  The same rationality applies for Python and Machine Learning.

I've only scratched the surface on building machine learning models with [scikit-learn](https://scikit-learn.org/stable/) and [TensorFlow](https://www.tensorflow.org/learn) (my favourite is a Random Forest for predicting customer churn based on graph features) but these seem really straight forward to pick up.  You can use your trained models directly in a [Flask](https://flask.palletsprojects.com/en/2.1.x/) API (or [FastAPI](https://fastapi.tiangolo.com/), etc) and run the algorithms in real-time on the fly.


### In a Microservices Architecture

If you still want to write your APIs in Node.js or TypeScript, that you can use a [microservices architecture](https://microservices.io/) or even [GraphQL resolvers](https://graphql.org/) to combine the machine learning elements with a more traditional API.


## Learn TypeScript

Rather than learning vanilla JavaScript, I would probably go straight for [TypeScript](https://www.typescriptlang.org/).  When I first started with TypeScript, I was on the fence about the benefits.   Compared to JavaScript, it felt a little dogmatic and there was a reason why I wasn't using a type-safe language like Java.

But the more I have worked with it, the more I have enjoyed the experience.  So much so that it is now engrained in me that it feels strange to write plain JavaScript without the types.

You don't need to go all-in and define types and interfaces for absolutely everything. You can instead just sprinkle in the typescript features where they are needed.  Where and when you use these types will come with experience.

I would go as far as to say that it has saved hours of debugging time and cut out a lot of silly mistakes.


## Has React has won the battle?

Over the years, I've jumped between front-end frameworks.  One of my first Angular 1._something_ projects written around is still in production at a company. I tried earlier versions of React with class components, `componentDidMount()` etc and hated it.  Global state management was a mess.

For a while I had a strong preference for Vue but the migration from version 2 to 3 has been a bit of a mess.   I first [experimented with the Composition API](https://dev.to/adamcowley/how-to-build-an-authentication-into-a-vue3-application-200b) in 2020 when the concept was first introduced but it still doesn't seem to be widely adopted.

From my experience consulting for Neo4j, and within Neo4j itself, it seems that React has won the battle.

Since React hooks and functional components were introduced, it has also become a lot nicer to use.  I mean, sure, Redux and JSX can still be a bit of a hot mess at times but there are steps and architecture decisions you can take to mitigate this.

After 6 months, what project doesn't feel like a mess anyway?!


## Data? That's less clear to me

Maybe I'm a little too close to the subject, but I don't see a one-size-fits-all solution for data.  Although I work with [Graph Databases](https://neo4j.com/docs/getting-started/current/graph-database/) on a daily basis I'm still of the opinion that you use the best tool for the job.  Instead of one definitive answer, let me throw out a few thoughts:


* **Relational databases are still cool** - I still love a relational database and they're not going anywhere any time soon.  I would recommend taking a look at [PostgresQL](https://www.postgresql.org/) if you want an open-source relational database.

* **[NoSQL](https://en.wikipedia.org/wiki/NoSQL) is a broad term** that covers a lot of database types: Document store; Key-value stores; Graphs; Wide-column Stores; Multi-model DBs.  They all have their own strengths and weaknesses.  It's worth at least understanding the strengths and weaknesses of each.  Beware, there can be a lot of hype and hyperbole.

  _A special mention here for [MongoDB](https://www.mongodb.com/) and [Redis](https://redis.io/)._


* **Data Mobility is Important**, especially in more complex architectures.  Understanding how streams of data can be consumed between applications is a great skill to have.

  _[Kafka](https://kafka.apache.org/) would be my #1 choice for this._


* **Graphs are Everywhere** - I'm paid to have this opinion it's true so feel free to take it with a pinch of salt, and connections are becoming increasingly more important to AI & ML.

  I would have no reservations about using Neo4j as the primary database in any new project I start.  In my experience they are as performant as a relational database and ACID transactions mean the data is as safe.  Ironically, relational databases are bad at handling _relationships_, so as the data complexity grows and more table joins are needed, you have paid upfront for the benefits of querying a graph.

  _Add to the fact that they're pretty fun to work with and you're on to a winner._


## Resources

This is by no means an exhausted list of resources, but here are some of the resources I would recommend if you are getting started with anything I have mentioned above.

* Python:
  * [www.learnpython.org](https://www.learnpython.org/) is a great place


* JavaScript, Node.js, TypeScript:
  * If you've even heard of JavaScript, chances are you have heard of [Wes Bos](https://wesbos.com/).  Wes has released a number of courses and has a fun teaching style
  * [Ultimate Courses](https://ultimatecourses.com/) has some great courses on JavaScript, TypeScript, React and Angular.
  * [TypeScript in 50 Lessons](https://typescript-book.com/) by [Stefan Baumgartner](https://twitter.com/ddprrt) is the perfect place to learn everything you need to know about TypeScript.

* Data:
  * [MongoDB University](https://university.mongodb.com/) is a great place to learn MongoDB
  * Of course, I have to mention [GraphAcademy](https://graphacademy.neo4j.com) as a great place to start learning Neo4j.  We have [courses for beginners to Graph Databases](https://graphacademy.neo4j.com/categories/beginners/) and [courses for Developers learning Neo4j](https://graphacademy.neo4j.com/categories/developer/).


If you have any questions, comments or criticisms, feel free to reach out to me on [Twitter](https://twitter.com/adamcowley) or [LinkedIn](https://linkedin.com/in/adamcowley).

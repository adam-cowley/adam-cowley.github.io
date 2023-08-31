---
title: "TIL: Quick & Convenient Cypher Counts"
date: 2023-08-31T09:25:00+01:00
description: The quickest way to get counts of nodes and relationships in Cypher
action: For more tips and tricks on Cypher and Neo4j in general,<br />head to <a href="https://graphacademy.neo4j.com/?ref=adam" target="_blank">Neo4j GraphAcademy and enrol now</a>.
image: /images/posts/til-quick-cypher-counts.jpg
categories:
- til
tags:
- neo4j
- cypher
---

I'm a little late to the party on this one, but since the around the *5.6 release* of Neo4j, you are now able to use [Cypher Subqueries Neo4j *5.0*](https://neo4j.com/docs/getting-started/cypher-intro/subqueries/) to get node and relationship counts from the count store in Neo4j.

For as long as I can remember, I have been writing the following Cypher statement to get a count of nodes with a label.

```cypher
MATCH (p:Person) RETURN count(p) AS count
```

As long as you specify a simple one-degree pattern, for example `(:Label)`, `()-[:TYPE]->()`, `(:Label)--(:Label)` or `(:Label)-[:TYPE]->()`, Neo4j will [use the database statistics held in the count store](https://neo4j.com/developer/kb/fast-counts-using-the-count-store/) to produce an instant result.

This comes with a caveat, you can only do this once per query.  So if you wanted more than one count, you would need to combine counts together using a `UNION` query.

## Fast-forward to 2023

Today I learned that you can use [`COUNT` subquery expressions](https://neo4j.com/docs/cypher-manual/current/syntax/expressions/#count-subqueries) to do the same thing with less code.  Subquery expressions are subqueries that can be added to a `WITH` or `WHERE` clause.

So the above query to get a count of all `(:Person)` nodes now becomes:

```cypher
RETURN COUNT { (p:Person) }
```

That's 42 characters reduced to 28 - 66.666% less.  I estimate I write a query like this 5-10 times a day, so over 48 working weeks a year, that means a **saving of 67 200 characters a year**.

Here is an example that counts the number of `:ACTED_IN` relationships from a `(:Person)` node and the total count of `:REVIEWED` relationships.

```cypher
RETURN COUNT { (p:Person)-[:ACTED_IN]->() } AS roles,
    COUNT { ()-[:REVIEWED]->() } AS reviews
```

### No More `UNION`s

This also means no more unions as each subquery is planned seperately.  The following query calculate the percentage of `(:HelpfulResponse)`s compared to the overall number of `(:Response)`s.

```cypher
WITH COUNT { (r:Response) } as total, COUNT { (r:HelpfulResponse) } AS helpful
RETURN round(100.0 * helpful / total, 2) +'%'
```

Thank you to the Cypher team and the `#cypher-genuis-bar`!

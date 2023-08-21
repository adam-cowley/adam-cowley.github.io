---
title: "Next level Cypher aggregations using WITH, COLLECT and UNWIND"
date: 2023-08-21T10:00:00+00:00
description: "YouTube Shorts Explained: Create a window function with Cypher using WITH, COLLECT and UNWIND."
action: For more tips and tricks on Cypher and Neo4j in general,<br />head to <a href="https://graphacademy.neo4j.com/?ref=adam" target="_blank">Neo4j GraphAcademy and enrol now</a>.
short: 9KWHuPOL1PI

categories:
- neo4j
tags:
- neo4j
- cypher
- shorts
---

Let's take a look at how we can take your Cypher aggregations _to the next level_...


<iframe src="https://www.youtube.com/embed/9KWHuPOL1PI" width="330" height="593" style="margin: auto">
    View video at <a href="https://www.youtube.com/shorts/9KWHuPOL1PI" target="_blank">https://www.youtube.com/embed/9KWHuPOL1PI</a>
</iframe>


Here we have a query that gets the number of completed enrolments per quarter on graph Academy since the start of 2021.

```cypher
MATCH (u:User)-[:HAS_ENROLMENT]->(e:CompletedEnrolment)
WHERE e.completedAt >= datetime('2021-01-01')
RETURN
  e.completedAt.year +'-'+ e.completedAt.quarter AS quarter,
  count(*) AS count
ORDER BY quarter DESC
```

The query produces the following table:

| quarter     | count |
| :---        |  ---: |
| 2023-02     | 1500  |
| 2023-01     | 1400  |
| 2022-04     | 1300  |
| 2022-03     | 1200  |
| 2022-02     | 1100  |
| 2022-01     | 1000  |


***[Read more about the modelling decisions behind the GraphAcademy website](https://neo4j.com/developer-blog/building-educational-platform-neo4j/)***

### The Next Level

Let's take this to the next level by adding a percentage change between the quarters. Now, for this we'll need to emulate a **window function** using Cypher.

First, let's change the `RETURN` clause to a `WITH` to allow us to manipulate the data further.

```cypher
- RETURN
+ WITH
    e.completedAt.year +'-'+ e.completedAt.quarter AS quarter,
    count(*) AS count
```

Next, use the `collect()` function to turn the individual arrays into an aggregated list.

```cypher
WITH collect({quarter: quarter, count: count}) AS all
```


The `range()` function generates a list of numbers that we can use to access the individual values within that list.

```cypher
range(0, size(all)-1) // [ {quarter: '2023-02', count: '1500'} ... ]
```


`UNWIND` the index array to get this and the previous quarter's count

```cypher
UNWIND range(0, size(all)-1) AS idx
RETURN idx,
  all[idx].quarter AS quarter,
  all[idx].count AS count,           // This quarter count
  all[idx+1].count AS previousCount // Previous quarter count
```

Divide the current number by the previous value and multiply by `100` to get the percentage, and minus `100` to get the delta.

```cypher
(100.0 * all[idx].count / all[idx+1].count) - 100
```


That number's a little bit, long so round it to two decimal places with the `round()` function.

```cypher
round((100.0 * all[idx].count / all[idx+1].count) - 100, 2)
```

The first row represents the current quarter, which isn't finished yet.  We can hide this by using the `CASE` statement and only `RETURN` the value if the index is greater than one.

```cypher
CASE
  WHEN idx > 0
    THEN round((100.0 * all[idx].count / all[idx+1].count) - 100, 2)
  ELSE null
END AS change
```

Here is the full Cypher statement.

```cypher
MATCH (u:User)-[:HAS_ENROLMENT]->(e:CompletedEnrolment)
WHERE e.completedAt >= datetime('2021-01-01')
WITH
  e.completedAt.year +'-'+ e.completedAt.quarter AS quarter,
  count(*) AS count

WITH collect({quarter: quarter, count: count}) AS all

UNWIND range(0, size(all)-1) AS idx

RETURN idx,
  all[idx].quarter AS quarter,
  all[idx].count AS count,
  CASE
    WHEN idx > 0
        THEN round((100.0 * all[idx].count / all[idx+1].count) - 100, 2)
    ELSE null
  END AS change
```

and the table of results...

| quarter | count | change |
| :---        |  ---: |  ---: |
| 2023-02	| 1500	| _null_ |
| 2023-01	| 1400	| 7.14 |
| 2022-04	| 1300	| 7.69 |
| 2022-03	| 1200	| 8.33 |
| 2022-02	| 1100	| 9.09 |
| 2022-01	| 1000	| 10 |

_This video was [originally published on the Neo4j YouTube Channel](https://www.youtube.com/shorts/9KWHuPOL1PI)._

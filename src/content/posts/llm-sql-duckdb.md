---
title: "Natural Language Queries on Pandas with LangChain and DuckDB"
date: 2024-04-11T20:00:00+01:00
description: Using DuckDB to perform natural language search on a Pandas DataFrame
# theme: nord
image: "/images/posts/llm-sql-duckdb.png"
pinned: true
categories:
- genai
tags:
- duckdb
- llms
- python
---

A lot of my reporting these days seems to revolve around pandas.  I like how `DataFrame`s can be quickly turned [into charts using matplotlib](https://adamcowley.co.uk/posts/til-neo4j-result-matplotlib/).  I often find myself pulling data into a dataframe, filtering and [using the `.plot` options to visualise the data](/posts/til-neo4j-result-matplotlib/).

Since [Mark Needham](https://www.youtube.com/watch?v=XFTFEKYLxyU&t=3s) posed the question _"Can an LLM write better pandas than me?"_ (TL;DR: it doesn't at the moment), I have been wondering whether text-to-SQL (text-to-cypher's more popular cousin) could yield better results.  Naturally, there's only one tool for the job: [DuckDB](https://duckdb.org).

I'm happy to say that early signs are promising.

## Converting DataFrames to DuckDB

I was pleasantly surprised to find that DuckDB already supports [SQL on Pandas](https://duckdb.org/docs/guides/python/import_pandas), which makes the job almost trivial.

If you want to follow along, you'll need to install the `duckdb` `pandas` and `langchain` dependencies:


```python
%pip install duckdb pandas langchain
```

Next, something to query.  Naturally, my mind went instantly to the [League Two standings](https://www.bbc.co.uk/sport/football/league-two/table).


```python
import pandas as pd

data = """Position	Team	Played	Won	Drawn	Lost	Goals For	Goals Against	Goal Difference	Points
1	Stockport County	42	24	11	7	84	42	42	83
2	Wrexham	43	23	10	10	78	51	27	79
3	Mansfield Town	42	21	13	8	81	43	38	76
4	Milton Keynes Dons	43	22	8	13	73	57	16	74
5	Crewe Alexandra	43	19	13	11	68	58	10	70
6	Barrow	41	18	13	10	57	45	12	67
7	Crawley Town	42	20	5	17	66	61	5	65
8	AFC Wimbledon	43	16	14	13	55	44	11	62
9	Walsall	42	17	11	14	63	61	2	62
10	Doncaster Rovers	42	18	7	17	59	63	-4	61
11	Harrogate Town	43	17	10	16	53	60	-7	61
12	Gillingham	43	17	9	17	40	53	-13	60
13	Bradford City	42	15	12	15	50	54	-4	57
14	Morecambe	43	17	9	17	63	74	-11	57
15	Notts County	42	16	7	19	83	79	4	55
16	Newport County	43	16	7	20	60	69	-9	55
17	Accrington Stanley	42	15	9	18	56	60	-4	54
18	Tranmere Rovers	43	15	6	22	61	63	-2	51
19	Swindon Town	42	13	11	18	70	74	-4	50
20	Salford City	43	12	11	20	62	78	-16	47
21	Grimsby Town	42	9	16	17	52	70	-18	43
22	Sutton United	43	9	12	22	51	76	-25	39
23	Colchester United	41	9	11	21	52	72	-20	38
24	Forest Green Rovers	43	9	9	25	41	71	-30	36
"""

# Split the data into rows and columns by newlines and tabs
rows =[ n.strip().split("\t") for n in  data.strip().split("\n") ]

# Remove spaces from the headers
headers = [ n.replace(" ", "") for n in  rows[0]]

# Get the data
data = rows[1:]

# Create the dataframe
league_table = pd.DataFrame(data, columns=headers)

# Convert numeric columns
league_table['Position'] = league_table['Position'].astype(int)
league_table['Played'] = league_table['Played'].astype(int)
league_table['Won'] = league_table['Won'].astype(int)
league_table['Drawn'] = league_table['Drawn'].astype(int)
league_table['Lost'] = league_table['Lost'].astype(int)
league_table['GoalsFor'] = league_table['GoalsFor'].astype(int)
league_table['GoalsAgainst'] = league_table['GoalsAgainst'].astype(int)
league_table['GoalDifference'] = league_table['GoalDifference'].astype(int)
league_table['Points'] = league_table['Points'].astype(int)
```

<div>

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th>Position</th>
      <th>Team</th>
      <th>Played</th>
      <th>Won</th>
      <th>Drawn</th>
      <th>Lost</th>
      <th>GoalsFor</th>
      <th>GoalsAgainst</th>
      <th>GoalDifference</th>
      <th>Points</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>Stockport County</td>
      <td>42</td>
      <td>24</td>
      <td>11</td>
      <td>7</td>
      <td>84</td>
      <td>42</td>
      <td>42</td>
      <td>83</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Wrexham</td>
      <td>43</td>
      <td>23</td>
      <td>10</td>
      <td>10</td>
      <td>78</td>
      <td>51</td>
      <td>27</td>
      <td>79</td>
    </tr>
    <tr>
      <td>3</td>
      <td>Mansfield Town</td>
      <td>42</td>
      <td>21</td>
      <td>13</td>
      <td>8</td>
      <td>81</td>
      <td>43</td>
      <td>38</td>
      <td>76</td>
    </tr>
    <tr>
      <td>4</td>
      <td>Milton Keynes Dons</td>
      <td>43</td>
      <td>22</td>
      <td>8</td>
      <td>13</td>
      <td>73</td>
      <td>57</td>
      <td>16</td>
      <td>74</td>
    </tr>
    <tr>
      <td>5</td>
      <td>Crewe Alexandra</td>
      <td>43</td>
      <td>19</td>
      <td>13</td>
      <td>11</td>
      <td>68</td>
      <td>58</td>
      <td>10</td>
      <td>70</td>
    </tr>
    <tr>
      <td>6</td>
      <td>Barrow</td>
      <td>41</td>
      <td>18</td>
      <td>13</td>
      <td>10</td>
      <td>57</td>
      <td>45</td>
      <td>12</td>
      <td>67</td>
    </tr>
    <tr>
      <td>7</td>
      <td>Crawley Town</td>
      <td>42</td>
      <td>20</td>
      <td>5</td>
      <td>17</td>
      <td>66</td>
      <td>61</td>
      <td>5</td>
      <td>65</td>
    </tr>
    <tr>
      <td>8</td>
      <td>AFC Wimbledon</td>
      <td>43</td>
      <td>16</td>
      <td>14</td>
      <td>13</td>
      <td>55</td>
      <td>44</td>
      <td>11</td>
      <td>62</td>
    </tr>
    <tr>
      <td>9</td>
      <td>Walsall</td>
      <td>42</td>
      <td>17</td>
      <td>11</td>
      <td>14</td>
      <td>63</td>
      <td>61</td>
      <td>2</td>
      <td>62</td>
    </tr>
    <tr>
      <td>10</td>
      <td>Doncaster Rovers</td>
      <td>42</td>
      <td>18</td>
      <td>7</td>
      <td>17</td>
      <td>59</td>
      <td>63</td>
      <td>-4</td>
      <td>61</td>
    </tr>
    <tr>
      <td>11</td>
      <td>Harrogate Town</td>
      <td>43</td>
      <td>17</td>
      <td>10</td>
      <td>16</td>
      <td>53</td>
      <td>60</td>
      <td>-7</td>
      <td>61</td>
    </tr>
    <tr>
      <td>12</td>
      <td>Gillingham</td>
      <td>43</td>
      <td>17</td>
      <td>9</td>
      <td>17</td>
      <td>40</td>
      <td>53</td>
      <td>-13</td>
      <td>60</td>
    </tr>
    <tr>
      <td>13</td>
      <td>Bradord City</td>
      <td>42</td>
      <td>15</td>
      <td>12</td>
      <td>15</td>
      <td>50</td>
      <td>54</td>
      <td>-4</td>
      <td>57</td>
    </tr>
    <tr>
      <td>14</td>
      <td>Morecambe</td>
      <td>43</td>
      <td>17</td>
      <td>9</td>
      <td>17</td>
      <td>63</td>
      <td>74</td>
      <td>-11</td>
      <td>57</td>
    </tr>
    <tr>
      <td>15</td>
      <td>Notts County</td>
      <td>42</td>
      <td>16</td>
      <td>7</td>
      <td>19</td>
      <td>83</td>
      <td>79</td>
      <td>4</td>
      <td>55</td>
    </tr>
    <tr>
      <td>16</td>
      <td>Newport County</td>
      <td>43</td>
      <td>16</td>
      <td>7</td>
      <td>20</td>
      <td>60</td>
      <td>69</td>
      <td>-9</td>
      <td>55</td>
    </tr>
    <tr>
      <td>17</td>
      <td>Accrington Stanley</td>
      <td>42</td>
      <td>15</td>
      <td>9</td>
      <td>18</td>
      <td>56</td>
      <td>60</td>
      <td>-4</td>
      <td>54</td>
    </tr>
    <tr>
      <td>18</td>
      <td>Tranmere Rovers</td>
      <td>43</td>
      <td>15</td>
      <td>6</td>
      <td>22</td>
      <td>61</td>
      <td>63</td>
      <td>-2</td>
      <td>51</td>
    </tr>
    <tr>
      <td>19</td>
      <td>Swindon Town</td>
      <td>42</td>
      <td>13</td>
      <td>11</td>
      <td>18</td>
      <td>70</td>
      <td>74</td>
      <td>-4</td>
      <td>50</td>
    </tr>
    <tr>
      <td>20</td>
      <td>Salford City</td>
      <td>43</td>
      <td>12</td>
      <td>11</td>
      <td>20</td>
      <td>62</td>
      <td>78</td>
      <td>-16</td>
      <td>47</td>
    </tr>
    <tr>
      <td>21</td>
      <td>Grimsby Town</td>
      <td>42</td>
      <td>9</td>
      <td>16</td>
      <td>17</td>
      <td>52</td>
      <td>70</td>
      <td>-18</td>
      <td>43</td>
    </tr>
    <tr>
      <td>22</td>
      <td>Sutton United</td>
      <td>43</td>
      <td>9</td>
      <td>12</td>
      <td>22</td>
      <td>51</td>
      <td>76</td>
      <td>-25</td>
      <td>39</td>
    </tr>
    <tr>
      <td>23</td>
      <td>Colchester United</td>
      <td>41</td>
      <td>9</td>
      <td>11</td>
      <td>21</td>
      <td>52</td>
      <td>72</td>
      <td>-20</td>
      <td>38</td>
    </tr>
    <tr>
      <td>24</td>
      <td>Forest Green Rovers</td>
      <td>43</td>
      <td>9</td>
      <td>9</td>
      <td>25</td>
      <td>41</td>
      <td>71</td>
      <td>-30</td>
      <td>36</td>
    </tr>
  </tbody>
</table>
</div>



## Querying with DuckDB

DuckDB will automatically detect a dataframe based on variable name, so you can query it directly using `duckdb.sql()`.


```python
import duckdb

duckdb.sql("SELECT * FROM league_table")
```

<blockquote>

    ┌──────────┬─────────────────────┬────────┬───────┬───────┬───────┬──────────┬──────────────┬────────────────┬────────┐
    │ Position │        Team         │ Played │  Won  │ Drawn │ Lost  │ GoalsFor │ GoalsAgainst │ GoalDifference │ Points │
    │  int64   │       varchar       │ int64  │ int64 │ int64 │ int64 │  int64   │    int64     │     int64      │ int64  │
    ├──────────┼─────────────────────┼────────┼───────┼───────┼───────┼──────────┼──────────────┼────────────────┼────────┤
    │        1 │ Stockport County    │     42 │    24 │    11 │     7 │       84 │           42 │             42 │     83 │
    │        2 │ Wrexham             │     43 │    23 │    10 │    10 │       78 │           51 │             27 │     79 │
    │        3 │ Mansfield Town      │     42 │    21 │    13 │     8 │       81 │           43 │             38 │     76 │
    │        4 │ Milton Keynes Dons  │     43 │    22 │     8 │    13 │       73 │           57 │             16 │     74 │
    │        5 │ Crewe Alexandra     │     43 │    19 │    13 │    11 │       68 │           58 │             10 │     70 │
    │        6 │ Barrow              │     41 │    18 │    13 │    10 │       57 │           45 │             12 │     67 │
    │        7 │ Crawley Town        │     42 │    20 │     5 │    17 │       66 │           61 │              5 │     65 │
    │        8 │ AFC Wimbledon       │     43 │    16 │    14 │    13 │       55 │           44 │             11 │     62 │
    │        9 │ Walsall             │     42 │    17 │    11 │    14 │       63 │           61 │              2 │     62 │
    │       10 │ Doncaster Rovers    │     42 │    18 │     7 │    17 │       59 │           63 │             -4 │     61 │
    │        · │      ·              │      · │     · │     · │     · │        · │            · │              · │      · │
    │        · │      ·              │      · │     · │     · │     · │        · │            · │              · │      · │
    │        · │      ·              │      · │     · │     · │     · │        · │            · │              · │      · │
    │       15 │ Notts County        │     42 │    16 │     7 │    19 │       83 │           79 │              4 │     55 │
    │       16 │ Newport County      │     43 │    16 │     7 │    20 │       60 │           69 │             -9 │     55 │
    │       17 │ Accrington Stanley  │     42 │    15 │     9 │    18 │       56 │           60 │             -4 │     54 │
    │       18 │ Tranmere Rovers     │     43 │    15 │     6 │    22 │       61 │           63 │             -2 │     51 │
    │       19 │ Swindon Town        │     42 │    13 │    11 │    18 │       70 │           74 │             -4 │     50 │
    │       20 │ Salford City        │     43 │    12 │    11 │    20 │       62 │           78 │            -16 │     47 │
    │       21 │ Grimsby Town        │     42 │     9 │    16 │    17 │       52 │           70 │            -18 │     43 │
    │       22 │ Sutton United       │     43 │     9 │    12 │    22 │       51 │           76 │            -25 │     39 │
    │       23 │ Colchester United   │     41 │     9 │    11 │    21 │       52 │           72 │            -20 │     38 │
    │       24 │ Forest Green Rovers │     43 │     9 │     9 │    25 │       41 │           71 │            -30 │     36 │
    ├──────────┴─────────────────────┴────────┴───────┴───────┴───────┴──────────┴──────────────┴────────────────┴────────┤
    │ 24 rows (20 shown)                                                                                       10 columns │
    └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
</blockquote>


## Natural Language Queries in LangChain

An LLM will need to know the structure of the table in order to generate a statement.  DuckDB supports the [`DESC` keyword](https://duckdb.org/docs/guides/meta/describe) for generating a table schema.


```python
schema = duckdb.sql("DESC league_table")
```

<blockquote>

    ┌────────────────┬─────────────┬─────────┬─────────┬─────────┬─────────┐
    │  column_name   │ column_type │  null   │   key   │ default │  extra  │
    │    varchar     │   varchar   │ varchar │ varchar │ varchar │ varchar │
    ├────────────────┼─────────────┼─────────┼─────────┼─────────┼─────────┤
    │ Position       │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    │ Team           │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    │
    │ Played         │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    │ Won            │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    │ Drawn          │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    │ Lost           │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    │ GoalsFor       │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    │ GoalsAgainst   │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    │ GoalDifference │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    │ Points         │ BIGINT      │ YES     │ NULL    │ NULL    │ NULL    │
    ├────────────────┴─────────────┴─────────┴─────────┴─────────┴─────────┤
    │ 10 rows                                                    6 columns │
    └──────────────────────────────────────────────────────────────────────┘

</blockquote>


Now, similar to the Cypher generation process covered in [Building a Neo4j-backed Chatbot with TypeScript course on GraphAcademy](https://graphacademy.neo4j.com/courses/llm-chatbot-typescript/), that schema should be passed along with a question to a prompt instructing the LLM to write an SQL statement.


```python
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
import os

llm = ChatOpenAI(
  openai_api_key=os.getenv("OPENAI_API_KEY")
)


sql_prompt = PromptTemplate.from_template("""
Given the following table schema for the table `league_table`:

{schema}

Write an SQL statement to answer the following question:

{question}

Provide all rows form the table - eg select * from.
Provide a limit where applicable.
Respond with only the SQL statement.
""")

sql_chain = sql_prompt | llm | StrOutputParser()
```

Let's give it a test:


```python
sql = sql_chain.invoke({
  "schema": schema,
  "question": "Who are the top scorers?"
})
```


<blockquote>

    `'SELECT * FROM league_table ORDER BY GoalsFor DESC;'`

</blockquote>


This looks reasonable.  The LLM has correctly identified that the `GoalsFor` column should be used to get the top scoring team.

The results of this query should be passed back to the LLM, along with instructions to generate an answer to the question.  Classic [Retrieval Augmented Generation (RAG)](https://graphacademy.neo4j.com/courses/llm-fundamentals/)


```python
answer_chain = PromptTemplate.from_template("""
Use the following data to provide a definitive answer to the user's question:

{context}

The question is: {question}
""") | llm | StrOutputParser()
```

These chains can then be combined to create an overall chain that takes the question, generates and executes the SQL, then passes that information to the answer generation chain.


```python
from langchain_core.runnables import RunnablePassthrough

qa_chain = (
  # Get the SQL schema
  RunnablePassthrough.assign(
    schema=lambda _: duckdb.sql("DESC league_table"),
  )
  # Generate the SQL and execute it
  | RunnablePassthrough.assign(
      context= sql_chain | duckdb.sql,
  )
  # Pass {context} and {question} to the answer_chain
  | answer_chain
  # Format the output as a string
  | StrOutputParser()
)
```

So, how does this chain perform on a simple question?

### Simple Query - Who has conceded the most?

Which team has conceded the most goals?


```python
qa_chain.invoke({"question": "Which team has conceded the most goals?"})
```

> 'Based on the data provided, Notts County has conceded the most goals with a total of 79 goals against.'


Looking at the original table, that looks correct.

How about a more complicated statement that will require some more complex SQL?

### More complex - Goals scored vs Average

What about if we ask which team has scored the most goals _and_ how does that compare to the league average?


```python
qa_chain.invoke({"question": "Which team scored the most goals and how many have they scored compared to the league average?"})
```

> 'Stockport County has scored the most goals with a total of 84, which is 22.42 goals more than the league average.'



### What about Swindon

How many games have Swindon Town won this year?


```python
qa_chain.invoke({"question": "How many games have Swindon Town won?"})
```

> 'Swindon Town has won 13 games.'


Can we trick the LLM into answering a question incorrectly?


```python
qa_chain.invoke({"question": "How many more games has Swindon Town won than they have lost?"})
```

> 'Based on the data provided, Swindon Town has won 5 fewer games than they have lost.'



No, we can't.  Nice!


### Points-per-game Ratios

How about some more complex reasoning?  Can the LLM handle that?


```python
qa_chain.invoke({"question": "What are the points per game values for each team and how does that compare to their league position?"})
```

<blockquote>
Based on the provided data, the points per game values for each team are as follows:

1. Stockport County: 1.976
2. Wrexham: 1.837
3. Mansfield Town: 1.810
4. Milton Keynes Dons: 1.721
5. Crewe Alexandra: 1.628
6. Barrow: 1.634
7. Crawley Town: 1.548
8. AFC Wimbledon: 1.442
9. Walsall: 1.476
10. Doncaster Rovers: 1.452
11. Notts County: 1.310
12. Newport County: 1.279
13. Accrington Stanley: 1.286
14. Tranmere Rovers: 1.186
15. Swindon Town: 1.190
16. Salford City: 1.093
17. Grimsby Town: 1.024
18. Sutton United: 0.907
19. Colchester United: 0.927
20. Forest Green Rovers: 0.837

From the data, it can be observed that Stockport County has the highest points per game value and is in the first position. On the other hand, Forest Green Rovers has the lowest points per game value and is in the last position. Generally, there is a correlation between the points per game value and the league position, with teams having higher points per game values tending to be in higher positions in the league standings.
</blockquote>


I'm pretty happy with that.

## Conclusion

I was surprised by two things: firstly that this seemed so easy; and secondly that no-one had provided an example already.

Overall the LLM performed well, in this case `gpt-4` through OpenAI.  I found that the SQL generation could be flaky at times, mainly due to the flavour of SQL that DuckDB expects.  The LLM struggled in general when the columns contained spaces, despite amending the prompt to use single quotes for column names rather than backticks.

It will be interesting to see how this performs at scale, and on more complex datasets.

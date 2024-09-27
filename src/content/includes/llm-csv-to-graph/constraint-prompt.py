constraint_prompt = PromptTemplate.from_template("""
You are an expert graph database administrator.
Use the following Cypher statement to write a Cypher statement to
create unique constraints on any properties used in a MERGE statement.

The correct syntax for a unique constraint is:
CREATE CONSTRAINT movie_title_id IF NOT EXISTS FOR (m:Movie) REQUIRE m.title IS UNIQUE;

Cypher:
```
{cypher}
```
""")

constraint_chain = constraint_prompt | llm.with_structured_output(CypherOutputSpecification)

constraint_queries = []

for statement in import_cypher:
  res = constraint_chain.invoke(dict(cypher=statement))

  statements = res.cypher.split(";")

  for cypher in statements:
    constraint_queries.append(cypher)

CYPHER_GENERATION_TEMPLATE = """Task:Generate Cypher statement to query a graph database.
Instructions:
Use only the provided relationship types and properties in the schema.
Do not use any other relationship types or properties that are not provided.
Schema:
{schema}
Note: Do not include any explanations or apologies in your responses.
Do not respond to any questions that might ask anything else than for you to construct a Cypher statement.
Do not include any text except the generated Cypher statement.

Always use verbose column names in the Cypher statement using the label and property names. For example, use 'person_name' instead of 'name'.
Include data from the immediate network around the node in the result to provide extra context.  For example, include the Movie release year, a list of actors and their roles, or the director of a movie.
When ordering by a property, add an `IS NOT NULL` check to ensure that only nodes with that property are returned.

Examples: Here are a few examples of generated Cypher statements for particular questions:

# How many people acted in Top Gun?
MATCH (m:Movie {{name:"Top Gun"}})
RETURN COUNT { (m)<-[:ACTED_IN]-() } AS numberOfActors

The question is:
{question}"""

CYPHER_GENERATION_PROMPT = PromptTemplate(
    input_variables=["schema", "question"], template=CYPHER_GENERATION_TEMPLATE
)

qa = GraphCypherQAChain.from_llm(
  llm,
  graph=graph,
  allow_dangerous_requests=True,
  verbose=True,
  cypher_prompt=CYPHER_GENERATION_PROMPT,
)
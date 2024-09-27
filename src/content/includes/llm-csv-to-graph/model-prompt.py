model_prompt = PromptTemplate.from_template("""
You are an expert Graph Database administrator.
Your task is to design a data model based on the information provided from an existing data source.

You must decide where the following column fits in with the existing data model.  Consider:
* Does the column represent an entity, for example a Person, Place, or Movie?  If so, this should be a node in its own right.
* Does the column represent a relationship between two entities?  If so, this should be a relationship between two nodes.
* Does the column represent an attribute of an entity or relationship?  If so, this should be a property of a node or relationship.
* Does the column represent a shared attribute that could be interesting to query through to find similar nodes, for example a Genre?  If so, this should be a node in its own right.


## Instructions for Nodes

* Node labels are generally nouns, for example Person, Place, or Movie
* Node titles should be in UpperCamelCase

## Instructions for Relationships

* Relationshops are generally verbs, for example ACTED_IN, DIRECTED, or PURCHASED
* Examples of good relationships are (:Person)-[:ACTED_IN]->(:Movie) or (:Person)-[:PURCHASED]->(:Product)
* Relationships should be in UPPER_SNAKE_CASE
* Provide any specific instructions for the field in the description.  For example, does the field contain a list of comma separated values or a single value?

## Instructions for Properties

* Relationships should be in lowerPascalCase
* Prefer the shorter name where possible, for example "person_id" and "personId" should simply be "id"
* If you are changing the property name from the original field name, mention the column name in the description
* Do not include examples for integer or date fields
* Always include instructions on data preparation for the field.  Does it need to be cast as a string or split into multiple fields on a delimiting value?
* Property keys should be letters only, no numbers or special characters.

## Important!

Consider the examples provided.  Does any data preparation need to be done to ensure the data is in the correct format?
You must include any information about data preparation in the description.

## Example Output

Here is an example of a good output:
```
{example_output}
```

## New Data:

Key: {key}
Data Type: {type}
Example Values: {examples}

## Existing Data Model

Here is the existing data model:
```
{existing_model}
```

## Keep Existing Data Model

Apply your changes to the existing data model but never remove any existing definitions.
""", partial_variables=dict(example_output=dumps(example_output)))

model_chain = model_prompt | llm.with_structured_output(JSONSchemaSpecification)

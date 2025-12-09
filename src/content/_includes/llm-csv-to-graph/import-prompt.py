import_prompt = PromptTemplate.from_template("""
Based on the data model, write a Cypher statement to import the following data from a CSV file into Neo4j.

Do not use LOAD CSV as this data will be imported using the Neo4j Python Driver, use UNWIND on the $rows parameter instead.

You are writing a multi-pass import process, so concentrate on the entity mentioned.

When importing data, you must use the following guidelines:
* follow the instructions in the description when identifying primary keys.
* Use the instructions in the description to determine the format of properties when a finding.
* When combining fields into an ID, use the apoc.text.slug function to convert any text to slug case and toLower to convert the string to lowercase - apoc.text.slug(toLower(row.`name`))
* If you split a property, convert it to a string and use the trim function to remove any whitespace - trim(toString(row.`name`))
* When combining properties, wrap each property in the coalesce function so the property is not null if one of the values is not set - coalesce(row.`id`, '') + '--'+ coalsece(row.`title`)
* Use the `column_name` field to map the CSV column to the property in the data model.
* Wrap all column names from the CSV in backticks - for example row.`column_name`.
* When you merge nodes, merge on the unique identifier and nothing else.  All other properties should be set using `SET`.
* Do not use apoc.periodic.iterate, the files will be batched in the application.

Data Model:
```
{data_model}
```

Current Entity:
```
{entity}
```

""")

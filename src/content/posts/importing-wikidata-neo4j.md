---
title: "Importing Wikidata into Neo4j Using Neosemantics"
date: 2021-02-18T10:00:00+00:00

description: How I imported football data from the Wikidata API into Neo4j using Neosemantics.

permalink: /neo4j/importing-wikipedia-data-into-neo4j/
categories:
- neo4j
tags:
- neo4j
- neosemantics
- rdf
- wikidata
---

Recently, I've spent quite a bit of time working on the ecosystem around [Neosemantics](https://github.com/neo4j-labs/neosemantics), a toolkit for importing RDF data into Neo4j.  A few weeks ago we [released a Graph App](https://medium.com/neo4j/how-i-built-the-neosemantics-n10s-graph-app-b7ada7b8d008) which provides a UI to help you learn how to use the procedures provided in the library.  I've also spent a couple of sessions recently with [Jesus Barassa](https://twitter.com/BarrasaDV) on the [Neo4j Twitch Channel](https://twitch.com/neo4j_)  demonstrating how to use the Graph App and the library in general.

But despite this, and apart from a frustrating couple of days in early 2017, I've not actually looked into RDF or SPARQL in any real detail.  So I thought I'd spend a few hours trying to learn how to query using  and import some data for myself.

So following on from the session on [import dbpedia data using the query service](https://www.twitch.tv/videos/639121866) I thought I'd spend a few hours experimenting with the data myself.

## The Goal

As I mentioned in the video, I'm a huge fan of football and data so the opportunity to combine these passions is an opportunity too good to pass up.  I've found from previous experiments that (free) Football data can be hard to come by and I've often had to resort to scraping HTML.

### A Quick Intro to SPARQL

I'm by no means an expert on SPARQL but here is my take on it.  A basic query will look something like the following:

```sparql
SELECT ?subject
WHERE {
  ?subject predicate object;
}
```

The `SELECT` section of the query is similar to an SQL query, where you would specify a list of variables that you would like to return from the query.  You can also say `SELECT *` to return everything that you have defined in the query.

```sparql
SELECT ?subject
```

The `WHERE` section is where the magic happens.  In this clause we're building up a set of [triples](https://en.wikipedia.org/wiki/Semantic_triple) which will provide the basis of the query.    Triples are define a `subject`, `predicate` and `object`, where each of these can be a literal value or something that belongs to a schema.

```sparql
WHERE {
  ?subject predicate object;
}
```

Prepending text with a question mark will turn it into a variable, in this case `?subject`.  These can then be used in the `SELECT` to return the value.

Say for example, we want to find all people who own a dog with brown hair.  We could search like this:

```sparql
PREFIX schema: <http://www.adamcowley.co.uk/ontology#>

SELECT *
WHERE {
    ?person a schema:person .
    ?person rdf:label ?name

    ?person schema:owns ?dog .
    ?dog schema:hair-colour ?hairColour . filter(?hairColour = 'brown')

    ?dog rdf:label ?dogName
}
```

Let's break that down:

```sparql
PREFIX ac: <http://www.adamcowley.co.uk/ontology#>
SELECT *
```

Firstly I'm defining a `PREFIX` - basically a short hand to say that anything that is defined as `ac:` belongs to my own Ontology so I don't have to type it out every time.  Then, I'm being lazy and saying to return any variable that I define in the WHERE clause.

```sparql
WHERE {
    ?person a ac:person .
```
The `?person` entity is an instance of a `person` as defined in my schema.


```sparql
    ?person rdf:label ?name
```
The `?person` entity will have an `rdf:label` which I assign to the variable `?name`.


```sparql
    ?person ac:owns ?dog .
    ?dog rdf:label ?dogName
```
The `?person` entity will have a relationship to an entity which I assign variable `?dog`.


```sparql
    ?dog ac:hair-colour ?hairColour . filter(?hairColour = 'brown')
}
```

The `?dog` entity will have a hair-colour property which I assign the variable `?hairColour`.    The `filter` function will ensure that hte value of `?hairColour` will be `brown`.


If you want a more comprehensive introduction then [this tutorial](https://www.youtube.com/watch?v=b3ft3CzkLYk) is a great place to start.


### Wikidata Query Service

In the video we queried [dbpedia](http://dbpedia.org/), so I thought I would test myself with the Wikidata.  The [Wikidata Query Service](https://query.wikidata.org/) allows you to run cypher queries and will display the results in a number of formats, from table view to charts and timelines.

The Wikidata Query Service also makes it much easier to query than DBPedia.  A number common prefixes are are automatically included so you don't need to define them, and the editor also features auto-completion so you don't need to memorise any properties.

<video controls>
  <source src="/uploads/importing-wikipedia-neo4j/player-member-of-team.mov">
</video>

Typing `Ctrl` + `Space` will enable auto-completion.


### Finding Football Players

So, back to the task.  Firstly, it makes sense to get a list of clubs.  So using auto-complete I put together a query to find every entity (`?team`) that is an **instance of** ([wdt:P31](https://www.wikidata.org/wiki/Property:P31)) an **Association Football Club** ([wd:Q15944511](https://www.wikidata.org/wiki/Q15944511)).

```sparql
SELECT * WHERE {
  ?team wdt:P31 wd:Q15944511 .
}
LIMIT 24
```

This query on it's own doesn't give too much information - just a list of entities.  But the Wikidata Query Service has a **Graph** view which displays the triples in a forced graph layout (much closer to what I'm used to with Neo4j).

![A Graph View of Wikidata Triples](/uploads/importing-wikipedia-neo4j/wikidata-graph-view.jpg)

This gives you valuable insight into what you should be typing into the auto-complete in order to build the triples.  From the graph I can see **league** ([wdt:P118](https://www.wikidata.org/wiki/Property:P118)) and the entity for La Liga ([wd:Q324867](https://www.wikidata.org/wiki/Q324867)) which I can use to filter the list of clubs.

```sparql
SELECT ?team ?teamLabel ?league ?leagueLabel
WHERE {
  ?team wdt:P31 wd:Q476028 .
  ?team wdt:P118 ?league . filter( ?league = wd:Q324867 )
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}
LIMIT 10
```
| team | teamLabel | league | leagueLabel |
| -- | -- | -- | -- |
| wd:Q7156 |	FC Barcelona	 | wd:Q324867	| La Liga |
| wd:Q8682 |	Real Madrid CF	 | wd:Q324867	| La Liga |
| wd:Q8687 |	Athletic Club	 | wd:Q324867	| La Liga |
| wd:Q8701 |	Atlético Madrid	 | wd:Q324867	| La Liga |
| wd:Q8723 |	Real Betis Balompié	 | wd:Q324867	| La Liga |
| wd:Q8749 |	Celta Vigo	 | wd:Q324867	| La Liga |
| wd:Q8780 |	RCD Espanyol de Barcelona	 | wd:Q324867	| La Liga |
| wd:Q8806 |	Getafe CF	 | wd:Q324867	| La Liga |
| wd:Q8812 |	Granada CF	 | wd:Q324867	| La Liga |
| wd:Q8823 |	Levante UD	 | wd:Q324867	| La Liga |

Looks good!  The next step in order to import this data into neo4j is to `CONSTRUCT` a graph from the triplets.  The construct part of the query allows you to define which triples are included in the graph.

By default, neosemantics will convert any `rdfs:type` into the label but because this data seems to be sparse or non-existent in most entities, I've had to construct my own *(fake)* schema prefix.

```sparql
PREFIX neo: <http://neo4j/myvocabulary/>
CONSTRUCT {
  ?team a neo:FootballTeam ;
          rdfs:label ?name .
  ?team wdt:P118 ?league .
  ?league a neo:FootballLeague ;
          wdt:P1448 ?leagueName .
}
WHERE {
  ?team wdt:P31 wd:Q476028 .
  ?team rdfs:label ?name . filter(lang(?name) = "en") .
  ?team wdt:P118 ?league . filter( ?league = wd:Q324867 )
  ?league rdfs:label ?leagueName . filter(lang(?leagueName) = "en")
}
```

Let's break that down again:

```sparql
PREFIX neo: <http://neo4j/myvocabulary/>
CONSTRUCT {
  ?team a neo:FootballTeam ;
          rdfs:label ?name .
```
The first line creates a prefix called neo.  The URL doesn't matter too much, the `handleVocabUris` config in Neosemantics will eventually cause this to be stripped away, leaving just the trailing value.

The next line defines `?team` as a `neo:FootballTeam` - now Neosemantics will recognise this as an `rdfs:type` and use it as a label.  The last line includes `rdfs:label` in the result.

Now, for the league:

```sparql
  ?team wdt:P118 ?league .
  ?league a neo:FootballLeague ;
          wdt:P1448 ?leagueName .
}
```

The first line defines the relationship between the `?team` and the `?league`, the second sets the type to `FootballLeague`, and third line includes the "Official Name" of the league in the import.

Running the query again will show the graph rather than a table of results:

| subject | predicate | object | context |
| -- | -- | -- | -- |
| wd:Q7156 |	rdf:type |	<http://neo4j/myvocabulary/FootballTeam>	| |
| wd:Q7156 |	rdfs:label |	FC Barcelona	| |
| wd:Q7156 |	wdt:P118 |	 wd:Q324867	| |
| wd:Q324867 |	rdf:type |	<http://neo4j/myvocabulary/FootballLeague>	| |
| wd:Q324867 |	wdt:P1448 |	La Liga	| |
| wd:Q8687 |	rdf:type |	<http://neo4j/myvocabulary/FootballTeam>	| |
| wd:Q8687 |	rdfs:label |	Athletic Club	| |
| wd:Q8687 |	wdt:P118 |	 wd:Q324867	| |
| wd:Q8749 |	rdf:type |	<http://neo4j/myvocabulary/FootballTeam>	| |

## Preparing the Data for Neo4j

Running the import procedures would import the data into Neo4j, but without mapping the Wikidata properties to values in the graph it wouldn't make much sense.  By configuring Neosemantics with `handleVocabUris` set to `MAP`, you are able to create mappings.  This means that when the data is imported into Neo4j it will have more meaning, and no data is lost if/when you choose to [export it](https://neo4j.com/docs/labs/nsmntx/current/export/).

Because I'm starting with a new graph from scratch, I can run the **init** procedure with `handleVocabUris` set to `MAP`.

```cypher
CALL n10s.graphconfig.init({
  handleVocabUris: 'MAP'
})
```

To preview how the data would look in the graph, you can use the `n10s.rdf.preview.fetch` procedure.  Wikidata has a `/sparql` endpoint that you can send a query to and receive an RDF response.  The endpoint takes the query as a search parameter - so by urlencoding the SPARQL query I can provide that as the first parameter of the procedure.

```cypher
WITH 'PREFIX neo: <http://neo4j/myvocabulary/>
CONSTRUCT {
  ?team a neo:FootballTeam ;
          rdfs:label ?name .
  ?team wdt:P118 ?league .
  ?league a neo:FootballLeague ;
          wdt:P1448 ?leagueName .
}
WHERE {
  ?team wdt:P31 wd:Q476028 .
  ?team rdfs:label ?name . filter(lang(?name) = "en") .
  ?team wdt:P118 ?league . filter( ?league = wd:Q324867 )
  ?league rdfs:label ?leagueName . filter(lang(?leagueName) = "en")
}' AS sparql
CALL n10s.rdf.preview.fetch(
  "https://query.wikidata.org/sparql?query=" +  apoc.text.urlencode(sparql),
  "JSON-LD",  { headerParams: { Accept: "application/ld+json" } }
)
YIELD nodes, relationships
RETURN nodes, relationships
```

![First view of the Wikidata Triples in Neo4j](/uploads/importing-wikipedia-neo4j/first-preview.jpg)

This looks *OK*, but a closer look at the properties reveals a  `P1448` property on the `:FootballLeague` nodes, which won't make much sense to anyone looking at the graph for the first time.

```json
{
  "P1448": "La Liga",
  "uri": "http://www.wikidata.org/entity/Q324867"
}
```

For this, I'll need to create a namespace and then define some mappings.  In the raw RDF, you can see that the `wds:` prefix stands for `http://www.wikidata.org/prop/direct/` - so I'll need to create a mapping from the URL to the prefix.

**Note: The Neosemantics Graph App will generate these Cypher statements for you.**

```cypher
CALL n10s.nsprefixes.add('wds', 'http://www.wikidata.org/prop/direct/');
```

Now that the prefix has been set up, I can create mappings for `P118` and `P1448`.  The `n10s.mapping.add` procedure takes two arguments, the full URI of the property and then the name that it should be mapped to in  Neo4j.

- `P118` is a relationship between the team and the league, so following neo4j conventions I will rename that to `IN_LEAGUE`
- `P1448` represents the "Official Name" of the league, so  I will rename that to `officialName`
- `rdfs:label`

```cypher
CALL n10s.mapping.add('http://www.wikidata.org/prop/direct/P118', 'IN_LEAGUE');
CALL n10s.mapping.add('http://www.wikidata.org/prop/direct/P1448', 'officialName');
```

Calling the name of each node *label* is also fine, but I'd prefer to call it *name*.  To do this, I will have to create a prefix for `rdfs` (`http://www.w3.org/2000/01/rdf-schema#`) and then a mapping for `label`

```cypher
CALL n10s.nsprefixes.add('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
CALL n10s.mapping.add('http://www.w3.org/2000/01/rdf-schema#label', 'name');
```

After running the `n10s.rdf.preview.fetch` again, the mappings will now have been applied to the team, league and the relationship between them:

```json
{
  "officialName": "La Liga",
  "uri": "http://www.wikidata.org/entity/Q324867"
}
{
  "name": "Atlético Madrid",
  "uri": "http://www.wikidata.org/entity/Q8701"
}
```

## Actually importing the Data

Mapping is an iterative process that may take some time, but it's well worth the effort.  Once you are happy with the mappings, you can replace `preview` with `import` in the previous query and the yielded fields to import the data.

```cypher
WITH 'PREFIX neo: <http://neo4j/myvocabulary/>
CONSTRUCT {
  ?team a neo:FootballTeam ;
          rdfs:label ?name .
  ?team wdt:P118 ?league .
  ?league a neo:FootballLeague ;
          wdt:P1448 ?leagueName .
}
WHERE {
  ?team wdt:P31 wd:Q476028 .
  ?team rdfs:label ?name . filter(lang(?name) = "en") .
  ?team wdt:P118 ?league . filter( ?league = wd:Q324867 )
  ?league rdfs:label ?leagueName . filter(lang(?leagueName) = "en")
}' AS sparql

CALL n10s.rdf.import.fetch(

"https://query.wikidata.org/sparql?query=" +  apoc.text.urlencode(sparql),  "JSON-LD",  { headerParams: { Accept: "application/ld+json"}})
YIELD terminationStatus, triplesLoaded, triplesParsed
RETURN terminationStatus, triplesLoaded, triplesParsed
```
terminationStatus | triplesLoaded | triplesParsed
-- | -- | --
"OK" | 80 | 80

The number of triplets loaded may vary compared to the number of nodes and relationships, but that is fine.  Some triplets will become nodes, but they may also become relationships or properties.  Each of these nodes will have a `:Resource` label assigned to them to signify which can then be used to query an RDF entity.

For example, I could query for the La Liga entity with the following cypher:

```cypher
MATCH (league:Resource {uri: "http://www.wikidata.org/entity/Q324867"})<-[:IN_LEAGUE]-(team)
RETURN league, team
```

![La Liga node surrounded by Team nodes in a forced graph layout](/uploads/importing-wikipedia-neo4j/imported-data.jpg)


## Conclusion

Sites like Wikidata and DBpedia hold data far beyond Football and  having an easy way to extract the data makes life so much easier.  Mark Needham has also used Neosemantics to [extract Coronavirus related data from dbpedia](https://markhneedham.com/blog/2020/04/21/quick-graph-covid-19-taxonomy/).  Many other services including the British Library also have RDF endpoints that could be queried using a similar process.


I may be blowing my own horn, but this would have been a lot more difficult without the Neosemantics [Graph App](https://neo4j.com/developer/graph-apps/).  The Graph App provides you with a set of forms which allow you to build up a query and preview the results as you go.  Once you're done

You can install the Graph App to [Neo4j Desktop](https://neo4j.com/developer/neo4j-desktop) by opening install.graphapp.io and click **Install** under the Neosemantics app.

<!-- For more content like this, check out the [Neo4j Twitch channel](https://twitch.com/neo4j_). -->

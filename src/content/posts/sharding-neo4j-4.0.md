---
title: "When and how to implement Sharding in Neo4j 4.0"
date: 2020-01-15T08:30:00Z
description: When you are dealing with large volumes of data, you may need to shard your graph across many physical servers.  Here's how&hellip;

url: /neo4j/sharding-neo4j-4.0/
categories:
- neo4j
tags:
- neo4j
- sharding
- "4.0"
---

When you are dealing with large volumes of data, you may need to _shard_ your graph across many physical servers.  A quick google search will tell you that:

> Sharding is a type of database partitioning that separates very large databases the into smaller, faster, more easily managed parts called data shards. The word shard means a small part of a whole.

In essence, if your data is too large to fit on a single server (and with hardware capabilities and costs, we're talking terrabytes worth), you should consider sharding.  So, with that in mind, let's take a fictional example, **SkyShard&trade;**.

**SkyShard&trade;** are a travel website that offer cheap flights to it's customers.  Due to the amount of flights the website offers,the frequency of updates, and the sheer number of combinations it makes sense to shard the data to ease the load of data and naturally narrow down the search space for possible flights.

If you are interested in _how_ the queries work, [Max De Marzi has some great blog posts](https://maxdemarzi.com/?s=flights).  For now, I will concentrate on the separation of data and not how the data will be queried.

## A brief introduction to sharding in Neo4j

Neo4j 4.0 has a huge update, named **Fabric**.  According to the [Neo4j Operations Manual](https://neo4j.com/docs/operations-manual/4.0-preview/fabric/introduction/), Fabric is defined as:

> [...] a converged platform that supports the storage, processing, analysis and management of data distributed and stored in multiple Neo4j databases.

Simple, right?  In essence, Fabric comes with it's own database that acts as an entry point to the Neo4j environment.  A driver will connect to a _proxy_ server or cluster of proxy servers with a set of configuration on it to give it a picture of each shard.  There is then a new [Cypher `USE` keyword](https://neo4j.com/docs/operations-manual/4.0-preview/fabric/queries/) introduced in 4.0 that will allow you to query across shards.

<!-- ![Neo4j Fabric Setup](https://neo4j.com/docs/operations-manual/4.0-preview/images/fabric-single-instance.png "A single instance setup of Neo4j Fabric proxy server sitting between the User and 3 Neo4j Databases") -->

## Something to consider

Although you can _query_ across shards, you cannot traverse across shards.  By that, I mean that you can't have a relationship going from a node on one shard to another.  So in this scenario, there will need to be a degree of duplication.  In this scenario, [some long haul flights with connections may arrive in their destinations over 24 hours after original departure](https://www.forbes.com/sites/ericrosen/2019/01/02/the-2019-list-of-the-longest-flights-in-the-world/) and depending on the business requirements a 24-48 hour stopover may procude a better price.  Depending on how the data is sharded, that 24-48 hours may need to be taken into account.

After lengthy, hypothetical discussions, the **SkyShard&trade;** team have decicded to shard by month.  So, the January shard will also need to have the first two days of February.  Then, when a request comes in, we'll need to decide which of the shards to query.

## Configuration

Configuring fabric is surprisingly easy.  As I mentioned, one server needs to be configured as a proxy and then each shard (albeit single instances or clusters) are setup as if they were standalone neo4j instances/clusters.



### Configuring the Proxy Server

Let's call this server `proxy` from now on.  Think of this server as a stateless server that just passes queries on to the real databases.  The proxy server must have a separate database configured for fabric that is separate from the default neo4j database, this is configured in `neo4j.conf` under `fabric.database.name`.  Let's call it fabric for now.

<div class="file">neo4j.conf</div>

```conf
fabric.database.name=fabric
```

Then, the server must be aware of each shard.  As SkyShard want to be able to offer bookings three months in advance I will create 3 shards for January, February and March 2020.  The shards are configured as a 0 based array under `fabric.graph`.  There are [four configuration options](https://neo4j.com/docs/operations-manual/4.0-preview/fabric/configuration/#_graph_settings) for each graph - a name, the bolt uri, [database name](../multi-tenancy-neo4j-4.0) on the instance and driver configuration.

To save any unnecessary configuration on the shards, I'll go for the default neo4j database and omit the `fabric.graph.<id>.database` configuration option.  Each of the servers will be configured via DNS to an entry reflecting the month.

<div class="file">neo4j.conf</div>

```conf
# January's shard
fabric.graph.0.name=january2020
fabric.graph.0.uri=neo4j://january:7687

# February's shard
fabric.graph.1.name=february2020
fabric.graph.1.uri=neo4j://february:7687

# March's shard
fabric.graph.2.name=march2020
fabric.graph.2.uri=neo4j://march:7687
```

### Configuring the Shards

For each of the shards, these can be set up as a single instance or as a cluster.  As far as they're concerned there is no need to configure anything on their side to get them to work with the proxy.

### Advertised Addresses

One thing that did catch me out when I was configuring the cluster is that I hadn't set the `dbms.connector.bolt.advertised_address` on the shards.  Make sure you do this, otherwise when the proxy connects to each shard, the shard will advertise the address of the shard as localhost - this will cause the proxy to send the queries to itself rather than the shard.

<div class="file">january: neo4j.conf</div>

```conf
dbms.connector.bolt.advertised_address=january:7687
```

There's 20 minutes of your life back.

### Schemas

Another thing to consider is that as the shards are considered to be independent - any schema queries will need to be run on them directly.  Why?  Well, because shards could have the same schema on them - but maybe SkyShard also have a shard which contains customer data, maybe additional airport data.  There is no concept of auto-partitioning, those decisions are to be made yourself.

You could easily build some sort of script to automate this if necessary:


<div class="file">cypher/constraints.cypher</div>

```cypher
CREATE CONSTRAINT ON (a:Airport) ASSERT a.code IS UNIQUE;
CREATE CONSTRAINT ON (f:Flight) ASSERT f.id IS UNIQUE;
```

```sh
$ cypher-shell -h bolt://january:2020 -u neo4j -p neo < cypher/constraints.cypher
```

The same is true if you are using anything other than the default `neo4j` database in `fabric.graph.<id>.database` - you'll have to run a cypher statement to create this explicitly.


That's it.  There's no concept of dependencies here, if a shard is unavailable then the error will be reported at query time.  But there is no waiting for a cluster size to form before the server starts like with a causal cluster.


## Querying the Shards

It is possible to query the shards directly using a bolt connection to the relevant hostname.  But you can also query the shards through the proxy.  This allows you to query across shards.

With version 4.0, a `USE` keyword has been added to cypher.  When you are querying through the proxy, this will allow you to select the shard to query, either via the id (think `fabric.graphs.<id>`) or the name  (`fabric.graphs.<id>.name`).

### Querying a Named Shared

To query a single named shard, you use the `USE {fabricdb}.{name}` syntax, where `fabricdb` is the configuration value set in `fabric.database.name`.  For example, to query the shard containing January's data, you can run:

```cypher
USE fabric.january2020
MATCH (n) RETURN count(n)
```

This will proxy the query through to `neo4j://january:7687` and return the results based on the data in january2020's database.  If you know the ID of the shard that you'd like to query, you can use the `USE {fabricdb}.graph({name})` syntax.

```cypher
USE fabric.graph(0)
MATCH (n) RETURN count(n)
```


### Querying Across Shards

You can also query across shards using an _anonymous procedure call_.  For example, if we have flight information in one shard and then more detailed information about the airports in another, we can query across them by calling `CALL { /* cypher */ }`.


```cypher
CALL {
  // Query January 20202 for a flight
  USE fabric.january2020
  MATCH
    (flight:Flight {id: "2013-1-1--1545"})-[:ORIGIN]->(o:Airport),
    (flight)-[:DESTINATION]->(d:Airport)
  RETURN flight, o, d
}

// You cannot access a node inside another call, so take the property values
// that we'll need to look up
WITH flight, o.code AS originCode, d.code AS destinationCode

CALL {
  // Take variables from previous
  WITH originCode, destinationCode

  // Find the nodes in the airports shard
  USE fabric.airports
  MATCH (origin:Airport {code: originCode})
  MATCH (destination:Airport {code: destinationCode})
  RETURN origin, destination
}


RETURN flight, origin, destination
```

<!-- ![Cross-Shard Querying](/uploads/sharding-neo4j-4.0/cross-shard-result.png "A neo4j result window with the properties of flight, origin and destination nodes") -->


Node values cannot be passed across shards, so the line:

`WITH flight, o.code AS originCode, d.code AS destinationCode`

 extracts the actual property values that we'll need to look up the more detailed airport nodes in that shard.

## Loading the Data via the Proxy

Now that the proxy and shards are configured, and we know how to query across it's time to add some data to the shard.  Because javascript is my language of choice, I'll put together some code that will take a CSV file, and separate the rows out into their shards.  Beyond that the same rules around importing data apply, so I will send the updates to neo4j in batches.


```js
const csv = require('csv-parser')
const fs = require('fs')
const neo4j = require('neo4j-driver')
const driver = new neo4j.driver('neo4j://localhost:7687', neo4j.auth.basic('neo4j', 'neo'))

// Functions here ...

const run = async () => {
    // Create Driver instance
    const driver = new neo4j.driver('neo4j://localhost:7687', neo4j.auth.basic('neo4j', 'neo'))

    // Organise rows from CSV into shard
    const results = await readFromCsv(__dirname + '/data/flights.csv')

    // Send data to each shard
    await Promise.all(
        Object.entries(results)
            .map(([key, value]) => importMonth(driver, key, value))
    )

    // Finished, close the driver
    driver.close()

    console.log('Finished!')
}

// Run it!
run()
```

Now to step a bit futher into the code that this fuction calls.

### `readFromCsv(file)`

Say we've got a CSV with this structure:


| year | month | day | flight | origin | dest |
| --- | --- | --- | --- | --- | --- |
| 2013 | 1  | 1 | 517  | EWR  | IAH |


The `loadFromCsv` function will take this file, separate the rows into data for each shard using the month column.  Because we have a requirement for a 48 hour overlap in data, the condition for a row being added to batch is either the month existing as a key in the `results` object OR the previous month existing and the day being 1 or 2.

```js
const readFromCsv = file => {
    const results = { '1': [], '2': [], '3': [], };

    return new Promise((resolve, reject) => {
        fs.createReadStream(file)
            .pipe(csv())
            .on('data', async row => {
                // Add to current month
                if ( results[ row.month ] ) {
                    results[ row.month ].push(row)
                }

                // Allow for 48 hours of the next month to be added to the previous month
                const nextMonth = ( parseInt(row.month) + 1 ).toString();
                if ( results[ nextMonth ] && parseInt(row.day) <= 2 ) {
                    results[ nextMonth ].push(row)
                }
            })
            .on('end', () => resolve(results))
    })
}
```

Once this code has separated the data by month, the data then needs to be imported into the relevant shard.

### `importMonth(driver, key, value)`

Making this function `async` means that can splice the top `x` number rows from the row, send that through to neo4j in a batch and `await` the results, then repeat until there are no more items left in the array.


```js
const importMonth = async (driver, key, data) => {
    const session = driver.session({ database: "fabric" })

    const shard = shards[ key ]
    const query = `
        USE fabric.${shard}
        UNWIND $batch AS row

        MERGE (origin:Airport {code: row.origin})
        MERGE (destination:Airport {code: row.dest})

        MERGE (f:Flight {id: row.year +'-'+ row.month +'-'+ row.day +'--'+ row.flight})

        MERGE (f)-[:ORIGIN]->(origin)
        MERGE (f)-[:DESTINATION]->(destination)
    `

    console.log(`Importing ${data.length} rows to ${shard}`)
    console.log(query)

    // While there are still rows left, splice the next X number of rows
    // and run an autocommit transaction
    while ( data.length ) {
        const batch = data.splice(0, batch_size)

        await session.run(query, { batch })
    }
}
```

The cypher query uses the `USE {fabricdb}.{name}` syntax explained above to select the relevant data before sending batches.

Of course, the code for a real-world application would be more complex than this - you could be consuming data from a message queue or even using an ETL too.  The basic concept will be the same though; separate the data by shard, then send to the neo4j proxy server in batches.


## Testing the Import Process

If I run the script from the command line, I should see the progress of the import before the `Finished!` message at the end.

```sh
$ node etl/index.js
Importing 27983 rows to january2020
Importing 25309 rows to february2020
Importing 29841 rows to march2020
Finished!
```

I can verity that that the batches have been successfully added to the shards by using the `graphIds()` function get the ID's of all graphs configured on the proxy, and using the `USE fabric.graph({{id})` syntax to get a count of the `:Flight` nodes on each shard.

```cypher
WITH ['january2020', 'february2020', 'march2020', 'airports'] AS shards
UNWIND fabric.graphIds() AS id
CALL {
  USE fabric.graph(id)
  MATCH (n:Flight) RETURN count(*) AS count
}
RETURN id, shards[id] AS name, count
ORDER BY id ASC
```

Which returns the following results:

```
╒════╤══════════════╤════════╕
│"id"│"name"        │"count" │
╞════╪══════════════╪════════╡
│0   │"january2020" | 27983  │
│1   │"february2020"│ 25309  │
│2   │"march2020"   | 29841  │
│3   │"airports"    │ 0      │
└────┴──────────────┴────────┘
```


##  The `USE GRAPH` clause is not available?? What

On more than one occasion I ended up with the following error:

```
Neo4jError: The `USE GRAPH` clause is not available in this implementation of Cypher due to lack of support for USE graph selector. (line 2, column 5 (offset: 21))
                USE skyshard.january2020"
                    ^
```

This error occurs when you run the query on a database that isn't configured to be the fabric database in `fabric.database.name`.  If you're running the query in Neo4j Browser or cypher-shell, you can run the `:use {database}` command.  Or if it's in the driver, you can specify the database when you create a new session.

```js
const session = driver.session({ database: "fabric" })
```

## Configuring Fabric with a Cluster

Configuring Fabric to work with a sharded cluster is similar to a single instance, the only change is that the initial discovery members are listed in a comma separated list under `fabric.graph.{id}.uri` in config.  For example, let's say that the march needs some more redundancy due to a large event or the start of holiday season, [you could configure a three core cluster](https://neo4j.com/docs/operations-manual/current/clustering/).  For argument sake, let's say they have the hostnames `march-core-1`, `march-core-2` and `march-core-3`.

The `uri` config for the proxy server would look something like this:

```conf
fabric.graph.2.name=march2020
fabric.graph.2.uri=neo4j://march-core-1:7687,neo4j://march-core-2:7687,neo4j://march-core-3:7687
```

Querying the graph by name or id would be the same, except now the proxy server would take care of the routing of the queries between the leader and followers.


## Next Steps

This is only a simple example to explain the process but in reality a production query could span many shards for all of the information it needs.  I touched on the idea of Airport data being held in a different shard.  It makes sense to keep static data in it's own shard rather than duplicating it across all shards.  In this case the Airport code is a unique identifier and will never change and is safe to be shared across shards but it may be a hassle to update multiple nodes if, for example, a new restaurant or amenity is added to the airport.

Time should also be taken to consider the performance of a query when running across shards - a query with two separate `USE {}` calls will cause the second statement to be run once per result streamed from the first statement.  This is the way that Cypher statements work at the moment, but keep in mind that you could be  passing a lot of information across the wire and causing more db hits than you need.  But then again, this is all part of the fun of running a graph database.

[The example code is up on github](https://github.com/adam-cowley/skyshard) along with docker-compose.yml for anyone wanting to test this out locally.

How has your Fabric setup gone?   Let us know on the below or on the [Neo4j Community forum](https://community.neo4j.com/).
---
title: "Multi-Tenancy in Neo4j 4.0"
date: 2020-01-15T08:20:00Z
description: How to manage and connect to multiple databases in Neo4j 4.0

url: /neo4j/multi-tenancy-neo4j-4.0/
categories:
- neo4j
tags:
- neo4j
- multi-database
- "4.0"
---

A big change in the 4.0 release of Neo4j is the introduction of multiple databases in Enterprise Edition.  Previous to 4.0, you could only have a single instance of Neo4j running a single database on any port at any time.  This made multi-tenancy a problem because you had to build the segregation of data into the application layer.

Now, you can create, start and stop multiple databases on the same Neo4j instance.  This experience reminds me a lot of traditional RDMS' - no surprise that [Ivan Zoratti](https://twitter.com/izoratti), ex. MySQL, joined Neo4j as a Product Manager in 2019.  First, there are a couple of concepts that need defining.

- **Instance** - a java processing running Neo4j on a particular port (think 7474 for http or 7687 for bolt).  An instance can host many **Databases**.
- **Database** - a collection of data, with it's own separate physical database structure (think your 3.x neo4j graph.db folder) 

The syntax to manage the DBMS seems to be in line with most other databases, and it's a really simple syntax.

**Note:** All of the system code examples will be run through cypher-shell, but these can just as easily be run against the system database in the browser.

```
:use system
```

## Installation

Installation of 4.0 is no different to 3.x, just head to neo4j.com/download, click Server Version and select the relevant version.  Alternatively, you can download and install 4.0 through [Desktop](https://neo4j.com/desktop).  If you've downloaded the binaries, run `bin/neo4j` to start the server.

```sh
cd /path/to/neo4j-4.0/
bin/neo4j-admin set-initial-password trustn01 # set an initial password
bin/neo4j start # start neo4j and wait...

open http://localhost:7474
```

## Databases

By default, you start with two databases; `neo4j` and `system`.  The `system` database is a new addition - this holds the metadata for Neo4j as a DMBS (**D**ata**b**ase **M**anagement **S**ystem) - database information and authentication.  The `neo4j` database is a regular instance of the graph database you know and love.  This can be _dropped_, but the system database cannot.

Databases are completely separate from eachother, meaning that a relationship cannot be created between two nodes in different databases.


### Creating a Database

First, open cypher-shell in the command line by running the following command.  Once connected, type the `:use system` command to switch over to the system database.

```sh
bin/cypher-shell -a bolt://localhost:7687 -u neo4j -p trustn01

Connected to Neo4j 4.0.0 at neo4j://localhost:7687 as user neo4j.
Type :help for a list of available commands or :exit to exit the shell.
Note that Cypher queries must end with a semicolon.
neo4j@neo4j> :use system
neo4j@system> 
```

Typing `:use system` means that all future queries will be ran against the `system` database.   Once in the system database, run `SHOW DATABASES` to see a list of databases.  You should see that both th system database and the default neo4j database already exist.

```
neo4j@system> SHOW DATABASES;
+------------------------------------------------------------------------------------------------+
| name     | address          | role         | requestedStatus | currentStatus | error | default |
+------------------------------------------------------------------------------------------------+
| "neo4j"  | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | TRUE    |
| "system" | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | FALSE   |
+------------------------------------------------------------------------------------------------+
```

You can type `SHOW DATABASE` to see information about an individual database.

```
neo4j@system> SHOW DATABASE neo4j;
+-----------------------------------------------------------------------------------------------+
| name    | address          | role         | requestedStatus | currentStatus | error | default |
+-----------------------------------------------------------------------------------------------+
| "neo4j" | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | TRUE    |
+-----------------------------------------------------------------------------------------------+
```

To create a database, you just run `CREATE DATABASE {name}`.

```
neo4j@system> CREATE DATABASE myclient;
0 rows available after 5 ms, consumed after another 0 ms
neo4j@system> SHOW DATABASES;
+--------------------------------------------------------------------------------------------------+
| name       | address          | role         | requestedStatus | currentStatus | error | default |
+--------------------------------------------------------------------------------------------------+
| "neo4j"    | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | TRUE    |
| "system"   | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | FALSE   |
| "myclient" | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | FALSE   |
+--------------------------------------------------------------------------------------------------+
```

You can then switch to the database using the `:USE` syntax as above.

### Starting and Stopping a Database

When you create a database, it will start by default.  You can stop it by running `STOP DATABASE {name}`.

```
neo4j@system> STOP DATABASE myclient;
0 rows available after 66 ms, consumed after another 1 ms
neo4j@system> SHOW DATABASES;
+--------------------------------------------------------------------------------------------------+
| name       | address          | role         | requestedStatus | currentStatus | error | default |
+--------------------------------------------------------------------------------------------------+
| "neo4j"    | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | TRUE    |
| "system"   | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | FALSE   |
| "myclient" | "localhost:7687" | "standalone" | "offline"       | "offline"     | ""    | FALSE   |
+--------------------------------------------------------------------------------------------------+

3 rows available after 3 ms, consumed after another 0 ms
```

Not that the `requestedStatus` and `currentStatus` columns are both now `offline`.  You can start the database back up by running `START DATABASE {name}`.

```
neo4j@system> START DATABASE myclient;
0 rows available after 80 ms, consumed after another 0 ms
neo4j@system> SHOW DATABASES;
+--------------------------------------------------------------------------------------------------+
| name       | address          | role         | requestedStatus | currentStatus | error | default |
+--------------------------------------------------------------------------------------------------+
| "neo4j"    | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | TRUE    |
| "system"   | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | FALSE   |
| "myclient" | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | FALSE   |
+--------------------------------------------------------------------------------------------------+
```

### Removing a Database

If you don't want the database any longer, you can run `DROP DATABASE {name}` to drop it.

```
neo4j@system> DROP DATABASE myclient;
0 rows available after 6 ms, consumed after another 0 ms
neo4j@system> SHOW DATABASES;
+------------------------------------------------------------------------------------------------+
| name     | address          | role         | requestedStatus | currentStatus | error | default |
+------------------------------------------------------------------------------------------------+
| "neo4j"  | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | TRUE    |
| "system" | "localhost:7687" | "standalone" | "online"        | "online"      | ""    | FALSE   |
+------------------------------------------------------------------------------------------------+

```


**Warning:** This will delete the underlying store files and cannot be undone.  There are no warnings when you run the command!


### Connecting to the Database in an application

One thing to note with the 4.0 release is that the connection strings are slightly different.  There is no longer a `bolt+routing` protocol, instead you use the new `neo4j://` protocol when connecting to a cluster.  This does the same job as bolt+routing did before, creating an instance of the routing driver.  Connecting directly to a neo4j instance is the same, you just use the `bolt://` protocol.  ([More information here](https://neo4j.com/docs/driver-manual/4.0-preview/client-applications/#driver-connection-uris))

The driver creation stays the same, but when you create a session, you specify the database that you would like to connect to.  Everything else is identical.


```js
const neo4j = require('neo4j')
const driver = new neo4j.driver('neo4j://localhost:7687')

const session = driver.session({
    database: 'myclient', // <-- the only change
})

session.run('MATCH (n) RETURN count(n) AS count')
    .then(res => console.log(res.records[0].get('count')))
```


**Note:** If you do not specify a database, the query will be run on the default database.  This is defined in `neo4j.conf` under `dbms.default_database`.

<div class="file">neo4j.conf</div>

```conf
dbms.default_database=mydefaultdb
```

### That's it!

That's it!  This is a feature that has been missing from Neo4j for a while and will make life a lot easier for anyone wanting to build a SaaS application on Neo4j.

Have you set up a multi-database in Neo4j yet?  Let me know below on the [Neo4j Community](https://community.neo4j.com/) site.



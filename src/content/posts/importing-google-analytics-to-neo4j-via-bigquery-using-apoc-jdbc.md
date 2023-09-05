---
title: 'Importing Google Analytics to Neo4j via BigQuery using APOC & JDBC'
description: Take back control of your website visit data by importing it into Neo4j via BigQuery.
image: /images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-model.png
date: 2018-07-06T10:45:54+00:00
categories:
- Neo4j
tags:
- Neo4j
- BigQuery
- JDBC
---
Google Analytics has been the defacto analytics platform for years. The major problem with this is that Google owns your data and the reporting platform can be difficult to work with.

However, for those with deep pockets and a Google Analytics 360 account, you can link your account with BigQuery and receive automated periodic imports. The BigQuery tables can then be used to import the data into Neo4j, giving you the ability to explore the data using Cypher.

## <a id="user-content-setting-up-your-google-project" class="anchor" href="#setting-up-your-google-project" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Setting up your Google Project

Firstly head over to the <a href="https://console.cloud.google.com/" rel="nofollow">Google APIs Console</a> and log in with your Google account. Once you are there, either create a new project or select an existing one. If you are creating a new project, give it a name and click **Create**.

<a href="/images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-create-account.png" target="_blank" rel="nofollow"><img src="/images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-create-account.png" alt="Create an Account" style="max-width:400px; margin: auto; display: block" /></a>

Next, you&#8217;ll need some credentials to connect to BigQuery. You can use OAuth to connect through a google account, but it is by far easier to create a _Service Account_. On the left hand menu, go to **IAM & admin**, then **Service accounts**. At the top of the page you should see a link to **Create Service Account**.

<a href="/images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-create-service-account.png" target="_blank" rel="nofollow"><img src="/images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-create-service-account.png" alt="Create a Service Account"  style="max-width:400px; margin: auto; display: block" /></a>

Give the account a name and modify the Service account ID if necessary. The account requires a role of `bigquery.jobs.create` to run queries, so if you don&#8217;t feel comfortable assigning _Project > Owner_, at the very least set the role to _Big Query Data > Big Query Job User_. Check the _Furnish a new Private Key_ and select JSON. Once you&#8217;ve created the account, make a note of the account ID (`*@projectname.iam.gserviceaccount.com`) and the location of the downloaded key file (or move it to your $NEO4J_HOME). We&#8217;ll need this later on.

Lastly, we&#8217;ll be using `apoc.load.jdbc` to connect to BigQuery. Make sure to add the [latest version of APOC](https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases) and the <a href="https://cloud.google.com/bigquery/partners/simba-drivers/" rel="nofollow">SIMBA JDBC drivers for BigQuery</a> to your `$NEO4J_HOME/plugins` folder.

## <a id="user-content-linking-google-analytics-to-bigquery" class="anchor" href="#linking-google-analytics-to-bigquery" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Linking Google Analytics to BigQuery

If you are an _OWNER_ of a property, this can be done with a single click. Under Admin, select the Property that you would like to link to. Then, in the _PROPERTY_ column, click **All Products** and then **Link BigQuery**.

<a href="https://support.google.com/analytics/answer/3416092" rel="nofollow">The official guide to setting up Google Analytis to BigQuery Export</a>

## <a id="user-content-exploring-the-data-set" class="anchor" href="#exploring-the-data-set" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Exploring the Data Set

So you can follow along, I will be using the <a href="https://bigquery.cloud.google.com/table/bigquery-public-data:google_analytics_sample.ga_sessions_20170801" rel="nofollow">sample dataset</a> made available by Google. You can easily switch out the `bigquery-public-data` project and `google_analytics_sample` dataset for your own.

The tables are exported daily in the format of `ga_sessions_{YYYY}{MM}{DD}`. A really nice feature of BigQuery is that you can run queries on multiple tables at once using a wildcard (`ga_sessons_201807*`) or a where clause (`_TABLE_SUFFIX >= '20180701'`). But **beware**, you&#8217;re billed by the data that you process during the query. So if you run a query for all tables in a particular year, you could end up with a hefty bill.

If you [head to the schema viewer](ttps://bigquery.cloud.google.com/table/bigquery-public-data:google_analytics_sample.ga_sessions_20170801), you&#8217;ll see that there is a lot of information available.

BigQuery uses it&#8217;s own version of SQL to run queries. Let&#8217;s run a query in the console to explore the data.

```sql
SELECT
  fullVisitorId,
  visitorId,
  visitNumber,
  visitId,
  visitStartTime,
  date,
  hits.time,
  hits.page.pagePath,
  hits.page.pageTitle,
  hits.page.hostname,
  trafficSource.campaign,
  trafficSource.source,
  trafficSource.medium,
  trafficSource.keyword,
  trafficSource.adwordsClickInfo.campaignId,
  geoNetwork.continent,
  geoNetwork.subcontinent,
  geoNetwork.country,
  geoNetwork.region,
  geoNetwork.city,
  geoNetwork.latitude,
  geoNetwork.longitude
FROM [bigquery-public-data:google_analytics_sample.ga_sessions_20170801] LIMIT 1000
```
<a href="https://docs.google.com/spreadsheets/d/1Ef6TxSs1d2lDAPgfdGitS6b9_KIbZqhHikxUSgZ-yXk/edit?usp=sharing" rel="nofollow">View an export of the top 1000 rows on Google Sheets</a>

### <strong>A Note on Unnesting Data</strong>

The <code>hits</code> and <code>customDimensions</code> columns inside each <code>ga_sessions_*</code> table are <em>REPEATED</em> fields. Unfortunately, at the moment apoc.load.jdbc does not handle these correctly. These can be <em>unnested</em> into individual rows using the <code>UNNEST</code> function. It means that the cypher query has to do slightly more work but we can get around the issue of multiple duplicates by using <code>MERGE</code> statements instead of <code>CREATE</code>.

<h3>
<a id="user-content-as-a-graph" class="anchor" href="#as-a-graph" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>As a Graph
</h3>

<a href="/images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-whiteboard.jpg" target="_blank" rel="nofollow"><img src="/images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-whiteboard.jpg" alt="The Graph Diagram on a whiteboard" style="max-width:400px; margin: auto; display: block" /></a>

We could represent this in a graph as a set of <code>Visitor</code>s, each of which has multiple <code>:Visits</code> which contain one or more <code>:Hits</code>. Each hit (either a pageview or an event) takes place on a <code>:Page</code> which belongs to a <code>:Domain</code>. There is also information on the user&#8217;s location, the app that they used. Custom Dimensions and the Traffic Source (source, medium, keywords, adwords content) may also be useful for linking to existing customer records and tracking the success of campaigns. I will stick to a more basic model for now.


<a href="/images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-model.png" target="_blank" rel="nofollow"><img src="/images/posts/importing-google-analytics-to-neo4j-via-bigquery-using-apoc-jdbc/neo4j-bigquery-model.png" alt="Extracted Graph Model"  style="max-width:400px; margin: auto; display: block" /></a>

<h2>
<a id="user-content-importing-to-neo4j-using-apoc--jdbc" class="anchor" href="#importing-to-neo4j-using-apoc--jdbc" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Importing to Neo4j using APOC & JDBC
</h2>

In order to connect to a JDBC source, we need to build up a connection string. APOC includes a <code>apoc.load.jdbc</code> function that yields a stream of <code>row</code>s, each property of which can be accessed through dot or square bracket notation.

```cypher
CALL apoc.load.jdbc(connectionString, queryOrTable)
YIELD row
RETURN row.property
```


<h4>
<a id="user-content-the-connection-string" class="anchor" href="#the-connection-string" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>The Connection String
</h4>

To build a connection string to connect to BigQuery, we&#8217;ll need the <em>Service account id</em> and <em>Private key</em> generated above. The JDBC Connection string take a combination of:

- <code>jdbc:bigquery://https://www.googleapis.com/bigquery/v2:443;</code> &#8211; The JDBC URL for the BigQuery API
- <code>ProjectId=neo4j-bigquery-test;</code> &#8211; The Name of the Project
- <code>OAuthType=0</code>&#8211; Instructs the driver to use service-based authentication. You can also use user-based OAuth authentication by setting this to <code>1</code> but this involves popups and copy and pasting urls & keys.
- <code>OAuthServiceAcctEmail=new-service-account@neo4j-bigquery-test2.iam.gserviceaccount.com</code> &#8211; The Service account ID set up earlier
- <code>OAuthPvtKeyPath=/path/to/neo4j-bigquery-test-327e650dbfe6.json</code> &#8211; The path to the key file that downloaded when the credentials were created



The full string should look something like this:

```
jdbc:bigquery://https://www.googleapis.com/bigquery/v2:443;ProjectId=neo4j-bigquery-test;OAuthType=0;OAuthServiceAcctEmail=neo4j-bigquery-test@neo4j-bigquery-test.iam.gserviceaccount.com;OAuthPvtKeyPath=/path/to/neo4j-bigquery-test-327e650dbfe6.json
```


This connection string is a bit unweildy. When calling <code>apoc.load.jdbc</code>, the procedure will check <code>neo4j.conf</code> file for a corresponding alias under <code>apoc.jdbc.&lt;alias&gt;.url</code>.

<div class="file">
<span>neo4j.conf</span>
</div>

```
# BigQuery Connection String
apoc.jdbc.BigQuery.url=jdbc:bigquery://https://www.googleapis.com/bigquery/v2:443;ProjectId=neo4j-bigquery-test;OAuthType=0;OAuthServiceAcctEmail=neo4j-bigquery-test@neo4j-bigquery-test.iam.gserviceaccount.com;OAuthPvtKeyPath=/path/to/neo4j-bigquery-test-327e650dbfe6.json
```

This makes subsequent calls simpler and protects queries from changes to keys in the future.

```
CALL apoc.load.jdbc('BigQuery', queryOrTable)
YIELD row
```

Much nicer.


<h3>
<a id="user-content-the-query" class="anchor" href="#the-query" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>The Query
</h3>

<p>
Let&#8217;s take the query above and run it through Neo4j with our credentials. When running the query through JDBC, you&#8217;ll need to change the format of the table names from <code>[project:dataset.table]</code> to <code>project.dataset.table</code> for example<br /> <code>bigquery-public-data.google_analytics_sample.ga_sessions_20170801</code>.
</p>


```
CALL apoc.load.jdbc('BigQuery', 'SELECT
  fullVisitorId,
  visitorId,
  visitNumber,
  visitId,
  visitStartTime,
  date,
  h.time,
  h.hitNumber,
  h.page.pagePath,
  h.page.pageTitle,
  h.page.hostname
FROM `bigquery-public-data.google_analytics_sample.ga_sessions_20170801`, UNNEST(hits) AS h')
YIELD row
// ...
```

Now we can use the row to merge the <code>:Visitor</code>, <code>:Visit</code> and <code>:Hit</code> nodes before merging the relationships together.


The start time of the visit is stored as seconds since epoch, so we can store this as a <a href="https://www.adamcowley.co.uk/neo4j/temporal-native-dates/" rel="nofollow">DateTime property introduced in Neo4j 3.4</a>, setting the <code>epochSeconds</code> value in the constructor.

There is no natural key for the hit, so I have combined the visit&#8217;s unique ID and the hit number to make a unique key. Where the <code>isInteraction</code> property is free, I have used the foreach hack to set a conditional label to signify that this was an event rather than a pageview.


```cypher
// ...
YIELD row

MERGE (visitor:Visitor { fullVisitorId: row.fullVisitorId })
SET visitor.visitorId = row.visitorId
MERGE (visit:Visit { visitId: row.visitId })
SET
visit.number = toInteger(row.visitNumber),
visit.startedAt = datetime({ epochSeconds: toInteger(row.visitStartTime) })


MERGE (hit:Hit { hitId: row.visitId + '-'+ row.hitNumber })
SET
hit.number = toInteger(row.hitNumber),
hit.timestamp = datetime({ epochSeconds: toInteger(row.time) })


Foreach Hack to set Interaction label
FOREACH (run IN CASE WHEN hit.isInteraction = 'tru [1] ELSE [] END |
  SET hit:Interaction
)
MERGE (host:Host { hostname: tname })
MERGE (page:Page { url: row.hostname + row.pagePath })
ge.hostname = row.hostname, page.path = row.pagePath
MERGE (host)-[:HAS_PAGE]->(page)
MERGE (visitor)-[:HAS_VISIT]->(visit)
(visit)-[:HAS_HIT]->(hit)
MERGE (hit)-[:FOR_PAGE]->(page);
```

<h3>
<a id="user-content-linked-lists" class="anchor" href="#linked-lists" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Linked Lists
</h3>

Linked Lists of nodes are useful for a number of situations. Because we have numbers on each hit and visit, we can query, collect and connect them together. This will be useful when analysing user behaviour.

```cypher
MATCH (visitor:Visitor)-[:HAS_VISIT]->(visit)
// Order visits in ascending order
WITH visitor, visit ORDER BY visit.number ASC
// Collect the visits
isitor, collect(visit) AS visits
// Unwind the ordered collection
 range(0, size(visits)-2) AS idx
WITH visits[idx] AS this, visits[idx+1] AS next
MERGE (this)-[:NEXT_VISIT]->(next)
```


I use this technique quite often to create linked lists. First, match the nodes that you are interested in before putting them into the correct order. Next, collect up the nodes &#8211; this allows you to calculate the size of the collection and unwind a range of indexes that can be used to create aliases between the two nodes.

With larger datasets, you sometimes need to be a little more cute. Using a <code>:LAST_HIT</code> relationship and identifying new nodes with a temporary label would cut down the number of nodes and relationships touched by the query on a larger dataset.

We can do the same to link up the visits.

```cypher
MATCH (visit:Visit)-[:HAS_HIT]->(hit)
// Order visits in ascending ord
WITH visit, hit ORDER BY hit.number ASC
// Collect the visits
isit, collect(hit) AS hits
// Unwind the ordered collection
 range(0, size(hits)-2) AS idx
WITH hits[idx] AS this, hits[idx+1] AS next
MERGE (this)-[:NEXT_HIT]->(next)
```

<h2>
<a id="user-content-analysis" class="anchor" href="#analysis" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Analysis
</h2>

Now we can start to use the power of the graph to explore the data.

<h3>
<a id="user-content-what-pages-are-users-returning-to" class="anchor" href="#what-pages-are-users-returning-to" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>What pages are users visiting?
</h3>


```cypher
MATCH (v:Visitor)-[:HAS_VISIT]->()-[:HAS_HIT]->()-[:FOR_PAGE]->(p:Page)
WHERE v.fullVisitorId = {fullVisitorId}
RETURN v.fullVisitorId, p.path, count(*) as visits
ORDER BY visits DESC
```


<table>
<tr>
<th>
        v.fullVisitorId
</th>

<th>
        p.path
</th>

<th>
        visits
</th>
</tr>

<tr>
<td>
        &#8220;7342454030115611747&#8221;
</td>

<td>
        &#8220;/store.html&#8221;
</td>

<td>
        151
</td>
</tr>

<tr>
<td>
        &#8220;7342454030115611747&#8221;
</td>

<td>
        &#8220;/store.html/quickview&#8221;
</td>

<td>
        147
</td>
</tr>

<tr>
<td>
        &#8220;7342454030115611747&#8221;
</td>

<td>
        &#8220;/google+redesign/apparel/mens+tshirts/google+mens+bayside+graphic+tee.axd&#8221;
</td>

<td>
        1
</td>
</tr>

<tr>
<td>
        &#8220;7342454030115611747&#8221;
</td>

<td>
        &#8220;/basket.html&#8221;
</td>

<td>
        1
</td>
</tr>

<tr>
<td>
        &#8220;7342454030115611747&#8221;
</td>

<td>
        &#8220;/home&#8221;
</td>

<td>
        1
</td>
</tr>

<tr>
<td>
        &#8220;7342454030115611747&#8221;
</td>

<td>
        &#8220;/google+redesign/office/stickers/youtube+custom+decals.axd&#8221;
</td>

<td>
        1
</td>
</tr>
</table>

<h3>
<a id="user-content-next-pages" class="anchor" href="#next-pages" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Next Pages
</h3>

<p>
  The <code>:NEXT_HIT</code> relationship allows us to see where a user goes next during their visit.
</p>


```cypher
MATCH (p1:Page)<-[:FOR_PAGE]-()-[:NEXT_HIT]->()-[:FOR_PAGE]->(p2)
WHERE p1 <> p2
RETURN p1.url, p2.url, count(*) as total
ORDER BY total DESC
LIMIT 5
```

<table>
<tr>
<th>
      p1.path
</th>

<th>
      p2.path
</th>

<th>
      total
</th>
</tr>

<tr>
<td>
      &#8220;/basket.html&#8221;
</td>

<td>
      &#8220;/yourinfo.html&#8221;
</td>

<td>
      521
</td>
</tr>

<tr>
<td>
      &#8220;/basket.html&#8221;
</td>

<td>
      &#8220;/signin.html&#8221;
</td>

<td>
      470
</td>
</tr>

<tr>
<td>
      &#8220;/yourinfo.html&#8221;
</td>

<td>
      &#8220;/payment.html&#8221;
</td>

<td>
      451
</td>
</tr>

<tr>
<td>
      &#8220;/google+redesign/nest/nest-usa&#8221;
</td>

<td>
      &#8220;/google+redesign/nest/nest-usa/quickview&#8221;
</td>

<td>
      417
</td>
</tr>

<tr>
<td>
      &#8220;/google+redesign/nest/nest-usa/quickview&#8221;
</td>

<td>
      &#8220;/google+redesign/nest/nest-usa&#8221;
</td>

<td>
      380
</td>
</tr>
</table>

<h3>
<a id="user-content-exit-pages" class="anchor" href="#exit-pages" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Exit Pages
</h3>

<p>
  Excluding sessions with a single pageview, where are users exiting the site? By matching a hit where there is both an incoming <code>:NEXT_HIT</code> relationship and no outgoing <code>:NEXT_HIT</code> relationship, we can identify page a user has left the site from.
</p>


```
MATCH (h:Hit)-[:FOR_PAGE]->(p:Page)
WHERE ( ()-[:NEXT_HIT]->(h) ) AND NOT ( (h)-[:NEXT_HIT]->() )
RETURN p.path, count(h) as exists
ORDER BY exists DESC LIMIT 10
```

<table>
<tr>
<th>
      p.path
</th>

<th>
      exists
</th>
</tr>

<tr>
<td>
      &#8220;/home&#8221;
</td>

<td>
      588
</td>
</tr>

<tr>
<td>
      &#8220;/google+redesign/shop+by+brand/youtube&#8221;
</td>

<td>
      195
</td>
</tr>

<tr>
<td>
      &#8220;/asearch.html&#8221;
</td>

<td>
      163
</td>
</tr>

<tr>
<td>
      &#8220;/google+redesign/apparel/mens/mens+t+shirts&#8221;
</td>

<td>
      133
</td>
</tr>

<tr>
<td>
      &#8220;/myaccount.html?mode=vieworderdetail&#8221;
</td>

<td>
      108
</td>
</tr>

<tr>
<td>
      &#8220;/google+redesign/nest/nest-usa&#8221;
</td>

<td>
      97
</td>
</tr>

<tr>
<td>
      &#8220;/basket.html&#8221;
</td>

<td>
      97
</td>
</tr>

<tr>
<td>
      &#8220;/google+redesign/electronics&#8221;
</td>

<td>
      73
</td>
</tr>

<tr>
<td>
      &#8220;/signin.html&#8221;
</td>

<td>
      58
</td>
</tr>

<tr>
<td>
      &#8220;/google+redesign/shop+by+brand/youtube/quickview&#8221;
</td>

<td>
      56
</td>
</tr>
</table>

<h2>
<a id="user-content-conclusion" class="anchor" href="#conclusion" aria-hidden="true"><span aria-hidden="true" class="octicon octicon-link"></span></a>Conclusion
</h2>

<p>
        We&#8217;ve just scratched the surface of what is possible when analysing web traffic in Neo4j. With a small amount of extra effort, you can create a sophisticated import script that maps a wealth of information into the graph. Combining this information with existing data sources, for example identifying customers from mailshots using custom dimensions, can lead to a deeper insight into a customer.
</p>

<p>
        Just remember, GDPR&#8230;
</p>
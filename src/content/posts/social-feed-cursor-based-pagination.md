---
title: "Social Feed Cursor Based Pagination"
description: How to squeeze as much peformance out of a high-traffic, high-volume social feed using Neo4j's Core API.
date: 2019-07-03T14:21:20+01:00
url: /neo4j/social-feed-cursor-based-pagination/
categories:
- neo4j
tags:
- neo4j
- java
- core api
- social
---

Ever since reading the [ODBMS interview with David Fox of Adobe](http://www.odbms.org/blog/2018/07/on-using-graph-database-technology-at-behance-interview-with-david-fox/), I've been eager to work on a large scale social network.  By switching the underlying database for the Behance social feed from Cassandra to Neo4j,they were able to reduce the number of servers from 48 down to a 3 server Neo4j cluster as well as reduce the operational burden of [fanning out writes in order to scale reads](https://www.quora.com/What-is-fan-out-write-and-fan-out-read-in-scalability).

<iframe width="560" height="315" src="https://www.youtube.com/embed/eg3R0JZxvys" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"  style="margin: 2em auto; display: block;" allowfullscreen></iframe>

At Behance, they managed to reduce:
- Maintenance hours down by 300%
- 60-150x lower storage requirements
- 48 servers down to 3 of equivalent size - meaninng much lower operation costs.

Those are crazy numbers, but it shows that if you choose the right tool for the job you can save a lot of time and money on both development and infrastructure costs.


With this in mind, I was excited when I was invited into a client a few weeks ago for a Healthcheck.  The company in question has modelled a social feed with over 13M nodes and many more relationships to represent friendships and following & followers.


## Why is a Graph good for a Social Feed?

The golden rule is **if the connections between data are as important as the data itself** or **if there are 3 or more joins**, a Graph is the right choice.  In this case, the fact that two Users are connected by friendships and follows relationships, and you're joining Users,Friends and Posts, it makes sense to use a Graph Database.

[Jim Webber puts this better than I ever could](https://www.youtube.com/watch?v=BfPDZf2wmqg&list=PL9Hl4pk2FsvVPIWPaKBHYSXpL0txJmwuS&index=2).

You can assume that most clients have a requirement of request times of less than 500ms, otherwise the user will start to feel the difference.  With networks of this scale with millions of users, each with an average of 100-500 friends and potentially hundreds of millions of posts between them, it is important to squeeze as much performance as possible out of the database.

This is where [index-free adjacency](https://medium.com/@dmccreary/how-to-explain-index-free-adjacency-to-your-manager-1a8e68ec664a) advantage of a Graph Native Database comes in.  Regardless of the size of the database, pointer chasing through nodes and relationships in memory is much quicker than scanning indexes on join tables.  Say you have a pivot table called `friends` with two foreign keys, `user_id_from` and `user_id_to`.

```sql
SELECT source.user_id AS source_id, friend.user_id AS friend_id, friendship.since AS since
FROM
    user AS source
    INNER JOIN friendship ON source.user_id = friendship.user_id_from
    INNER JOIN user AS friend ON friendship.user_id_to = friend.user_id
```

In this query, you're forced to scan the indexes at read time in order to find friends.  This means the more your user base grows, the slower the query will get.  As friendship is an undirected relationship, you'll also need to add additional logic to check both the from and to indexes, or even worse insert two rows in the database so you know that you can always join on `user_id_from`.

NoSQL databases are no better for this.  Although they're good at scaling writes, at read time you'll end up scanning indexes and even adding a collection of user id's against each user to hold friends and follows.  Again, for an undirected relationship, you'll need to update two records.

In both examples, you'll also have to fan out to optimise reads.  When a post is created, you'll have to append the post's ID to the posts collection on **each** of the followers.  This is unnecessary complexity for a problem that can be easily solved in a Graph.  If you want to add a new feature, you've got even more code to write.

This example is trivial in Neo4j.  Because the data has been stored in a way to make graph operations .  The query is much simpler too.

```cypher
MATCH (source:User {id: $id})-[friendship:FRIEND_OF]-(friend) // Undirected relationships, cool!
RETURN source.id AS source_id, friend.user_id AS friend_id friendship.since AS since
```

Then when it comes to loading the User's feed, you've got a simple Cypher query:

```
MATCH (:User {id: $id})-[:FRIEND_OF]-()-[:POSTED]->(post:Post)
RETURN post.createdAt, post.body
ORDER BY post.createdAt DESC LIMIT 10
```

As the user base grows, the query time will stay the same thanks to index free adjacency. Once you hit the index on `:User(id)`, you're pointer chasing in memory rather than computing joins between tables.

As always, it's all about using the right tool for the job.


## Modelling a Social Feed

If something is worth doing in Neo4j, chanced are [Max](http://maxdemarzi.com) has already done it.  In this case, the model relies heavily on [Max's News Feed post](https://maxdemarzi.com/2016/10/28/news-feeds/) written in 2016.  The principles haven't changed.

The *TL;DR* of the post is that Neo4j is optimised for traversing relationship types.  By encoding the date of the a `Post` in the relationship name, it means you can traverse a specific subset of a User's posts rather than having to look at everything.  Cut down the number of database hits and the query will be faster.

For now, I'll concentrate on `:Post`s from `User`s that a particular User `FOLLOWS`.  For the posted relationship, the date is encoded as `POSTED_ON_{YYYY}_{MM}_{DD}` format.  Depending on the level of granularity required, you could just encode the year, or you could go down further to dates and times.

![(:User)-[:FOLLOWS]->(:User)-[:POSTED_ON_2019_06_30]->(:Post)](/blog/social-feed-cursor-based-pagination/01-follows-model.svg)

This will allow us to get posts from a User on a particular day.


## User Defined Procedures

You *could* write a Cypher query to pull back the User's posts.  But the requirement here is to squeeze as much performance out of the database as possible.  You cannot specify a dynamic relationship type without some string manipulation in an application layer or expanding all relationships to check the type.  The Core API allows you to do this programatically, so all we would need to do is apply a timestamp or cursor.

Again, [Max is the authority on this](https://maxdemarzi.com/2019/01/28/neo4j-stored-procedures-for-devs-that-dont-know-java-yet/) so head over and read his blog for many examples on how to work with the Neo4j Core API and write User Defined Procedures and Functions.


### But Why Cursors?

For most cases, a simple `SKIP` and `LIMIT`  would be sufficient for pagination.  But with a social feed of hundreds if not thousands of users and posts that is constantly updating, a simple order and limit will not be enough.  By the time the User loads page 2, posts could have been added which would mean a different set of posts would be ordered and limited.  This could lead to users missing vital content.

By using a cursor based approach, you can control where the pagination starts and ends.  So when a User scrolls to the end of the page, you could use a cursor based on the last ID in the post to get the next in the list.  Equally, if you are checking for posts that have been posted since the top result, you can easily identify and find these.

For berevity, I will use the first or last Post ID as the cursor, this way there is a quick lookup on the ID to find when the post was posted.  This could also be a timestamp based on the post timestamp or some encoded value.

So the procedure should do the following:

1. Find the User by it's Username
2. Expand the `FOLLOWS` relationship to find all Users that the original user is following
3. Given the ID of the last post, find the timestamp of the post.  Or fallback to today's date if no cursor exists
4. Find all posts on the day of the cursor
5. Repeat the process for the next day until the limit is reached
6. Decorate the posts with standard information including the poster, likes, comments, reposts, etc
7. Return a Stream of POJO's that hold the posts

By deploying this as a procedure, we can wrap some pretty complex code into a single call.  The results could then be `YIELD`ed into a cypher query where further information could be gathered in the Cypher statement or simply just returned.  The Cypher query will look something like this:

```cypher
CALL social.feed($username, $limit, $cursorType, $cursor)
YIELD post
RETURN post
```

\

## The Procedure

### Dependencies

There are two dependencies needed to use the Core API's.  First, the Core API package (`org.neo4j.neo4j`) and the Test Harness (`org.neo4j.test.neo4j-harness`) for testing purposes.  These releases are versioned in align with Neo4j versions, so I've gone for the latest version here.

```gradle
// build.gradle
project.ext {
    neo4jVersion = '3.5.6'
}

dependencies {
    // ...
    // Neo4j Core
    compileOnly group: 'org.neo4j', name: 'neo4j', version: project.neo4jVersion

    // ...
    // Neo4j Test Harness
    testCompile group: 'org.neo4j.test', name: 'neo4j-harness', version: project.neo4jVersion
}
```

When I first started with Java, I preferred the look of a gradle file over a Maven xml file and I'm stubbornly sticking to it here.  I like that you can define the `neo4jVersion` as part of the project config and quickly update it if you're updating the project for a later release of Neo4j.  [The same dependencies can](https://mvnrepository.com/artifact/org.neo4j) also be included in a Maven project if you're that way inclined.


### `@Context` variables

Neo4j will automatically inject three instances objects into a class.

- The `GraphDatabaseService` will be used to interact with the Java Core API.
- The `Log` class be used to log information to the Neo4j log files.
- The `TerminationGuard` allows long running procedures to check at regular intervals if the surrounding query has been terminated or has timed out and terminate itself appropriately.


These need to public and non-final and annotated as `@Context`.  Apart from `@Context`-annotated variables, classes that define procedures or functions should only contain static variables.  Here we’re defining a Customer label that we will use later on in the class.


```java
import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.logging.Log;
import org.neo4j.procedure.Context;
import org.neo4j.procedure.TerminationGuard;

public class Feed {

    // Context variables must be public and non-final
    @Context
    public GraphDatabaseService db;

    @Context
    public Log log;

    @Context
    public TerminationGuard guard;

    // Everything that isn't a context variable must be Sstatic
    private static Label User = Label.label("User");

    // Write some Procedures
}
```

### Procedure Definition

Next, a procedure function needs to be defined.  In order to make this callable from a Cypher query it needs to be annotated with the `@Procedure` annotation.  By default, the procedure will be named `{packageName}.{functionName}`, but this can be overridden by providing a `name` value.
A `@Description` parameter can be added to provide a friendly description for end users.  Any parameters passed into the function need to be annotated with `@Name`, and can be given a `defaultValue`.

```java
@Procedure(name="social.feed")
@Description("social.feed(username, [limit, [cursorType, since]]) :: post, author | Get the feed for a user")
public Stream<PostResult> socialFeed(
        @Name("username") String username,
        @Name(value = "limit", defaultValue = "10") Double limit,
        @Name(value = "cursor", defaultValue = "before") String cursorType,
        @Name(value = "sinceId", defaultValue = "") String sinceId
) {
    // Code here...
}
```

### Result POJO

As you can see, the procedure returns a `java.util.Stream` of `PostResult`.  This is simply a **POJO**(Plain old Java Object) where any public property in the POJO can be `YIELD`ed into the query.  In this case I just want to return a `Map` that represents the decorated post.

```java
public class PostResult
{
    // Can be yielded
    public Map<String, Object> post;

    // Cannot be yielded
    private Object hidden;

    public PostResult(Map<String, Object> post) {
        this.post = post;
    }
}
```

### The Service

I prefer to split my procedures out into their own classes so it makes them easier to unit test. Any interactions with the graph start with the `GraphDatabaseService` so I will add this as a parameter on the constructor.  The `Log` class is also useful for logging information out into neo4j.log.

```java
public class GetFeed
{
    private final GraphDatabaseService db;
    private final Log log;

    public GetFeed( GraphDatabaseService db, Log log ) {
        this.db = db;
        this.log = log;
    }

    // Code here...
}
```

Then, define a function that can be called in the procedure definition, taking the user's username, the type of cursor, the cursor itself and the number of results to return.

```java
public Stream<PostResult> forUser(
    String username,
    String cursorType,
    String sinceId,
    Double limit
) {
    // Code here...
}
```

Now we can write some code to pull the user's feed.

#### Getting the User

The `GraphDatabaseService::findNode` function allows you to find a single node based on a property.

```java
private Node getUser(String username) {
    return db.findNode( Labels.User, Properties.username, username );
}
```


#### List of Follows

The `Node` object allows you to expand nodes in various combinations, allowing you to get all relationships in any direction or of a specific type.  In this case, we want posts from Users that the current user follows and also their friends through the `FRIEND_OF` relationship in either direction.

```java
private Set<Node> getFollowing(Node user) {
    Set<Node> users = new HashSet<>(  );

    // (user)-[:FOLLOWS]->(:User)
    for ( Relationship rel : user.getRelationships( RelationshipTypes.FOLLOWS, Direction.OUTGOING ) ) {
        users.add( rel.getOtherNode( user ) );
    }

    // (user)-[:FRIEND_OF]-(:User)
    for ( Relationship rel : user.getRelationships( RelationshipTypes.FRIEND_OF, Direction.BOTH ) ) {
        users.add( rel.getOtherNode( user ) );
    }

    return users;
}
```

#### Posts by Cursor

Next, we need to get an upper bound for the dated relationships to traverse.  If no cursor/ID is specified, the code should fall back to the current date and time.  Otherwise, we'll need a function to look up a post by it's ID and use it's `createdAt` property.

```java
// Default Date to current time
ZonedDateTime dateTime = ZonedDateTime.now();

// If a post ID is specified, then get a
if ( sinceId != null && !sinceId.equals("") ) {
    dateTime = getPostTime( sinceId );
}
```

Again, you can use `db.findNode` to get a Node of a particular label by a key/value pairing.  If the post is found, the `getProperty` method will allow you to access the property.  Otherwise, fallback to the current date and time.


```java
private ZonedDateTime getPostTime(String postId) {
    Node post = db.findNode( Labels.Post, Properties.postId, postId );

    if ( post != null ) {
        return (ZonedDateTime) post.getProperty( Properties.postCreatedAt, ZonedDateTime.now() );
    }

    // Post not found, use the current date and time
    log.debug( "Cannot find post "+ postId +". Using now() as value" );
    return ZonedDateTime.now();
}
```

### Getting Before After the Cursor

After finding the date and time of the last viewed post, the next thing required is a function that will iterate through the list of users that the current user is following, find any posts that they've made on this day and by traversing the dated relationship and add them to a `List` and sort them by their created date.

```java
private List<Node> getPostsOnDate(Set<Node> users, ZonedDateTime date, Comparator comparator) {
    List<Node> output = new ArrayList<>(  );

    // Get all posts from each user on the date
    RelationshipType relType = RelationshipType.withName( String.format(POSTED_ON,  date.format( Time.formatter )) );

    for ( Node user : users ) {
        for ( Relationship rel: user.getRelationships( relType, Direction.OUTGOING) ) {
            // Add to output
            output.add( rel.getEndNode() );
        }
    }

    // Sort
    output.sort(
        Comparator.comparing(
            n -> ( (ZonedDateTime) ((Node) n).getProperty( Properties.postCreatedAt ) ).toEpochSecond(),
            comparator
        )
    );

    return output;
}
```

Because there may be no posts at all on this date to fill the limit, or possibly too many, a function is needed to to keep checking the previous days until either the limit is reached.  A floor is also needed to stop the function running in an infinite loop.  In this case, I have chosen an abitrary date of 3 December 2007, but this could just as easily be the date of the first post in the database.

```java
private List<Node> getPostsBefore(Set users, ZonedDateTime dateTime, Double limit) {
    final List<Node> output = new ArrayList<>(  );

    ZonedDateTime originalDateTime = dateTime;

    // Set a minimum date to stop the code running forever
    ZonedDateTime floor = ZonedDateTime.parse("2007-12-03T10:15:30+01:00[Europe/London]");

    while ( output.size() < limit && dateTime.isAfter( floor ) ) {
        List<Node> posts = getPostsOnDate(users, dateTime, reverseOrder());

        posts.forEach( n -> {
            ZonedDateTime postCreatedAt = (ZonedDateTime) ((Node) n).getProperty( Properties.postCreatedAt );

            // Add to the
            if ( postCreatedAt.isBefore( originalDateTime ) ) {
                output.add( n );
            }
        } );

        // Try again with the day before
        dateTime = dateTime.minusDays(1);
    }

    // Trim to size and return
    return output.subList( 0, Math.min(limit.intValue(), output.size()) );
}
```

Once the from each date are found, a check is added to make sure that the date is after the time of the original post so you don't return any duplicates.  Then the list is trimmed to size using the `limit` variable supplied into the function.


### Decorating Posts

### Posts after the Cursor

For the sake of berevity, I will skip the implementation of the `getPostsAfter` method in this post but if you are curious then [you can find the code in the repository](https://github.com/adam-cowley/social/blob/master/src/main/java/ac/owley/social/feed/procedures/GetFeed.java#L128).  Essentially the code is similar, but instead of subtracting a day from the date you instead add a day to the date, and set a ceiling rather than a floor to prevent the infinite loop.  There is also some post-processing work to do on the results to reverse the order so they appear correctly in the UI.

## TL;DR: Putting it all together

[The code is available on Github](https://github.com/adam-cowley/social/blob/master/src/main/java/ac/owley/social/feed/procedures/GetFeed.java) - feel free to clone and try it out for yourself.  The callable function below takes all of the functions into a single method that can be called.


```java
public Stream<PostResult> forUser(
    String username,
    String cursorType,
    String sinceId,
    Double limit
) {
    // Get User
    Node user = getUser(username);

    if ( user == null ) {
        log.debug( "Cannot find user "+ username +". Returning empty stream" );
        return Stream.empty();
    }

    // Get Following
    Set following = getFollowing( user );

    if ( following.size() == 0 ) {
        log.debug( "User"+ username +" isn't following anyone. Returning empty stream" );
        return Stream.empty();
    }

    // Get Date of last/next post
    ZonedDateTime dateTime = ZonedDateTime.now();

    if ( sinceId != null && !sinceId.equals("") ) {
        dateTime = getPostTime( sinceId );
    }

    // Correct Cursor Type
    if ( cursorType == null || ( !cursorType.equals(CURSOR_TYPE_BEFORE) && !cursorType.equals(CURSOR_TYPE_AFTER) ) ) {
        cursorType = CURSOR_TYPE_BEFORE;
    }

    List<Node> output;

    if ( cursorType.equals(CURSOR_TYPE_AFTER) ) {
        output = getPostsAfter(following, dateTime, limit);
    }
    else {
        output = getPostsBefore(following, dateTime, limit);
    }

    // Get the next X posts before this post
    return output
            .stream()
            .map(e -> new PostResult( Decorator.decoratePost( e ) ));
}
```

The `GetFeed` class can then be instantiated in the `@Procedure` annotated function and called with the parameters passed through from the Cypher call.

```java
@Procedure(name="social.feed")
@Description("social.feed(username, [limit, [cursorType, since]]) :: post, author | Get the feed for a user")
public Stream<PostResult> socialFeed(
        @Name("username") String username,
        @Name(value = "limit", defaultValue = "10") Double limit,
        @Name(value = "cursor", defaultValue = "before") String cursorType,
        @Name(value = "sinceId", defaultValue = "") String sinceId
) {
    GetFeed feed = new GetFeed(db, log);

    return feed.forUser(username, cursorType, sinceId, limit);
}
```


## Testing the Procedure

The Neo4j Test Harness comes with a `Neo4jRule` class which exposes an implementation of Neo4j for test purposes.  This can be used to create an in-memory database.  The `.withProcedure` method will allow us to load any classes that contain procedure definitions into the Test Server.  Any test data required for the test can be loaded in using the `.withFixture` method.


```java
@Rule
public final Neo4jRule neo4j = new Neo4jRule()
    // Register Procedures
    .withProcedure(Procedures.class)

    // Cypher query that creates an example dataset
    .withFixture("CREATE (n) ...");
```

Then a test method can be written to execute a Cypher statement and make some assertions on the result.  There is a more verbose example of the test class [in the repository](https://github.com/adam-cowley/social/blob/master/src/test/java/ac/owley/social/feed/FeedTest.java).

```java
@Test
public void shouldMountMyProcedures() throws Throwable {
    GraphDatabaseService db = neo4j.getGraphDatabaseService();

    try ( Transaction tx = db.beginTx() ) {
        Result res = db.execute("CALL social.feed('adam', 10) YIELD post RETURN post");

        // Result is an Iterator so you can get the `next` post
        // or iterate over the results in a for loop
        Node node = (Node) res.next().get("post");

        // Make some assertions
    }
}
```


## Deploying the Procedure

The deployment process is the only drawback of writing [User Defined Procedures & Functions](https://neo4j.com/docs/java-reference/current/extending-neo4j/procedures-and-functions/procedures/).  For every release, you need to build a jar file, deploy it to all of the Neo4j servers and restart the Neo4j service on each server.  That said, if the performance wins are enough this is a challenge well worth taking on.


```sh
# Build
gradle build # or mvn clean package

# Deploy
cp target/project-1.0.jar $NEO4J_HOME/plugins

# Restart
$NEO4J_HOME/bin/neo4j restart
```

Once Neo4j has restarted, you should see the procedure listed under `dbms.procedures`.

```
call dbms.procedures() YIELD name, description
WITH name, description WHERE name STARTS WITH "social"
RETURN name, description
```

| name | description |
|:--- |:--- |
| social.feed | `social.feed(username, [limit, [cursorType, since]]) ...` |

\

There it is.  Now it can be `CALL`ed in a Cypher Statement with the code in the description.

## Conclusion

Neo4j is a great choice for Social Feeds, the database is designed from the ground up to traverse large networks in real time and Cypher makes queries like this a trivial task.  When working with larger graphs, specific relationship types allow you traverse small subgraphs and improve performance by orders of magnitude.  But sometimes these relationships require you to be a little clever, this is where a User Defined Procedure can give you those extra performance wins.

[The code that supports this blog post is available on GitHub](https://github.com/adam-cowley/social).

Do you have a social feed in your Neo4j database?  Would you model the data differently?  Drop me a message.   I'm [@adamcowley on Twitter](http://twitter.com/adamcowley)
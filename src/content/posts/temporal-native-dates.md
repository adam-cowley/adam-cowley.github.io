---
title: An introduction to Temporal Date Types in Neo4j
description: A comprehensive guide to using temporal types in Cypher, including Date, Time, DateTime, LocalDate, LocalDateTime and Duration.
date: 2018-05-16T22:25:51+00:00
categories:
- Neo4j
tags:
- neo4j
- temporal
---

With Neo4j 3.4 GA now out in the wild, a few people have asked me about the new Temporal data types that have been introduced. In this post I will go over the a few of the new additions and provide a working example.


### TL;DR: Jump to&#8230;</strong>


- <a href="#clocks">Clocks</a>
- <a href="#dates">Dates</a>
- <a href="#time">Times</a>
- <a href="#local-dates-and-times">Local Dates and Times</a>
- <a href="#durations">Durations</a>
- <a href="#truncating-values">Truncating Values</a>
- <a href="#config-changes">Config Changes</a>
- <a href="#converting-dates">Converting Dates</a>
- <a href="#a-working-example-route-planning">Working Example</a>

When I first started using Neo4j back in 2014, I can remember one thing was missing &#8211; support for native date datatype. The holy grail. This lead to some pretty <del>complex</del> clever approaches to dates including <a href="https://graphaware.com/neo4j/2014/08/20/graphaware-neo4j-timetree.html" rel="nofollow">Time Trees</a> which represented the dates as a tree of nodes with labels <code>:Year</code>, <code>:Month</code> and <code>:Day</code> and even down to second level.

As the performance of index-backed range seeks improved, the need to maintain these trees of nodes reduced but you were still left with a dilemma. Do you store the properties as a human readable date? Maybe seconds since epoch? Do I need to use <a href="https://neo4j-contrib.github.io/neo4j-apoc-procedures/" rel="nofollow">APOC</a> to convert the dates.

Luckily, from version 3.4, we no longer need to worry about it.

Neo4j now supports five temporal types, all a combination of date, time and timezone.

Type | Description | Supports Date? | Supports Time? | Supports Timezone?
--- | --- |:---:|:---:|:---:
Date | A tuple of Year, Month and Day | Y
Time | An instance of a point in time | Y | Y
LocalTime | A time that is considered “local” in it’s context |  | Y
DateTime | A combination of Date and Time | Y | Y | Y
LocalDateTime | A combination of Date and Time that can be considered “local” in it’s context | Y | Y



<h2 id="clocks" class="make-it-readable">
    Clocks
</h2>

Before I go into the new types, I first need to mention <em>clocks</em>. When creating a new date or time value, you have the option of chosing one of three <em>clocks</em>.

- <strong>The Transaction clock</strong> &#8211; Uses the date and time at the start of the current transaction &#8211; this is the same as cypher&#8217;s <code>timestamp()</code> function which does not update during the transaction.
- <strong>The Statement clock</strong> &#8211; Transactions can contain more than one statement. To use the date and time of the current statement, use the static <code>.statement()</code> function.
- <strong>The Realtime Clock</strong> &#8211; This returns the real time date regardless of the transaction and statement start dates. This is the equivalent of <code>apoc.date.currentTimestamp()</code>

Each of these functions also accepts a single parameter, allowing you to specify the timezone of the returned instance. For example <code>datetime.statement('Europe/London')</code>. If you don&#8217;t specify a timezone, the server&#8217;s default timezone will be used.


<h2 id="dates" class="make-it-readable">
    Dates
</h2>

<h3 id="getting-the-current-date">
    Getting the Current Date
</h3>

<p>
    The <code>date()</code> function can be used to create in instance of a <code>Date</code>. As mentioned earlier, you can call the static method on dates to return a time based on the start of the transaction, statement or realtime.
</p>

```
RETURN date(), date.transaction(), date.statement(), date.realtime()
```

<table>
<tr>
<th>
        date
</th>

<th>
        date.transaction
</th>

<th>
        date.statement
</th>

<th>
        date.realtime
</th>
</tr>

<tr>
<td>
<code>"2018-05-16"</code>
</td>

<td>
<code>"2018-05-16"</code>
</td>

<td>
<code>"2018-05-16"</code>
</td>

<td>
<code>"2018-05-16"</code>
</td>
</tr>
</table>

<p>
    The date function will also take two optional arguments, a Map of options and/or a timezone in String format.
</p>

<h3 id="specifying-a-date" class="make-it-readable">
    Specifying a date
</h3>

<p>
    A date can be specified in one of two ways, either by passing through <a href="https://neo4j.com/docs/developer-manual/preview/cypher/syntax/temporal/#cypher-temporal-specify-date" rel="nofollow">a valid ISO 8601 data type</a> as a String, or by providing a map containing the year, month and day.
</p>

```
UNWIND [
  date('2018-01-01'),
  date({ year: 2018, month: 1, day: 2 })
] AS date
RETURN date
```

<table>
<tr>
<th>
        date
</th>
</tr>

<tr>
<td>
<code>"2018-01-01"</code>
</td>
</tr>

<tr>
<td>
<code>"2018-01-02"</code>
</td>
</tr>
</table>

<p class="make-it-readable">
    The individual units of the date value can be accessed via year, month and day accessors.
</p>

```
WITH date('2018-05-16') AS date
RETURN date.year, date.month, date.day
```

<table>
<tr>
<th>
        date.year
</th>

<th>
        date.month
</th>

<th>
        date.day
</th>
</tr>

<tr>
<td>
<code>2018</code>
</td>

<td>
<code>5</code>
</td>

<td>
<code>16</code>
</td>
</tr>
</table>

<p>
    Another nice feature of the <a href="https://en.wikipedia.org/wiki/ISO_8601" rel="nofollow">ISO 8601</a> support is the ability to create dates by the week number (<code>2018-W51</code>), quarter (<code>2018-Q2</code>) or ordinal dates (<code>2018-364</code>).
</p>

<h2 id="time">
    Time
</h2>

<p>
    Time values are created using the <code>time()</code> function. Like a Date, a time instant can be created with either an ISO 8601 string or a map containing hour, minute, second, millisecond and/or nanosecond values. As with the Date, there are accessors for each unit of time held in the
</p>

```
UNWIND [
  time('12:34:56.1234'),
  time({ hour: 12, minute: 34, second: 45, millisecond: 123, nanosecond: 400000 })
] AS time
RETURN time.hour, time.minute, time.second,  time.millisecond, time.nanosecond, time.timezone
```

<table>
<tr>
<th>
        time.hour
</th>

<th>
        time.minute
</th>

<th>
        time.second
</th>

<th>
        time.millisecond
</th>

<th>
        time.nanosecond
</th>

<th>
        time.timezone
</th>
</tr>

<tr>
<td>
<code>12</code>
</td>

<td>
<code>34</code>
</td>

<td>
<code>56</code>
</td>

<td>
<code>123</code>
</td>

<td>
<code>123400000</code>
</td>

<td>
<code>"Z"</code>
</td>
</tr>

<tr>
<td>
<code>12</code>
</td>

<td>
<code>34</code>
</td>

<td>
<code>45</code>
</td>

<td>
<code>123</code>
</td>

<td>
<code>123400000</code>
</td>

<td>
<code>"Z"</code>
</td>
</tr>
</table>

<h2 id="datetime" class="make-it-readable">
</span></a>DateTime
</h2>

<p>
    A <code>DateTime</code> is a combination of both date and time and can be constructed using a combination of the date and time constructs mentioned above.
</p>

```cypher
UNWIND [
  datetime('2018-01-02T07:20:30[Europe/London]'),
  datetime({ year: 2018, month: 1, day: 2, hour:07, minute: 20, second: 30, timezone: 'Europe/London' })
] AS date
RETURN datetime
```

<table>
<tr>
<th>
        datetime
</th>
</tr>

<tr>
<td>
<code>"2018-01-02T07:20:30[Europe/London]"</code>
</td>
</tr>

<tr>
<td>
<code>"2018-01-02T07:20:30[Europe/London]"</code>
</td>
</tr>
</table>

<h2 id="local-dates-and-times">
    Local Dates and Times
</h2>

<p>
    Local Dates and Times are simply a way of storing data without the need for extraneous data. Instances of <code>LocalTime</code> and <code>LocalDateTime</code> can be considered &#8220;local&#8221; in their context, meaning a delivery shipped at 16:00 in London would be in in GMT or BST without needing to store the timezone.
</p>

<p>
    It is worth noting that local dates and times are not comparable to date and time data that are stored in different timezones. A package shipped from Berlin with a LocalTime of 16:00 could not be compared to the time of the package shipped from London.
</p>

```
RETURN localtime(), localdatetime()
```

<table>
<tr>
<th>
        localtime
</th>

<th>
        localdatetime
</th>
</tr>

<tr>
<td>
<code>"18:53:44.727000000"</code>
</td>

<td>
<code>"2018-05-16T18:53:44.727000000"</code>
</td>
</tr>
</table>

<h2 id="durations">
    Durations
</h2>

<p>
    Neo4j 3.4 also supports durations. A duration is defined as the difference between two instances in time. To create a duration, we can either pass through a string containing a valid duration string or <a href="https://neo4j.com/docs/developer-manual/preview/cypher/functions/temporal/#functions-duration-create-components" rel="nofollow">a map containing one or more components</a>
</p>

<p>
    The String version starts with a <code>P</code> and then contains one or more of the following
</p>


- <code>x</code>Y &#8211; Number of years
- <code>x</code>M &#8211; Number of months
- <code>x</code>D &#8211; Number of days



<p>
    And then one or more time units, prefixed with a <code>T</code>
</p>


- <code>x</code>H &#8211; Number of hours
- <code>x</code>M &#8211; Number of minutes
- <code>x</code>S &#8211; Number of seconds with milliseconds after a decimal point.



<p>
    For example, <code>P2012Y4M2DT14H37M21.545S</code> denotes a duration of 2012 years, 4 months, 2 days; 14 hours, 37 minutes, 21 seconds and 545 milliseconds.
</p>

<p>
    Alternatively, the map can contain one or more of: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds.
</p>

<p>
    Let&#8217;s take a look at a couple of examples in action&#8230;
</p>

```
UNWIND [
  duration('P30DT4980S'),
  duration({ days: 30, hours: 1, minutes: 23 })
] as duration
RETURN duration
```

<table>
<tr>
<th>
        duration
</th>
</tr>

<tr>
<td>
<code>"P0M30DT4980S"</code>
</td>
</tr>

<tr>
<td>
<code>"P0M30DT4980S"</code>
</td>
</tr>
</table>

<p class="make-it-readable">
    We can sum both a date and a duration together to provide us with a date 90 days in the future.
</p>

```
WITH date() as now, duration('P90D') AS duration
RETURN now, now + duration AS then
```

<table>
<tr>
<th>
        now
</th>

<th>
        then
</th>
</tr>

<tr>
<td>
<code>"2018-05-16"</code>
</td>

<td>
<code>"2018-08-14"</code>
</td>
</tr>
</table>

<p>
    Three months until my birthday, I now expect a birthday present from you&#8230;
</p>

<h3 id="durations-between-dates" class="make-it-readable">
    Durations between dates
</h3>

<p>
    You can calculate the difference between dates by using the <code>duration.between(start, end)</code> function. This function compares two points in time and returns an instance of a <code>Duration</code>.
</p>

```
WITH datetime.transaction() AS start
CALL apoc.util.sleep(2000)
WITH start, datetime.realtime() AS end
RETURN duration.between(start, end) as duration
```

<table>
<tr>
<th>
        duration
</th>
</tr>

<tr>
<td>
<code>"P0M0DT2.003000000S"</code>
</td>
</tr>
</table>

<p>
    There are also <code>duration.inSeconds</code>, <code>duration.inDays</code> <code>duration.inMonths</code> functions which discard any smaller components to provide a rounded figure.
</p>

<h2 id="truncating-values">
    Truncating Values
</h2>

<p>
    Any temporal value can be truncated using the <code>truncate()</code> function. <a href="https://neo4j.com/docs/developer-manual/preview/cypher/functions/temporal/#functions-temporal-truncate-overview" rel="nofollow">Truncating an instant</a> allows you to round a value to the nearest unit of time &#8211; for example, removing the seconds or milliseconds from a value.
</p>

```
datetime.truncate('seconds', myDate)
```

<h2 id="config-changes">
    Config Changes
</h2>

<p>
    There is one additional configuration setting included in <code>neo4j.conf</code>. The <code>db.temporal.timezone</code> setting is used to configure the default timezone for the server. By default this is set to UTC (<code>Z</code>).
</p>

```
db.temporal.timezone=Europe/London
```

<h2 id="converting-dates" class="make-it-readable">
    Converting Dates
</h2>

<p>
    If you&#8217;re currently using the <code>timestamp()</code> function or milliseconds since epoch, you can supply a map with <code>epochMillis</code> set to the timestamp property stored on the node.
</p>

```
MATCH (e:Event)
SET e.startDate = datetime({ epochMillis: e.startsAt })
```

    If you are storing seconds rather than milliseconds, you can define a <code>epochSeconds</code> option instead.
</p>

<h2 id="a-working-example-route-planning" class="make-it-readable">
    A Working Example: Route Planning
</h2>

<p>
    To demonstrate how these temperal data types work, I will revisit the Journey Planning project that featured in my talk at <a href="http://graphconnect.com" rel="nofollow">Graph Connect 2017 in London</a>. For brevity, I will use the basic scheduling data rather than the extensive model.
</p>

<p>
    Let&#8217;s run a quick cypher statement to set up some test data. First I&#8217;ll create a <code>:Service</code> node, each service will have one or more scheduled <code>:Leg</code> nodes. Each leg will have two relationships to signify which <code>:Station</code> a traveller can board from or alight to.
</p>

```
// An array of legs with their origin, destination and departure and arrival times
WITH [
  {origin:'PAD', destination:'REA', departsAt:'08:00', arrivesAt:'08:28'},
  {origin:'REA', destination:'DPW', departsAt:'08:30', arrivesAt:'08:43'},
  {origin:'DPW', destination:'SWI', departsAt:'08:45', arrivesAt:'08:58'},
  {origin:'SWI', destination:'CHI', departsAt:'09:00', arrivesAt:'09:13'},
  {origin:'CHI', destination:'BAT', departsAt:'09:15', arrivesAt:'09:28'},
  {origin:'BAT', destination:'BRI', departsAt:'09:30', arrivesAt:'10:00'}
] as legs
// Create the Service Node
MERGE (service:Service { reference: '0800-GWR-PAD-BRI' })
WITH service, legs
// Create (:Service)-[:HAS_SCHEDULED_LEG]->(:Leg)
UNWIND legs AS leg
MERGE (l:Leg {
    reference: service.reference + '-'+ leg.origin + '-'+ leg.destination,
    departsAt: leg.departsAt,
    arrivesAt: leg.arrivesAt
})
MERGE (service)-[:HAS_SCHEDULED_LEG]->(l)
// Create (:Station)-[:CAN_BOARD]->(:Leg)-[:CAN_ALIGHT]->(:Station)
MERGE (origin:Station { reference: leg.origin })
MERGE (destination:Station { reference: leg.destination })
MERGE (origin)-[:CAN_BOARD]->(l)
MERGE (l)-[:CAN_ALIGHT]->(destination)
// Create (:Leg)-[:NEXT_LEG]-=>(:Leg)
WITH collect(l) as legs
UNWIND range(0, size(legs)-2) as idx
WITH legs[idx] as this, legs[idx+1] as next
MERGE (this)-[:NEXT_LEG]->(next)
```

This should give us some data to play with.

<a href="/images/posts/temporal-native-dates/Screen-Shot-2018-05-16-at-10.33.56.png" target="_blank" rel="nofollow"><img src="/images/posts/temporal-native-dates/Screen-Shot-2018-05-16-at-10.33.56.png" alt="The Data Model" data-canonical-src="/images/posts/temporal-native-dates/Screen-Shot-2018-05-16-at-10.33.56.png" style="max-width:100%;" /></a><br /> <em>Looking good&#8230;</em>

<h3 id="creating-a-schedule" class="make-it-readable">
    Creating a Schedule
</h3>

<p>
    As standard, we want customers to be able to book a journey 90 days in advance. Rather than creating the processes manually, it would be useful to create a script that can be run daily to create all services in batch.
</p>

<p>
    Each day, we would like to create the schedule for 90 days time. We can do this by adding a 90 day duration to the current date:
</p>

```
WITH date() + duration('P90D') AS scheduleDate
```

Then, let&#8217;s match all of the services and their legs <em>(for the sake of argument, let&#8217;s pretend we&#8217;ve also checked that the services are valid for the scheduledDate&#8230;)</em>

```
MATCH (service:Service)
WITH scheduleDate, service, [ (service)-[:HAS_SCHEDULED_LEG]->(l) | l ] as legs
```

Then create a <code>:ServiceDay</code> node. We can use the accessors from <code>scheduleDate</code> to create a unique reference for the Service for that particular day. While we&#8217;re at it, we can set the date property to our Date instance.


```
MERGE (day:ServiceDay {
  reference: service.reference +'-'+ scheduleDate.year +'-'+ scheduleDate.month +'-'+ scheduleDate.day
})
SET day.date = scheduleDate
MERGE (service)-[:HAS_SERVICE_DAY]->(day)
```

Next, unwind the scheduled legs, get the origin and destination stations and create the legs for the service on that day.


```
WITH scheduleDate, service, legs, day
UNWIND legs AS leg
MATCH (origin)-[:CAN_BOARD]->(leg)-[:CAN_ALIGHT]->(destination)
MERGE (l:ServiceDayLeg {
  reference: leg.reference + '-'+ scheduleDate.year +'-'+ scheduleDate.month +'-'+ scheduleDate.day
})
SET
    l.departsAt = localtime(leg.departsAt),
    l.arrivesAt = localtime(leg.arrivesAt),
    l.duration = duration.between(l.departsAt, l.arrivesAt)
MERGE (day)-[:HAS_LEG]->(l)
MERGE (origin)-[:CAN_BOARD]->(l)
MERGE (destination)<-[:CAN_ALIGHT]-(l)
```

Why <code>LocalTime</code>? We&#8217;re only dealing with a single timezone so there is no need to store a timezone with the time. If you&#8217;re dealing with services in different countries then you can compare instants in different timezones using <code>Time</code>.


<p>
    Lastly, let&#8217;s combine the legs together into a linked list so we can traverse through the journey.
</p>

```
WITH service, l ORDER BY l.departsAt ASC
WITH service, collect(l) AS legs
UNWIND range(0, size(legs)-2) AS idx
WITH legs[idx] AS this, legs[idx+1] as next
MERGE (this)-[:NEXT_LEG]->(next)
```

<h3 id="full-cypher-statement" class="make-it-readable">
    Full Cypher Statement
</h3>

```
WITH date() + duration('P90D') AS scheduleDate
MATCH (service:Service)
WITH scheduleDate, service, [ (service)-[:HAS_SCHEDULED_LEG]->(l) | l ] as legs
// Create Service Day
MERGE (day:ServiceDay {
    // We can use the .year, .month, .day accessors on a date type
    reference: service.reference +'-'+ scheduleDate.year +'-'+ scheduleDate.month +'-'+ scheduleDate.day
})
// ... and set the date as a property
SET day.date = scheduleDate
MERGE (service)-[:HAS_SERVICE_DAY]->(day)
WITH scheduleDate, service, legs, day
// Unwind the legs
UNWIND legs AS leg
MATCH (origin)-[:CAN_BOARD]->(leg)-[:CAN_ALIGHT]->(destination)
MERGE (l:ServiceDayLeg {
    reference: leg.reference + '-'+ scheduleDate.year +'-'+ scheduleDate.month +'-'+ scheduleDate.day
})
SET
    // The arrival and departure times can be converted to LocalTime
    l.departsAt = localtime(leg.departsAt),
    l.arrivesAt = localtime(leg.arrivesAt),
    l.duration = duration.between(l.departsAt, l.arrivesAt)
MERGE (day)-[:HAS_LEG]->(l)
MERGE (origin)-[:CAN_BOARD]->(l)
MERGE (destination)<-[:CAN_ALIGHT]-(l)
WITH service, l ORDER BY l.departsAt ASC
WITH service, collect(l) AS legs
// Create :NEXT_LEG relationships
UNWIND range(0, size(legs)-2) AS idx
WITH legs[idx] AS this, legs[idx+1] as next
MERGE (this)-[:NEXT_LEG]->(next)
```

<p class="make-it-readable">
    So&#8230;how long will it take me to get home this evening?
</p>

```
MATCH (origin:Station {reference: 'PAD'})-[:CAN_BOARD]->(start:ServiceDayLeg),
      (destination:Station {reference: 'SWI'})<-[:CAN_ALIGHT]-(end:ServiceDayLeg)
MATCH path = (start)-[:NEXT_LEG*0..10]->(end)
WITH duration.between(start.departsAt, end.arrivesAt) as journeyDuration
RETURN journeyDuration, journeyDuration.minutes as minutes
```

<table>
<tr>
<th>
        journeyDuration
</th>

<th>
        minutes
</th>
</tr>

<tr>
<td>
<code>"P0M0DT3480S"</code>
</td>

<td>
        60
</td>
</tr>
</table>

<h2 id="indexing-temporal-types" class="make-it-readable">
    Indexing Temporal Types
</h2>

<p>
    Equality and range lookups on temporal data types are backed by indexes, making queries extremely fast. Indexes are created in the same manner as before.
</p>

```
CREATE INDEX ON :ServiceDay(date)
```

The planner shows that a simple range query uses a <code>NodeIndexSeekByRange</code> stage.

```
explain MATCH (s:ServiceDay)
WHERE date('2018-08-12') &gt;= s.date &gt;= date('2018-08-15')
RETURN s
```

<p style="text-align: center">
<a href="/images/posts/temporal-native-dates/plan-2.png" target="_blank" rel="nofollow"><img src="/images/posts/temporal-native-dates/plan-2.png" alt="The Query Plan shows that range queries are indexed backed" data-canonical-src="/images/posts/temporal-native-dates/plan-2.png" style="max-width:100%;" /></a>
</p>

<h2 id="further-reading" class="make-it-readable">
    Further Reading
</h2>

<p>
    Neo4j 3.4 is still in it&#8217;s early stages the moment so many of these features are still in development. Still, you can try them out by <a href="https://neo4j.com/download/other-releases/#releases" rel="nofollow">downloading 3.4.0 from neo4j.com</a> or in Neo4j Desktop. Community posts are scarse, but documentation for all of the new functionality can be found in the preview documentation.
</p>

- <a href="https://neo4j.com/docs/developer-manual/preview/cypher/functions/temporal/" rel="nofollow">Temporal Functions</a>
- <a href="https://neo4j.com/docs/developer-manual/preview/cypher/syntax/operators/#query-operators-temporal" rel="nofollow">Temporal Operators</a>
- <a href="https://neo4j.com/docs/developer-manual/preview/cypher/syntax/operators/#cypher-ordering" rel="nofollow">Ordering and comparison of temporal values</a>


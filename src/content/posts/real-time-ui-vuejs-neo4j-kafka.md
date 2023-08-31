---
title: "Building a Real-Time UI on top of Neo4j with Vue.js and Kafka"
image: /images/posts/real-time-ui-vuejs-neo4j-kafka/fig1.png
date: 2020-01-07T12:55:08Z
description: "How to build a Real-time UI on top of Neo4j with VueJS using websockets, driven by Kafka and the Neo4j Streams plugin."

categories:
- neo4j
tags:
- neo4j
- nodejs
- kafka
- vuejs
---

**Note: This post was published in 2020.  Some advice may be out of date.**

In this post, I will demonstrate how you can build a real-time application on top of [Neo4j](https://neo4j.com) using a few open source plugins.  Due to brevity, this will only be a basic application but you can take the principles and make it as complicated as you need.

For this example, I will also be using [Vue.js](https://vuejs.org/) on top of an [express](https://expressjs.com/) server communicating through websockets.  If you prefer something like React then it will work just as well.

Also, I'm using [neode](https://github.com/adam-cowley/neode) - a nodejs based OGM that I wrote for Neo4j.  Again, you could quite easily swap this out for another OGM or just [run cypher queries against Neo4j](/javascript/using-the-neo4j-driver-with-nodejs/)  using the [official driver](https://www.npmjs.com/package/neo4j-driver).

With the disclaimers out of the way, let's get going.

## Overview

An idea that I've had at the back of my mind for a while is to build a collaborative Graph Database modelling tool.  For this, real-time information will have to be passed through to all users that are logged in so a user doesn't overwrite what another user is doing.  For this, I will need to _lock_ and _unlock_ nodes in real-time and pass the message to a user.

![Diagram detailing the messaging process](/images/posts/real-time-ui-vuejs-neo4j-kafka/fig1.png "Diagram detailing the messaging process")

1. When a user selects a _Node_ in the UI, a `lock` event should be sent to the API via websockets.  This status update should be distributed to the other users, and that node locked in their front end
2. As the user drags the _Node_, a `drag` event should be sent with the x/y coordinates of the node so this can be reflected in what each other user sees.
3. When the _Node_ is dropped, the node should be _unlocked_ for all users by a `lock` event



## Creating a basic express API

Firstly, we need an API that we can send these messages.  The API will be in charge of saving the updates to Neo4j and redistributing the message to all of the other clients.  The first step is to create a new directory which will hold the code, initiate the project and install the required dependencies.

```sh
mkdir api && cd $_
npm init -y
npm i -S express neode kafka-node socket.io
```

- **express** - This is an unopinionated framework for building REST APIs
- **neode** - An OGM that I'll use to take care of the legwork when communicating with Neo4j.
- **kafka-node** - A library for interacting with Kafka.  This package allows you to create Producers and Consumers in node.
- **socket.io** - A library that enables communication over websockets

For now, I'll create a server that socket.io and the kafka consumer will bind to.

<div class="file">api/src/index.js</div>

```js
const express = require('express')
const app = express()

app.get('/', (req, res) => res.send('Hello!'))

const server = app.listen(3000, () => console.log('Listening on http://localhost:3000'))
```

Running `node index.js` and heading to http://localhost:3000, you should now see a page saying `Hello!`.

Next step, setting up neode.  For this, I will use the `fromEnv` function included with neode. This makes life a little easier by allowing you to define the neo4j connection details in a `.env` file.  We can also use this for the kafka consumer later on.

<div class="file">api/.env</div>

```env
NEO4J_PROTOCOL=bolt
NEO4J_HOST=localhost
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=mysecretpassword
NEO4J_PORT=7687
```

To load these settings into `process.env`, you call the `.config()` function supplied by `dotenv`.

```js
// Load the .env variables into process.env
require('dotenv').config()

// Accessing the variable
console.log(process.env.NEO4J_HOST) // "localhost"
```

### Data Persistence with Neode

Next, I'll need a [neode model](https://github.com/adam-cowley/neode/#loading-with-models).  At the risk of causing confusion, I'm going to call the nodes we save in the database `Node`.  I'll want a UUID to serve as a unique ID, a status and x and y coordinates.

<div class="file">api/models/Node.js</div>

```js
module.exports = {
    id: {
        type: 'uuid',
        primary: true,
    },
    status: {
        type: 'string',
        valid: [ 'locked', 'unlocked', ], // I want two statuses
    },
    x: 'float',   // These are a simple shorthand for {type: 'float'}
    y: 'float',
}
```

Then, an instance of neode.  For clarity, I will create this in a new file called `neode.js` but this could quite easily just be written in index.js.

<div class="file">api/neode.js</div>

```js
const neode = require('neode')
    // Load using the config in .env
    .fromEnv()
    // Use the models defined in api/models/*.js
    .withDirectory(__dirname + '/models')

module.exports = neode
```

You can then use neode to [create some data](https://github.com/adam-cowley/neode/#merging-a-node) and place them at a random x,y coordinate.
```js
const neode = require('./neode')

const ids = [
    '61ff4876-e488-4a91-94a6-f8d6bdd35273',
    'c98e1475-1421-41f9-9f2f-551ce1b1bf5a',
    '642f2518-b1b8-4405-9dd8-bd19e6a0f487',
    'be7d130c-a922-4e80-9a84-c0723a8d4710'
];

ids.map(id => neode.create('Node', { id, x: Math.random()*1000, y: Math.random()*1000 }))

```

### Communicating with Socket.io

Next, for the communication between the front end and API.  For this, I've gone for
[socket.io](https://socket.io/) because I've used this on a few projects in the past and it is relatively easy to set up with express.  But in reality, any websockets implementation will do.

Again, in a new file, I'm creating a function that can be called to create a socket.io instance.  I've done this because the socket needs to be bound to some sort of http server, and at some point will need to communicate with neo4j and the kafka consumer too.

<div class="file">api/io.js</div>

```js
const createSocket = (server, neode, consumer) => {
    const io = require('socket.io')(server)

    // Messages will be sent and received here...

    return io
}

module.exports = createSocket
```

Then the function can be imported and called inside `index.js`.

<div class="file">api/index.js</div>

```js
const io = require('./io')(server, neode)
```

The socket.io API is essentially an event emitted and therefore has an extremely simple interface.
On connection, a `connection` event is fired which provides a `socket` object.  This contains an
 `on(event, callback)` function that allows you to execute a callback function when an event is received.

<div class="file">api/io.js</div>

```js
io.on('connection', socket => {
    console.log(`--> JOINED: ${socket.id}`) // --> JOINED: Am-spDXUXvNHhuLNAAAD

    // Listen for events from that socket
    socket.on('disconnect', () => {
        console.log(`<-- LEFT  : ${socket.id}`) // <-- LEFT  : sbIpyb0yM64cYcX_AAAA
    })
})
```

To send a message, you can either use `socket.emit(message, payload)` to send a message to that socket only, or use `io.emit(message, payload)` to send a message to all sockets.  Socket.io also has the concept of [Rooms and Namespaces](https://socket.io/docs/server-api/#socket-rooms), which could be useful in a multitenancy environment but that is beyond the scope of this article.

When a user joins for the first time, we might want to do some authentication but for berevity I will skip that step.  When a user joins, I will use neode to query the database and send the current state of the graph to the UI in the form of a `welcome` message.

```js
io.on('connection', socket => {
    console.log(`--> JOINED: ${socket.id}`) // --> JOINED: Am-spDXUXvNHhuLNAAAD

    neode.all('Node')
        .then(res => res.toJson())
        .then(data => socket.emit('welcome', data))

    // ...
})
```

In order to handle communications from the client, I'll need to listen for  2 events; `lock` and `unlock`.  When the lock event is received with an id in the payload, I will need to use that to update the status of a node in neo4j.  If an unlock event is received, I will need to set the _unlocked_ status should be saved along with the new x and y coordinates.

For now, when a message is received I will simply send out the past tense version to all other connected sockets.  Later on, these messages will be handled by Kafka instead.

```js
// Handle Lock Event
socket.on('lock', data => {
     neode.find('Node', data.id)
        .then(node => node.update({
            status: 'locked',
            // So we have some context of who locked it, we can use the socket ID
            by: socket.id,
        }))
        .then(node => node.toJson())
        .then(json => io.emit('locked', json))
})

// Handle Unlock Event
socket.on('lock', data => {
    neode.find('Node', data.id)
        .then(node => node.update({
            status: 'unlocked',
            by: null,
            x: data.x,
            y: data.y,
        }))
        .then(node => node.toJson())
        .then(json => io.emit('unlocked', json))
})
```

Great.  That should be enough to get the front end working.


## Building a Front End with Vue.js

Essentially, we want a framework that allows us to build an application quickly and that can consume messages via websockets using javascript.  My personal preference is Vue.js but you could te easily swap out Vue.js for  React, Angular, Ember, jQuery, Backbone (is that still a thing?!), YourFavouriteFrontEndFramework and the result would be the same.

The `@vue/cli` tools allow you to quickly generate a project template and get started in minutes.  The following command creates a new project in the `ui` folder.

```sh
vue create ui
```

There are [several ways](https://www.npmjs.com/package/vue-socket.io) to include the Socket.io code in a vue project, but because the implementation is relatively simple I'll just use the `socket.io-client` package.

```
cd ui
npm i --save socket.io-client

# serve the project in dev mode
npm run serve
```

The easiest way to [create draggable elements](http://www.petercollingridge.co.uk/tutorials/svg/interactive/dragging/) is through SVG.  So inside the `App.vue` component, I'll just add an svg element and use a custom Vue component to represent the nodes - each generating a draggable `<circle>` element.


When the UI receives the welcome message, it should populate a `nodes` array.  Each time a locked or unlocked message is received, the corresponding item in that array will be updated and that status reflected in the UI.


<div class="file">App.vue</div>

```html
<template>
    <div id="app">
        <svg height="100%" width="100%" style="background: #f2f2f2">
            <!-- Node circles will go here -->
        </svg>
    </div>
</template>

<script>
import Node from '@/components/Node'
import io from 'socket.io-client';

// There is probably a more sophisticated way of doing this...
const socket = io('http://localhost:3000');

export default {
    name: 'app',
    components: {
        Node,
    },
    data: () => ({
        loading: true,
        selected: null,

        nodes: [],
    }),
}
</script>
```

For the draggable nodes, I'll simply wrap a Vue component `<circle>` component and apply some handlers.  This way, I can encapsulate the locking and dragging logic and then send back events to the parent component when something interesting happens.  I've defined these

<div class="file">Node.vue</div>

```vue
<template>
    <circle
        :cx="x" :cy="y" :r="r" :style="style"
        :title=" JSON.stringify(node) "
    />
</template>

<script>
export default {
    name: 'Node',
    props: {
        node: Object,
        selected: String,
        lock: Function,
        move: Function,
        unlock: Function,

        r: {
            type: Number,
            default: 50,
        }
    },
    // Start with default values for x and y that will be changed based
    // on the values of the node object passed as a prop
    data: () => ({ x: 0, y: 0, }),
}
</script>
```

Because the x and y coordinates can be changed, I can't use these directly from the node object.  So the `data()` function will return default values.  Then as the component is mounted, or the node object updates this position should be overwritten.

<div class="file">Node.vue</div>

```js
export default {
    name: 'Node',
    // ...
    data: () => ({ x: 0, y: 0, }),
    methods: {
        reposition() {
            // Set x and y based on the Node object
            this.x = this.node.x;
            this.y = this.node.y;
        },
    },
    mounted() {
        // Run the function when the component is first mounted
        this.reposition()
    },
    watch: {
        // ... and for any subsequent change to the node object
        node() {
            this.reposition()
        },
    },
}
```

### Locking the Node
On mouse down, I want to send a message to the server to say that the node has been locked.  This will be taken care of by the `lock` function passed as a prop, but I will also need to check that another user hasn't locked the nodeso I need to wrap it in a handler function.  First I need to define a function in the component, then bind that to the onmousedown event.

```js
// ...
methods: {
    handleLock(e) {
        // Don't do anything if it's already locked
        if ( this.node.status === "locked" ) {
            return;
        }

        this.lock(this.node)
    },

},
// ...
```

To bind events to components, I prefer the shorthand `@` syntax - so for example, I can bind the function on mouse down, and then use `.prevent` to prevent any default behaviour (the equivalent of calling `event.preventDefault()`).
```html
<template>
    <circle
        :cx="x" :cy="y" :r="r" :style="style"
        :title=" JSON.stringify(node) "

        @mousedown.prevent="handleLock"
        @mousemove.prevent="handleMove"
        @mouseup.prevent="handleUnlock"
        @mouseout.prevent="handleUnlock"
    />
</template>
```

### Handling the Drag

Handling the dragging of a component in an SVG is fairly trivial - and is defined in [great detail here](http://www.petercollingridge.co.uk/tutorials/svg/interactive/dragging/).  On mouse move, if this node is selected by the current user, I want to set the `cx` and `cy` properties to the position of the mouse.  This information is available from the event.  Because the SVG element is the parent element of the component, it can be accessed by using `this.$el`.

```js
handleMove(e) {
    if ( this.selected === this.node.id ) {
        this.$el.setAttributeNS(null, "cx", e.clientX)
        this.$el.setAttributeNS(null, "cy", e.clientY)
    }
},
```

Then, once the Node has been _dropped_, I want to _unlock_ the node and send the new position back to the API.

```js
handleUnlock(e) {
    if ( this.selected === this.node.id ) {
        this.unlock(this.node, {x: e.clientX, y: e.clientY})
    }
},
```

### Client to Server Communication

Sending and receiving messages from the Socket.io client are similar to the code above.  The `socket` object has an `emit(message, body)` function which.  As this will be identical for all messages, I'll implement it as a method on the `App` component.  For a production ready app you might want to move this into it's own service.

Each of the messages then has a similar signature, just sending a different event name and payload.

<div class="file">App.vue</div>

```js
export default {
    name: 'app',
    // ...
    methods: {
        send(message, body) {
            console.log('sending', message, body)
            return socket.emit(message, body)
        },

        lock(node) {
            const { id, } = node;

            // Set selected node in component
            this.selected = node.id

            this.send('lock', { id, })
        },
        move(node, data) {
            const { id, } = node;
            this.send('move', { id, ...data })
        },
        unlock(node, data) {
            // Clear selected node in component
            this.selected = null

            const { id, } = node;
            this.send('unlock', { id, ...data })
        },
    },
}
```

Now the server can send events, all that is needed is to receive any events that come back.  The `created()` function is fired when the component is created - this is a perfect place to bind some event listeners for the socket.  As a message comes in, the nodes prop for the component should be updated to reflect the change - whether that is a node locked or unlocked.

```js
export default {
    name: 'app',
    // ...
    created() {
        // Add listeners to set the initial app state on connection
        socket.on('welcome', nodes => {
            this.nodes = nodes
            this.loading = false
        })

        // Handle another user locking a node
        socket.on('locked', e => {
            const index = this.locked.indexOf(e.id);
            if ( index > -1 ) {
                this.locked.splice(index, 1)
            }

            // Update status
            const nodeIndex = this.nodes.findIndex(n => n.id == e.id)
            this.nodes[ nodeIndex ].status = "locked"

            console.log('LOCKED!', e)
        })

        // Handle a node becoming unlocked
        socket.on('unlocked', e => {
            // Remove from locked
            const index = this.locked.indexOf(e.id);
            if ( index > -1 ) {
                this.locked.splice(index, 1)
            }

            // Update status and position
            const nodeIndex = this.nodes.findIndex(n => n.id == e.id)

            this.nodes[ nodeIndex ].x = e.x
            this.nodes[ nodeIndex ].y = e.y
            this.nodes[ nodeIndex ].status = "unlocked"

            console.log('UNLOCKED!', e)
        })
    },
}
```

A quick test shows that any changes made in one browser window are reflected in other browser windows.

<video width="100%" controls>
  <source src="/images/posts/real-time-ui-vuejs-neo4j-kafka/sync720.mov">
</video>


### Publishing Updates with Neo4j Streams

This is fine for a small application, but wouldn't work at scale.  If you try to run the API in a load balanced environment only the other users that happen to be connected to the server that received the update would be updated.  This is where Kafka comes in, when data is updated in Neo4j we can push it out to a Kafka topic.  Then, we can create a Consumer in `api/src/index.js` which will consume the topic and then relay the changes out to the front end via websockets.

There are two ways of achieving this.  The more complex option would be to publish the changes from the application server, or use the [Neo4j Streams](https://neo4j.com/docs/labs/neo4j-streams/) plugin to turn Neo4j into a Publisher.

[Neo4j Streams](https://neo4j.com/docs/labs/neo4j-streams/) is a neo4j plugin that allows you to create Producers and/or Consumers directly inside neo4j by editing a few lines of `neo4j.conf`.  By installing the plugin, a set of procedures are made available in neo4j to publish.  You _could_  `CALL streams.publish(topic, payload)` in cypher but that still seems like too much work.

Neo4j Streams also allows you to publish to or consume from a Kafka topic with a few lines of config.

#### Installing Neo4j Streams

[Full installation instructions are available here](https://neo4j.com/docs/labs/neo4j-streams/current/) but in short, you download the [ *.jar file for the latest release](https://github.com/neo4j-contrib/neo4j-streams/releases/latest) and copy it to the `plugins` folder of your neo4j instance.  Then, in `neo4j.conf` add in a couple of items with references to the zookeeper server and any kafka servers to bootstrap to (separated by a comma).

<div class="file">neo4j.conf</div>

```conf
kafka.zookeeper.connect=zookeeper.url:2181
kafka.bootstrap.servers=kafka.url:9092
```

#### Configuring the Sink

By configuring the neo4j server as a _Sink_, you can publish updates to a Kafka Topic at the end of every transaction.  Neo4j Streams allows you to set this up by adding a few more lines to the `neo4j.conf` file.  After configuring the server as a source, there are options to define patterns, each of which will be checked when a transaction is committed.

```conf
streams.source.topic.nodes.<TOPIC_NAME>=<PATTERN>
streams.source.topic.relationships.<TOPIC_NAME>=<PATTERN>
```

I have a queue set up in kafka called `locks`, so I can configure neo4j to update kafka when the status, x or y properties of a `Node` node are updated.  You can either supply a wildcard `{*}` to include all properties or provide a list inside braces separated by a comma (`{prop1, prop2}`).  Prefixing a property with a minus sign `{-prop3}` will exclude it from the filter.  You can [apply many patterns](https://neo4j.com/docs/labs/neo4j-streams/current/producer/#producer-patterns) to this config by splitting with a semicolon.

```
# enable it
streams.source.enabled=true
streams.source.topic.nodes.locks=Node{status,x,y}
```

After restarting the database to apply the settings and running a cypher query - you can see that

```cypher
MATCH (n:Node)
SET n.status = 'locked', n.x = rand()*100, n.y = rand()*100
```

![Changes listed in Kafka](/images/posts/real-time-ui-vuejs-neo4j-kafka/fig2.png "A list of updates for a set of nodes in Lenses UI")


### Listening for Changes in the API

Now, the only thing left to do is to messages published to the Kafka topic in the API and push those out to the front end.  For this, the API will need a Kafka consumer.  This is done with the `kafka-node` package installed earlier.

The first step is to create a client to connect to the Kafka host.  Because `.env` is already setup and working with neode, I'll add a the configuration options for the kafka server(s), topic and consumer group to .env

<div class="file">.env</div>

```env
KAFKA_SERVER=kafka.url:9092
KAFKA_TOPIC=locks
KAFKA_GROUP=LocksGroup1
```

Then the next step is to create a client to connect to Kafka, then a consumer that will listen to the locks topic.  By specifying a group, you can either split the consumption of the topic over a number of servers, or in this case by supplying different groups for each application server - each application server and subsequent user will receive the update.


<div class="file">api/src/consumer.js</div>

```js
const kafka = require('kafka-node')

// Client
const client = new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_SERVER });

// Consumer
const consumer = new kafka.Consumer(
    client,
    // You can supply more than one topic here
    [ { topic: process.env.KAFKA_TOPIC, partition: 0 } ],
    {
        groupId: process.env.KAFKA_GROUP,
        autoCommit: true,
        fetchMaxWaitMs: 1000,
        fetchMaxBytes: 1024 * 1024,
        encoding: 'utf8',
        fromOffset: false
    }
);

// Export it so we can use it later
module.exports = consumer;
```

Then the only thing left to do is consume the messages as the come in from the topic.  Because the consumer is only listening on a single topic there's no need to check the message when it comes in - just the type.

The interface for listening is the same as socket.io, when a message comes in we want to emit it to each connected socket.

<div class="file">api/src/io.js</div>

```js
 // Now with added consumer parameter
const createSocket = (server, neode, consumer) => {
    // ...

    // Listen for Kafka
    consumer.on('message', ({ value, }) => {
        // Parse the JSON value into an object
        const { payload, } = JSON.parse(value)

        // Get the properties from the update
        const { properties, } = payload.after

        // ... and the status
        const { status, } = properties

        console.log('\n\nemitting from kafka:', status, properties)

        // Emit the message through all connected sockets
        io.emit(status, properties)
    })
}

```

That's it!  When a message comes in, the payload will include a value that includes `before` and `after` objects that show the state of the node before and after the transaction.  Because the status properties are the same as the messages, this can be used as the message name, and the entire property object can be sent as the payload.


## Next Steps

This is quite a basic example, but you could use this to do some pretty clever things.  For example, neo4j could push the information to another topic, which another topic listens to, runs some aggregation and then passes the new value to another queue.

Neo4j could be used as a [Consumer](https://neo4j.com/docs/labs/neo4j-streams/current/consumer/) as well as a Producer and process messages directly from a Kafka topic.

On the websockets side, Socket.io has [Rooms and Namespaces](https://socket.io/docs/rooms-and-namespaces/) functionality that could be used for a multi-tenancy system.  As a connection is received, some authentication could take place that resulted in the user joining a room belonging to it's organisation.  That way only the relevant messages are sent to each user.

The [code is up on github](https://github.com/adam-cowley/real-time-ui-vuejs-neo4j-kafka), feel free to clone and play for yourself.

If you have any questions or comments, I'm [@adamcowley](http://twitter.com/adamcowley) or feel free to continue the conversation on the [Neo4j Community site](https://community.neo4j.com/t/building-a-real-time-ui-on-top-of-neo4j-with-vue-js-and-kafka/13495).


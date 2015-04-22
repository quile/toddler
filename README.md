# toddler.js

## Like a toddler, always asking questions.

Toddler is a library for building queries that can be programmatically
manipulated and are simple data structures.  Those queries can be
turned into SQL or CQL for sending to SQL databases or Cassandra.

## Select Example

Load toddler in:

    var toddler = require("toddler");

Create a query (there are a few ways to do this):

    var q = new toddler.Query();

Now qualify it:

    q.select("foo", "bar").from("zip").where(toddler.lt("pop", "?")).limit(12);

And generate some CQL:

    console.log(q.cql());
    => "select foo, bar from zip where pop < ? limit 12"

Queries are stored internally as mori (read: immutable) data structures, so
it's trivial to serialise and deserialise queries.  Bottom line: you
can avoid hardcoding queries as strings, and instead build composable,
serialisable datastructures to represent them instead.

## Insert Example

   var insert = toddler.insert("foo", "bar", "baz").
                        into("quux").
                        values("?", "hey", toddler.raw("dateOf(now())"));
   console.log(insert.cql());
   => "insert into quux (foo, bar, baz) values (?, ?, dateOf(now()))"

Note that the "hey" has disappeared from the values; instead it will appear
in the "binds":

   console.log(insert.binds());
   => ["?", "hey"]


## Warning

This is likely to be unstable for a while as I put all the
bits and pieces together into a more coherent whole.

# License

MIT

(c) kd 2015 - present

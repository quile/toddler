# toddler.js

## Like a toddler, always asking questions.

Toddler is a library for building queries that can be programmatically
manipulated and are simple data structures.  Those queries can be
turned into SQL or CQL for sending to SQL databases or Cassandra.

## Example

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
it's trivial to serialise and deserialise queries.  Bottom line:
You can avoid writing festering pustulent CQL queries
as strings in your application.

## Warning

This is likely to be unstable for a while as I put all the
bits and pieces together into a more coherent whole.

# License

MIT

(c) kd 2015 - present

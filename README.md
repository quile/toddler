# toddler.js

## Like a toddler, always asking questions.

Toddler is a library for building queries that can be programmatically
manipulated and are simple data structures.  Those queries can be
turned into CQL for sending to Cassandra.  Soon it will also
generate various flavours of SQL for sending to SQL databases.

## Select Example

Load toddler in:

    var toddler = require("toddler");

Create a query (there are a few ways to do this):

    var q = new toddler.Query();

Now qualify it:

    q.select("foo", "bar").from("zip").where(toddler.lt("pop", "?")).limit(12);

And generate some CQL:

    console.log(q.statement("CQL"));
    => "select foo, bar from zip where pop < ? limit 12"

Queries are stored internally as mori (read: immutable) data structures, so
it's trivial to serialise and deserialise queries.  Bottom line: you
can avoid hardcoding queries as strings, and instead build composable,
serialisable datastructures to represent them instead.

## Insert Example

You can generate an insert statement using the same syntax:

    var insert = toddler.insert("foo", "bar", "baz").
                         into("quux").
                         values("?", "hey", toddler.raw("dateOf(now())"));
    console.log(insert.statement("CQL"));
    => "insert into quux (foo, bar, baz) values (?, ?, dateOf(now()))"

Note that the "hey" has disappeared from the values; instead it will appear
in the "binds":

    console.log(insert.binds("CQL"));
    => ["?", "hey"]

## Delete Example

Delete statements are fairly simple:

    var delete = toddler.delete().from("tree").
                         where(toddler.eq("fruit", toddler.bind("banana")));

    console.log(delete.statement("CQL"));
    => "delete from tree where fruit = ?"

You can retrieve any bind values the same way as shown above.

More docs coming soon; for now just check out the tests.

## TODO

* Proper docs
* Proper tests
* bind-value conveniences & helpers
* Add other missing syntax

## Warning

This is likely to be unstable for a while as I put all the
bits and pieces together into a more coherent whole.

## Contribute

If you're using toddler in your code, let me know!  And I'll happily
review pull requests if you feel like contributing.  Cheers!

# License

MIT

(c) kd 2015 - present

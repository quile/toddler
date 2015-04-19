var m = require("mori");
var c = require("./toddler");

t = new c.CQLTranslator();
var q = c.select(c.from(c.where(c.limit(null, 10), c.eq("foo", "%@")), "foo"), ["id", "banana"]);
console.log(q);

q = c.select(c.from(c.where(c.limit(c.orderBy(c.orderBy(null, ["philbert"]), ["banana", "jones"]), 10), c.and(c.eq("foo", "%@"), c.gt("publish_date", "2015-05-05"))), "foo"), ["id", "banana"]);
console.log(q);
console.log(t.prepare(q));

var q = c.query("foo", "bar").from("zip").where(c.lt("pop", "?")).limit(12);
console.log(q.cql());



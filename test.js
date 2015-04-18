var m = require("mori");
var c = require("./toddler");

var q = c.select(c.from(c.where(c.limit(null, 10), c.eq("foo", "%@")), "foo"), ["id", "banana"]);
console.log(q);

q = c.select(c.from(c.where(c.limit(c.orderBy(c.orderBy(null, ["philbert"]), ["banana", "jones"]), 10), c.and(c.eq("foo", "%@"), c.gt("publish_date", "2015-05-05"))), "foo"), ["id", "banana"]);
console.log(q);

/*
q = new c.Query();

q.select("*").from("tree").where(c.eq("fruit", "banana")).and(c.eq("flowers", "red")).or(c.eq("season", "summer")).limit(3).offset(6).orderBy("size").orderBy("fish");
console.log(q.query());
*/

q = new c.Query();

q.select("foo", "bar").from("zip").where(c.lt("pop", "fizz")).limit(12);
console.log(q.query());

t = new c.Translator();
console.log(t.prepare(q.query()));

console.log(t.prepareClause(m.get(q.query(), ":where")));

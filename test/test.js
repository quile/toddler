var mori   = require("mori");
var assert = require("assert");

var toddler = require("../toddler");

var t = new toddler.CQLTranslator();

describe("queries", function() {
    describe("select", function () {
        var q = toddler.select(
            toddler.from(
                toddler.where(
                    toddler.limit(null, 10),
                    toddler.eq("foo", "%@")),
                "foo"
            ),
            ["id", "banana"]
        );

        it("should have the correct structure", function() {
            assert(mori.equals(
                q,
                mori.hashMap(":operation", ":select",
                             ":table", "foo",
                             ":limit", 10,
                             ":where", mori.vector("=", "foo", "%@"),
                             ":columns", mori.vector("id", "banana"))
            ));
        });

        var select = toddler.select("foo", "bar").from("baz");
        it("produced a valid select query directly", function() {
            assert(mori.equals(
                mori.hashMap(":operation", ":select",
                             ":columns", mori.vector("foo", "bar"),
                             ":table", "baz")
            ));
        });

        var query = toddler.query().select("mango", "papaya").
            from("fruit").
            where(toddler.and(
                toddler.eq("colour", "orange"),
                toddler.gt("size", 20)
            )).
            limit(3);

        var cql = query.cql();

        it("generated correct CQL from select object", function() {
            assert.equal(
                cql,
                "select mango, papaya from fruit where colour = ? and size > ? limit 3"
            );
        });
    });


    describe("insert", function() {
        var insert = toddler.insert("goo", "boo").into("junk").values("bonk", "zonk");
        it("creates a query object directly", function() {
            assert(mori.equals(
                insert._query,
                mori.hashMap(":operation", ":insert",
                             ":columns", mori.vector("goo", "boo"),
                             ":table", "junk",
                             ":values", mori.vector("bonk", "zonk"))
            ));
        });

        var q = toddler.query().insert("zip", "zap").
            into("zoo").values(
                toddler.bind("gronk"),
                toddler.bind("plonk")
            );

        it("generates correct CQL from insert", function() {
            var cql = q.cql();
            assert.equal(
                cql,
                "insert into zoo (zip, zap) values (?, ?)"
            );
        });

        it("generates the correct bind values from insert", function() {
            var binds = q.binds();
            assert.equal(binds[0], "gronk");
            assert.equal(binds[1], "plonk");
        });
    });

    describe("delete", function() {
        var q = toddler.query().delete().from("aquarium").
            where(
                toddler.or([
                    toddler.eq("fish", "shark"),
                    toddler.eq("fish", "manta ray")
                ]));

        it("generates the correct CQL from delete", function() {
            var cql = q.cql();
            assert.equal(
                cql,
                "delete from aquarium where fish = ? or fish = ?"
            );
        });

        it("generates the correct bind values from delete", function() {
            var binds = q.binds();
            assert.equal(binds[0], "shark");
            assert.equal(binds[1], "manta ray");
        });

        var noBinds = toddler.query().delete().from('user_favorites').where(
            toddler.and(
                toddler.eq('user_id', toddler.bind('?')),
                toddler.eq('neulion_id', toddler.bind('?'))
            )
        );

        it("generates the correct empty bind values from delete", function() {
            var binds = noBinds.binds();
            assert.equal(binds[0], "?");
            assert.equal(binds[1], "?");
            var cql = noBinds.cql();
            assert.equal(
                cql,
                "delete from user_favorites where user_id = ? and neulion_id = ?"
            );
        });
    })
});

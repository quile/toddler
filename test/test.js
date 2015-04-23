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

        var query = toddler.query().select("mango", "papaya").
            from("fruit").
            where(toddler.and(
                toddler.eq("colour", "orange"),
                toddler.gt("size", 20)
            )).
            limit(3);

        var cql = query.cql();

        it("generated correct CQL from select", function() {
            assert.equal(
                cql,
                "select mango, papaya from fruit where colour = ? and size > ? limit 3"
            );
        });
    });


    describe("insert", function() {
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
    })
});

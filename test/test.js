var mori   = require("mori");
var assert = require("assert");

var toddler = require("../toddler");

var t = new toddler.Translator("default");

describe("queries", function() {
    describe("default select", function () {
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
            orderBy("guava DESC", "feijoa").
            limit(3);

        var statement = query.statement();

        it("generated correct SQL from select object", function() {
            assert.equal(
                statement,
                "select mango, papaya from fruit where (colour = ? and size > ?) order by guava DESC, feijoa limit 3"
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

        it("generates correct SQL from insert", function() {
            var statement = q.statement();
            assert.equal(
                statement,
                "insert into zoo ( zip, zap ) values ( ?, ? )"
            );
        });

        it("generates the correct bind values from insert", function() {
            var binds = q.binds();
            assert.equal(binds[0], "gronk");
            assert.equal(binds[1], "plonk");
        });
    });

    describe("delete", function() {
        var del = toddler.delete().from("argh");
        it("creates a query directly", function() {
            assert(mori.equals(
                del._query,
                mori.hashMap(":operation", ":delete",
                             ":table", "argh")
            ));
        });
        var q = toddler.query().delete().from("aquarium").
            where(
                toddler.or([
                    toddler.eq("fish", "shark"),
                    toddler.eq("fish", "manta ray")
                ]));

        it("generates the correct SQL from delete", function() {
            var statement = q.statement();
            assert.equal(
                statement,
                "delete from aquarium where (fish = ? or fish = ?)"
            );
        });

        it("generates the correct bind values from delete", function() {
            var binds = q.binds();
            assert.equal(binds[0], "shark");
            assert.equal(binds[1], "manta ray");
        });

        var noBinds = toddler.query().delete().from('lunch_box').where(
            toddler.and(
                toddler.eq('salad', toddler.bind('?')),
                toddler.eq('cheese', toddler.bind('?'))
            )
        );

        it("generates the correct empty bind values from delete", function() {
            var binds = noBinds.binds();
            assert.equal(binds[0], "?");
            assert.equal(binds[1], "?");
            var statement = noBinds.statement();
            assert.equal(
                statement,
                "delete from lunch_box where (salad = ? and cheese = ?)"
            );
        });
    });

    describe("clause", function() {

        it("distinguishes correctly between single and multiple clauses", function() {
            var clause = toddler.eq("foo", "bar");

            assert(mori.equals(
                t.prepareClause(clause),
                mori.hashMap(":statement", "foo = ?", ":bind", mori.vector("bar"))
            ));
        });

        it("generates NOT clause", function() {
            var clause = toddler.not(toddler.and(toddler.eq("foo", "bar"), toddler.ge("thing", 12)));

            assert(mori.equals(
                t.prepareClause(clause),
                mori.hashMap(":statement", "not (foo = ? and thing >= ?)",
                             ":bind", mori.vector("bar", 12))
            ));
        });

        it("generates AND clause", function() {
            var clause = toddler.and(toddler.eq("foo", "bar"), toddler.ge("thing", 12));

            assert(mori.equals(
                t.prepareClause(clause),
                mori.hashMap(":statement", "(foo = ? and thing >= ?)",
                             ":bind", mori.vector("bar", 12))
            ));
        });

        it("generates OR clause", function() {
            var clause = toddler.or(toddler.eq("foo", "bar"), toddler.ge("thing", 12));

            assert(mori.equals(
                t.prepareClause(clause),
                mori.hashMap(":statement", "(foo = ? or thing >= ?)",
                             ":bind", mori.vector("bar", 12))
            ));
        });

        it("generates nested clauses in correct order", function() {
            var clause1 = toddler.or(toddler.eq("foo", "bar"), toddler.ne("baz", "quux"));
            var clause2 = toddler.and(toddler.eq("blonk", "zap"), toddler.lt("gronk", 42));
            var clause3 = toddler.and(clause1, clause2);

            assert(mori.equals(
                t.prepareClause(clause3),
                mori.hashMap(":statement", "((foo = ? or baz != ?) and (blonk = ? and gronk < ?))",
                             ":bind", mori.vector("bar", "quux", "zap", 42))
            ))
        });
    });
});

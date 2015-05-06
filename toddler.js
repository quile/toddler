// toddler.js
// Query language DSL for Javascript

var mori = require("mori");

var toddler = {

    _query: function(query) {
        return query || mori.hashMap();
    },

    query: function() {
        var q = new Query();
        if (arguments.length) {
            q.select.apply(q, arguments);
        }
        return q;
    },

    operation: function(query, op) {
        return mori.assoc(this._query(query), ":operation", op);
    },

    select: function(query, what) {
        if (!mori.isMap(query)) {
            var qo = toddler.query();
            return qo.select.apply(qo, arguments);
        }
        query = this.operation(query, ":select");
        what = mori.toClj(what);
        return mori.assoc(query, ":columns", what);
    },

    insert: function(query, what) {
        if (!mori.isMap(query)) {
            var qo = toddler.query();
            return qo.insert.apply(qo, arguments);
        }
        query = this.operation(query, ":insert");
        what = mori.toClj(what);
        return mori.assoc(query, ":columns", what);
    },

    delete: function(query) {
        if (!mori.isMap(query)) {
            return toddler.query().delete();
        }
        return this.operation(query, ":delete");
    },

    into: function(query, table) {
        return this.from(query, table);
    },

    from: function(query, table) {
        return mori.assoc(this._query(query),
                          ":table", table);
    },

    where: function(query, clause) {
        return mori.assoc(this._query(query),
                          ":where", clause);
    },

    values: function(query, values) {
        return mori.assoc(this._query(query),
                          ":values", values);
    },

    limit: function(query, limit) {
        return mori.assoc(this._query(query),
                          ":limit", limit);
    },

    offset: function(query, offset) {
        return mori.assoc(this._query(query),
                          ":offset", offset);
    },

    orderBy: function(query, columns) {
        var query = this._query(query);
        if (!mori.isSequential(mori.toClj(columns))) {
            columns = mori.vector(columns);
        }
        var existingOrderings = mori.get(query, ":order") || mori.vector();
        return mori.assoc(query, ":order", mori.concat(existingOrderings, columns));
    },

    // simple clauses; store them like a LISP exp
    clause: function(type, a, b) {
        return mori.vector(type, a, b);
    },

    eq: function(a, b) { return this.clause("=", a, b)  },
    ne: function(a, b) { return this.clause("!=", a, b) },
    gt: function(a, b) { return this.clause(">", a, b)  },
    lt: function(a, b) { return this.clause("<", a, b)  },
    ge: function(a, b) { return this.clause(">=", a, b) },
    le: function(a, b) { return this.clause("<=", a, b) },

    // nodes in clauses
    and: function(clauses) {
        if (arguments.length > 1) {
            clauses = mori.vector.apply(mori, arguments);
        }
        return mori.hashMap(":type", ":and", ":sub", clauses);
    },
    or: function(clauses) {
        if (arguments.length > 1) {
            clauses = mori.vector.apply(mori, arguments);
        }
        return mori.hashMap(":type", ":or", ":sub", clauses);
    },
    not: function(clause) {
        return mori.hashMap(":type", ":not", ":sub", clause);
    },

    bind: function(str) {
        return mori.hashMap(":bind", str);
    },

    raw: function(str) {
        return mori.hashMap(":raw", str);
    }
};

function Translator(dialect) {
    this._translator = this.loadTranslator(dialect);
    this._dialect = dialect;
}

Translator.prototype.DIALECTS = {
    "cql": CQLTranslator,
    // "mysql": "SQLTranslator",
    // "postgres": "SQLTranslator",
    // "default": "SQLTranslator",
    // "sql": "SQLTranslator",
};

Translator.prototype.loadTranslator = function(dialect) {
    var clarse = this.DIALECTS[dialect.toLowerCase()] ||
                    this.DIALECTS["default"];
    return new clarse();
};

Translator.prototype._renderBuffer = function(buffer) {
    var q = mori.toClj(buffer);
    var flat = mori.flatten(q);

    var statementParts = mori.map(function(o) {
        if (typeof o === "string") { return o }
        return mori.get(o, ":statement");
    }, flat);
    var bindParts = mori.map(function(o) {
        if (typeof o === "string") { return null }
        return mori.get(o, ":bind");
    }, flat);

    return mori.hashMap(
        ":statement", mori.toJs(mori.filter(function(o) {
                return o;
            }, statementParts)).join(" "),
        ":bind", mori.flatten(mori.filter(function(o) { return o }, bindParts))
    );
};

// Later generalise this to other dialects
Translator.prototype.prepare = function(query) {
    var operation = mori.get(query, ":operation");

    switch(operation) {
        case ":select":
            return this.prepareSelect(query);
        case ":insert":
            return this.prepareInsert(query);
        case ":delete":
            return this.prepareDelete(query);
        default:
            throw new Error("No such operation: " + operation);
    }
}

Translator.prototype.prepareSelect = function(query) {
    return this._renderBuffer([
        "select",
        this.prepareColumns(query),
        "from",
        this.prepareTables(query),
        this.prepareWhere(query),
        this.prepareOrdering(query),
        this.prepareLimit(query),
        this.prepareOffset(query)
    ]);
};

Translator.prototype.prepareInsert = function(query) {
    var preparedValues = this._translator.prepareValues(query);
    var rendered = this._renderBuffer([
        "insert into",
        this.prepareTables(query),
        "(", this.prepareColumns(query), ")",
        "values",
        "(", mori.get(preparedValues, ":statement"), ")"
    ]);
    return mori.hashMap(":statement", mori.get(rendered, ":statement"),
                        ":bind", mori.toJs(mori.get(preparedValues, ":bind")));
};

Translator.prototype.prepareDelete = function(query) {
    return this._renderBuffer([
        "delete from",
        this.prepareTables(query),
        this.prepareWhere(query)
    ]);
};

Translator.prototype.prepareWhere = function(query) {
    var where = mori.get(query, ":where");
    var bind = mori.vector();
    if (where) {
        return this._renderBuffer([
            "where",
            this.prepareClause(where)
        ]);
    }
    return null;
};

Translator.prototype.prepareLimit = function(query) {
    var limit = mori.get(query, ":limit");
    var bind = mori.vector();
    if (limit) {
        var q = ["limit"];
        q.push(limit);
        if (limit === "?" || limit === "%@") {
            bind = mori.conj(bind, "?");
        }
        return mori.hashMap(":statement", q.join(" "),
                            ":bind", bind);
    }
    return null;
};

Translator.prototype.prepareColumns = function(query) {
    return this._translator.prepareColumns(query);
};

Translator.prototype.prepareTables = function(query) {
    return this._translator.prepareTables(query);
};

Translator.prototype.prepareClause = function(clause) {
    return this._translator.prepareClause(clause);
};

Translator.prototype.prepareOrdering = function(query) {
    return null;
};

Translator.prototype.prepareOffset = function(query) {
    return null;
};

// ============================================================

function CQLTranslator() {}

CQLTranslator.prototype.prepareTables = function(query) {
    return mori.get(query, ":table");
};

CQLTranslator.prototype.prepareColumns = function(query) {
    // columns
    var columns = mori.get(query, ":columns");
    if (columns === null) {
        columns = mori.vector("*");
    } else if (!mori.isVector(columns)) {
        columns = mori.vector(columns);
    }
    return mori.toJs(columns).join(", ");
};

CQLTranslator.prototype.prepareValues = function(query) {
    var binds = [];
    var q = [];
    var values = mori.get(query, ":values");
    mori.each(values, function(v) {
        if (!mori.isMap(v)) {
            console.log("Value is not a map :(");
            return;
        }

        if (mori.hasKey(v, ":raw")) {
            var value = mori.get(v, ":raw");
            q.push(value);
        } else if (mori.hasKey(v, ":bind")) {
            q.push("?");
            binds.push(mori.get(v, ":bind"));
        }
    });
    return mori.hashMap(":statement", q.join(", "),
                        ":bind", mori.vector.apply(mori, binds));
};

CQLTranslator.prototype.OPERAND_MAP = mori.hashMap(
    ":and", "and",
    ":or", "or",
    ":not", "not"
);

CQLTranslator.prototype.prepareClause = function(clause) {
    var self = this;
    if (mori.isMap(clause)) {
        var type = mori.get(clause, ":type");
        if (type === ":and" || type === ":or") {
            var clauses = mori.map(
                function(c) { return self.prepareClause(c) },
                mori.get(clause, ":sub")
            );
            var statements = mori.map(
                function(c) { return mori.get(c, ":statement") },
                clauses
            );
            var binds = mori.map(
                function(c) { return mori.get(c, ":bind") },
                clauses
            );
            var statement = mori.toJs(statements).join(" " + mori.get(this.OPERAND_MAP, type) + " ");
            var bind = mori.into(mori.vector(), mori.flatten(binds));
            return mori.hashMap(":statement", statement,
                                ":bind", bind);
        } else {
            // NOT
            var notClause = this.prepareClause(mori.get(clause, ":sub"));
            var statement = mori.get(this.OPERAND_MAP, type) + " " + mori.get(notClause, ":statement");
            return mori.assoc(notClause, ":statement", statement);
        }
    } else if (mori.isSequential(clause)) {
        var statement = mori.get(clause, 1) + " " + mori.get(clause, 0) + " ";
        var binds = mori.vector();
        var right = mori.get(clause, 2);
        if (mori.isMap(right)) {
            if (mori.hasKey(right, ":bind")) {
                binds = mori.conj(binds, mori.get(right, ":bind"));
                statement = statement + "?";
            } else if (mori.hasKey(right, ":raw")) {
                statement = statement + mori.get(right, ":raw");
            }
        } else {
            if (right === "?" || right === "%@") {
                binds = mori.conj(binds, "?");
            } else {
                binds = mori.conj(binds, right);
            }
            statement = statement + "?";
        }
        return mori.hashMap(":statement", statement, ":bind", mori.toClj(binds));
    }
}

toddler.Translator = Translator;

function Query() {
    this._query = mori.hashMap();
    this._translator = new Translator("CQL");
}

Query.prototype.select = function(columns) {
    var what = mori.isSequential(mori.toClj(columns)) ? columns : mori.vector.apply(mori, arguments);
    this._query = toddler.select(this._query, what);
    return this;
};

Query.prototype.insert = function(columns) {
    var what = mori.isSequential(mori.toClj(columns)) ? columns : mori.vector.apply(mori, arguments);
    this._query = toddler.insert(this._query, what);
    return this;
};

Query.prototype.delete = function() {
    this._query = toddler.delete(this._query);
    return this;
};

Query.prototype.from = function(table) {
    this._query = toddler.from(this._query, table);
    return this;
};

Query.prototype.into = function(table) {
    return this.from(table);
};

Query.prototype.where = function(clause) {
    this._query = toddler.where(this._query, clause);
    return this;
};

Query.prototype.values = function(values) {
    values = mori.toClj(values);
    if (arguments.length === 1 && mori.isVector(values)) {
    } else {
        values = mori.vector.apply(mori, arguments);
    }
    this._query = toddler.values(this._query, values);
    return this;
};

Query.prototype.limit = function(limit) {
    this._query = toddler.limit(this._query, limit);
    return this;
};

Query.prototype.offset = function(offset) {
    this._query = toddler.offset(this._query, offset);
    return this;
};

Query.prototype.orderBy = function(orderings) {
    this._query = toddler.orderBy(this._query, orderings);
    return this;
};

Query.prototype.and = function(clause) {
    var existing = mori.get(this._query, ":where");
    this._query = toddler.where(this._query, toddler.and(existing, clause));
    return this;
};

Query.prototype.or = function(clause) {
    var existing = mori.get(this._query, ":where");
    this._query = toddler.where(this._query, toddler.or(existing, clause));
    return this;
};

Query.prototype.not = function() {
    var existing = mori.get(this._query, ":where");
    this._query = toddler.where(toddler.not(this._query, existing));
    return this;
};

Query.prototype.query = function() { return this._query };

Query.prototype.cql = function() {
    var cql = this._translator.prepare(this._query);
    return mori.get(cql, ":statement");
}

Query.prototype.binds = function() {
    var cql = this._translator.prepare(this._query);
    return mori.toJs(mori.get(cql, ":bind"));
}

toddler.Query = Query;

module.exports = toddler;
